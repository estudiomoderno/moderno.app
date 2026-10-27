-- Existing allowlisted project metadata, disposable fixture only.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';r record;v jsonb;p jsonb;idx integer;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 p:='{"id":99001,"num":"PR-99001","brand":"cm","name":"Nuevo proyecto ficticio","client":"Cliente ficticio","status":"En progreso","type":"Reforma integral","addr":"Calle de Prueba 12B, Portal B 2º A, Ciudad ficticia, Provincia ficticia, España","city":"Ciudad ficticia","country":"España","cp":"00123","placeId":"place-fixture-only","tasks":[]}'::jsonb;
 idx:=jsonb_array_length(r.contenido);v:=r.contenido||jsonb_build_array(p);
 perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'contenido',v)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido->idx->>'addr'=p->>'addr','new project full address including street number province survives collaborator save');
 perform pg_temp.assert_true(r.contenido->idx->>'cp'='00123','postal code survives collaborator save with leading zeros');
 perform pg_temp.assert_true(r.contenido->idx->>'city'=p->>'city' and r.contenido->idx->>'country'=p->>'country','project city and country survive reread');
 perform pg_temp.assert_true(r.contenido->idx->>'placeId'='place-fixture-only','Google place reference survives collaborator full save');
 perform pg_temp.assert_true(r.contenido->idx->>'type'='Reforma integral','project type survives collaborator save');
 perform pg_temp.assert_true(r.contenido->idx->>'num'='PR-99001' and r.contenido->idx->>'client'='Cliente ficticio','project identity and client preserved');
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'cambios',jsonb_build_array(jsonb_build_object('op','set','path',jsonb_build_array(idx::text,'type'),'value','Decoración')))));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido->idx->>'type'='Decoración','project type survives delta save');
 perform pg_temp.assert_true(r.contenido->idx->>'addr'=p->>'addr','address remains after unrelated project edit');
 perform pg_temp.assert_true(r.contenido->idx->>'placeId'='place-fixture-only','Google place reference survives unrelated delta');
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','base',r.updated_at,'cambios',jsonb_build_array(jsonb_build_object('op','set','path',jsonb_build_array(idx::text,'placeId'),'value','""'::jsonb)))));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido->idx->>'placeId'='','stale reference can be cleared after a manual address change');
 perform pg_temp.assert_true(strpos(r.contenido::text,'"fee"')=0,'new project metadata cannot expose protected finances');
end$$;
reset role;
