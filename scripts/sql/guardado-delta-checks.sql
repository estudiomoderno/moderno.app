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
 for bad in select value from jsonb_array_elements('[{"op":"set","path":["missing","child"],"value":1},{"op":"remove","path":["missing"]},{"op":"splice","path":[],"index":-1,"delete":1,"items":[]},{"op":"set","path":[1],"value":1},{"op":"bad","path":[]},{"op":"array_sync","path":[],"order":[1,1],"items":[]},{"op":"array_sync","path":[],"order":[2],"items":[]},{"op":"array_sync","path":[],"order":[1,2],"items":[{"id":1},{"id":2}]},{"op":"array_sync","path":[],"order":[1],"items":[{"id":2}]}]') loop
  blocked:=false;begin perform public.app_aplicar_delta('{}',jsonb_build_array(bad));exception when others then blocked:=true;end;
  perform pg_temp.assert_true(blocked,'malformed patch rejected');
 end loop;
end $$;
do $$declare caso jsonb;blocked boolean;begin
 for caso in select value from jsonb_array_elements('[
  {"doc":[{"id":1}],"change":{"op":"array_sync","path":[],"order":[1,1],"items":[]}},
  {"doc":[{"id":1}],"change":{"op":"array_sync","path":[],"order":[2],"items":[]}},
  {"doc":[{"id":1}],"change":{"op":"array_sync","path":[],"order":[1],"items":[{"id":1}]}},
  {"doc":[{"id":1}],"change":{"op":"array_sync","path":[],"order":[1],"items":[{"id":2}]}},
  {"doc":[{"id":1},{"id":1}],"change":{"op":"array_sync","path":[],"order":[1],"items":[]}},
  {"doc":[{"id":true}],"change":{"op":"array_sync","path":[],"order":[true],"items":[]}}
 ]') loop
  blocked:=false;begin perform public.app_aplicar_delta(caso->'doc',jsonb_build_array(caso->'change'));exception when others then blocked:=true;end;
  perform pg_temp.assert_true(blocked,'malformed identified array rejected');
 end loop;
