-- Retira el trabajo y su estado, pero mantiene toda limpieza fuera del camino
-- de guardado. La retencion queda PAUSADA: antes de agotar el margen de
-- almacenamiento hace falta decidir y activar otro mecanismo operativo.
-- No restaura revisiones vencidas ni vuelve a conceder DML.
begin;
set local statement_timeout to '30s';
set local lock_timeout to '1s';

do $guard$
declare trigger_count integer;
begin
  if to_regprocedure('public.datos_estudio_archiva()') is null
     or obj_description('public.datos_estudio_archiva()'::regprocedure,'pg_proc')
          is distinct from 'moderno.datos_estudio_archiva/history-outside-save-v1' then
    raise exception 'La version del trigger de historial no coincide; rollback cancelado';
  end if;
  if to_regprocedure('app_private.limpiar_historial_guardado(integer)') is null
     or obj_description('app_private.limpiar_historial_guardado(integer)'::regprocedure,'pg_proc')
          is distinct from 'moderno.app_private.limpiar_historial_guardado/history-retention-v1' then
    raise exception 'La funcion de retencion no coincide; rollback cancelado';
  end if;
  if to_regclass('app_private.history_retention_status') is null
     or obj_description('app_private.history_retention_status'::regclass,'pg_class')
          is distinct from 'moderno.app_private.history_retention_status/v1' then
    raise exception 'El estado de retencion no coincide; rollback cancelado';
  end if;
  select count(*) into trigger_count from pg_trigger t
   where t.tgfoid='public.datos_estudio_archiva()'::regprocedure
     and not t.tgisinternal;
  if trigger_count<>1 or not exists(
    select 1 from pg_trigger t
     where t.tgrelid='public.datos_estudio'::regclass
       and t.tgname='trg_datos_estudio_archiva'
       and t.tgfoid='public.datos_estudio_archiva()'::regprocedure
       and not t.tgisinternal and t.tgtype=19
  ) then
    raise exception 'El trigger de historial ha cambiado; rollback cancelado';
  end if;
  lock table app_private.history_retention_status in access exclusive mode;
end
$guard$;

do $unschedule$
declare trabajo_existe boolean:=false;trabajo_ajeno boolean:=false;invocacion_restante boolean:=false;
begin
  if exists (select 1 from pg_catalog.pg_extension where extname='pg_cron')
     and to_regclass('cron.job') is not null and exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='cron' and p.proname='unschedule' and p.pronargs=1
  ) then
    execute 'select exists(select 1 from cron.job where jobname=''moderno-history-retention'' and username<>current_user),exists(select 1 from cron.job where jobname=''moderno-history-retention'' and username=current_user)'
      into trabajo_ajeno,trabajo_existe;
    if trabajo_ajeno then
      raise exception 'El trabajo moderno-history-retention pertenece a otro usuario; no se modifica ni se elimina la funcion';
    end if;
    if trabajo_existe then
      -- Literal sin tipo: deja que pg_cron resuelva su firma oficial por nombre.
      execute 'select cron.unschedule(''moderno-history-retention'')';
    end if;
    execute 'select exists(select 1 from cron.job where position(''limpiar_historial_guardado'' in command)>0)'
      into invocacion_restante;
    if invocacion_restante then
      raise exception 'Existe otro trabajo que usa limpiar_historial_guardado; no se elimina la funcion';
    end if;
  end if;
end
$unschedule$;

create or replace function public.datos_estudio_archiva()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if old.contenido is not distinct from new.contenido then return new; end if;
  if not exists (
    select 1
      from public.datos_estudio_hist h
     where h.estudio_id=old.estudio_id
       and h.bloque=old.bloque
       and h.guardado_en >= statement_timestamp() - interval '5 minutes'
  ) then
    insert into public.datos_estudio_hist
      (estudio_id, bloque, contenido, version_de, actor)
    values
      (old.estudio_id, old.bloque, old.contenido, old.updated_at,
       coalesce(auth.jwt() ->> 'email', 'sistema'));
  end if;
  -- Rollback conservador: nunca vuelve a cargar una limpieza sobre el guardado.
  return new;
end;
$function$;
comment on function public.datos_estudio_archiva()
  is 'moderno.datos_estudio_archiva/history-outside-save-rollback-v1';

drop function app_private.limpiar_historial_guardado(integer);
drop table app_private.history_retention_status;
commit;
