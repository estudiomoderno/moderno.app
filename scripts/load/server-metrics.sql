\set ON_ERROR_STOP on
\pset pager off
\pset format csv
\echo snapshot_database
select clock_timestamp() as captured_at,
       current_database() as database_name,
       numbackends,xact_commit,xact_rollback,blks_read,blks_hit,
       tup_returned,tup_fetched,tup_inserted,tup_updated,tup_deleted,
       deadlocks,temp_files,temp_bytes,blk_read_time,blk_write_time
  from pg_catalog.pg_stat_database
 where datname=current_database();

\echo snapshot_capacity
select current_setting('max_connections')::int as max_connections,
       (select count(*) from pg_catalog.pg_stat_activity where datname=current_database()) as used_connections,
       pg_catalog.pg_database_size(current_database()) as database_bytes,
       pg_catalog.pg_total_relation_size('public.datos_estudio'::regclass) as data_bytes,
       pg_catalog.pg_total_relation_size('public.datos_estudio_hist'::regclass) as history_bytes;

\echo snapshot_activity
select state,coalesce(wait_event_type,'none') as wait_type,count(*) as connections,
       coalesce(max(extract(epoch from clock_timestamp()-query_start)),0)::numeric(12,3) as oldest_query_seconds
  from pg_catalog.pg_stat_activity
 where datname=current_database()
 group by state,coalesce(wait_event_type,'none')
 order by state,wait_type;

\echo snapshot_locks
select mode,granted,count(*) as locks
  from pg_catalog.pg_locks
 where database=(select oid from pg_catalog.pg_database where datname=current_database())
 group by mode,granted
 order by mode,granted;

\echo snapshot_tables
select relname,n_live_tup,n_dead_tup,n_tup_ins,n_tup_upd,n_tup_del,
       vacuum_count,autovacuum_count,analyze_count,autoanalyze_count,
       last_autovacuum,last_autoanalyze
  from pg_catalog.pg_stat_user_tables
 where schemaname='public' and relname in ('datos_estudio','datos_estudio_hist')
 order by relname;

\echo snapshot_save_statements_v2_and_legacy
select queryid,calls,rows,
       round(total_exec_time::numeric,3) as total_exec_ms,
       round(mean_exec_time::numeric,3) as mean_exec_ms,
       round(max_exec_time::numeric,3) as max_exec_ms,
       shared_blks_read,shared_blks_hit,temp_blks_read,temp_blks_written,wal_bytes
  from extensions.pg_stat_statements
 where dbid=(select oid from pg_catalog.pg_database where datname=current_database())
   and (query like '%app_guardar_lote_v2%' or query like '%app_guardar_lote_delta%')
 order by total_exec_time desc;

\echo snapshot_v2_receipts
with bounded as (
  select estudio_id,actor_id,count(*) as per_actor
    from app_private.save_requests
   group by estudio_id,actor_id
)
select (select count(*) from app_private.save_requests) as receipts,
       (select count(distinct estudio_id) from app_private.save_requests) as studies,
       (select count(distinct actor_id) from app_private.save_requests) as actors,
       coalesce(max(per_actor),0) as max_receipts_per_actor_and_study,
       pg_catalog.pg_total_relation_size('app_private.save_requests'::regclass) as receipt_bytes
  from bounded;

select coalesce(max(per_actor)<=32,true) as receipts_bounded
  from (
    select count(*) as per_actor
      from app_private.save_requests
     group by estudio_id,actor_id
  ) bounded
\gset
\if :receipts_bounded
\else
  \echo 'ERROR: app_private.save_requests supera 32 recibos por actor y estudio'
  \quit 3
\endif

\echo snapshot_load_fixture
select count(distinct e.id) filter(where e.nombre like 'LOAD:load-%') as load_studies,
       count(*) filter(where d.bloque='proyectos' and d.contenido->0->>'_loadRun' like 'load-%') as load_blocks
  from public.estudios e
  left join public.datos_estudio d on d.estudio_id=e.id;
