-- Disposable PostgreSQL only. All identities and records are fictional.
begin;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public') or exists(select 1 from auth.users) then
  raise exception 'Requires an empty isolated database';
 end if;
end $$;
create schema extensions;
create extension pgcrypto with schema extensions;
create table public.estudios(id uuid primary key);
create table public.miembros(estudio_id uuid references public.estudios(id),user_id uuid references auth.users(id),rol text,primary key(estudio_id,user_id));
create table public.datos_estudio(estudio_id uuid references public.estudios(id),bloque text,contenido jsonb,updated_at timestamptz,primary key(estudio_id,bloque));
create function public.app_rol_usuario(e uuid,u uuid) returns text language sql stable security definer set search_path='' as $$select coalesce((select case when rol='admin' then 'admin' else 'colaborador' end from public.miembros where estudio_id=e and user_id=u),'sin_acceso')$$;
-- BASELINE_HERE
revoke all on all functions in schema public from public,anon,authenticated;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function public.app_rol(uuid),public.app_leer_bloques(uuid,text[]),public.app_guardar_lote(uuid,jsonb),public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) to authenticated;
alter table public.datos_estudio enable row level security;
grant select on public.datos_estudio to authenticated;
create policy fixture_admin_only on public.datos_estudio for select to authenticated using(public.app_rol(estudio_id)='admin');
-- DELTA_HERE
-- CANDIDATE_HERE

create temp table assertions(label text);
create temp table lost_response_fixture(request jsonb,confirmed_version timestamptz);
grant insert,select on assertions to authenticated;
grant insert,select on lost_response_fixture to authenticated;
create function pg_temp.assert_true(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label; end if;insert into assertions values(label);end$$;

insert into auth.users values
 ('00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000012');
insert into public.estudios values('00000000-0000-4000-8000-000000000001');
insert into public.miembros values
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','admin'),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','miembro');
insert into public.datos_estudio values
 ('00000000-0000-4000-8000-000000000001','proyectos','[{"id":1,"name":"Ficticio","rooms":[{"id":2,"sections":[{"items":[{"id":3,"name":"Mesa ficticia","qty":1,"price":20,"cost":7}]}]}]}]','2026-01-01'),
 ('00000000-0000-4000-8000-000000000001','contactos','[{"id":1,"name":"Ficticio"}]','2026-01-01'),
 ('00000000-0000-4000-8000-000000000001','agenda',jsonb_build_object('payload',repeat('x',9*1024*1024)),'2026-01-01');

select pg_temp.assert_true(not has_function_privilege('anon','public.app_guardar_lote_v2(uuid,jsonb)','execute'),'anon denied');
select pg_temp.assert_true(not has_function_privilege('anon','public.app_confirmar_guardado_v2(uuid,uuid)','execute'),'anon confirmation denied');
select pg_temp.assert_true(has_function_privilege('authenticated','public.app_guardar_lote_v2(uuid,jsonb)','execute'),'authenticated RPC only');
select pg_temp.assert_true(has_function_privilege('authenticated','public.app_confirmar_guardado_v2(uuid,uuid)','execute'),'authenticated confirmation only');
select pg_temp.assert_true(not has_schema_privilege('authenticated','app_private','usage') and not has_table_privilege('authenticated','app_private.save_requests','select'),'ledger private');
select pg_temp.assert_true((select prosecdef and 'search_path=""'=any(proconfig) and not coalesce(proconfig@>array['statement_timeout=60s'],false) from pg_proc where oid='public.app_guardar_lote_v2(uuid,jsonb)'::regprocedure),'definer has empty path and does not claim an ineffective inner timeout');
select pg_temp.assert_true((select prosecdef and 'search_path=""'=any(proconfig) from pg_proc where oid='public.app_confirmar_guardado_v2(uuid,uuid)'::regprocedure),'confirmation definer has empty path');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$
declare
 e constant uuid:='00000000-0000-4000-8000-000000000001';
 rid constant text:='10000000-0000-4000-8000-000000000001';
 v timestamptz; saved timestamptz; after_replay timestamptz; out1 jsonb;out2 jsonb;request jsonb;blocked boolean;i integer;
