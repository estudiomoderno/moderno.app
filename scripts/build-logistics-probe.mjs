import fs from 'node:fs';
const strip=s=>s.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');
let sql=fs.readFileSync(new URL('./sql/recorrido-base.sql',import.meta.url),'utf8');
sql=sql.replace('end$$;\nreset role;',()=>`
 req:=jsonb_build_object('id',o->>'id','version',o->'version','fecha','2026-09-15','nota','Fecha acordada ficticia');cmd:=gen_random_uuid();
 o:=public.app_pedido_economia(e,'337001','fecha_entrega',req,cmd);
 insert into recorrido values('fecha_prevista_registrada',o#>>'{contenido,fecha_entrega}'='2026-09-15');
 insert into recorrido values('fecha_reintento_idempotente',public.app_pedido_economia(e,'337001','fecha_entrega',req,cmd)=o);
 fallo:=false;begin perform public.app_pedido_economia(e,'337001','fecha_entrega',req,gen_random_uuid());exception when sqlstate 'PT409' then fallo:=true;end;
 insert into recorrido values('logistica_version_obsoleta_rechazada',fallo);
 req:=jsonb_build_object('id',o->>'id','version',o->'version','fecha','2026-02-30','nota','Fecha imposible');
 fallo:=false;begin perform public.app_pedido_economia(e,'337001','fecha_entrega',req,gen_random_uuid());exception when datetime_field_overflow then fallo:=true;end;
 insert into recorrido values('fecha_imposible_rechazada',fallo);
 req:=jsonb_build_object('id',o->>'id','version',o->'version','categoria','dano','nota','Embalaje danado ficticio');cmd:=gen_random_uuid();
 o:=public.app_pedido_economia(e,'337001','incidencia',req,cmd);
 insert into recorrido values('incidencia_abierta',o#>>'{contenido,incidencias,0,estado}'='abierta');
 insert into recorrido values('incidencia_reintento_no_duplica',public.app_pedido_economia(e,'337001','incidencia',req,cmd)=o);
 o:=public.app_pedido_economia(e,'337001','resolver_incidencia',jsonb_build_object('id',o->>'id','version',o->'version','incidencia',cmd,'nota','Embalaje revisado sin dano a pieza'),gen_random_uuid());
 insert into recorrido values('incidencia_resuelta_conserva_original',o#>>'{contenido,incidencias,0,estado}'='resuelta' and o#>>'{contenido,incidencias,0,nota}'='Embalaje danado ficticio');
 insert into recorrido values('logistica_no_mueve_dinero_ni_recepciones',(o#>>'{contenido,pagos,0,importe}')::numeric=50 and (o#>>'{contenido,lineas,0,recibido}')::numeric=1 and (o#>>'{contenido,economia,total}')::numeric=145.20);
end$$;
reset role;`);
if(process.argv[3])sql=sql.replace('select * from recorrido;',()=>strip(fs.readFileSync(process.argv[3],'utf8'))+`
insert into recorrido select 'reversion_funcion_conserva_incidencias',exists(select 1 from public.app_operaciones where estudio_id='33700000-0000-4000-8000-000000000001' and contenido#>>'{incidencias,0,estado}'='resuelta');
select * from recorrido;`);
sql=sql.replace('select * from recorrido;','select count(*) as comprobaciones,bool_and(correcto is true) as todas_correctas,jsonb_agg(nombre) filter(where correcto is distinct from true) as fallos from recorrido;');
sql=sql.replace('begin;',()=> 'begin;\n'+strip(fs.readFileSync(new URL('../SQL/pedidos-economia.sql',import.meta.url),'utf8')));
if(!process.argv[2]||!/rollback;\s*$/i.test(sql))throw Error('Salida y rollback obligatorios');fs.writeFileSync(process.argv[2],sql);
