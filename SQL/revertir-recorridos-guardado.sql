-- Code-only rollback for the two scanners. No data, parser, projection or policies change.
begin;
CREATE OR REPLACE FUNCTION public.app_rutas_documentos_privados(v jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare hijo jsonb;
begin
 if jsonb_typeof(v)='object' then
  if v ? 'docRef' or v ? 'docKind' then return query select * from public.app_rutas_storage(v);return;end if;
  for hijo in select value from jsonb_each(v) loop return query select * from public.app_rutas_documentos_privados(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from public.app_rutas_documentos_privados(hijo);end loop;
 end if;
end $function$
;
revoke all on function public.app_rutas_documentos_privados(jsonb) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.app_rutas_storage(v jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare hijo jsonb; ruta text;
begin
 if jsonb_typeof(v)='string' then
  ruta:=public.app_ruta_storage(v#>>'{}');if ruta is not null then return next ruta;end if;
 elsif jsonb_typeof(v)='object' then
  for hijo in select value from jsonb_each(v) loop return query select * from public.app_rutas_storage(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from public.app_rutas_storage(hijo);end loop;
 end if;
end $function$
;
revoke all on function public.app_rutas_storage(jsonb) from public,anon,authenticated;
commit;