begin
 select updated_at into v from public.app_leer_bloques(e,array['proyectos']);
 request:=jsonb_build_object('v',2,'requestId',rid,'cambios',jsonb_build_array(jsonb_build_object(
  'bloque','proyectos','base',v,'cambios','[{"op":"set","path":["0","name"],"value":"Editado una vez"}]'::jsonb)));
 out1:=public.app_guardar_lote_v2(e,request);
 select updated_at into saved from public.app_leer_bloques(e,array['proyectos']);
 out2:=public.app_guardar_lote_v2(e,request);
 select updated_at into after_replay from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(out1->>'replayed'='false' and out2->>'replayed'='true','retry reports replay');
 perform pg_temp.assert_true(saved=after_replay and out1->'bloques'->0->>'updated_at'=out2->'bloques'->0->>'updated_at','retry keeps exact version');
 perform pg_temp.assert_true((select contenido#>>'{0,name}'='Editado una vez' from public.app_leer_bloques(e,array['proyectos'])),'content committed once');

 blocked:=false;
 begin
  perform public.app_guardar_lote_v2(e,jsonb_set(request,'{cambios,0,cambios,0,value}','"otro"'::jsonb));
 exception when sqlstate 'PT409' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'same request id with another body conflicts');

 request:=jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000002','cambios',jsonb_build_array(jsonb_build_object(
  'bloque','proyectos','base',saved,'cambios','[]'::jsonb)));
 out1:=public.app_guardar_lote_v2(e,request);
 perform pg_temp.assert_true(out1->'bloques'->0->>'changed'='false','no-op acknowledged without update');
 perform pg_temp.assert_true((select updated_at=saved from public.app_leer_bloques(e,array['proyectos'])),'no-op keeps version');

 request:=jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000003','cambios',jsonb_build_array(
  jsonb_build_object('bloque','proyectos','base',saved,'cambios','[{"op":"set","path":["0","name"],"value":"No debe quedar"}]'::jsonb),
  jsonb_build_object('bloque','contactos','base','2000-01-01T00:00:00Z','contenido','[]'::jsonb)));
 blocked:=false;begin perform public.app_guardar_lote_v2(e,request);exception when sqlstate 'PT409' then blocked:=true;end;
 perform pg_temp.assert_true(blocked and (select contenido#>>'{0,name}'='Editado una vez' from public.app_leer_bloques(e,array['proyectos'])),'multi-block conflict is atomic');

 blocked:=false;begin perform public.app_guardar_lote_v2(e,'{"v":2,"requestId":"10000000-0000-4000-8000-000000000004","cambios":[],"extra":true}');exception when sqlstate '22023' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'unknown envelope keys rejected');

 blocked:=false;begin
  perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000005','cambios',jsonb_build_array(jsonb_build_object(
   'bloque','proyectos','base',saved,'cambios',jsonb_build_array(jsonb_build_object('op','set','path',jsonb_build_array('0','notes'),'value',repeat('x',8*1024*1024+1)))))));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'oversized operation rejected by measured bytes');

 blocked:=false;begin
  perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000006','cambios',jsonb_build_array(jsonb_build_object(
   'bloque','proyectos','base',saved,'contenido',repeat('x',16*1024*1024+1)))));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'oversized full document rejected by measured bytes');

 blocked:=false;begin
  perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000007','cambios',jsonb_build_array(
   jsonb_build_object('bloque','proyectos','base',saved,'contenido',repeat('x',13*1024*1024)),
   jsonb_build_object('bloque','contactos','base','2026-01-01T00:00:00+00:00','contenido',repeat('y',13*1024*1024)))));
 exception when sqlstate '54000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'oversized envelope rejected by measured bytes');

	 -- El limite es acumulado en todo el envelope, no 64 operaciones por cada
	 -- uno de los nueve bloques.
	 declare
	  ops33 jsonb;ops32 jsonb;ids4001 jsonb;
	 begin
	  select jsonb_agg(jsonb_build_object('op','set','path',jsonb_build_array('name'),'value',n)) into ops33 from generate_series(1,33)n;
	  select jsonb_agg(jsonb_build_object('op','set','path',jsonb_build_array('name'),'value',n)) into ops32 from generate_series(1,32)n;
	  blocked:=false;begin
	   perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000008','cambios',jsonb_build_array(
	    jsonb_build_object('bloque','proyectos','base',saved,'cambios',ops33),
	    jsonb_build_object('bloque','contactos','base','2026-01-01T00:00:00+00:00','cambios',ops32))));
	  exception when sqlstate '54000' then blocked:=true;end;
	  perform pg_temp.assert_true(blocked,'aggregate operations across blocks are bounded');

	  select jsonb_agg(to_jsonb(n)) into ids4001 from generate_series(1,4001)n;
	  blocked:=false;begin
	   perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000009','cambios',jsonb_build_array(
	    jsonb_build_object('bloque','proyectos','base',saved,'cambios',jsonb_build_array(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order',ids4001,'items','[]'::jsonb))),
	    jsonb_build_object('bloque','contactos','base','2026-01-01T00:00:00+00:00','cambios',jsonb_build_array(jsonb_build_object('op','array_sync','path','[]'::jsonb,'order',ids4001,'items','[]'::jsonb))))));
	  exception when sqlstate '54000' then blocked:=true;end;
	  perform pg_temp.assert_true(blocked,'aggregate array identities across blocks are bounded');
	 end;

		 -- Un documento inicialmente pequeno no puede saltarse el presupuesto
		 -- creciendo en la primera operacion y reconstruyendose otras 63 veces.
		 declare
		  growth_ops jsonb;
		 begin
		  select jsonb_build_array(jsonb_build_object('op','set','path','[]'::jsonb,'value',jsonb_build_object('payload',repeat('g',5*1024*1024),'marker',0)))
		         ||coalesce(jsonb_agg(jsonb_build_object('op','set','path',jsonb_build_array('marker'),'value',n) order by n),'[]'::jsonb)
		    into growth_ops from generate_series(1,63)n;
		  blocked:=false;begin
		   perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000012','cambios',jsonb_build_array(jsonb_build_object(
		    'bloque','proyectos','base',saved,'cambios',growth_ops))));
		  exception when sqlstate '54000' then blocked:=true;end;
		  perform pg_temp.assert_true(blocked,'small document growth envelope work is rejected before applying');
		 end;

	 -- Documento grande con pocas operaciones: permitido. El mismo documento con
	 -- trabajo repetido por encima de 256 MiB: rechazo antes de aplicar o registrar.
	 declare
	  agenda_base timestamptz;agenda_saved timestamptz;many_ops jsonb;
	 begin
	  select updated_at into agenda_base from public.app_leer_bloques(e,array['agenda']);
	  out1:=public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000010','cambios',jsonb_build_array(jsonb_build_object(
	   'bloque','agenda','base',agenda_base,'cambios','[{"op":"set","path":["marker"],"value":1},{"op":"set","path":["marker"],"value":2}]'::jsonb))));
	  select updated_at into agenda_saved from public.app_leer_bloques(e,array['agenda']);
	  perform pg_temp.assert_true(out1->'bloques'->0->>'changed'='true' and (select contenido->>'marker'='2' from public.app_leer_bloques(e,array['agenda'])),'large document with bounded work is accepted');
	  select jsonb_agg(jsonb_build_object('op','set','path',jsonb_build_array('marker'),'value',n) order by n) into many_ops from generate_series(1,15)n;
	  blocked:=false;begin
	   perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000011','cambios',jsonb_build_array(jsonb_build_object(
	    'bloque','agenda','base',agenda_saved,'cambios',many_ops))));
	  exception when sqlstate '54000' then blocked:=true;end;
	  perform pg_temp.assert_true(blocked and (select contenido->>'marker'='2' and updated_at=agenda_saved from public.app_leer_bloques(e,array['agenda'])),'large document repeated envelope work is rejected before applying');
	 end;

 -- Ninguna solicitud reciente sin confirmar se expulsa por cantidad.
 for i in 1..40 loop
  perform public.app_guardar_lote_v2(e,jsonb_build_object(
   'v',2,'requestId','30000000-0000-4000-8000-'||lpad(i::text,12,'0'),
   'cambios',jsonb_build_array(jsonb_build_object('bloque','proyectos','base',saved,'cambios','[]'::jsonb))));
 end loop;
