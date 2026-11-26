-- Rollback dirigido de guardado-delta-array-sync.sql.
-- Retira array_sync y conserva los presupuestos de seguridad; no elimina RPC
-- ni modifica datos o RLS.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$
declare v2_activo boolean:=false;v2_rpc_existe boolean:=false;
begin
 if to_regprocedure('public.app_aplicar_delta(jsonb,jsonb)') is null
   or to_regprocedure('public.app_guardar_lote_delta(uuid,jsonb)') is null then
  raise exception 'No se encuentra la instalación de guardado delta';
 end if;
 if (select prosecdef from pg_proc where oid='public.app_aplicar_delta(jsonb,jsonb)'::regprocedure)
   or (select prorettype<>'jsonb'::regtype or provolatile<>'i' from pg_proc where oid='public.app_aplicar_delta(jsonb,jsonb)'::regprocedure) then
  raise exception 'La firma actual de app_aplicar_delta no es la esperada';
 end if;
 if obj_description('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure,'pg_proc')
      is distinct from 'moderno.app_aplicar_delta/array-sync-v2' then
  raise exception 'La version array-sync-v2 no esta instalada; rollback cancelado';
 end if;
 if obj_description('public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure,'pg_proc')
      is distinct from 'moderno.app_guardar_lote_delta/envelope-budget-v2' then
  raise exception 'El writer delta no tiene presupuestos verificados; rollback cancelado';
 end if;
 v2_rpc_existe:=to_regprocedure('public.app_guardar_lote_v2(uuid,jsonb)') is not null;
 if to_regclass('app_private.save_protocol_settings') is null then
  if v2_rpc_existe then
   raise exception 'No se puede demostrar que guardado v2 este drenado; rollback cancelado';
  end if;
 else
  -- Impide que la migracion v2 vuelva a activar el protocolo mientras se
  -- sustituye el helper dentro de esta misma transaccion.
  execute 'lock table app_private.save_protocol_settings in share row exclusive mode';
  execute 'select coalesce((select accept_new from app_private.save_protocol_settings where protocol=2),false)'
    into v2_activo;
  if v2_activo then
   raise exception 'Desactivar primero las solicitudes nuevas de guardado v2; rollback cancelado';
  end if;
 end if;
 if v2_rpc_existe then
  if to_regclass('app_private.save_requests') is null then
   raise exception 'No se puede drenar guardado v2 sin su libro de recibos; rollback cancelado';
  end if;
  -- Toda solicitud v2 lee save_requests antes de usar app_aplicar_delta. Este
  -- lock espera a las solicitudes ya en vuelo y pone en cola las nuevas, que
  -- despues veran accept_new=false. Si no drena en cinco segundos, aborta.
  execute 'lock table app_private.save_requests in access exclusive mode';
 end if;
end $guard$;

create or replace function public.app_aplicar_delta(p_documento jsonb,p_cambios jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare resultado jsonb:=p_documento; cambio jsonb; ruta text[]; padre jsonb; hoja text; objetivo jsonb; nuevo jsonb; indice integer; cantidad integer;
  bytes_documento bigint:=coalesce(octet_length(p_documento::text),0)::bigint;
  bytes_cambios bigint:=coalesce(octet_length(p_cambios::text),0)::bigint;
  bytes_resultado bigint;
  operaciones integer;
begin
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios)>64 then raise exception 'Cambios no validos'; end if;
 operaciones:=jsonb_array_length(p_cambios);
 if bytes_documento>24*1024*1024 or bytes_cambios>12*1024*1024
   or (bytes_documento+bytes_cambios)*operaciones>256::bigint*1024*1024 then
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
  is 'moderno.app_aplicar_delta/legacy-budget-v2';

revoke all on function public.app_aplicar_delta(jsonb,jsonb) from public,anon;
grant execute on function public.app_aplicar_delta(jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
