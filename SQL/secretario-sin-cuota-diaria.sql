-- Retira únicamente el rechazo diario del piloto del Secretario.
-- Conserva 200 reservas mensuales por persona/estudio y 200 mensuales
-- globales, junto con autenticación, RLS, propietario, ACL y contadores.
-- Admite los dos predecesores verificados —producción (20 por día) y el
-- contrato aislado (100 por persona/día)—, además de su contención exacta.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

do $guard$
declare
  candidate pg_catalog.pg_proc%rowtype;
  candidate_hash text;
  month_start date:=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
  check_definition text;
  check_validated boolean;
begin
  if to_regclass('moderno_secretary.usage_daily') is null
     or to_regprocedure('public.secretary_request_reserve(uuid)') is null
     or to_regprocedure('public.app_rol_usuario(uuid,uuid)') is null then
    raise exception 'Falta el runtime de cuota esperado';
  end if;

  -- Serializa cambios de política y conserva el mismo orden de bloqueo que
  -- las reservas: primero el mes global y después las filas de uso.
  perform pg_advisory_xact_lock(hashtextextended('secretary-quota-migration',733));
  perform pg_advisory_xact_lock(hashtextextended('secretary-global:'||month_start::text,733));
  lock table moderno_secretary.usage_daily in access exclusive mode;
  if date_trunc('month',clock_timestamp() at time zone 'UTC')::date<>month_start then
    raise exception 'Cambio de mes durante la revisión: repetir en una ventana estable';
  end if;

  select * into candidate from pg_catalog.pg_proc
  where oid='public.secretary_request_reserve(uuid)'::regprocedure;
  candidate_hash:=md5(candidate.prosrc);
  if candidate_hash not in ('022417ead8f26a2427800a96a75cebcf','438f92197dbddc487df5e9ef8e7aea54','2428a71ef2e17190164e396045e9ee6c')
     or candidate.proowner<>'postgres'::regrole
     or candidate.prosecdef is not true
     or candidate.proconfig is distinct from array['search_path=""']::text[]
     or candidate.prorettype<>'jsonb'::regtype
     or candidate.proretset
     or candidate.prokind<>'f'
     or candidate.provolatile<>'v'
     or candidate.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
     or candidate.pronargs<>1
     or candidate.proargtypes[0]<>'uuid'::regtype
     or candidate.proargnames is distinct from array['p_estudio']::text[]
     or has_function_privilege('anon',candidate.oid,'EXECUTE')
     or not has_function_privilege('authenticated',candidate.oid,'EXECUTE') then
    raise exception 'La función de cuota cambió: revisar antes de sustituirla';
  end if;
  if has_schema_privilege('anon','moderno_secretary','USAGE')
     or has_schema_privilege('authenticated','moderno_secretary','USAGE')
     or not (select relrowsecurity from pg_catalog.pg_class where oid='moderno_secretary.usage_daily'::regclass)
     or has_table_privilege('authenticated','moderno_secretary.usage_daily','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('anon','moderno_secretary.usage_daily','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Los permisos de la cuota cambiaron: revisar antes de continuar';
  end if;

  select pg_get_constraintdef(oid),convalidated into check_definition,check_validated
  from pg_catalog.pg_constraint
  where conrelid='moderno_secretary.usage_daily'::regclass
    and conname='usage_daily_requests_check' and contype='c';
  if check_validated is not true
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid='moderno_secretary.usage_daily'::regclass and contype='c')<>1
     or not (
       candidate_hash='022417ead8f26a2427800a96a75cebcf'
       and check_definition='CHECK (((requests >= 0) AND (requests <= 20)))'
       or candidate_hash='438f92197dbddc487df5e9ef8e7aea54'
       and check_definition='CHECK (((requests >= 0) AND (requests <= 100)))'
       or candidate_hash='2428a71ef2e17190164e396045e9ee6c'
       and check_definition='CHECK (((requests >= 0) AND (requests <= 200)))'
     ) then
    raise exception 'La función y la restricción de cuota no forman un predecesor verificado';
  end if;
