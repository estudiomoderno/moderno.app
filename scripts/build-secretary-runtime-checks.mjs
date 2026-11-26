import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const transactionBody=source=>source.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
function body(file){return transactionBody(fs.readFileSync(new URL(`../SQL/${file}`,import.meta.url),'utf8'));}
const functionHash=source=>createHash('md5').update(source.match(/as \$fn\$([\s\S]*?)\$fn\$;/)[1]).digest('hex');

// Runs only inside the disposable PostgreSQL service used by pull-request CI.
// It installs the same isolated contract and quota that are applied to
// moderno-pruebas, then rolls every fixture and object back.
export function buildSecretaryRuntimeChecks(){
 const prerequisites=body('secretario-pruebas-prerequisitos.sql');
 const runtime=body('secretario-runtime.sql');
 const legacyRuntime=transactionBody(fs.readFileSync(new URL('./fixtures/secretario-runtime-20.sql',import.meta.url),'utf8'));
 const upgrade=body('secretario-cuota-diaria-100.sql');
 const dailyRollback=body('secretario-cuota-diaria-100.rollback.sql');
 const changedFunction=legacyRuntime.match(/create or replace function public\.secretary_request_reserve[\s\S]*?\$fn\$;/)[0].replace("raise exception 'No autorizado'","raise exception 'Permiso de fixture cambiado'");
 const runtimeRollback=body('secretario-runtime.rollback.sql');
 return `begin;
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email')
  or to_regclass('public.estudios') is not null then raise exception 'Requires bare, disposable local fixture';end if;
end$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.estudios(id uuid primary key default gen_random_uuid(),nombre text not null);
create table public.miembros(user_id uuid not null references auth.users(id),estudio_id uuid not null references public.estudios(id),rol text not null,primary key(user_id,estudio_id));
${prerequisites}
${legacyRuntime}
do $$begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin;end if;end$$;
grant execute on function public.secretary_request_reserve(uuid) to service_role;
create temp table quota_before as select proowner,proacl,prosecdef,proconfig from pg_proc where oid='public.secretary_request_reserve(uuid)'::regprocedure;
create temp table assertions(message text);grant select,insert on assertions to authenticated;
create function pg_temp.assert_true(ok boolean,msg text) returns void language plpgsql as $$begin if ok is not true then raise exception '%',msg;end if;insert into assertions values(msg);end$$;
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002');
select pg_temp.assert_true((select bool_and(relrowsecurity) from pg_class where oid in ('public.estudios'::regclass,'public.miembros'::regclass,'public.datos_estudio'::regclass,'moderno_secretary.usage_daily'::regclass)),'all client-facing and private tables use RLS');
select pg_temp.assert_true(not has_function_privilege('anon','public.unirse_al_estudio()','EXECUTE'),'anon cannot create a test study');
select pg_temp.assert_true(not has_function_privilege('anon','public.secretary_request_reserve(uuid)','EXECUTE'),'anon cannot reserve model usage');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.datos_estudio','INSERT,UPDATE,DELETE'),'clients cannot write blocks directly');
select pg_temp.assert_true(not has_table_privilege('authenticated','moderno_secretary.usage_daily','SELECT,INSERT,UPDATE,DELETE'),'clients cannot inspect or alter raw usage');
set local role authenticated;
do $$begin begin perform public.unirse_al_estudio();raise exception 'Null identity accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'null identity rejected');end;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(public.unirse_al_estudio()->>'rol'='admin','test signup creates an isolated admin membership');
select pg_temp.assert_true(public.unirse_al_estudio()->>'estudio_id'=(select estudio_id::text from public.miembros where user_id=auth.uid()),'repeated signup is idempotent');
select pg_temp.assert_true((select count(*)=1 from public.estudios),'signup never creates a second study for the same user');
create temp table fixture_study_ids(key text primary key,id uuid);
grant select on fixture_study_ids to authenticated;
insert into fixture_study_ids values('first',(select estudio_id from public.miembros where user_id=auth.uid()));
select pg_temp.assert_true(public.app_guardar_lote(
 (select estudio_id from public.miembros where user_id=auth.uid()),
 '[{"bloque":"proyectos","contenido":[{"id":1,"name":"Proyecto ficticio"}],"base":null}]'::jsonb
)->0->>'bloque'='proyectos','admin writes only through the versioned RPC');
select pg_temp.assert_true((select count(*)=1 from public.app_leer_bloques(
 (select estudio_id from public.miembros where user_id=auth.uid()),array['proyectos']
)),'authorized reader returns the requested block');
do $$declare study uuid:=(select estudio_id from public.miembros where user_id=auth.uid());i integer;r jsonb;begin
 for i in 1..20 loop r:=public.secretary_request_reserve(study);end loop;
 perform pg_temp.assert_true(r->>'daily_remaining'='0','daily counter reaches zero exactly at 20');
 begin perform public.secretary_request_reserve(study);raise exception 'Daily quota exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(true,'request 21 is blocked');end;
end$$;
reset role;
-- A drifted function or constraint must abort the complete migration. Each
-- failed subtransaction also restores the artificial drift used by this test.
do $test$begin begin
 execute $drift$${changedFunction}$drift$;
 execute $migration$${upgrade}$migration$;
 raise exception 'Missing function precondition';
 exception when sqlstate 'P0001' then perform pg_temp.assert_true(SQLERRM='La función de cuota cambió: revisar antes de sustituirla','upgrade refuses an unexpected function body');end;end$test$;
do $test$begin begin
 alter table moderno_secretary.usage_daily drop constraint usage_daily_requests_check,add constraint usage_daily_requests_check check(requests between 0 and 21);
 execute $migration$${upgrade}$migration$;
 raise exception 'Missing constraint precondition';
 exception when sqlstate 'P0001' then perform pg_temp.assert_true(SQLERRM='La restricción de cuota cambió: revisar antes de sustituirla','upgrade refuses an unexpected check constraint');end;end$test$;
select pg_temp.assert_true((select sum(requests)=20 from moderno_secretary.usage_daily),'failed preconditions preserve all existing usage');
${upgrade}
select pg_temp.assert_true((select sum(requests)=20 from moderno_secretary.usage_daily),'upgrade preserves the 20 existing reservations');
select pg_temp.assert_true((select md5(prosrc)='${functionHash(runtime)}' from pg_proc where oid='public.secretary_request_reserve(uuid)'::regprocedure),'upgrade and fresh installation use the same function body');
select pg_temp.assert_true((select p.proowner=b.proowner and p.proacl=b.proacl and p.prosecdef=b.prosecdef and p.proconfig=b.proconfig from pg_proc p cross join quota_before b where p.oid='public.secretary_request_reserve(uuid)'::regprocedure),'upgrade preserves owner ACL and security settings');
select pg_temp.assert_true((select pg_get_constraintdef(oid)='CHECK (((requests >= 0) AND (requests <= 100)))' and convalidated from pg_constraint where conrelid='moderno_secretary.usage_daily'::regclass and conname='usage_daily_requests_check'),'upgrade validates storage for up to 100 reservations per row');
do $test$begin begin
 execute $migration$${upgrade}$migration$;
 raise exception 'Repeated upgrade unexpectedly accepted';
 exception when sqlstate 'P0001' then perform pg_temp.assert_true(SQLERRM='La función de cuota cambió: revisar antes de sustituirla','repeated upgrade cannot overwrite a newer function');end;end$test$;
insert into public.estudios(id,nombre) values('33333333-3333-4333-8333-333333333332','Segundo estudio ficticio');
insert into public.estudios(id,nombre) values('33333333-3333-4333-8333-333333333333','Tercer estudio ficticio');
insert into public.miembros(user_id,estudio_id,rol) values
 ('10000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333332','admin'),
 ('10000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$declare study uuid:=(select id from fixture_study_ids where key='first');i integer;r jsonb;begin
 for i in 1..60 loop r:=public.secretary_request_reserve(study);end loop;
 perform pg_temp.assert_true(r->>'daily_remaining'='20','existing 20 plus 60 new reservations leave 20 for the person');
 for i in 1..20 loop r:=public.secretary_request_reserve('33333333-3333-4333-8333-333333333332');end loop;
 perform pg_temp.assert_true(r->>'daily_remaining'='0','daily counter reaches zero at 100 across both studies');
 perform pg_temp.assert_true(r->>'monthly_remaining'='180' and r->>'global_monthly_remaining'='100','monthly counters retain their study and global scope');
 begin perform public.secretary_request_reserve(study);raise exception 'Daily quota exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(SQLERRM='Límite diario del Secretario alcanzado','request 101 in the first study is blocked');end;
 begin perform public.secretary_request_reserve('33333333-3333-4333-8333-333333333332');raise exception 'Cross-study quota exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(SQLERRM='Límite diario del Secretario alcanzado','changing study cannot obtain reservation 101');end;
 begin perform public.secretary_request_reserve('33333333-3333-4333-8333-333333333333');raise exception 'Other study accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'quota change does not grant access to another study');end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(public.secretary_request_reserve('33333333-3333-4333-8333-333333333333')->>'daily_remaining'='99','a different person receives their own daily allowance');
reset role;
select pg_temp.assert_true((select sum(requests)=101 and max(requests)=80 from moderno_secretary.usage_daily),'blocked reservations do not modify the stored counts');
${dailyRollback}
select pg_temp.assert_true((select sum(requests)=101 and max(requests)=80 from moderno_secretary.usage_daily),'daily rollback preserves historical rows above 20');
select pg_temp.assert_true((select md5(prosrc)='${functionHash(dailyRollback)}' from pg_proc where oid='public.secretary_request_reserve(uuid)'::regprocedure),'daily rollback installs the reviewed 20-per-person function');
select pg_temp.assert_true((select p.proowner=b.proowner and p.proacl=b.proacl and p.prosecdef=b.prosecdef and p.proconfig=b.proconfig from pg_proc p cross join quota_before b where p.oid='public.secretary_request_reserve(uuid)'::regprocedure),'daily rollback preserves owner ACL and security settings');
select pg_temp.assert_true((select pg_get_constraintdef(oid)='CHECK (((requests >= 0) AND (requests <= 100)))' and convalidated from pg_constraint where conrelid='moderno_secretary.usage_daily'::regclass and conname='usage_daily_requests_check'),'rollback keeps valid storage for historical counts above 20');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$begin
 begin perform public.secretary_request_reserve('33333333-3333-4333-8333-333333333332');raise exception 'Rollback allowed more usage';exception when sqlstate 'PT429' then perform pg_temp.assert_true(SQLERRM='Límite diario del Secretario alcanzado','a person already above 20 stays blocked after rollback');end;
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$declare i integer;r jsonb;begin
 for i in 1..19 loop r:=public.secretary_request_reserve('33333333-3333-4333-8333-333333333333');end loop;
 perform pg_temp.assert_true(r->>'daily_remaining'='0','rollback allows only the remainder up to 20');
 begin perform public.secretary_request_reserve('33333333-3333-4333-8333-333333333333');raise exception 'Rollback limit exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(true,'rollback blocks reservation 21');end;
end$$;
reset role;
insert into moderno_secretary.usage_daily(user_id,estudio_id,day,requests)
select '10000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333',
 case when (clock_timestamp() at time zone 'UTC')::date=date_trunc('month',clock_timestamp() at time zone 'UTC')::date then (clock_timestamp() at time zone 'UTC')::date+1 else date_trunc('month',clock_timestamp() at time zone 'UTC')::date end,80;
set local role authenticated;
do $$begin
 begin perform public.secretary_request_reserve('33333333-3333-4333-8333-333333333333');raise exception 'Global monthly quota exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(SQLERRM='Límite mensual global alcanzado','global request 201 remains blocked after daily rollback');end;
end$$;
reset role;
${runtimeRollback}
select pg_temp.assert_true(not has_function_privilege('public','public.secretary_request_reserve(uuid)','EXECUTE'),'runtime rollback removes inherited public execution');
select pg_temp.assert_true(not has_function_privilege('anon','public.secretary_request_reserve(uuid)','EXECUTE'),'runtime rollback keeps anonymous callers blocked');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.secretary_request_reserve(uuid)','EXECUTE'),'runtime rollback blocks new reservations without deleting counters');
select pg_temp.assert_true((select coalesce(sum(requests),0)=200 from moderno_secretary.usage_daily),'runtime rollback preserves usage counters');
select count(*) as secretary_runtime_checks_passed from assertions;
rollback;

-- Verify a genuinely fresh installation independently of the upgrade path.
begin;
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email')
  or to_regclass('public.estudios') is not null then raise exception 'Requires bare, disposable local fixture';end if;
end$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.estudios(id uuid primary key default gen_random_uuid(),nombre text not null);
create table public.miembros(user_id uuid not null references auth.users(id),estudio_id uuid not null references public.estudios(id),rol text not null,primary key(user_id,estudio_id));
${prerequisites}
${runtime}
create temp table assertions(message text);grant select,insert on assertions to authenticated;
create function pg_temp.assert_true(ok boolean,msg text) returns void language plpgsql as $$begin if ok is not true then raise exception '%',msg;end if;insert into assertions values(msg);end$$;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
insert into public.estudios(id,nombre) values('33333333-3333-4333-8333-333333333331','Instalación ficticia nueva'),('33333333-3333-4333-8333-333333333332','Otro estudio ficticio');
insert into public.miembros(user_id,estudio_id,rol) values('10000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333331','admin'),('10000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333332','admin');
insert into moderno_secretary.usage_daily(user_id,estudio_id,day,requests)
select '10000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333331',
 case when (clock_timestamp() at time zone 'UTC')::date=date_trunc('month',clock_timestamp() at time zone 'UTC')::date then (clock_timestamp() at time zone 'UTC')::date+1 else date_trunc('month',clock_timestamp() at time zone 'UTC')::date end,100;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$declare i integer;r jsonb;begin
 for i in 1..100 loop r:=public.secretary_request_reserve('33333333-3333-4333-8333-333333333331');end loop;
 perform pg_temp.assert_true(r->>'daily_remaining'='0','fresh runtime accepts exactly 100 in a single study');
 perform pg_temp.assert_true(r->>'monthly_remaining'='0' and r->>'global_monthly_remaining'='0','fresh runtime keeps both monthly ceilings at 200');
end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.secretary_request_reserve('33333333-3333-4333-8333-333333333332');raise exception 'Fresh global quota exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(SQLERRM='Límite mensual global alcanzado','fresh runtime blocks global reservation 201 from another person');end;
end$$;
reset role;
do $$begin begin
 update moderno_secretary.usage_daily set requests=101;
 raise exception 'Storage bound accepted 101';
 exception when check_violation then perform pg_temp.assert_true(true,'fresh storage rejects a row above 100');end;end$$;
select pg_temp.assert_true((select sum(requests)=200 and max(requests)=100 from moderno_secretary.usage_daily),'fresh runtime and constraint failures preserve recorded usage');
select pg_temp.assert_true(not has_function_privilege('anon','public.secretary_request_reserve(uuid)','EXECUTE') and has_function_privilege('authenticated','public.secretary_request_reserve(uuid)','EXECUTE'),'fresh runtime preserves the authenticated RPC boundary');
select pg_temp.assert_true(not has_table_privilege('authenticated','moderno_secretary.usage_daily','SELECT,INSERT,UPDATE,DELETE'),'fresh storage stays private');
select count(*) as secretary_fresh_runtime_checks_passed from assertions;
rollback;`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildSecretaryRuntimeChecks());
