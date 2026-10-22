-- Whole RPC under the same timeout used by authenticated production requests.
insert into public.miembros values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012','miembro');
insert into public.datos_estudio
select '00000000-0000-0000-0000-000000000002','proyectos',
 jsonb_build_array(jsonb_build_object('id',1,'name','Proyecto grande ficticio','rooms',jsonb_build_array(jsonb_build_object('id',2,'name','Lista ficticia','sections',jsonb_build_array(jsonb_build_object('id',3,'name','General','items',items)))))),'2026-01-01'
from (select jsonb_agg(jsonb_build_object('id',n,'name','Producto ficticio '||n,'price',20,'qty',1,'cost',7,'margin',15,'desc',repeat('x',4000))) as items from generate_series(1,1500) n) products;
set local statement_timeout='8s';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$declare e uuid:='00000000-0000-0000-0000-000000000002';r record;result jsonb;started timestamptz;elapsed numeric;
begin
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 started:=clock_timestamp();
 result:=public.app_guardar_lote_delta(e,jsonb_build_array(jsonb_build_object('bloque','proyectos','cambios','[{"op":"set","path":["0","rooms","0","sections","0","items","0","qty"],"value":2}]'::jsonb,'base',r.updated_at)));
 elapsed:=extract(epoch from clock_timestamp()-started)*1000;
 perform pg_temp.assert_true(jsonb_array_length(result)=1,'1500 products full RPC confirmed');
 perform pg_temp.assert_true(elapsed<8000,'1500 products full RPC below 8 seconds');
 raise notice '1500 products, approximately 6 MB, collaborator delta RPC: % ms',elapsed;
 select * into r from public.app_leer_bloques(e,array['proyectos']);
 perform pg_temp.assert_true(r.contenido#>>'{0,rooms,0,sections,0,items,0,qty}'='2','large collaborator save survives reread');
 perform pg_temp.assert_true(strpos(r.contenido::text,'"cost"')=0 and strpos(r.contenido::text,'"margin"')=0,'large read still hides private amounts');
end $$;
reset role;
set local statement_timeout=0;
select pg_temp.assert_true((select contenido#>>'{0,rooms,0,sections,0,items,0,cost}'='7' and contenido#>>'{0,rooms,0,sections,0,items,0,margin}'='15' from public.datos_estudio where estudio_id='00000000-0000-0000-0000-000000000002' and bloque='proyectos'),'large save keeps real private amounts');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.app_colaborador_combinar_vista(jsonb,jsonb,jsonb)','execute') and not has_function_privilege('anon','public.app_colaborador_combinar_vista(jsonb,jsonb,jsonb)','execute'),'trusted-view helper internal only');
