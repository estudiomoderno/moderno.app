-- Revierte únicamente las funciones de colaboración; no borra productos añadidos.
begin;
do $guard$
begin
 if to_regprocedure('public.portal_cliente_lee_pre_colaboracion(text)') is null then
  raise exception 'No existe la versión anterior del lector del portal';
 end if;
end $guard$;
drop function if exists public.portal_cliente_producto_anadir(text,text,integer,text,jsonb,uuid);
drop function public.portal_cliente_lee(text);
alter function public.portal_cliente_lee_pre_colaboracion(text) rename to portal_cliente_lee;
revoke all on function public.portal_cliente_lee(text) from public;
grant execute on function public.portal_cliente_lee(text) to anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
