import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

function body(file){
 return fs.readFileSync(new URL(`../SQL/${file}`,import.meta.url),'utf8')
  .replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
}

// Runs only inside the disposable PostgreSQL service used by pull-request CI.
// It installs the same isolated contract and quota that are applied to
// moderno-pruebas, then rolls every fixture and object back.
export function buildSecretaryRuntimeChecks(){
 const prerequisites=body('secretario-pruebas-prerequisitos.sql');
 const runtime=body('secretario-runtime.sql');
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
${runtime}
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
insert into moderno_secretary.usage_daily(user_id,estudio_id,day,requests)
select '10000000-0000-4000-8000-000000000001',m.estudio_id,d.day,20
from public.miembros m
cross join lateral(
 select day::date from generate_series(date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month'-interval '1 day')::date,interval '1 day') day
 where day::date<>current_date limit 9
) d where m.user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$declare study uuid:=(select estudio_id from public.miembros where user_id=auth.uid());begin
 begin perform public.secretary_request_reserve(study);raise exception 'Monthly quota exceeded';exception when sqlstate 'PT429' then perform pg_temp.assert_true(true,'request 201 in the month is blocked');end;
end$$;
select count(*) as secretary_runtime_checks_passed from assertions;
rollback;`;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildSecretaryRuntimeChecks());
