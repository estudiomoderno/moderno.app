-- Desactiva solo el trabajo de retencion. Conserva el indice: eliminarlo no
-- recupera datos y obligaria a reconstruirlo para una futura activacion.
do $unschedule$
declare trabajo_existe boolean:=false;trabajo_ajeno boolean:=false;
begin
  if exists (select 1 from pg_catalog.pg_extension where extname='pg_cron')
     and to_regclass('cron.job') is not null and exists (
    select 1
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace
     where n.nspname='cron' and p.proname='unschedule' and p.pronargs=1
  ) then
    execute 'select exists(select 1 from cron.job where jobname=''moderno-history-retention'' and username<>current_user),exists(select 1 from cron.job where jobname=''moderno-history-retention'' and username=current_user)'
      into trabajo_ajeno,trabajo_existe;
    if trabajo_ajeno then
      raise exception 'El trabajo moderno-history-retention pertenece a otro usuario; no se modifica';
    end if;
    if trabajo_existe then
      execute 'select cron.unschedule(''moderno-history-retention'')';
    end if;
    if trabajo_existe then
      execute 'select exists(select 1 from cron.job where jobname=''moderno-history-retention'' and username=current_user)'
        into trabajo_existe;
      if trabajo_existe then raise exception 'No se pudo desprogramar moderno-history-retention';end if;
    end if;
  end if;
end
$unschedule$;
