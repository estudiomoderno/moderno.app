// Builds a rollback-only test; no database connection or credentials.
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const strip=p=>read(p).replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
let sql=read('scripts/sql/recorrido-base.sql');
sql=sql.replace("'solicitud','{\"items\":[\"silla337\"],\"proveedor\":\"Proveedor ficticio\"}'","'solicitud','{\"items\":[\"silla337\"],\"cantidades\":[1],\"proveedor\":\"Proveedor ficticio\"}'")
 .replace('=145.20','=72.60').replaceAll("o->>'estado'='parcial'","o->>'estado'='recibido'");
sql=sql.replace(" insert into recorrido values('cantidad_total_pedida_no_supera_ficha',fallo);",` insert into recorrido values('cantidad_total_pedida_no_supera_ficha',fallo);
 req:=jsonb_build_object('id',o->>'id','version',o->'version','cantidades','[2]'::jsonb,'nota','Instalacion ficticia');
 fallo:=false;begin perform public.app_operaciones_accion(e,'337001','instalar',req,gen_random_uuid());exception when others then fallo:=true;end;
 insert into recorrido values('instalar_no_supera_recibido',fallo);
 req:=jsonb_set(req,'{cantidades}','[1]');cmd:=gen_random_uuid();
 o:=public.app_operaciones_accion(e,'337001','instalar',req,cmd);
 insert into recorrido values('instalacion_registrada',(o#>>'{contenido,lineas,0,instalado}')::numeric=1);
 insert into recorrido values('instalacion_reintento_idempotente',public.app_operaciones_accion(e,'337001','instalar',req,cmd)=o);
 fallo:=false;begin perform public.app_pedido_economia(e,'337001','devolver',jsonb_build_object('id',o->>'id','version',o->'version','cantidades','[1]'::jsonb,'nota','Devolucion ficticia'),gen_random_uuid());exception when others then fallo:=true;end;
 insert into recorrido values('devolucion_exige_retirar_instalado',fallo);
 o:=public.app_operaciones_accion(e,'337001','desinstalar',jsonb_build_object('id',o->>'id','version',o->'version','cantidades','[1]'::jsonb,'nota','Retirada ficticia documentada'),gen_random_uuid());
 insert into recorrido values('retirada_conserva_pago',(o#>>'{contenido,lineas,0,instalado}')::numeric=0 and (o#>>'{contenido,pagos,0,importe}')::numeric=50);
 o:=public.app_pedido_economia(e,'337001','devolver',jsonb_build_object('id',o->>'id','version',o->'version','cantidades','[1]'::jsonb,'nota','Devolucion tras retirada'),gen_random_uuid());
 insert into recorrido values('devolucion_tras_retirada',(o#>>'{contenido,lineas,0,devuelto}')::numeric=1);
 r:=public.app_operaciones_accion(e,'337001','solicitud','{"items":["silla337"],"cantidades":[1],"proveedor":"Proveedor parcial"}',gen_random_uuid());
 r:=public.app_operaciones_accion(e,'337001','oferta',jsonb_build_object('id',r->>'id','version',r->'version','precios','[55]'::jsonb),gen_random_uuid());
 o2:=public.app_operaciones_accion(e,'337001','pedido',jsonb_build_object('id',r->>'id','version',r->'version','oferta',r#>>'{contenido,ofertas,0,id}'),gen_random_uuid());
 o2:=public.app_operaciones_accion(e,'337001','confirmar',jsonb_build_object('id',o2->>'id','version',o2->'version'),gen_random_uuid());
 insert into recorrido values('reparto_en_dos_pedidos',o2->>'estado'='confirmado' and (o2#>>'{contenido,lineas,0,qty}')::numeric=1);
`);
sql=sql.replace('select * from recorrido;',()=>`update public.miembros set rol='miembro' where user_id='52957931-04e3-4342-8122-912e95227d9c';
set local role authenticated;
do $$declare fallo boolean:=false;begin
 begin perform public.app_operaciones_accion('33700000-0000-4000-8000-000000000001','337001','instalar','{}',gen_random_uuid());exception when insufficient_privilege then fallo:=true;end;
 insert into recorrido values('colaborador_no_instala_comercial',fallo);
end$$;
reset role;
select count(*) as comprobaciones,bool_and(correcto is true) as todas_correctas,jsonb_agg(nombre) filter(where correcto is distinct from true) as fallos from recorrido;`);
const roles=[['Gestoría (solo lectura)','gestoria'],['Cliente','cliente'],['Contratista (obra)','contratista']].map(([label,role])=>`
select set_config('request.jwt.claims','{}',true);
update public.datos_estudio set contenido=jsonb_set(contenido,'{users}','[{"email":"recuperacion-v336-20260911@example.invalid","role":"${label}"}]') where estudio_id='33700000-0000-4000-8000-000000000001' and bloque='config';
select set_config('request.jwt.claims','{"sub":"52957931-04e3-4342-8122-912e95227d9c","role":"authenticated"}',true);
set local role authenticated;
do $$declare fallo boolean:=false;begin
 insert into recorrido values('${role}_rol_real',public.app_rol('33700000-0000-4000-8000-000000000001')='${role}');
 begin perform public.app_operaciones_accion('33700000-0000-4000-8000-000000000001','337001','instalar','{}',gen_random_uuid());exception when insufficient_privilege then fallo:=true;end;
 insert into recorrido values('${role}_no_instala',fallo);
 fallo:=false;begin perform public.app_operaciones_lee('33700000-0000-4000-8000-000000000001','337001');exception when insufficient_privilege then fallo:=true;end;
 insert into recorrido values('${role}_sin_registro_comercial',fallo);
end$$;
reset role;`).join('\n');
sql=sql.replace('select count(*) as comprobaciones',()=>roles+`
insert into recorrido select 'proyeccion_financiera_sin_snapshot_privado',not (public.app_finanzas_lectura('{"invoices":[{"lines":[{"name":"Silla","qty":1,"price":100,"cost":60,"source":{"snapshot":{"cost":60}}}]}]}')#>'{invoices,0,lines,0}' ?| array['source','cost']);
set local role anon;
insert into recorrido select 'portal_sin_pedidos_instalaciones_costes',public.portal_aprobaciones('recorridoficticio337')::text not like '%proveedor%' and public.portal_aprobaciones('recorridoficticio337')::text not like '%instalado%' and public.portal_aprobaciones('recorridoficticio337')::text not like '%cost%';
reset role;
select count(*) as comprobaciones`);
sql=sql.replace('begin;',()=> 'begin;\n'+strip('SQL/operaciones-producto.sql')+'\n'+strip('SQL/pedidos-economia.sql'));
if(!/rollback;\s*$/i.test(sql))throw Error('Falta ROLLBACK');
if(!process.argv[2])throw Error('Indica destino');fs.writeFileSync(process.argv[2],sql);
