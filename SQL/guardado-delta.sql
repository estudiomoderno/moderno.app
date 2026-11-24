-- Additive RPCs. Existing clients, batch atomicity and role filters are preserved.
begin;
do $guard$ begin
 if to_regprocedure('public.app_aplicar_delta(jsonb,jsonb)') is not null
   or to_regprocedure('public.app_leer_versiones(uuid,text[])') is not null
   or to_regprocedure('public.app_guardar_lote_delta(uuid,jsonb)') is not null then
  raise exception 'Los RPC delta ya existen; revisar antes de reemplazar';
 end if;
end $guard$;
create or replace function public.app_aplicar_delta(p_documento jsonb,p_cambios jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare resultado jsonb:=p_documento; cambio jsonb; ruta text[]; padre jsonb; hoja text; objetivo jsonb; nuevo jsonb; indice integer; cantidad integer; valido boolean;
  bytes_documento bigint:=coalesce(octet_length(p_documento::text),0)::bigint;
  bytes_cambios bigint:=coalesce(octet_length(p_cambios::text),0)::bigint;
  bytes_resultado bigint;
  operaciones integer; sincronizaciones integer; identidades bigint;
begin
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios)>64 then raise exception 'Cambios no validos'; end if;
 select count(*) filter(where value->>'op'='array_sync')::integer,
        coalesce(sum(case when value->>'op'='array_sync' then
          case when jsonb_typeof(value->'order')='array' and jsonb_typeof(value->'items')='array'
            then jsonb_array_length(value->'order')+jsonb_array_length(value->'items') else 8001 end
        else 0 end),0)::bigint
 into sincronizaciones,identidades from jsonb_array_elements(p_cambios);
 operaciones:=jsonb_array_length(p_cambios);
 if bytes_documento>24*1024*1024 or bytes_cambios>12*1024*1024
   -- El parche puede convertir un documento pequeno en uno grande en la
   -- primera operacion. Incluir sus bytes evita que las operaciones restantes
   -- reconstruyan ese resultado cientos de MiB sin consumir presupuesto.
   or (bytes_documento+bytes_cambios)*operaciones>256::bigint*1024*1024
   or sincronizaciones>8 or identidades>8000 then
  raise exception 'Delta excede el presupuesto de trabajo' using errcode='54000';
 end if;
 for cambio in select value from jsonb_array_elements(p_cambios) loop
  if jsonb_typeof(cambio) is distinct from 'object' or jsonb_typeof(cambio->'path') is distinct from 'array'
    or jsonb_array_length(cambio->'path')>64 or exists(select 1 from jsonb_array_elements(cambio->'path') x where jsonb_typeof(x)<>'string') then raise exception 'Ruta no valida'; end if;
  select coalesce(array_agg(value order by ord),'{}'::text[]) into ruta from jsonb_array_elements_text(cambio->'path') with ordinality as p(value,ord);
  if cardinality(ruta)>0 then
   padre:=resultado #> ruta[1:cardinality(ruta)-1];hoja:=ruta[cardinality(ruta)];
   if padre is null or jsonb_typeof(padre) not in ('array','object') then raise exception 'Padre no valido'; end if;
   if jsonb_typeof(padre)='array' and (hoja!~'^(0|[1-9][0-9]{0,8})$' or hoja::integer>=jsonb_array_length(padre)) then raise exception 'Indice no valido'; end if;
  end if;
  if cambio->>'op'='set' and cambio ? 'value' then
   resultado:=case when cardinality(ruta)=0 then cambio->'value' else jsonb_set(resultado,ruta,cambio->'value',true) end;
  elsif cambio->>'op'='remove' and cardinality(ruta)>0 then
   if resultado #> ruta is null then raise exception 'No se encuentra el campo'; end if;
   resultado:=resultado #- ruta;
  elsif cambio->>'op'='array_sync' then
   objetivo:=case when cardinality(ruta)=0 then resultado else resultado #> ruta end;
   if jsonb_typeof(objetivo) is distinct from 'array' or jsonb_typeof(cambio->'order') is distinct from 'array'
     or jsonb_typeof(cambio->'items') is distinct from 'array' then raise exception 'Lista identificada no valida'; end if;
   if jsonb_array_length(objetivo)>2000 or jsonb_array_length(cambio->'order')>2000
     or jsonb_array_length(cambio->'items')>2000 then raise exception 'Lista identificada demasiado grande'; end if;
   with actuales as materialized (
    select value as elemento,value->'id' as id from jsonb_array_elements(objetivo) x(value)
   ),ordenados as materialized (
    select value as id,ord from jsonb_array_elements(cambio->'order') with ordinality x(value,ord)
   ),agregados as materialized (
    select value as elemento,value->'id' as id from jsonb_array_elements(cambio->'items') x(value)
   ),fuentes as materialized (
    select elemento,id from actuales union all select elemento,id from agregados
   ),comprobacion as (
    select
     not exists(select 1 from actuales where jsonb_typeof(elemento) is distinct from 'object' or not (elemento ? 'id') or jsonb_typeof(id) not in ('string','number'))
     and (select count(*)=count(distinct id) from actuales)
     and not exists(select 1 from ordenados where jsonb_typeof(id) not in ('string','number'))
     and (select count(*)=count(distinct id) from ordenados)
     and not exists(select 1 from agregados where jsonb_typeof(elemento) is distinct from 'object' or not (elemento ? 'id') or jsonb_typeof(id) not in ('string','number'))
     and (select count(*)=count(distinct id) from agregados)
     and not exists(select 1 from actuales a join agregados n on n.id=a.id)
     and (select count(*) from ordenados o join fuentes f on f.id=o.id)=(select count(*) from ordenados)
     and (select count(*) from agregados n join ordenados o on o.id=n.id)=(select count(*) from agregados) as valido
   )
   select comprobacion.valido,coalesce((select jsonb_agg(f.elemento order by o.ord) from ordenados o join fuentes f on f.id=o.id),'[]'::jsonb)
   into valido,nuevo from comprobacion;
   if not valido then raise exception 'Identificadores no validos'; end if;
   resultado:=case when cardinality(ruta)=0 then nuevo else jsonb_set(resultado,ruta,nuevo,false) end;
  elsif cambio->>'op'='splice' then
   objetivo:=case when cardinality(ruta)=0 then resultado else resultado #> ruta end;
   if jsonb_typeof(objetivo) is distinct from 'array' or jsonb_typeof(cambio->'items') is distinct from 'array'
     or coalesce(cambio->>'index','')!~'^(0|[1-9][0-9]{0,8})$' or coalesce(cambio->>'delete','')!~'^(0|[1-9][0-9]{0,8})$' then raise exception 'Lista no valida'; end if;
   indice:=(cambio->>'index')::integer;cantidad:=(cambio->>'delete')::integer;
   if indice>jsonb_array_length(objetivo) or cantidad>jsonb_array_length(objetivo)-indice then raise exception 'Rango no valido'; end if;
   select coalesce(jsonb_agg(value order by ord),'[]') into nuevo from jsonb_array_elements(objetivo) with ordinality as x(value,ord) where ord<=indice;
   nuevo:=nuevo||(cambio->'items')||coalesce((select jsonb_agg(value order by ord) from jsonb_array_elements(objetivo) with ordinality as x(value,ord) where ord>indice+cantidad),'[]');
   resultado:=case when cardinality(ruta)=0 then nuevo else jsonb_set(resultado,ruta,nuevo,false) end;
  else raise exception 'Operacion no valida'; end if;
 end loop;
 bytes_resultado:=coalesce(octet_length(resultado::text),0)::bigint;
 if bytes_resultado>24*1024*1024 then
  raise exception 'Documento resultante demasiado grande' using errcode='54000';
 end if;
 return resultado;