end
$guard$;

create temporary table secretario_quota_no_daily_before on commit drop as
select proowner,proacl,prosecdef,proconfig,prorettype,proretset,prokind,
       provolatile,prolang,pronargs,proargtypes,proargnames
from pg_catalog.pg_proc
where oid='public.secretary_request_reserve(uuid)'::regprocedure;

alter table moderno_secretary.usage_daily
  drop constraint usage_daily_requests_check,
  add constraint usage_daily_requests_check check(requests between 0 and 200);

create or replace function public.secretary_request_reserve(p_estudio uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  actor_id uuid:=auth.uid();
  today_utc date:=(clock_timestamp() at time zone 'UTC')::date;
  month_start date:=date_trunc('month',today_utc::timestamp)::date;
  used_day integer;
  used_month integer;
  used_global_month integer;
begin
  if actor_id is null or public.app_rol_usuario(p_estudio,actor_id) not in ('admin','colaborador') then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  -- El bloqueo global hace atómico el techo mensual de toda la aplicación.
  -- Siempre se adquiere antes del bloqueo por persona/estudio.
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
  where user_id=actor_id and estudio_id=p_estudio
    and day>=month_start and day<month_start+interval '1 month';
  if used_month>=200 then
    raise exception 'Límite mensual del Secretario alcanzado' using errcode='PT429';
  end if;
  insert into moderno_secretary.usage_daily(user_id,estudio_id,day,requests)
  values(actor_id,p_estudio,today_utc,1)
  on conflict(user_id,estudio_id,day) do update
    set requests=moderno_secretary.usage_daily.requests+1,updated_at=clock_timestamp()
    where moderno_secretary.usage_daily.requests<200
  returning requests into used_day;
  if used_day is null then
    raise exception 'Límite mensual del Secretario alcanzado' using errcode='PT429';
  end if;
  return jsonb_build_object(
    'accepted',true,
    'daily_remaining',null,
    'monthly_remaining',200-used_month-1,
    'global_monthly_remaining',200-used_global_month-1
  );
end
$fn$;

do $verify$
declare
  candidate pg_catalog.pg_proc%rowtype;
  before_contract record;
  check_definition text;
  check_validated boolean;
begin
  select * into candidate from pg_catalog.pg_proc
  where oid='public.secretary_request_reserve(uuid)'::regprocedure;
  select * into before_contract from secretario_quota_no_daily_before;
  if md5(candidate.prosrc)<>'bbb9ca430b37c2570540ae49e829c7bb'
     or candidate.proowner is distinct from before_contract.proowner
     or candidate.proacl is distinct from before_contract.proacl
     or candidate.prosecdef is distinct from before_contract.prosecdef
     or candidate.proconfig is distinct from before_contract.proconfig
     or candidate.prorettype is distinct from before_contract.prorettype
     or candidate.proretset is distinct from before_contract.proretset
     or candidate.prokind is distinct from before_contract.prokind
     or candidate.provolatile is distinct from before_contract.provolatile
     or candidate.prolang is distinct from before_contract.prolang
     or candidate.pronargs is distinct from before_contract.pronargs
     or candidate.proargtypes is distinct from before_contract.proargtypes
     or candidate.proargnames is distinct from before_contract.proargnames
     or has_function_privilege('anon',candidate.oid,'EXECUTE')
     or not has_function_privilege('authenticated',candidate.oid,'EXECUTE') then
    raise exception 'No se conservó el contrato de la función de cuota';
  end if;
  select pg_get_constraintdef(oid),convalidated into check_definition,check_validated
  from pg_catalog.pg_constraint
  where conrelid='moderno_secretary.usage_daily'::regclass
    and conname='usage_daily_requests_check' and contype='c';
  if check_definition is distinct from 'CHECK (((requests >= 0) AND (requests <= 200)))'
     or check_validated is not true then
    raise exception 'No se instaló la contención física mensual esperada';
  end if;
end
$verify$;

drop table pg_temp.secretario_quota_no_daily_before;

commit;
