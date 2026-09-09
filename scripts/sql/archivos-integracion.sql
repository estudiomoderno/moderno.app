-- Metadatos ficticios transitorios: no se crean ni modifican bytes de Storage.
-- Esto prueba autorización SQL; las descargas HTTP se comprueban por separado.
do $$ begin if exists(select 1 from storage.objects where bucket_id='archivos' and name like 'af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_%') then raise exception 'La ruta de ensayo ya existe';end if;end $$;
insert into storage.objects(bucket_id,name,owner_id) values
 ('archivos','af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_propio.pdf','0705b805-d29b-47e5-abd5-4576047c6369'),
 ('archivos','af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_oculto.pdf',null),
 ('archivos','af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_compartido.pdf',null),
 ('archivos','af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_contable.pdf',null);
insert into public.app_archivos_compartidos(estudio_id,nombre) values
 ('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5','af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_compartido.pdf'),
 ('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5','af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_contable.pdf');
update public.datos_estudio set contenido=jsonb_set(contenido,'{entries}','[{"id":123,"file":{"name":"Contable.pdf","type":"application/pdf","data":"storage://archivos/af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_contable.pdf"}}]') where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and bloque='facturas';
set local role authenticated;
insert into resultado_prueba select 'archivo_propio_permitido',count(*)=1 from storage.objects where bucket_id='archivos' and name='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_propio.pdf';
insert into resultado_prueba select 'archivo_compartido_permitido',count(*)=1 from storage.objects where bucket_id='archivos' and name='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_compartido.pdf';
insert into resultado_prueba select 'archivo_contable_rechazado',count(*)=0 from storage.objects where bucket_id='archivos' and name='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_contable.pdf';
do $$ declare r record; n integer; ok boolean:=false;begin
 select * into r from public.app_leer_bloques('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5',array['proyectos']);
 perform public.guardar_bloque_versionado('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5','proyectos',jsonb_set(r.contenido,'{0,tasks,0,files}','[{"name":"Propio.pdf","data":"storage://archivos/af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_propio.pdf"},{"name":"Ruta pegada.pdf","data":"storage://archivos/af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_oculto.pdf"}]'),r.updated_at);
 insert into resultado_prueba select 'pegar_ruta_no_concede_acceso',count(*)=0 from storage.objects where bucket_id='archivos' and name='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_oculto.pdf';
 begin insert into public.app_archivos_compartidos(estudio_id,nombre) values('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5','forjado');exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values('registro_privado_no_editable',ok);
 begin
  delete from storage.objects where bucket_id='archivos' and name='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_propio.pdf';get diagnostics n=row_count;
 exception when insufficient_privilege then n:=0;end;
 insert into resultado_prueba values('borrado_sql_rechazado',n=0);
 insert into resultado_prueba values('permiso_borrado_rechazado',not public.app_archivo_roles('af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_propio.pdf','borrar'));
end $$;
reset role;
insert into resultado_prueba select 'adjunto_propio_registrado',exists(select 1 from public.app_archivos_compartidos where nombre='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_propio.pdf');
insert into resultado_prueba select 'adjunto_ajeno_no_registrado',not exists(select 1 from public.app_archivos_compartidos where nombre='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_oculto.pdf');
update public.datos_estudio set contenido=jsonb_set(contenido,'{entries}','[]') where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and bloque='facturas';
set local role authenticated;
insert into resultado_prueba select 'contable_sigue_privado_sin_referencia',count(*)=0 from storage.objects where bucket_id='archivos' and name='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5/__ensayo_roles_contable.pdf';
reset role;