end $$;
do $$declare documento jsonb;orden jsonb;resultado jsonb;demasiado jsonb;demasiados_items jsonb;blocked boolean:=false;inicio timestamptz;duracion_ms numeric;begin
 select jsonb_agg(jsonb_build_object('id',n,'value','Fila ficticia '||n) order by n),jsonb_agg(to_jsonb(n) order by n desc)
 into documento,orden from generate_series(1,2000) n;
 inicio:=clock_timestamp();
 resultado:=public.app_aplicar_delta(documento,jsonb_build_array(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order',orden,'items','[]'::jsonb)));
 duracion_ms:=extract(epoch from clock_timestamp()-inicio)*1000;
 perform pg_temp.assert_true(jsonb_array_length(resultado)=2000 and resultado#>>'{0,id}'='2000' and resultado#>>'{1999,id}'='1','identified array 2000 exact');
 perform pg_temp.assert_true(duracion_ms<5000,'identified array 2000 bounded');
 select jsonb_agg(to_jsonb(n) order by n) into demasiado from generate_series(1,2001) n;
 begin perform public.app_aplicar_delta(documento,jsonb_build_array(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order',demasiado,'items',jsonb_build_array(jsonb_build_object('id',2001)))));exception when others then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'identified order over limit rejected');
 blocked:=false;begin perform public.app_aplicar_delta(documento||jsonb_build_array(jsonb_build_object('id',2001)),jsonb_build_array(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order',orden,'items','[]'::jsonb)));exception when others then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'identified source over limit rejected');
 select jsonb_agg(jsonb_build_object('id',3000+n) order by n) into demasiados_items from generate_series(1,2001) n;
 blocked:=false;begin perform public.app_aplicar_delta(documento,jsonb_build_array(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order','[]'::jsonb,'items',demasiados_items)));exception when others then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'identified additions over limit rejected');
end $$;
do $$declare documento jsonb;cambios jsonb;resultado jsonb;blocked boolean:=false;begin
 documento:=jsonb_build_object('id',1,'payload',repeat('x',9*1024*1024));
 resultado:=public.app_aplicar_delta(documento,'[{"op":"set","path":["marker"],"value":1},{"op":"set","path":["marker"],"value":2}]'::jsonb);
 perform pg_temp.assert_true(resultado->>'marker'='2','large document small patch stays within work budget');
 select jsonb_agg(jsonb_build_object('op','set','path',jsonb_build_array('marker'),'value',n) order by n)
   into cambios from generate_series(1,29)n;
 begin perform public.app_aplicar_delta(documento,cambios);exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'large document repeated copy work is rejected before applying');
 blocked:=false;
 select jsonb_agg(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order','[1]'::jsonb,'items','[]'::jsonb))
   into cambios from generate_series(1,9);
 begin perform public.app_aplicar_delta('[{"id":1}]'::jsonb,cambios);exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'array sync operations per block are bounded');
 blocked:=false;
 select jsonb_build_array(jsonb_build_object('op','set','path','[]'::jsonb,'value',jsonb_build_object('payload',repeat('g',5*1024*1024),'marker',0)))
        ||coalesce(jsonb_agg(jsonb_build_object('op','set','path',jsonb_build_array('marker'),'value',n) order by n),'[]'::jsonb)
   into cambios from generate_series(1,63)n;
 begin perform public.app_aplicar_delta('{"marker":0}'::jsonb,cambios);exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'small document growth work is rejected before applying');
 blocked:=false;
 documento:=jsonb_build_object('payload',repeat('f',23*1024*1024));
 begin perform public.app_aplicar_delta(documento,jsonb_build_array(jsonb_build_object('op','set','path',jsonb_build_array('extra'),'value',repeat('f',2*1024*1024))));exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'resulting document size is bounded');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';vp timestamptz;vc timestamptz;ops33 jsonb;ops32 jsonb;sync5 jsonb;blocked boolean;begin
 select updated_at into vp from public.app_leer_bloques(e,array['proyectos']);
 select updated_at into vc from public.app_leer_bloques(e,array['contactos']);
 select jsonb_agg(jsonb_build_object('op','set','path','["0","name"]'::jsonb,'value',n) order by n) into ops33 from generate_series(1,33)n;
 select jsonb_agg(jsonb_build_object('op','set','path','["0","name"]'::jsonb,'value',n) order by n) into ops32 from generate_series(1,32)n;
 blocked:=false;begin
  perform public.app_guardar_lote_delta(e,jsonb_build_array(
   jsonb_build_object('bloque','proyectos','base',vp,'cambios',ops33),
   jsonb_build_object('bloque','contactos','base',vc,'cambios',ops32)));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'legacy envelope aggregate operations are bounded');
 select jsonb_agg(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order','[1]'::jsonb,'items','[]'::jsonb)) into sync5 from generate_series(1,5);
 blocked:=false;begin
  perform public.app_guardar_lote_delta(e,jsonb_build_array(
   jsonb_build_object('bloque','proyectos','base',vp,'cambios',sync5),
   jsonb_build_object('bloque','contactos','base',vc,'cambios',sync5)));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'legacy envelope aggregate array syncs are bounded');
 blocked:=false;begin
  perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object(
   'bloque','proyectos','base',vp,'contenido',jsonb_build_object('payload',repeat('x',16*1024*1024+1)))));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'legacy full document size is bounded');
 blocked:=false;begin
  perform public.app_guardar_lote_delta(e,jsonb_build_array(
   jsonb_build_object('bloque','proyectos','base',vp,'contenido',jsonb_build_object('payload',repeat('x',13*1024*1024))),
   jsonb_build_object('bloque','contactos','base',vc,'contenido',jsonb_build_object('payload',repeat('y',13*1024*1024)))));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'legacy total envelope size is bounded');
end $$;
reset role;
-- ARRAY_SYNC_ROLLBACK_FIRST_HERE
select pg_temp.assert_true(obj_description('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure,'pg_proc')='moderno.app_aplicar_delta/legacy-budget-v2','first rollback records exact legacy marker');
create temp table array_sync_pre_rollback as
select pg_get_functiondef('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure) as definition,
 'public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure::oid as writer_oid,
 (select md5(string_agg(estudio_id::text||'/'||bloque||'/'||contenido::text||'/'||updated_at::text,'|' order by estudio_id,bloque)) from public.datos_estudio) as data_digest,
 (select count(*) from pg_policies where schemaname='public') as policy_count;
-- ARRAY_SYNC_UPGRADE_HERE
select pg_temp.assert_true(position('array_sync' in pg_get_functiondef('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure))>0,'array sync upgrade restored');
select pg_temp.assert_true(obj_description('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure,'pg_proc')='moderno.app_aplicar_delta/array-sync-v2','upgrade records exact array marker');
select pg_temp.assert_true(obj_description('public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure,'pg_proc')='moderno.app_guardar_lote_delta/envelope-budget-v2','upgrade hardens and marks the legacy writer');
-- ARRAY_SYNC_ROLLBACK_SECOND_HERE
select pg_temp.assert_true(obj_description('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure,'pg_proc')='moderno.app_aplicar_delta/legacy-budget-v2','second rollback records exact legacy marker');
select pg_temp.assert_true((select definition=pg_get_functiondef('public.app_aplicar_delta(jsonb,jsonb)'::regprocedure) from array_sync_pre_rollback),'array sync rollback byte equivalent');
select pg_temp.assert_true((select writer_oid='public.app_guardar_lote_delta(uuid,jsonb)'::regprocedure::oid and data_digest=(select md5(string_agg(estudio_id::text||'/'||bloque||'/'||contenido::text||'/'||updated_at::text,'|' order by estudio_id,bloque)) from public.datos_estudio) and policy_count=(select count(*) from pg_policies where schemaname='public') from array_sync_pre_rollback),'array sync rollback preserves writer data and policies');
select pg_temp.assert_true(not has_function_privilege('anon','public.app_aplicar_delta(jsonb,jsonb)','execute') and has_function_privilege('authenticated','public.app_aplicar_delta(jsonb,jsonb)','execute'),'array sync rollback preserves grants');
select count(*) as delta_checks_passed from assertions;
rollback;
