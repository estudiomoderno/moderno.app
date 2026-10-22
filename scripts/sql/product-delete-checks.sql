-- All fixtures are fictional, within the existing transaction, followed by rollback.
reset role;
update public.datos_estudio set contenido='[{"id":101,"name":"Proyecto protegido ficticio","fee":999,"rooms":[{"id":201,"name":"Lista ficticia","sections":[{"id":"s1","name":"General","items":[{"id":"p1","name":"Mesa","price":20,"qty":1,"cost":7},{"id":"p2","name":"Silla","price":10,"qty":2,"cost":4}]}]}]},{"id":102,"name":"Proyecto sin campos privados","rooms":[]}]',updated_at=clock_timestamp() where estudio_id='00000000-0000-0000-0000-000000000001' and bloque='proyectos';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';r record;v jsonb;blocked boolean;old_version timestamptz;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);old_version:=r.updated_at;
 -- Real product deletion through the frontend's delta RPC, including private cost.
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'cambios','[{"op":"splice","path":["0","rooms","0","sections","0","items"],"index":0,"delete":1,"items":[]}]'::jsonb)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(jsonb_array_length(r.contenido#>'{0,rooms,0,sections,0,items}')=1 and r.contenido#>>'{0,rooms,0,sections,0,items,0,id}'='p2','product deletion survives fresh read');
 perform pg_temp.assert_true(strpos(r.contenido::text,'"cost"')=0,'deletion never reveals private cost');
 blocked:=false;begin perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',old_version,'cambios','[{"op":"set","path":[],"value":[]}]'::jsonb)));exception when sqlstate 'PT409' then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'stale deletion cannot overwrite concurrent changes');
 for v in select value from jsonb_array_elements(jsonb_build_array(r.contenido-0,r.contenido-1,'[]'::jsonb)) loop
  blocked:=false;begin perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',v)));exception when insufficient_privilege then blocked:=true;end;
  perform pg_temp.assert_true(blocked,'cannot delete protected or unprotected projects or all projects');
 end loop;
 blocked:=false;begin perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'cambios','[{"op":"remove","path":["1"]}]'::jsonb)));exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'project deletion blocked through delta too');
 v:=jsonb_set(r.contenido,'{0,rooms,0,sections,0,items,0,cost}','0');
 blocked:=false;begin perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',v)));exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'retained private cost still rejects tampering');
 v:=jsonb_set(r.contenido,'{0,rooms,0,sections,0,items}','[]');
 perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',v)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido#>'{0,rooms,0,sections,0,items}'='[]'::jsonb,'last product deletion saves via full writer');
 blocked:=false;begin perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',r.contenido-1),jsonb_build_object('bloque','contactos','base',null,'contenido','[]'::jsonb)));exception when others then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'batch containing project removal fails atomically');
 blocked:=false;begin perform public.app_colaborador_borrados_productos('[]','[]','proyectos');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'helper not directly callable by authenticated users');
 blocked:=false;begin perform public.app_guardar_lote_delta('00000000-0000-0000-0000-000000000099','[{"bloque":"proyectos","contenido":[],"base":null}]');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'another studio is still inaccessible');
end$$;
reset role;
select pg_temp.assert_true((select contenido#>>'{0,fee}'='999' and jsonb_array_length(contenido)=2 from public.datos_estudio where estudio_id='00000000-0000-0000-0000-000000000001' and bloque='proyectos'),'project count and protected fee unchanged');
select pg_temp.assert_true(not has_function_privilege('anon','public.app_colaborador_borrados_productos(jsonb,jsonb,text)','execute'),'anonymous helper denied');
select pg_temp.assert_true(not (select prosecdef from pg_proc where oid='public.app_colaborador_borrados_productos(jsonb,jsonb,text)'::regprocedure),'helper does not elevate privileges');
-- Legacy products with unique names can be deleted, duplicated identities fail closed.
do $$declare old jsonb;fresh jsonb;blocked boolean;
begin
 old:='[{"id":1,"rooms":[{"id":2,"sections":[{"name":"General","items":[{"name":"Legado","price":20,"qty":1,"cost":7}]}]}]}]';
 fresh:=jsonb_set(public.app_colaborador_filtrar(old),'{0,rooms,0,sections,0,items}','[]');
 perform pg_temp.assert_true(public.app_colaborador_combinar(public.app_colaborador_borrados_productos(old,fresh,'proyectos'),fresh)=fresh,'unique legacy product name deletion');
 old:=jsonb_set(old,'{0,rooms,0,sections,0,items}',(old#>'{0,rooms,0,sections,0,items}')||(old#>'{0,rooms,0,sections,0,items}'));
 blocked:=false;begin perform public.app_colaborador_borrados_productos(old,fresh,'proyectos');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'ambiguous legacy products rejected');
end$$;
-- Admin can still delete a complete project.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$declare r record;begin
 select * into r from public.app_leer_bloques('00000000-0000-0000-0000-000000000001',array['proyectos']);
 perform public.app_guardar_lote('00000000-0000-0000-0000-000000000001',jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',r.contenido-1)));
 perform pg_temp.assert_true((select jsonb_array_length(contenido)=1 from public.app_leer_bloques('00000000-0000-0000-0000-000000000001',array['proyectos'])),'admin can delete project');
end$$;
reset role;
-- Recheck the new writer with a 6 MB document under the production request timeout.
set local statement_timeout='8s';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000002';r record;started timestamptz;elapsed numeric;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);started:=clock_timestamp();
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'cambios','[{"op":"splice","path":["0","rooms","0","sections","0","items"],"index":0,"delete":1,"items":[]}]'::jsonb)));
 elapsed:=extract(epoch from clock_timestamp()-started)*1000;
 perform pg_temp.assert_true(elapsed<8000,'1500 products deletion writer below 8 seconds');
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(jsonb_array_length(r.contenido#>'{0,rooms,0,sections,0,items}')=1499,'large deletion durable');
 raise notice '6 MB collaborator product deletion: % ms',elapsed;
end$$;
reset role;
set local statement_timeout=0;
