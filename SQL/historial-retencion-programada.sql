-- Saca la retencion del camino de guardado. Conserva una revision por bloque
-- cada cinco minutos y limpia, por lotes pequenos, solo revisiones vencidas.
-- No habilita pg_cron ni programa trabajos; la activacion operativa es aparte.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;

do $guard$
declare
  trigger_count integer;
  trigger_source text;
  trigger_marker text;
  trigger_config text[];
begin
  if to_regclass('public.datos_estudio') is null
     or to_regclass('public.datos_estudio_hist') is null
     or to_regprocedure('public.datos_estudio_archiva()') is null then
    raise exception 'Falta el historial de datos que debe protegerse';
  end if;
  if to_regprocedure('public.app_limpiar_historial_guardado(integer)') is not null then
    raise exception 'Existe una funcion publica de limpieza sin huella verificada; migracion cancelada';
  end if;
  select count(*) into trigger_count
    from pg_trigger t
   where t.tgfoid='public.datos_estudio_archiva()'::regprocedure
     and not t.tgisinternal;
  if trigger_count<>1 or not exists (
    select 1
      from pg_trigger t
     where t.tgrelid='public.datos_estudio'::regclass
       and t.tgname='trg_datos_estudio_archiva'
       and not t.tgisinternal
       and t.tgfoid='public.datos_estudio_archiva()'::regprocedure
       and t.tgtype=19 -- BEFORE UPDATE FOR EACH ROW
  ) then
    raise exception 'El trigger de historial no coincide';
  end if;

  select lower(p.prosrc),obj_description(p.oid,'pg_proc'),p.proconfig
    into trigger_source,trigger_marker,trigger_config
    from pg_proc p
   where p.oid='public.datos_estudio_archiva()'::regprocedure
     and p.prosecdef;
  if trigger_source is null then
    raise exception 'La funcion anterior de historial no es SECURITY DEFINER';
  elsif trigger_marker='moderno.datos_estudio_archiva/history-outside-save-v1' then
    if not coalesce('search_path=""'=any(trigger_config),false)
       or position('5 minutes' in trigger_source)=0
       or position('delete from public.datos_estudio_hist' in trigger_source)>0 then
      raise exception 'La version marcada del trigger de historial no coincide';
    end if;
  elsif trigger_marker is null then
    -- Compatibilidad de una sola vez con historial-guardado-acotado.sql.
    -- No se reemplaza una SECURITY DEFINER desconocida solo por compartir nombre.
    if not coalesce('search_path=public'=any(trigger_config),false)
       or position('5 minutes' in trigger_source)=0
       or position('for update skip locked' in trigger_source)=0
       or position('limit 1' in trigger_source)=0
       or position('delete from public.datos_estudio_hist' in trigger_source)=0 then
      raise exception 'La funcion anterior de historial no tiene la huella esperada';
    end if;
  else
    raise exception 'La version marcada del trigger de historial no admite esta migracion';
  end if;

  -- El trigger consulta esta clave en cada UPDATE. No se sustituye la funcion
  -- si el indice falta o deriva: con un historial grande, instalar primero y
  -- comprobar despues convertiria temporalmente cada guardado en un escaneo.
  if not exists (
    select 1
      from pg_catalog.pg_index i
      join pg_catalog.pg_class ic on ic.oid=i.indexrelid
      join pg_catalog.pg_am am on am.oid=ic.relam
     where i.indrelid='public.datos_estudio_hist'::regclass
       and i.indisvalid and i.indisready
       and i.indnkeyatts>=3
       and i.indpred is null
       and am.amname='btree'
       and pg_catalog.pg_get_indexdef(i.indexrelid,1,true)='estudio_id'
       and pg_catalog.pg_get_indexdef(i.indexrelid,2,true)='bloque'
       and pg_catalog.pg_get_indexdef(i.indexrelid,3,true)
             ~ '^guardado_en( DESC)?( NULLS (FIRST|LAST))?$'
  ) then
    raise exception
      'Falta el indice valido por estudio, bloque y fecha; no se cambia el trigger';
  end if;
end
$guard$;

create or replace function public.datos_estudio_archiva()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Una actualizacion de version sin cambio de documento no crea historial.
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

  -- La transaccion del usuario no hace ninguna limpieza.
  return new;
end;
$function$;
comment on function public.datos_estudio_archiva()
  is 'moderno.datos_estudio_archiva/history-outside-save-v1';

