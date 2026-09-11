-- Baseline only: isolated recovery clone, synthetic records, always ROLLBACK.
begin;
do $$begin
 if not exists(select 1 from auth.users where id='52957931-04e3-4342-8122-912e95227d9c' and email='recuperacion-v336-20260911@example.invalid') then raise exception 'Solo clon de recuperacion';end if;
 if exists(select 1 from public.estudios where id='33700000-0000-4000-8000-000000000001') then raise exception 'No sobrescribir ensayo existente';end if;
end$$;
insert into public.estudios(id,nombre) values('33700000-0000-4000-8000-000000000001','ENSAYO RECORRIDO');
update public.miembros set estudio_id='33700000-0000-4000-8000-000000000001' where user_id='52957931-04e3-4342-8122-912e95227d9c' and estudio_id='33600000-0000-4000-8000-000000000001' and rol='admin';
insert into public.datos_estudio(estudio_id,bloque,contenido) values
('33700000-0000-4000-8000-000000000001','proyectos','[{"id":337001,"name":"Proyecto ficticio","cliShare":{"token":"recorridoficticio337","active":true},"rooms":[{"id":33701,"name":"Sala","cliMode":"aprob","sections":[{"id":"seccion337","name":"Muebles","items":[{"id":"silla337","name":"Silla","qty":2,"price":100,"cost":60,"unit":"ud"}]}]}]}]'),
('33700000-0000-4000-8000-000000000001','config','{"users":[],"account":{"name":"ENSAYO RECORRIDO"}}');
create temp table recorrido(nombre text,correcto boolean);
grant all on recorrido to authenticated,anon;
select set_config('request.jwt.claims','{"sub":"52957931-04e3-4342-8122-912e95227d9c","role":"authenticated"}',true);
set local role authenticated;
do $$declare e uuid:='33700000-0000-4000-8000-000000000001';a jsonb;r jsonb;o jsonb;o2 jsonb;req jsonb;cmd uuid;fallo boolean;begin
 a:=public.app_operaciones_accion(e,'337001','aprobacion','{"item":"silla337"}',gen_random_uuid());
 a:=public.portal_aprobacion_decidir('recorridoficticio337',(a->>'id')::uuid,a#>>'{contenido,revision}','aprobada',gen_random_uuid());
 insert into recorrido values('respuesta_portal_revision',a->>'registrado'='true');
 r:=public.app_operaciones_accion(e,'337001','solicitud','{"items":["silla337"],"proveedor":"Proveedor ficticio"}',gen_random_uuid());
 r:=public.app_operaciones_accion(e,'337001','oferta',jsonb_build_object('id',r->>'id','version',r->'version','precios','[60]'::jsonb),gen_random_uuid());
 o:=public.app_operaciones_accion(e,'337001','pedido',jsonb_build_object('id',r->>'id','version',r->'version','oferta',r#>>'{contenido,ofertas,0,id}'),gen_random_uuid());
 o:=public.app_pedido_economia(e,'337001','condiciones',jsonb_build_object('id',o->>'id','version',o->'version','tipos','[21]'::jsonb,'transporte',0,'tipo_transporte',0,'retencion',0,'nota','Condiciones de ensayo'),gen_random_uuid());
 o:=public.app_operaciones_accion(e,'337001','confirmar',jsonb_build_object('id',o->>'id','version',o->'version'),gen_random_uuid());
 insert into recorrido values('pedido_revision_aprobada_total',o->>'estado'='confirmado' and (o#>>'{contenido,economia,total}')::numeric=145.20);
 req:=jsonb_build_object('id',o->>'id','version',o->'version','cantidades','[1]'::jsonb);cmd:=gen_random_uuid();
 o:=public.app_operaciones_accion(e,'337001','recibir',req,cmd);
 insert into recorrido values('recepcion_parcial',o->>'estado'='parcial');
 insert into recorrido values('reintento_no_duplica',public.app_operaciones_accion(e,'337001','recibir',req,cmd)=o);
 fallo:=false;begin perform public.app_operaciones_accion(e,'337001','recibir',req,gen_random_uuid());exception when sqlstate 'PT409' then fallo:=true;end;
 insert into recorrido values('segunda_sesion_version_obsoleta',fallo);
 o:=public.app_pedido_economia(e,'337001','pago',jsonb_build_object('id',o->>'id','version',o->'version','importe',50,'fecha',current_date::text,'nota','Pago ficticio parcial'),gen_random_uuid());
 insert into recorrido values('pago_independiente_recepcion',(o#>>'{contenido,pagos,0,importe}')::numeric=50 and o->>'estado'='parcial');
 r:=public.app_operaciones_accion(e,'337001','solicitud','{"items":["silla337"],"proveedor":"Otro proveedor ficticio"}',gen_random_uuid());
 r:=public.app_operaciones_accion(e,'337001','oferta',jsonb_build_object('id',r->>'id','version',r->'version','precios','[55]'::jsonb),gen_random_uuid());
 o2:=public.app_operaciones_accion(e,'337001','pedido',jsonb_build_object('id',r->>'id','version',r->'version','oferta',r#>>'{contenido,ofertas,0,id}'),gen_random_uuid());
 fallo:=false;begin perform public.app_operaciones_accion(e,'337001','confirmar',jsonb_build_object('id',o2->>'id','version',o2->'version'),gen_random_uuid());exception when others then fallo:=true;end;
 insert into recorrido values('cantidad_total_pedida_no_supera_ficha',fallo);
end$$;
reset role;
select * from recorrido;
rollback;
