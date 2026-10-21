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
declare resultado jsonb:=p_documento; cambio jsonb; ruta text[]; padre jsonb; hoja text; objetivo jsonb; nuevo jsonb; indice integer; cantidad integer;
begin
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios)>64 then raise exception 'Cambios no validos'; end if;
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
 return resultado;
end $fn$;
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
declare cambio jsonb; actual record; lote jsonb:='[]'; visto text[]:='{}';
begin
 if auth.uid() is null or not coalesce(public.app_rol(p_estudio) in ('admin','colaborador'),false) then raise exception 'No autorizado' using errcode='42501'; end if;
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios) not between 1 and 9 then raise exception 'Lote no valido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 for cambio in select value from jsonb_array_elements(p_cambios) order by value->>'bloque' loop
  if jsonb_typeof(cambio) is distinct from 'object' or coalesce(cambio->>'bloque','') not in ('proyectos','compras','presupuestos','facturas','contactos','contratistas','fases','agenda','config')
   or cambio->>'bloque'=any(visto) or (cambio ? 'contenido')=(cambio ? 'cambios') then raise exception 'Cambio no valido'; end if;
  visto:=array_append(visto,cambio->>'bloque');
  if cambio ? 'cambios' then
   select * into actual from public.app_leer_bloques(p_estudio,array[cambio->>'bloque']);
   if not found or actual.updated_at is distinct from (cambio->>'base')::timestamptz then raise exception 'La version ha cambiado; conservar cambios' using errcode='PT409'; end if;
   lote:=lote||jsonb_build_array(jsonb_build_object('bloque',cambio->>'bloque','base',cambio->'base','contenido',public.app_aplicar_delta(actual.contenido,cambio->'cambios')));
  else lote:=lote||jsonb_build_array(cambio); end if;
 end loop;
 return public.app_guardar_lote(p_estudio,lote);
end $fn$;
revoke all on function public.app_guardar_lote_delta(uuid,jsonb) from public,anon;
grant execute on function public.app_guardar_lote_delta(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
