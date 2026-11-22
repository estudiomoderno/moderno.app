-- Retención automática del circuito de mejora y de los contadores de prueba.
-- La función de feedback debe estar instalada antes de programar el trabajo.
begin;
create extension if not exists pg_cron with schema pg_catalog;
do $schedule$
declare existing_job bigint;
begin
  if to_regprocedure('moderno_secretary.purge_expired()') is null then
    raise exception 'Falta moderno_secretary.purge_expired()';
  end if;
  select jobid into existing_job from cron.job where jobname='secretario-retention-daily';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'secretario-retention-daily',
    '17 3 * * *',
    'select moderno_secretary.purge_expired();'
  );
end $schedule$;
commit;
