-- Existing writer contract: new category + diary shape, no schema changes or real users.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';r record;v jsonb;blocked boolean;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 v:=jsonb_set(r.contenido,'{0,files}','[{"id":"plan-fixture","name":"Plano.pdf","cat":"plano","type":"application/pdf","data":"storage://archivos/00000000-0000-0000-0000-000000000001/fictional.pdf"},{"id":"doc-fixture","name":"Contrato.pdf","cat":"documento"}]');
 v:=jsonb_set(v,'{0,events}','[{"id":"existing-event","cat":"other","txt":"Keep"},{"id":"diario-fixture","cat":"diario-obra","date":"2026-10-22","txt":"Visita ficticia","createdBy":"Persona ficticia","createdAt":"2026-10-22T09:00:00Z","files":[{"id":"photo-fixture","name":"Foto.jpg","type":"image/jpeg","data":"storage://archivos/00000000-0000-0000-0000-000000000001/fictional.jpg"}]}]');
 perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',v)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido#>>'{0,files,0,cat}'='plano','collaborator plan category durable');
 perform pg_temp.assert_true(r.contenido#>>'{0,files,1,cat}'='documento','document category durable');
 perform pg_temp.assert_true(r.contenido#>>'{0,events,1,txt}'='Visita ficticia' and r.contenido#>>'{0,events,1,files,0,name}'='Foto.jpg','diary notes date author and private photo survive fresh read');
 perform pg_temp.assert_true(r.contenido#>>'{0,events,0,id}'='existing-event','other project events preserved');
 perform pg_temp.assert_true(strpos(r.contenido::text,'"fee"')=0,'private finances remain hidden');
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'cambios','[{"op":"set","path":["0","events","1","txt"],"value":"Visita actualizada"},{"op":"set","path":["0","files","0","cat"],"value":"documento"}]'::jsonb)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido#>>'{0,events,1,txt}'='Visita actualizada' and r.contenido#>>'{0,files,0,cat}'='documento','diary edit and category move durable via delta');
 perform pg_temp.assert_true(r.contenido#>>'{0,events,1,files,0,id}'='photo-fixture','photo references retained when notes change');
 blocked:=false;begin perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',jsonb_set(r.contenido,'{0,fee}','0'))));exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'new diary cannot bypass protected finances');
end$$;
reset role;