create table if not exists app_private.history_retention_status(
  singleton smallint primary key check(singleton=1),
  last_run_at timestamptz,
  last_duration_ms bigint,
  last_batch integer,
  last_deleted integer,
  last_deleted_bytes bigint not null default 0,
  last_byte_limited boolean not null default false,
  pending boolean not null default false,
  oldest_pending_at timestamptz,
  consecutive_saturated_runs integer not null default 0,
  total_deleted bigint not null default 0,
  skipped_runs bigint not null default 0,
  activation_preflight_at timestamptz,
  observation_seconds bigint,
  observed_rows bigint,
  observed_bytes bigint,
  projected_rows_per_day bigint,
  projected_bytes_per_day bigint,
  nominal_rows_per_day bigint,
  nominal_bytes_per_day bigint,
  updated_at timestamptz not null default clock_timestamp()
);
comment on table app_private.history_retention_status
  is 'moderno.app_private.history_retention_status/v1';
alter table app_private.history_retention_status enable row level security;
revoke all on app_private.history_retention_status from public,anon,authenticated;
insert into app_private.history_retention_status(singleton)
values(1) on conflict(singleton) do nothing;

do $verify_status$
declare rel regclass:='app_private.history_retention_status'::regclass;
begin
  if (select count(*) from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped)<>21
     or (select count(*) from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped
       and ((a.attname='singleton' and a.atttypid='pg_catalog.int2'::regtype and a.attnotnull)
         or (a.attname in ('last_run_at','oldest_pending_at','activation_preflight_at','updated_at') and a.atttypid='pg_catalog.timestamptz'::regtype)
         or (a.attname in ('last_duration_ms','last_deleted_bytes','total_deleted','skipped_runs','observation_seconds','observed_rows','observed_bytes','projected_rows_per_day','projected_bytes_per_day','nominal_rows_per_day','nominal_bytes_per_day') and a.atttypid='pg_catalog.int8'::regtype)
         or (a.attname in ('last_batch','last_deleted','consecutive_saturated_runs') and a.atttypid='pg_catalog.int4'::regtype)
         or (a.attname in ('last_byte_limited','pending') and a.atttypid='pg_catalog.bool'::regtype)))<>21
     or exists(
       select 1 from pg_attribute a
        where a.attrelid=rel and a.attnum>0 and not a.attisdropped
          and a.attname in (
            'singleton','last_deleted_bytes','last_byte_limited','pending',
            'consecutive_saturated_runs','total_deleted','skipped_runs','updated_at'
          )
          and not a.attnotnull
     )
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='p')
     or not exists(select 1 from pg_constraint c where c.conrelid=rel and c.contype='c'
       and pg_get_constraintdef(c.oid)~'singleton = 1')
     or not (select relrowsecurity from pg_class where oid=rel) then
    raise exception 'app_private.history_retention_status tiene una estructura incompatible';
  end if;
end
$verify_status$;

create or replace function app_private.limpiar_historial_guardado(p_lote integer default 50)
returns integer
language plpgsql
security definer
set search_path to ''
set lock_timeout to '1s'
as $function$
declare
  presupuesto_bytes constant bigint:=16*1024*1024;
  eliminadas integer:=0;
  bytes_eliminados bigint:=0;
  limitado_bytes boolean:=false;
  inicio timestamptz:=clock_timestamp();
  pendiente_desde timestamptz;
