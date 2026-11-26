-- Contención no destructiva tras la ampliación diaria.
-- Con el Secretario sin solicitudes en curso, reduce a 20 por persona/día UTC
-- sumadas entre estudios. Quien ya reservó 20 o más no puede reservar más hoy.
-- Conserva CHECK<=100: hay filas históricas válidas que pueden superar 20.
-- No borra/reduce contadores, no cambia permisos y mantiene los topes mensuales.
-- No restaura la política antigua por estudio: conserva la agregación por persona.
-- La reactivación de 100 requiere revisar una nueva transición desde este cuerpo.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $guard$
declare
  candidate pg_catalog.pg_proc%rowtype;
  month_start date:=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
  check_definition text;
  check_validated boolean;
begin
  if to_regclass('moderno_secretary.usage_daily') is null
     or to_regprocedure('public.secretary_request_reserve(uuid)') is null then
    raise exception 'Falta el runtime de cuota esperado';
  end if;
  -- The migration lock serializes reviewed quota changes. Take the same global
  -- month lock as reservations before locking the table, preserving lock order.
  perform pg_advisory_xact_lock(hashtextextended('secretary-quota-migration',733));
  perform pg_advisory_xact_lock(hashtextextended('secretary-global:'||month_start::text,733));
  lock table moderno_secretary.usage_daily in access exclusive mode;
  if date_trunc('month',clock_timestamp() at time zone 'UTC')::date<>month_start then
    raise exception 'Cambio de mes durante la revisión: repetir en una ventana estable';
  end if;
  select * into candidate from pg_catalog.pg_proc
  where oid='public.secretary_request_reserve(uuid)'::regprocedure;
  if md5(candidate.prosrc) not in ('438f92197dbddc487df5e9ef8e7aea54')
     or candidate.proowner<>'postgres'::regrole
     or candidate.prosecdef is not true
     or candidate.proconfig is distinct from array['search_path=""']::text[]
     or candidate.prorettype<>'jsonb'::regtype
     or candidate.proretset
     or candidate.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
     or candidate.proargnames is distinct from array['p_estudio']::text[]
     or has_function_privilege('anon',candidate.oid,'EXECUTE')
     or not has_function_privilege('authenticated',candidate.oid,'EXECUTE') then
    raise exception 'La función de cuota cambió: revisar antes de sustituirla';
  end if;
  if not (select relrowsecurity from pg_catalog.pg_class where oid='moderno_secretary.usage_daily'::regclass)
     or has_table_privilege('authenticated','moderno_secretary.usage_daily','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('anon','moderno_secretary.usage_daily','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Los permisos de la cuota cambiaron: revisar antes de continuar';
  end if;
  select pg_get_constraintdef(oid),convalidated into check_definition,check_validated
  from pg_catalog.pg_constraint
  where conrelid='moderno_secretary.usage_daily'::regclass
    and conname='usage_daily_requests_check' and contype='c';
  if check_definition is distinct from 'CHECK (((requests >= 0) AND (requests <= 100)))'
     or check_validated is not true
     or (select count(*) from pg_catalog.pg_constraint where conrelid='moderno_secretary.usage_daily'::regclass and contype='c')<>1 then
    raise exception 'La restricción de cuota cambió: revisar antes de sustituirla';
  end if;
end $guard$;

create or replace function public.secretary_request_reserve(p_estudio uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  actor_id uuid:=auth.uid();
  today_utc date:=(clock_timestamp() at time zone 'UTC')::date;
  month_start date:=date_trunc('month',today_utc::timestamp)::date;
  used_day integer;
  used_user_day integer;
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
  -- The global monthly lock above also serializes this daily sum across studies.
  select coalesce(sum(requests),0)::integer into used_user_day
  from moderno_secretary.usage_daily
  where user_id=actor_id and day=today_utc;
  if used_user_day>=20 then
    raise exception 'Límite diario del Secretario alcanzado' using errcode='PT429';
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
    'daily_remaining',20-used_user_day-1,
    'monthly_remaining',200-used_month-1,
    'global_monthly_remaining',200-used_global_month-1
  );
end $fn$;

commit;

