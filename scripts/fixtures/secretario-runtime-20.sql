-- Frozen legacy 20-per-user/study runtime for disposable migration checks only.
-- The test generator supplies the bare-database guard and rolls this back.
-- Cuota distribuida del Secretario. No conserva preguntas,
-- respuestas, nombres, documentos ni importes: solo contadores de solicitudes.
begin;

do $guard$
begin
  if to_regclass('auth.users') is null
     or to_regclass('public.estudios') is null
     or to_regclass('public.miembros') is null
     or to_regclass('public.datos_estudio') is null
     or to_regprocedure('public.app_rol(uuid)') is null
     or to_regprocedure('public.app_rol_usuario(uuid,uuid)') is null
     or to_regprocedure('public.app_leer_bloques(uuid,text[])') is null
     or has_function_privilege('anon',to_regprocedure('public.app_rol(uuid)'),'EXECUTE')
     or has_function_privilege('anon',to_regprocedure('public.app_leer_bloques(uuid,text[])'),'EXECUTE')
     or not has_function_privilege('authenticated',to_regprocedure('public.app_rol(uuid)'),'EXECUTE')
     or not has_function_privilege('authenticated',to_regprocedure('public.app_leer_bloques(uuid,text[])'),'EXECUTE')
     or not (select relrowsecurity from pg_class where oid='public.estudios'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.miembros'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.datos_estudio'::regclass) then
    raise exception 'Falta el contrato de permisos';
  end if;
end $guard$;

create schema if not exists moderno_secretary;
revoke all on schema moderno_secretary from public,anon,authenticated;

create table if not exists moderno_secretary.usage_daily(
  user_id uuid not null references auth.users(id) on delete cascade,
  estudio_id uuid not null references public.estudios(id) on delete cascade,
  day date not null,
  requests integer not null default 0 check(requests between 0 and 20),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(user_id,estudio_id,day)
);
create index if not exists secretary_usage_study_day on moderno_secretary.usage_daily(estudio_id,day);
alter table moderno_secretary.usage_daily enable row level security;
revoke all on moderno_secretary.usage_daily from public,anon,authenticated;

create or replace function public.secretary_request_reserve(p_estudio uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  actor_id uuid:=auth.uid();
  today_utc date:=(clock_timestamp() at time zone 'UTC')::date;
  month_start date:=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
  used_day integer;
  used_month integer;
  used_global_month integer;
begin
  if actor_id is null or public.app_rol_usuario(p_estudio,actor_id) not in ('admin','colaborador') then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  -- A global lock makes the application-wide ceiling atomic even when many
  -- users and studies reserve at the same time. It is always acquired before
  -- the per-user/study lock to keep lock ordering deterministic.
  perform pg_advisory_xact_lock(hashtextextended('secretary-global:'||month_start::text,733));
  select coalesce(sum(requests),0)::integer into used_global_month
  from moderno_secretary.usage_daily
  where day>=month_start and day<month_start+interval '1 month';
  if used_global_month>=200 then
    raise exception 'Límite mensual global alcanzado' using errcode='PT429';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text||':'||p_estudio::text||':'||month_start::text,733));
  select coalesce(sum(requests),0)::integer into used_month
  from moderno_secretary.usage_daily
  where user_id=actor_id and estudio_id=p_estudio and day>=month_start and day<month_start+interval '1 month';
  if used_month>=200 then
    raise exception 'Límite mensual del Secretario alcanzado' using errcode='PT429';
  end if;
  insert into moderno_secretary.usage_daily(user_id,estudio_id,day,requests)
  values(actor_id,p_estudio,today_utc,1)
  on conflict(user_id,estudio_id,day) do update
    set requests=moderno_secretary.usage_daily.requests+1,updated_at=clock_timestamp()
    where moderno_secretary.usage_daily.requests<20
  returning requests into used_day;
  if used_day is null then
    raise exception 'Límite diario del Secretario alcanzado' using errcode='PT429';
  end if;
  return jsonb_build_object(
    'accepted',true,
    'daily_remaining',20-used_day,
    'monthly_remaining',200-used_month-1,
    'global_monthly_remaining',200-used_global_month-1
  );
end $fn$;
revoke all on function public.secretary_request_reserve(uuid) from public,anon,authenticated;
grant execute on function public.secretary_request_reserve(uuid) to authenticated;

commit;