begin
  if p_lote is null or p_lote not between 1 and 50 then
    raise exception 'Lote de retencion no valido' using errcode='22023';
  end if;

  -- Evita ejecuciones solapadas aunque el planificador cambie. El intento que
  -- encuentra otra limpieza activa no espera ni toca el historial.
  if not pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended('moderno-history-retention',20261123)
  ) then
    update app_private.history_retention_status
       set skipped_runs=skipped_runs+1,updated_at=clock_timestamp()
     where singleton=1;
    return 0;
  end if;

  -- El limite es doble: como maximo 50 filas y aproximadamente 16 MiB de
  -- JSON almacenado. La primera fila siempre avanza, incluso si ella sola
  -- supera el presupuesto; asi un documento grande no bloquea la cola.
  with candidatas as materialized (
    -- Materializa solo identidad, orden y tamano; nunca copia hasta 50 JSON
    -- completos antes de decidir que filas caben en el presupuesto.
    select h.id,h.guardado_en,
           pg_catalog.pg_column_size(h.contenido)::bigint as tamano_bytes
      from public.datos_estudio_hist h
     where h.guardado_en < statement_timestamp() - interval '30 days'
       -- Incluso un estudio inactivo conserva su revision mas reciente.
       and exists (
         select 1
           from public.datos_estudio_hist reciente
          where reciente.estudio_id=h.estudio_id
            and reciente.bloque=h.bloque
            and (reciente.guardado_en,reciente.id)>(h.guardado_en,h.id)
       )
     order by h.guardado_en,h.id
     for update skip locked
     limit p_lote
  ), medidas as (
    select c.id,c.guardado_en,c.tamano_bytes,
           pg_catalog.row_number() over(order by c.guardado_en,c.id) as posicion,
           pg_catalog.sum(c.tamano_bytes)
             over(order by c.guardado_en,c.id rows unbounded preceding) as acumulado_bytes
      from candidatas c
  ), vencidas as (
    select m.id
      from medidas m
     where m.posicion=1 or m.acumulado_bytes<=presupuesto_bytes
  ), borradas as (
    delete from public.datos_estudio_hist h
     using vencidas v
     where h.id=v.id
     returning pg_catalog.pg_column_size(h.contenido)::bigint as tamano_bytes
  )
  select count(*)::integer,coalesce(sum(b.tamano_bytes),0)::bigint,
         exists(
           select 1 from medidas m
            where m.posicion>1 and m.acumulado_bytes>presupuesto_bytes
         )
    into eliminadas,bytes_eliminados,limitado_bytes
    from borradas b;

  -- Una busqueda indexable y acotada basta para saber si existe atraso y su
  -- antiguedad; no cuenta toda la tabla grande en cada minuto.
  select h.guardado_en into pendiente_desde
    from public.datos_estudio_hist h
   where h.guardado_en < statement_timestamp() - interval '30 days'
     and exists (
       select 1
         from public.datos_estudio_hist reciente
        where reciente.estudio_id=h.estudio_id
          and reciente.bloque=h.bloque
          and (reciente.guardado_en,reciente.id)>(h.guardado_en,h.id)
     )
   order by h.guardado_en,h.id
   limit 1;

  insert into app_private.history_retention_status(
    singleton,last_run_at,last_duration_ms,last_batch,last_deleted,
    last_deleted_bytes,last_byte_limited,pending,oldest_pending_at,
    consecutive_saturated_runs,total_deleted,updated_at
  ) values(
    1,clock_timestamp(),
    greatest(0,(extract(epoch from clock_timestamp()-inicio)*1000)::bigint),
    p_lote,eliminadas,bytes_eliminados,limitado_bytes,
    pendiente_desde is not null,pendiente_desde,
    case when pendiente_desde is not null and (eliminadas=p_lote or limitado_bytes)
         then 1 else 0 end,
    eliminadas,clock_timestamp()
  ) on conflict(singleton) do update set
    last_run_at=excluded.last_run_at,
    last_duration_ms=excluded.last_duration_ms,
    last_batch=excluded.last_batch,
    last_deleted=excluded.last_deleted,
    last_deleted_bytes=excluded.last_deleted_bytes,
    last_byte_limited=excluded.last_byte_limited,
    pending=excluded.pending,
    oldest_pending_at=excluded.oldest_pending_at,
    consecutive_saturated_runs=case
      when excluded.pending
       and (excluded.last_deleted=excluded.last_batch or excluded.last_byte_limited)
      then app_private.history_retention_status.consecutive_saturated_runs+1
      else 0 end,
    total_deleted=app_private.history_retention_status.total_deleted+excluded.last_deleted,
    updated_at=excluded.updated_at;

  return eliminadas;
end;
$function$;
comment on function app_private.limpiar_historial_guardado(integer)
  is 'moderno.app_private.limpiar_historial_guardado/history-retention-v1';

revoke all on function app_private.limpiar_historial_guardado(integer) from public,anon,authenticated;
revoke all on function public.datos_estudio_archiva() from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.datos_estudio_hist from public,anon,authenticated;

do $verify$
declare trigger_source text;cleanup_source text;
begin
  select lower(p.prosrc) into trigger_source
    from pg_proc p
   where p.oid='public.datos_estudio_archiva()'::regprocedure
     and p.prosecdef
     and 'search_path=""'=any(p.proconfig);
  select lower(p.prosrc) into cleanup_source
    from pg_proc p
   where p.oid='app_private.limpiar_historial_guardado(integer)'::regprocedure
     and p.prosecdef
     and 'search_path=""'=any(p.proconfig)
     and 'lock_timeout=1s'=any(p.proconfig);
  if trigger_source is null
     or position('5 minutes' in trigger_source)=0
     or position('delete from public.datos_estudio_hist' in trigger_source)>0
     or cleanup_source is null
     or position('for update skip locked' in cleanup_source)=0
     or position('limit p_lote' in cleanup_source)=0
     or position('presupuesto_bytes' in cleanup_source)=0
     or position('pg_column_size' in cleanup_source)=0
     or position('pg_try_advisory_xact_lock' in cleanup_source)=0
     or position('history_retention_status' in cleanup_source)=0
     or has_function_privilege('anon','public.datos_estudio_archiva()','execute')
     or has_function_privilege('authenticated','app_private.limpiar_historial_guardado(integer)','execute')
     or has_table_privilege('anon','public.datos_estudio_hist','insert')
     or has_table_privilege('authenticated','public.datos_estudio_hist','delete') then
    raise exception 'No se pudo separar y acotar la retencion del historial';
  end if;
end
$verify$;

commit;
