import fs from 'node:fs';import {pathToFileURL} from 'node:url';
export function buildInvitationChecks(){
const sql=fs.readFileSync(new URL('../SQL/aceptar-invitacion-estudio.sql',import.meta.url),'utf8').replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
const trigger=fs.readFileSync(new URL('../SQL/cancelar-invitacion.sql',import.meta.url),'utf8').split('create or replace function public.app_equipo_aceptar_rol()')[1].split('commit;')[0];
return `begin;
do $$begin if exists(select 1 from information_schema.columns where table_schema='auth' and table_name='users' and column_name='email') then raise exception 'Requires the bare local fixture';end if;end$$;
alter table auth.users add column email text,add column email_confirmed_at timestamptz;
create table public.estudios(id uuid primary key,nombre text);
create table public.miembros(user_id uuid primary key references auth.users(id),estudio_id uuid references public.estudios(id),rol text,role_id uuid);
create table public.invitaciones(estudio_id uuid references public.estudios(id),email text,rol text,role_id uuid,primary key(estudio_id,email));
create or replace function public.app_equipo_aceptar_rol()${trigger}
create trigger app_equipo_aceptar_rol before insert on public.miembros for each row execute function public.app_equipo_aceptar_rol();
${sql}
create temp table assertions(message text);grant select,insert on assertions to authenticated;
create function pg_temp.assert_true(ok boolean,msg text) returns void language plpgsql as $$begin if ok is not true then raise exception '%',msg;end if;insert into assertions values(msg);end$$;
insert into public.estudios values('33333333-3333-4333-8333-333333333333','Equipo ficticio'),('44444444-4444-4444-8444-444444444444','Otro estudio ficticio');
insert into auth.users(id,email,email_confirmed_at) values('10000000-0000-4000-8000-000000000001','invited@example.invalid',now()),('10000000-0000-4000-8000-000000000002','other@example.invalid',now()),('10000000-0000-4000-8000-000000000003','unconfirmed@example.invalid',null);
insert into public.invitaciones values('33333333-3333-4333-8333-333333333333','INVITED@example.invalid','miembro','55555555-5555-4555-8555-555555555555'),('33333333-3333-4333-8333-333333333333','unconfirmed@example.invalid','miembro',null);
select pg_temp.assert_true(not has_function_privilege('anon','public.app_aceptar_invitacion(uuid)','EXECUTE'),'anon cannot accept invitations');
select pg_temp.assert_true(has_function_privilege('authenticated','public.app_aceptar_invitacion(uuid)','EXECUTE'),'authenticated can request verified acceptance');
set local role authenticated;
do $$begin begin perform public.app_aceptar_invitacion('33333333-3333-4333-8333-333333333333');raise exception 'Anonymous UID accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'null identity rejected');end;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$begin begin perform public.app_aceptar_invitacion('33333333-3333-4333-8333-333333333333');raise exception 'Wrong mailbox accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'wrong mailbox rejected');end;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$begin begin perform public.app_aceptar_invitacion('33333333-3333-4333-8333-333333333333');raise exception 'Unconfirmed account accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'unconfirmed mailbox rejected');end;end$$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;begin
 begin perform public.app_aceptar_invitacion('44444444-4444-4444-8444-444444444444');raise exception 'Wrong study accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'wrong study rejected');end;
 r:=public.app_aceptar_invitacion('33333333-3333-4333-8333-333333333333');perform pg_temp.assert_true(r->>'estudio_id'='33333333-3333-4333-8333-333333333333' and r->>'nuevo'='false','joins exact study without creating another');
 r:=public.app_aceptar_invitacion('33333333-3333-4333-8333-333333333333');perform pg_temp.assert_true(r->>'rol'='miembro','acceptance is idempotent');
 begin perform public.app_aceptar_invitacion('44444444-4444-4444-8444-444444444444');raise exception 'Existing membership reassigned';exception when insufficient_privilege then perform pg_temp.assert_true(true,'existing membership not moved');end;
end$$;
reset role;
select pg_temp.assert_true((select role_id='55555555-5555-4555-8555-555555555555' from public.miembros where user_id='10000000-0000-4000-8000-000000000001'),'existing role trigger preserves invited profile');
select pg_temp.assert_true(not exists(select 1 from public.invitaciones where lower(email)='invited@example.invalid'),'accepted invitation consumed');
insert into public.invitaciones values('33333333-3333-4333-8333-333333333333','other@example.invalid','miembro',null);
delete from public.invitaciones where email='other@example.invalid';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$begin begin perform public.app_aceptar_invitacion('33333333-3333-4333-8333-333333333333');raise exception 'Cancelled invitation accepted';exception when insufficient_privilege then perform pg_temp.assert_true(true,'cancelled invitation fails closed');end;end$$;
reset role;
select pg_temp.assert_true((select count(*)=2 from public.estudios),'no study created in any path');
select pg_temp.assert_true((select count(*)=1 from public.miembros),'no unauthorized membership created');
select count(*) as invitation_checks_passed from assertions;
rollback;`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(buildInvitationChecks());