end $$;
reset role;

select pg_temp.assert_true((select count(*)=40 from app_private.save_requests where actor_id='00000000-0000-4000-8000-000000000011' and request_id::text like '30000000-%'),'ledger keeps all 40 recent unconfirmed receipts');
select pg_temp.assert_true(exists(select 1 from app_private.save_requests where request_id='10000000-0000-4000-8000-000000000001'),'lost acknowledgement A remains replayable after more than 32 saves');
select pg_temp.assert_true(not exists(select 1 from app_private.save_requests where request_id='10000000-0000-4000-8000-000000000003'),'failed atomic request has no receipt');

-- Una pestana confirma el ACK, pero otra que perdio la misma respuesta todavia
-- puede reproducir exactamente el mismo requestId durante la ventana de 24 horas.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
select pg_temp.assert_true(public.app_confirmar_guardado_v2('00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),'exact receipt confirmed');
select pg_temp.assert_true(public.app_confirmar_guardado_v2('00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),'repeated confirmation is harmless');
do $$
declare
 e constant uuid:='00000000-0000-4000-8000-000000000001';
 v timestamptz;replayed jsonb;
begin
 select updated_at into v from public.app_leer_bloques(e,array['proyectos']);
 replayed:=public.app_guardar_lote_v2(e,jsonb_build_object(
  'v',2,'requestId','30000000-0000-4000-8000-000000000001',
  'cambios',jsonb_build_array(jsonb_build_object('bloque','proyectos','base',v,'cambios','[]'::jsonb))));
 perform pg_temp.assert_true(replayed->>'replayed'='true','tab B lost ACK replays after tab A confirms');
end $$;
reset role;
select pg_temp.assert_true(exists(select 1 from app_private.save_requests where request_id='30000000-0000-4000-8000-000000000001' and acknowledged_at is not null) and exists(select 1 from app_private.save_requests where request_id='30000000-0000-4000-8000-000000000002' and acknowledged_at is null),'confirmation keeps the exact replay and does not touch another request');

-- TTL: un ACK de mas de 24 horas y un abandono de mas de 30 dias vencen;
-- A y los recibos recientes sobreviven.
update app_private.save_requests set acknowledged_at=statement_timestamp()-interval '25 hours'
where request_id='30000000-0000-4000-8000-000000000001';
update app_private.save_requests set committed_at=statement_timestamp()-interval '31 days'
where request_id='30000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$
declare e constant uuid:='00000000-0000-4000-8000-000000000001';v timestamptz;
begin
 select updated_at into v from public.app_leer_bloques(e,array['proyectos']);
 perform public.app_guardar_lote_v2(e,jsonb_build_object(
  'v',2,'requestId','30000000-0000-4000-8000-000000000041',
  'cambios',jsonb_build_array(jsonb_build_object('bloque','proyectos','base',v,'cambios','[]'::jsonb))));
end $$;
reset role;
select pg_temp.assert_true(not exists(select 1 from app_private.save_requests where request_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')),'TTL removes acknowledged receipts after 24 hours and abandoned receipts after 30 days');
select pg_temp.assert_true(exists(select 1 from app_private.save_requests where request_id='30000000-0000-4000-8000-000000000003') and exists(select 1 from app_private.save_requests where request_id='10000000-0000-4000-8000-000000000001'),'TTL preserves recent receipts and lost acknowledgement A');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
set local role authenticated;
do $$
declare e constant uuid:='00000000-0000-4000-8000-000000000001';r record;out1 jsonb;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 out1:=public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','20000000-0000-4000-8000-000000000001','cambios',jsonb_build_array(jsonb_build_object(
  'bloque','proyectos','base',r.updated_at,'cambios','[{"op":"set","path":["0","name"],"value":"Colaborador ficticio"}]'::jsonb))));
 perform pg_temp.assert_true(out1->'bloques'->0->>'changed'='true','collaborator v2 saved');
end $$;
reset role;
select pg_temp.assert_true((select contenido#>>'{0,name}'='Colaborador ficticio' and contenido#>>'{0,rooms,0,sections,0,items,0,cost}'='7' from public.datos_estudio where bloque='proyectos'),'collaborator hidden fields preserved');

-- Simula COMMIT correcto seguido de respuesta de red perdida: se ignora la
-- primera respuesta y se reenvia exactamente el mismo envelope inmutable.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$declare e constant uuid:='00000000-0000-4000-8000-000000000001';r record;request jsonb;out1 jsonb;confirmed timestamptz;after_replay timestamptz;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 request:=jsonb_build_object('v',2,'requestId','40000000-0000-4000-8000-000000000001','cambios',jsonb_build_array(jsonb_build_object(
  'bloque','proyectos','base',r.updated_at,'cambios','[{"op":"set","path":["0","name"],"value":"Respuesta perdida ficticia"}]'::jsonb)));
 perform public.app_guardar_lote_v2(e,request);
 select updated_at into confirmed from public.app_leer_bloques(e,array['proyectos']);
 insert into lost_response_fixture values(request,confirmed);
 out1:=public.app_guardar_lote_v2(e,request);
 select updated_at into after_replay from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(out1->>'replayed'='true' and confirmed=after_replay,'lost response retry does not write twice');
end $$;
reset role;

-- La reversion acepta replays pero bloquea requestId nuevos.
update app_private.save_protocol_settings set accept_new=false where protocol=2;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$declare e constant uuid:='00000000-0000-4000-8000-000000000001';v timestamptz;blocked boolean;out1 jsonb;request jsonb;confirmed timestamptz;
begin
 select updated_at into v from public.app_leer_bloques(e,array['proyectos']);
 select f.request,f.confirmed_version into request,confirmed from lost_response_fixture f;
 out1:=public.app_guardar_lote_v2(e,request);
 perform pg_temp.assert_true(out1->>'replayed'='true' and (select updated_at=confirmed from public.app_leer_bloques(e,array['proyectos'])),'rollback keeps prior receipt available');
 blocked:=false;begin perform public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','10000000-0000-4000-8000-000000000099','cambios',jsonb_build_array(jsonb_build_object('bloque','proyectos','base',v,'cambios','[]'::jsonb))));exception when sqlstate '55000' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'rollback rejects new operations');
end $$;
reset role;

-- Reaplicar el roll-forward reactiva explicitamente las solicitudes nuevas.
insert into app_private.save_protocol_settings(protocol,accept_new)
values(2,true)
on conflict(protocol) do update
set accept_new=true,updated_at=clock_timestamp();
select pg_temp.assert_true((select accept_new from app_private.save_protocol_settings where protocol=2),'roll-forward reactivates protocol v2');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$declare e constant uuid:='00000000-0000-4000-8000-000000000001';v timestamptz;out1 jsonb;
begin
 select updated_at into v from public.app_leer_bloques(e,array['proyectos']);
 out1:=public.app_guardar_lote_v2(e,jsonb_build_object('v',2,'requestId','50000000-0000-4000-8000-000000000001','cambios',jsonb_build_array(jsonb_build_object('bloque','proyectos','base',v,'cambios','[]'::jsonb))));
 perform pg_temp.assert_true(out1->>'replayed'='false','roll-forward accepts new operations again');
end $$;
reset role;

select count(*) as idempotent_save_checks_passed from assertions;
rollback;
