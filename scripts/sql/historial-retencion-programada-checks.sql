\set ON_ERROR_STOP on
-- Requires an empty isolated database. Everything is rolled back.
begin;
do $$begin if exists(select 1 from pg_tables where schemaname='public') or exists(select 1 from pg_namespace where nspname in ('auth','cron')) then raise exception 'Requires an empty isolated database';end if;end$$;
-- Roles are cluster-wide and may already exist in the disposable CI container.
do $$begin
  if not exists(select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
end$$;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$select '{"email":"fixture@example.invalid"}'::jsonb$$;
create table public.estudios(id uuid primary key);
create table public.datos_estudio(estudio_id uuid not null references public.estudios(id),bloque text not null,contenido jsonb not null,updated_at timestamptz not null,primary key(estudio_id,bloque));
create table public.datos_estudio_hist(id bigint generated always as identity primary key,estudio_id uuid not null,bloque text not null,contenido jsonb not null,version_de timestamptz not null,actor text not null,guardado_en timestamptz not null default statement_timestamp());
create index datos_estudio_hist_estudio_bloque_guardado_idx
  on public.datos_estudio_hist(estudio_id,bloque,guardado_en desc);
grant select,insert,update,delete,truncate,references,trigger on public.datos_estudio_hist to anon,authenticated;
create function public.datos_estudio_archiva() returns trigger language plpgsql security definer set search_path='public' as $$begin
  if not exists(select 1 from public.datos_estudio_hist h where h.estudio_id=old.estudio_id and h.bloque=old.bloque and h.guardado_en>=statement_timestamp()-interval '5 minutes') then
    insert into public.datos_estudio_hist(estudio_id,bloque,contenido,version_de,actor)values(old.estudio_id,old.bloque,old.contenido,old.updated_at,'fixture');
  end if;
  with vencida as (select h.id from public.datos_estudio_hist h where h.estudio_id=old.estudio_id and h.guardado_en<statement_timestamp()-interval '30 days' order by h.guardado_en,h.id for update skip locked limit 1)
  delete from public.datos_estudio_hist h using vencida where h.id=vencida.id;
  return new;
end$$;
create trigger trg_datos_estudio_archiva before update on public.datos_estudio for each row execute function public.datos_estudio_archiva();

-- CANDIDATE_HERE

create temp table assertions(ok boolean not null,label text not null);
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$begin insert into assertions values(ok,label);if not ok then raise exception 'FAILED: %',label;end if;end$$;

select pg_temp.assert_true(to_regnamespace('cron') is null and not exists(select 1 from pg_extension where extname='pg_cron'),'migration does not install or schedule pg_cron');
select pg_temp.assert_true(
  not has_table_privilege('anon','public.datos_estudio_hist','INSERT')
  and not has_table_privilege('authenticated','public.datos_estudio_hist','DELETE')
  and not has_table_privilege('anon','public.datos_estudio_hist','REFERENCES')
  and not has_table_privilege('authenticated','public.datos_estudio_hist','TRIGGER'),
  'history mutation and schema privileges revoked'
);
select pg_temp.assert_true(has_table_privilege('authenticated','public.datos_estudio_hist','SELECT'),'history read privilege preserved');
select pg_temp.assert_true(not has_function_privilege('authenticated','app_private.limpiar_historial_guardado(integer)','EXECUTE'),'cleanup is private');
select pg_temp.assert_true(not has_function_privilege('anon','public.datos_estudio_archiva()','EXECUTE'),'trigger function is private');
select pg_temp.assert_true((select 'search_path=""'=any(proconfig) from pg_proc where oid='public.datos_estudio_archiva()'::regprocedure),'trigger has empty search_path');
select pg_temp.assert_true((select 'search_path=""'=any(proconfig) and 'lock_timeout=1s'=any(proconfig) from pg_proc where oid='app_private.limpiar_historial_guardado(integer)'::regprocedure),'cleanup has an empty search path and bounded lock waits');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid='app_private.history_retention_status'::regclass),'retention status has RLS defense in depth');
select pg_temp.assert_true(not has_table_privilege('authenticated','app_private.history_retention_status','SELECT'),'retention status is operator-only');
select pg_temp.assert_true((select count(*)=2 from pg_indexes where schemaname='public' and tablename='datos_estudio_hist'),'fixture has only its primary key and required trigger index');

insert into public.estudios values('11111111-1111-4111-8111-111111111111');
insert into public.datos_estudio values('11111111-1111-4111-8111-111111111111','proyectos','[{"id":1}]',clock_timestamp());
update public.datos_estudio set contenido='[{"id":2}]',updated_at=clock_timestamp() where bloque='proyectos';
update public.datos_estudio set contenido='[{"id":3}]',updated_at=clock_timestamp() where bloque='proyectos';
update public.datos_estudio set updated_at=clock_timestamp() where bloque='proyectos';
select pg_temp.assert_true((select count(*)=1 from public.datos_estudio_hist where bloque='proyectos'),'snapshot throttled and no-op ignored');

insert into public.datos_estudio_hist(estudio_id,bloque,contenido,version_de,actor,guardado_en)
select '11111111-1111-4111-8111-111111111111','agenda',jsonb_build_object('n',n),clock_timestamp(),'fixture',statement_timestamp()-interval '40 days'+n*interval '1 second'
from generate_series(1,10)n;
select pg_temp.assert_true(app_private.limpiar_historial_guardado(5)=5,'first cleanup is bounded');
select pg_temp.assert_true(
  (select pending and oldest_pending_at is not null and last_batch=5 and last_deleted=5
          and last_deleted_bytes>0 and not last_byte_limited
          and consecutive_saturated_runs=1 and total_deleted=5
     from app_private.history_retention_status where singleton=1),
  'first full batch exposes backlog and throughput'
);
select pg_temp.assert_true(app_private.limpiar_historial_guardado(5)=4,'second cleanup keeps latest anchor');
select pg_temp.assert_true(
  (select not pending and oldest_pending_at is null and last_batch=5 and last_deleted=4
          and last_deleted_bytes>0 and not last_byte_limited
          and consecutive_saturated_runs=0 and total_deleted=9
     from app_private.history_retention_status where singleton=1),
  'drained backlog clears the alert signal'
);
select pg_temp.assert_true(app_private.limpiar_historial_guardado(5)=0,'cleanup drains eligible rows only');
select pg_temp.assert_true((select count(*)=1 from public.datos_estudio_hist where bloque='agenda'),'inactive block keeps latest revision');
do $$begin perform app_private.limpiar_historial_guardado(0);raise exception 'invalid batch accepted';exception when sqlstate '22023' then null;end$$;
do $$begin perform app_private.limpiar_historial_guardado(51);raise exception 'oversized batch accepted';exception when sqlstate '22023' then null;end$$;

select count(*) as history_retention_checks_passed from assertions;
rollback;
