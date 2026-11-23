-- Los estudios grandes pueden necesitar más de los 8 s del rol autenticado.
-- La excepción queda limitada a los dos RPC de escritura versionada: no
-- cambia datos, permisos, RLS ni el timeout global del resto de la API.
begin;

do $guard$
begin
  if to_regprocedure('public.app_guardar_lote(uuid,jsonb)') is null
     or to_regprocedure('public.app_guardar_lote_delta(uuid,jsonb)') is null then
    raise exception 'Faltan los RPC de guardado que deben protegerse';
  end if;
  if has_function_privilege('anon','public.app_guardar_lote(uuid,jsonb)','execute')
     or has_function_privilege('anon','public.app_guardar_lote_delta(uuid,jsonb)','execute')
     or not has_function_privilege('authenticated','public.app_guardar_lote(uuid,jsonb)','execute')
     or not has_function_privilege('authenticated','public.app_guardar_lote_delta(uuid,jsonb)','execute') then
    raise exception 'El contrato de permisos de guardado no coincide';
  end if;
end
$guard$;

alter function public.app_guardar_lote(uuid,jsonb)
  set statement_timeout='60s';
alter function public.app_guardar_lote_delta(uuid,jsonb)
  set statement_timeout='60s';

do $verify$
begin
  if not coalesce((select 'statement_timeout=60s'=any(proconfig)
                   from pg_proc where oid='public.app_guardar_lote(uuid,jsonb)'::regprocedure),false)
     or not coalesce((select 'statement_timeout=60s'=any(proconfig)
                      from pg_proc where oid='public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure),false) then
    raise exception 'No se pudo limitar la ampliación a los RPC de guardado';
  end if;
end
$verify$;

commit;
