import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

// This harness only runs in the disposable Postgres service of PR checks.
// Every fixture and the installed objects are rolled back together.
export function buildSecretaryFeedbackChecks(){
 const sql=fs.readFileSync(new URL('../SQL/secretario-feedback.sql',import.meta.url),'utf8')
  .replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
 return `begin;
do $$begin
 if exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email')
  or to_regclass('public.estudios') is not null then raise exception 'Requires bare, disposable local fixture';end if;
end$$;
create table public.estudios(id uuid primary key,nombre text);
create table public.miembros(user_id uuid references auth.users(id),estudio_id uuid references public.estudios(id),rol text,primary key(user_id,estudio_id));
alter table public.estudios enable row level security;
alter table public.miembros enable row level security;
create function public.app_rol_usuario(p_estudio uuid,p_usuario uuid) returns text language sql stable security invoker set search_path='' as $$
 select coalesce((select rol from public.miembros where estudio_id=p_estudio and user_id=p_usuario),'sin_acceso');$$;
create function public.app_rol(p_estudio uuid) returns text language sql stable security definer set search_path='' as $$
 select public.app_rol_usuario(p_estudio,auth.uid());$$;
${sql}
create temp table assertions(message text);grant select,insert on assertions to authenticated;
create function pg_temp.assert_true(ok boolean,msg text) returns void language plpgsql as $$begin if ok is not true then raise exception '%',msg;end if;insert into assertions values(msg);end$$;
insert into public.estudios values
 ('33333333-3333-4333-8333-333333333331','Estudio ficticio A'),
 ('33333333-3333-4333-8333-333333333332','Estudio ficticio B'),
 ('33333333-3333-4333-8333-333333333333','Estudio ficticio C');
insert into auth.users(id) select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6) n;
insert into public.miembros values
 ('10000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333331','admin'),
 ('10000000-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333331','colaborador'),
 ('10000000-0000-4000-8000-000000000003','33333333-3333-4333-8333-333333333332','admin'),
 ('10000000-0000-4000-8000-000000000004','33333333-3333-4333-8333-333333333332','colaborador'),
 ('10000000-0000-4000-8000-000000000005','33333333-3333-4333-8333-333333333333','admin');
select pg_temp.assert_true(not has_function_privilege('anon','public.secretary_feedback_submit(uuid,jsonb)','EXECUTE'),'anon cannot submit');
select pg_temp.assert_true(not has_table_privilege('authenticated','moderno_secretary.feedback','SELECT,INSERT,UPDATE,DELETE'),'raw feedback has no direct client privileges');
select pg_temp.assert_true(not has_table_privilege('authenticated','moderno_secretary.consent','SELECT,INSERT,UPDATE,DELETE'),'consent has no direct client privileges');
select pg_temp.assert_true(not has_function_privilege('authenticated','moderno_secretary.report(date)','EXECUTE'),'users cannot query other studies feedback');
select pg_temp.assert_true((select bool_and(relrowsecurity) from pg_class where oid in ('moderno_secretary.feedback'::regclass,'moderno_secretary.consent'::regclass)),'private tables have RLS');
set local role authenticated;
do $$begin begin perform public.secretary_feedback_consent_get('33333333-3333-4333-8333-333333333331');raise exception 'Null identity accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'null identity rejected');end;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(public.secretary_feedback_consent_get('33333333-3333-4333-8333-333333333331')='{"version":1,"enabled":false,"revision":0}'::jsonb,'consent defaults off');
do $$begin
 begin perform public.secretary_feedback_submit('33333333-3333-4333-8333-333333333331','{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"unhelpful","reason":"could_not_finish"}');raise exception 'Opt-out accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'no event before explicit consent');end;
 begin perform public.secretary_feedback_consent_set('33333333-3333-4333-8333-333333333332',true,0);raise exception 'Foreign study accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'foreign study denied');end;
end$$;
select pg_temp.assert_true(public.secretary_feedback_consent_set('33333333-3333-4333-8333-333333333331',true,0)->>'revision'='1','grant has revision');
select pg_temp.assert_true(public.secretary_feedback_submit('33333333-3333-4333-8333-333333333331','{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"unhelpful","reason":"could_not_finish"}')->>'accepted'='true','closed feedback accepted');
select public.secretary_feedback_submit('33333333-3333-4333-8333-333333333331','{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful","reason":"saved_time"}');
do $$declare bad jsonb;begin
 foreach bad in array array[
 '{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful","prompt":"PRIVATE FICTIONAL TEXT"}'::jsonb,
 '{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful","userId":"10000000-0000-4000-8000-000000000002"}'::jsonb,
 '{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful","reason":"could_not_finish"}'::jsonb,
 '{"version":"1","event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful"}'::jsonb,
 '{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful","reason":null}'::jsonb,
 '{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful","reason":""}'::jsonb,
 '{"version":1,"event":"secretary_feedback","task":"private_document","outcome":"helpful"}'::jsonb
 ] loop
  begin perform public.secretary_feedback_submit('33333333-3333-4333-8333-333333333331',bad);raise exception 'Extra or invalid data accepted';exception when invalid_parameter_value then perform pg_temp.assert_true(true,'invalid payload rejected');end;
 end loop;
end$$;
reset role;
select pg_temp.assert_true((select count(*)=1 from moderno_secretary.feedback),'repeated feedback updates one monthly task row');
select pg_temp.assert_true(not exists(select 1 from moderno_secretary.report(current_date)),'small cohort suppressed');
set local role authenticated;
select pg_temp.assert_true(public.secretary_feedback_consent_set('33333333-3333-4333-8333-333333333331',false,0)->>'revision'='2','stale revoke still succeeds');
do $$begin
 begin perform public.secretary_feedback_consent_set('33333333-3333-4333-8333-333333333331',true,1);raise exception 'Late grant accepted';exception when sqlstate 'PT409' then perform pg_temp.assert_true(true,'late grant cannot undo revoke');end;
 begin perform public.secretary_feedback_submit('33333333-3333-4333-8333-333333333331','{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"helpful"}');raise exception 'Revoked submit accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'revoked submit denied');end;
end$$;
reset role;
select pg_temp.assert_true(not exists(select 1 from moderno_secretary.feedback),'revoke removes own raw events');

-- Populate 5 distinct people across 3 distinct studies through the real RPCs.
do $$declare m record;r jsonb;begin
 for m in select * from public.miembros order by user_id loop
  perform set_config('request.jwt.claim.sub',m.user_id::text,true);
  r:=public.secretary_feedback_consent_get(m.estudio_id);
  perform public.secretary_feedback_consent_set(m.estudio_id,true,(r->>'revision')::bigint);
  perform public.secretary_feedback_submit(m.estudio_id,'{"version":1,"event":"secretary_feedback","task":"invoice_from_quote","outcome":"unhelpful","reason":"could_not_finish"}');
  if m.user_id='10000000-0000-4000-8000-000000000004' then
   perform pg_temp.assert_true(not exists(select 1 from moderno_secretary.report(current_date)),'four people/two studies remain suppressed');
  end if;
 end loop;
end$$;
select pg_temp.assert_true((select count(*)=1 and min(contributors)=5 and min(studies)=3 from moderno_secretary.report(current_date)),'five people/three studies yield only aggregate counts');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
set local role authenticated;
do $$begin begin perform public.secretary_feedback_consent_get('33333333-3333-4333-8333-333333333331');raise exception 'Nonmember read accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'nonmember cannot read consent');end;end$$;
select pg_temp.assert_true(public.secretary_feedback_consent_set('33333333-3333-4333-8333-333333333331',false,0)=public.secretary_feedback_consent_set('99999999-9999-4999-8999-999999999999',false,0),'nonmember withdrawal does not disclose studio existence');
reset role;
select pg_temp.assert_true(not exists(select 1 from moderno_secretary.consent where user_id='10000000-0000-4000-8000-000000000006'),'nonmember withdrawal creates no rows');
delete from public.miembros where user_id='10000000-0000-4000-8000-000000000005';
select pg_temp.assert_true(not exists(select 1 from moderno_secretary.report(current_date)),'revoked membership removed from aggregates');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.assert_true(public.secretary_feedback_consent_set('33333333-3333-4333-8333-333333333333',false,0)->>'enabled'='false','ex-member can withdraw own consent');
reset role;
select pg_temp.assert_true((select count(*)=4 from moderno_secretary.feedback),'withdrawing one user preserves other users');
update moderno_secretary.feedback set created_at=now()-interval '91 days';
select pg_temp.assert_true(moderno_secretary.purge_expired()=4,'retention removes expired raw events');
select pg_temp.assert_true(not exists(select 1 from moderno_secretary.feedback),'expired feedback removed');
select count(*) as secretary_feedback_checks_passed from assertions;
rollback;`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildSecretaryFeedbackChecks());
