-- Solo clon de recuperación. Anteponer permisos-roles.sql y permisos-colaboradores.sql
-- dentro de una única transacción, omitiendo sus COMMIT. Este ensayo termina en ROLLBACK.
do $$ begin if not exists(select 1 from auth.users where id='0705b805-d29b-47e5-abd5-4576047c6369' and email like '%@example.invalid') then raise exception 'Solo identidad ficticia';end if;end $$;
update public.datos_estudio set contenido=jsonb_set(contenido,'{users}','[{"email":"ui-portales-af1bd5ff-e836-483e-a45f-2c1a71eb1ff5@example.invalid","role":"Colaborador"}]') where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and bloque='config';
update public.datos_estudio set contenido='[{"id":101,"name":"Proyecto ficticio","total":999,"tasks":[{"id":201,"title":"Antes","amount":250,"acc":true,"subs":[{"txt":"Subtarea","done":false}],"comments":[{"cid":"ficticio","txt":"Comentario","ts":1}]}],"rooms":[{"id":301,"name":"Sala","sections":[{"name":"Muebles","items":[{"id":401,"name":"Mesa","qty":1,"price":100,"cost":45}]}]}]}]' where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and bloque='proyectos';
update public.miembros set rol='miembro' where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and user_id='0705b805-d29b-47e5-abd5-4576047c6369';
create temp table resultado_prueba(nombre text,correcto boolean);
grant insert,select on resultado_prueba to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"0705b805-d29b-47e5-abd5-4576047c6369","role":"authenticated"}',true);
do $$ declare r record; nuevo jsonb; ok boolean;begin
 select * into r from public.app_leer_bloques('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5',array['proyectos']);
 insert into resultado_prueba values ('rol_confirmado',r.rol='colaborador'),('costes_no_recibidos',strpos(r.contenido::text,'"cost"')=0 and strpos(r.contenido::text,'"amount"')=0 and strpos(r.contenido::text,'"total"')=0),('subtareas_y_comentarios',r.contenido#>>'{0,tasks,0,subs,0,txt}'='Subtarea' and r.contenido#>>'{0,tasks,0,comments,0,txt}'='Comentario'),('lectura_directa_rechazada',(select count(*)=0 from public.datos_estudio where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5'));
 nuevo:=jsonb_set(r.contenido,'{0,tasks,0,title}','"Después"');
 perform public.guardar_bloque_versionado('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5','proyectos',nuevo,r.updated_at);
 insert into resultado_prueba select 'tarea_guardada',contenido#>>'{0,tasks,0,title}'='Después' from public.app_leer_bloques('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5',array['proyectos']);
 ok:=false;begin perform public.guardar_bloque_versionado('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5','config','{}',null);exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values ('config_rechazada',ok);
 ok:=false;begin perform public.app_leer_bloques('00000000-0000-0000-0000-000000000001',null);exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values ('otro_estudio_rechazado',ok);
end $$;
reset role;
insert into resultado_prueba select 'privados_conservados',contenido#>>'{0,total}'='999' and contenido#>>'{0,tasks,0,amount}'='250' and contenido#>>'{0,rooms,0,sections,0,items,0,cost}'='45' from public.datos_estudio where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and bloque='proyectos';
insert into resultado_prueba select 'marcas_dinamicas',public.app_config_colaborador('{"BRAND":{"marca_ficticia":{"name":"Ficticia","front":"#fff","cost":99}},"logos":{"marca_ficticia":"data:image/png;base64,AA"}}')#>>'{BRAND,marca_ficticia,front}'='#fff';
insert into resultado_prueba select 'mapas_nulos_seguros',public.app_config_colaborador('{"logos":null,"BRAND":null,"idPrefix":null,"series":null}')#>'{BRAND}'='{}'::jsonb;
insert into resultado_prueba select 'ruta_pdf_unicode',public.app_ruta_storage('https://auth.moderno.app/storage/v1/object/public/archivos/af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/Facturaci%C3%B3n%20prueba.pdf')='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/Facturación prueba.pdf';
insert into resultado_prueba select 'ruta_pdf_malformada_rechazada',public.app_ruta_storage('https://auth.moderno.app/storage/v1/object/public/archivos/af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/%ZZ.pdf') is null;
insert into resultado_prueba select 'ruta_pdf_externa_rechazada',public.app_ruta_storage('https://example.invalid/storage/v1/object/public/archivos/af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/prueba.pdf') is null;
do $$ declare original jsonb; cambiado jsonb; esperado jsonb; ok boolean;begin
 original:='[{"name":"Plano.pdf","data":"plano"},{"name":"Privado.pdf","docRef":"privado","docKind":"factura","data":"secreto"},{"name":"Foto.png","data":"foto"},{"docRef":"sin-identidad","data":"secreto-2"}]';
 cambiado:=public.app_colaborador_combinar(original,'[{"name":"Foto.png","data":"foto-2"},{"name":"Plano nuevo.pdf","data":"nuevo"},{"name":"Alta.pdf","data":"alta"}]');
 insert into resultado_prueba values('adjuntos_visibles_editables',public.app_colaborador_filtrar(cambiado)='[{"name":"Foto.png","data":"foto-2"},{"name":"Plano nuevo.pdf","data":"nuevo"},{"name":"Alta.pdf","data":"alta"}]'::jsonb);
 insert into resultado_prueba values('documentos_ocultos_intactos',cambiado->1=original->1 and cambiado->3=original->3);
 insert into resultado_prueba values('quitar_visibles_conserva_ocultos',public.app_colaborador_combinar(original,'[]')=jsonb_build_array(original->1,original->3));
 insert into resultado_prueba values('guardado_repetido_idempotente',public.app_colaborador_combinar(cambiado,public.app_colaborador_filtrar(cambiado))=cambiado);
 ok:=false;begin perform public.app_colaborador_combinar(original,'[{"name":"Privado.pdf","data":"suplantado"}]');exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values('suplantacion_oculto_rechazada',ok);
 ok:=false;begin perform public.app_colaborador_combinar(original,'[{"name":"Nuevo","docRef":"inyectado"}]');exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values('inyeccion_documento_privado_rechazada',ok);
 ok:=false;begin perform public.app_colaborador_combinar('[{"id":1,"name":"Con coste","cost":50}]','[]');exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values('borrar_fila_con_coste_rechazado',ok);
end $$;
select * from resultado_prueba;
rollback;
