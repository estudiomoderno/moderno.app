select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000001';r record;v jsonb;blocked boolean;bad jsonb;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 v:=jsonb_set(r.contenido,'{0,rooms,0,sections,0,items,0}',(r.contenido#>'{0,rooms,0,sections,0,items,0}')||'{"name":"Mesa editada ficticia","price":25,"qty":3,"cost":null,"margin":null,"addedAt":"2026-10-22T09:00:00Z"}');
 perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','contenido',v,'base',r.updated_at)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido#>>'{0,rooms,0,sections,0,items,0,name}'='Mesa editada ficticia','legacy product edit saved');
 perform pg_temp.assert_true(strpos(r.contenido::text,'"cost"')=0 and strpos(r.contenido::text,'"margin"')=0,'private amounts still unreadable');
 v:=jsonb_set(r.contenido,'{0,rooms}',(r.contenido#>'{0,rooms}')||'[{"id":10,"name":"Lista colaboradora","kind":"pav","icon":"wall","created":"2026-10-22","sections":[{"id":"section-new","name":"General","items":[{"id":"product-new","name":"Producto nuevo","price":30,"qty":2,"cost":null,"margin":null,"addedAt":"2026-10-22T09:00:00Z","url":"https://shop.example.invalid/item","supplier":"Tienda ficticia","sku":"new-1","dims":"30x40","material":"Roble","color":"Natural","plazo":"1 semana","unit":"ud","status":"Revisión Cliente","files":[],"img":"","note":"Prueba ficticia"}]}]}]');
 perform public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','contenido',v,'base',r.updated_at)));
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido#>>'{0,rooms,1,kind}'='pav' and r.contenido#>>'{0,rooms,1,icon}'='wall','new list category and icon round trip');
 perform pg_temp.assert_true(r.contenido#>>'{0,rooms,1,sections,0,items,0,addedAt}'='2026-10-22T09:00:00Z','product creation date round trip');
 for bad in select value from jsonb_array_elements('[{"cost":0},{"cost":99},{"margin":0},{"margin":20},{"secret":"attack"}]') loop
  v:=jsonb_set(r.contenido,'{0,rooms,0,sections,0,items,0}',(r.contenido#>'{0,rooms,0,sections,0,items,0}')||bad);
  blocked:=false;begin perform public.app_guardar_lote(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','contenido',v,'base',r.updated_at)));exception when insufficient_privilege then blocked:=true;end;
  perform pg_temp.assert_true(blocked,'non-null private field or unknown field remains rejected');
 end loop;
 blocked:=false;begin perform public.app_colaborador_preparar_lista('{}');exception when insufficient_privilege then blocked:=true;end;
 perform pg_temp.assert_true(blocked,'normalizer not a callable public RPC');
end$$;
reset role;
select pg_temp.assert_true((select contenido#>>'{0,rooms,0,sections,0,items,0,cost}'='7' and contenido#>>'{0,rooms,0,sections,0,items,0,price}'='25' from public.datos_estudio where bloque='proyectos'),'actual private cost preserved while public price changes');
select pg_temp.assert_true(not has_function_privilege('anon','public.app_colaborador_preparar_lista(jsonb)','execute'),'anonymous cannot normalize');
select pg_temp.assert_true(not (select prosecdef from pg_proc where oid='public.app_colaborador_preparar_lista(jsonb)'::regprocedure),'normalizer never gains definer rights');
