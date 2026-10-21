-- Candidate: optimize the existing scanners without changing classification or grants.
-- Validate in moderno-pruebas and verify source hashes before an authorized production application.
begin;
do $guard$
begin
 if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='app_ruta_storage' and md5(replace(prosrc,chr(13),''))='34f83806d9ba1d4e74fe9a9e30c77094') then raise exception 'Unexpected source: app_ruta_storage; stop and review';end if;
 if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='app_rutas_documentos_privados' and md5(replace(prosrc,chr(13),''))='282120da116ece47116be2fbee11e353') then raise exception 'Unexpected source: app_rutas_documentos_privados; stop and review';end if;
 if not exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='app_rutas_storage' and md5(replace(prosrc,chr(13),''))='82fd5e725f44d630f46dce8316916521') then raise exception 'Unexpected source: app_rutas_storage; stop and review';end if;
end $guard$;
create or replace function public.app_rutas_storage(v jsonb) returns setof text
language sql immutable set search_path='' as $scan$
 with candidates as materialized (
  select x#>>'{}' as enlace
  from jsonb_path_query(v,'strict $.** ? (@.type() == "string")') x
  where (x#>>'{}') like 'storage://archivos/%' or (x#>>'{}') like 'https://%'
 ), rutas as materialized (
  select public.app_ruta_storage(enlace) as ruta from candidates
 ) select ruta from rutas where ruta is not null;
$scan$;
revoke all on function public.app_rutas_storage(jsonb) from public,anon,authenticated;

create or replace function public.app_rutas_documentos_privados(v jsonb) returns setof text
language sql immutable set search_path='' as $private$
 -- Consumers use these routes as a set (EXISTS or DISTINCT). A nested private
 -- document must never broaden the set beyond a private ancestor's subtree.
 select distinct r.ruta
 from jsonb_path_query(v,'strict $.** ? (@.type() == "object" && (exists(@.docRef) || exists(@.docKind)))') d
 cross join lateral public.app_rutas_storage(d) r(ruta);
$private$;
revoke all on function public.app_rutas_documentos_privados(jsonb) from public,anon,authenticated;

commit;
