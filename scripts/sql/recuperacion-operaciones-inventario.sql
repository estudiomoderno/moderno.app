-- Solo lectura: ejecutar en el proyecto de recuperacion antes de instalar SQL.
-- La ausencia de tablas debe quedar visible; no reparar antes de registrar evidencia.
begin transaction read only;
select current_database() as base,
 to_regclass('public.app_operaciones') is not null as operaciones,
 to_regclass('public.app_operacion_eventos') is not null as eventos;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('app_operaciones','app_operacion_eventos');
select p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('app_operaciones_lee','app_operaciones_accion','app_operaciones_historial','portal_aprobaciones','portal_aprobacion_decidir','app_ops_invalidar');
select t.tgname,t.tgenabled from pg_trigger t join pg_proc p on p.oid=t.tgfoid where p.proname='app_ops_invalidar' and not t.tgisinternal;
rollback;
