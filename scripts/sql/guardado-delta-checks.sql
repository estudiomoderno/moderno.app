-- Disposable PostgreSQL only. All records are fictional; rollback removes all fixtures.
begin;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public') or exists(select 1 from auth.users) then raise exception 'Requires an empty isolated database'; end if;
end $$;
create table public.miembros(estudio_id uuid,user_id uuid,rol text,primary key(estudio_id,user_id));
create table public.datos_estudio(estudio_id uuid,bloque text,contenido jsonb,updated_at timestamptz,primary key(estudio_id,bloque));
create function public.app_rol_usuario(e uuid,u uuid) returns text language sql stable security definer set search_path='' as $$select coalesce((select case when rol='admin' then 'admin' else 'colaborador' end from public.miembros where estudio_id=e and user_id=u),'sin_acceso')$$;
-- BASELINE_HERE
revoke all on all functions in schema public from public,anon,authenticated;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function public.app_rol(uuid),public.app_leer_bloques(uuid,text[]),public.app_guardar_lote(uuid,jsonb),public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) to authenticated;
alter table public.datos_estudio enable row level security;
grant select on public.datos_estudio to authenticated;
create policy fixture_admin_only on public.datos_estudio for select to authenticated using(public.app_rol(estudio_id)='admin');
-- CANDIDATE_HERE
create temp table assertions(label text);
grant insert,select on assertions to authenticated;
create function pg_temp.assert_true(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label; end if;insert into assertions values(label);end$$;
-- ROUND_TRIP_HERE
insert into public.miembros values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011','admin'),('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','miembro');
insert into public.datos_estudio values('00000000-0000-0000-0000-000000000001','proyectos','[{"id":1,"name":"Ficticio","rooms":[{"id":2,"sections":[{"items":[{"id":3,"name":"Mesa ficticia","qty":1,"price":20,"cost":7}]}]}]}]','2026-01-01'),('00000000-0000-0000-0000-000000000001','contactos','[{"id":1,"name":"Ficticio"}]','2026-01-01');
select pg_temp.assert_true(not has_function_privilege('anon','public.app_leer_versiones(uuid,text[])','execute') and not has_function_privilege('anon','public.app_guardar_lote_delta(uuid,jsonb)','execute'),'anon denied');
select pg_temp.assert_true(not (select prosecdef from pg_proc where oid='public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure),'delta invoker');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';v timestamptz;original jsonb;result jsonb;blocked boolean;
begin
 select updated_at,contenido into v,original from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true((select count(*)=2 from public.app_leer_versiones(e,null)),'versions only');
 blocked:=false;begin perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','contactos','contenido','[]'::jsonb,'base',v),jsonb_build_object('bloque','proyectos','cambios','[{"op":"set","path":["0","name"],"value":"fallar"}]'::jsonb,'base','2000-01-01')));exception when sqlstate 'PT409' then blocked:=true;end;
 perform pg_temp.assert_true(blocked and (select contenido='[{"id":1,"name":"Ficticio"}]'::jsonb from public.app_leer_bloques(e,array['contactos'])),'atomic batch conflict rolls back');
 result:=public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','cambios','[{"op":"set","path":["0","rooms","0","sections","0","items","0","qty"],"value":2}]'::jsonb,'base',v)));
 perform pg_temp.assert_true(jsonb_array_length(result)=1 and (select contenido#>>'{0,rooms,0,sections,0,items,0,qty}'='2' from public.app_leer_bloques(e,array['proyectos'])),'admin delta saved');
 blocked:=false;begin perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','cambios','[]'::jsonb,'base',v)));exception when sqlstate 'PT409' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'stale version rejected');
 blocked:=false;begin perform public.app_leer_versiones('00000000-0000-0000-0000-000000000099',null);exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'cross studio rejected');
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';r record;blocked boolean;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(strpos(r.contenido::text,'"cost"')=0,'collaborator filtered baseline');
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','cambios','[{"op":"set","path":["0","name"],"value":"Editado ficticio"}]'::jsonb,'base',r.updated_at)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 blocked:=false;begin perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','cambios','[{"op":"set","path":["0","rooms","0","sections","0","items","0","cost"],"value":0}]'::jsonb,'base',r.updated_at)));exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'private cost injection rejected');
 blocked:=false;begin perform public.app_guardar_lote_delta(e,'[{"bloque":"config","contenido":{},"base":null}]');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'collaborator config rejected');
end $$;
reset role;
select pg_temp.assert_true((select contenido#>>'{0,rooms,0,sections,0,items,0,cost}'='7' and contenido#>>'{0,name}'='Editado ficticio' from public.datos_estudio where bloque='proyectos'),'private fields preserved');
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$declare blocked boolean:=false;begin
 begin perform public.app_guardar_lote_delta('00000000-0000-0000-0000-000000000001','[]');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'null identity denied');
end$$;
reset role;
do $$declare bad jsonb;blocked boolean;begin
 for bad in select value from jsonb_array_elements('[{"op":"set","path":["missing","child"],"value":1},{"op":"remove","path":["missing"]},{"op":"splice","path":[],"index":-1,"delete":1,"items":[]},{"op":"set","path":[1],"value":1},{"op":"bad","path":[]}]') loop
  blocked:=false;begin perform public.app_aplicar_delta('{}',jsonb_build_array(bad));exception when others then blocked:=true;end;
  perform pg_temp.assert_true(blocked,'malformed patch rejected');
 end loop;
end $$;
select count(*) as delta_checks_passed from assertions;
rollback;