end $fn$;
comment on function public.app_aplicar_delta(jsonb,jsonb)
  is 'moderno.app_aplicar_delta/array-sync-v2';
revoke all on function public.app_aplicar_delta(jsonb,jsonb) from public,anon;
grant execute on function public.app_aplicar_delta(jsonb,jsonb) to authenticated;

create or replace function public.app_leer_versiones(p_estudio uuid,p_bloques text[] default null)
returns table(bloque text,updated_at timestamptz,rol text)
language plpgsql stable security definer set search_path='' as $fn$
declare acceso text;
begin
 acceso:=public.app_rol(p_estudio);
 if auth.uid() is null or not coalesce(acceso in ('admin','colaborador'),false) then raise exception 'No autorizado' using errcode='42501'; end if;
 return query select d.bloque,d.updated_at,acceso from public.datos_estudio d where d.estudio_id=p_estudio and (p_bloques is null or d.bloque=any(p_bloques));
end $fn$;
revoke all on function public.app_leer_versiones(uuid,text[]) from public,anon;
grant execute on function public.app_leer_versiones(uuid,text[]) to authenticated;

-- SECURITY INVOKER deliberately calls the existing filtered reader and writer.
-- Never reads a raw table, never bypasses collaborator field restrictions.
create or replace function public.app_guardar_lote_delta(p_estudio uuid,p_cambios jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare cambio jsonb; actual record; lote jsonb:='[]'; visto text[]:='{}';candidato jsonb;
  bytes_actual bigint;bytes_delta bigint;operaciones integer;operaciones_total integer:=0;
  sincronizaciones_bloque integer;sincronizaciones_total integer:=0;
  identidades_bloque bigint;identidades_total bigint:=0;trabajo_total bigint:=0;
begin
 if auth.uid() is null or not coalesce(public.app_rol(p_estudio) in ('admin','colaborador'),false) then raise exception 'No autorizado' using errcode='42501'; end if;
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios) not between 1 and 9 then raise exception 'Lote no valido'; end if;
 if octet_length(p_cambios::text)>24*1024*1024 then raise exception 'Lote demasiado grande' using errcode='54000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 for cambio in select value from jsonb_array_elements(p_cambios) order by value->>'bloque' loop
  if jsonb_typeof(cambio) is distinct from 'object' or coalesce(cambio->>'bloque','') not in ('proyectos','compras','presupuestos','facturas','contactos','contratistas','fases','agenda','config')
   or cambio->>'bloque'=any(visto) or (cambio ? 'contenido')=(cambio ? 'cambios') then raise exception 'Cambio no valido'; end if;
  visto:=array_append(visto,cambio->>'bloque');
  if cambio ? 'cambios' then
   select * into actual from public.app_leer_bloques(p_estudio,array[cambio->>'bloque']);
   if not found or actual.updated_at is distinct from (cambio->>'base')::timestamptz then raise exception 'La version ha cambiado; conservar cambios' using errcode='PT409'; end if;
   if jsonb_typeof(cambio->'cambios') is distinct from 'array' then raise exception 'Cambio no valido'; end if;
   bytes_actual:=coalesce(octet_length(actual.contenido::text),0)::bigint;
   bytes_delta:=coalesce(octet_length((cambio->'cambios')::text),0)::bigint;
   operaciones:=jsonb_array_length(cambio->'cambios');
   select count(*) filter(where op.value->>'op'='array_sync')::integer,
          coalesce(sum(case when op.value->>'op'='array_sync' then
            case when jsonb_typeof(op.value->'order')='array' and jsonb_typeof(op.value->'items')='array'
              then jsonb_array_length(op.value->'order')+jsonb_array_length(op.value->'items') else 8001 end
          else 0 end),0)::bigint
     into sincronizaciones_bloque,identidades_bloque
     from jsonb_array_elements(cambio->'cambios') op(value);
   operaciones_total:=operaciones_total+operaciones;
   sincronizaciones_total:=sincronizaciones_total+sincronizaciones_bloque;
   identidades_total:=identidades_total+identidades_bloque;
   trabajo_total:=trabajo_total+(bytes_actual+bytes_delta)*operaciones;
   if operaciones_total>64 or sincronizaciones_total>8 or identidades_total>8000
      or trabajo_total>256::bigint*1024*1024 then
    raise exception 'Lote excede el presupuesto de trabajo' using errcode='54000';
   end if;
   candidato:=public.app_aplicar_delta(actual.contenido,cambio->'cambios');
   if octet_length(candidato::text)>16*1024*1024 then raise exception 'Documento resultante demasiado grande' using errcode='54000'; end if;
   lote:=lote||jsonb_build_array(jsonb_build_object('bloque',cambio->>'bloque','base',cambio->'base','contenido',candidato));
  else
   if octet_length((cambio->'contenido')::text)>16*1024*1024 then raise exception 'Documento demasiado grande' using errcode='54000'; end if;
   lote:=lote||jsonb_build_array(cambio);
  end if;
 end loop;
 return public.app_guardar_lote(p_estudio,lote);
end $fn$;
comment on function public.app_guardar_lote_delta(uuid,jsonb)
  is 'moderno.app_guardar_lote_delta/envelope-budget-v2';
revoke all on function public.app_guardar_lote_delta(uuid,jsonb) from public,anon;
grant execute on function public.app_guardar_lote_delta(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
