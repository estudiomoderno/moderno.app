-- Solo identidades ficticias del clon; el generador antepone la migración sin COMMIT.
do $$ begin if not exists(select 1 from auth.users where email='publicacion-admin-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid') then raise exception 'Solo clon ficticio';end if;end $$;
create temp table pruebas_flujos(nombre text,correcto boolean);
grant insert,select on pruebas_flujos to authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where email='publicacion-admin-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare eid uuid:='735c13cc-1cb5-4eb7-a197-24265f738bfb';a record;c record;r jsonb;fallo boolean:=false;begin
 select * into a from public.datos_estudio where estudio_id=eid and bloque='agenda';
 select * into c from public.datos_estudio where estudio_id=eid and bloque='contactos';
 begin
  perform public.app_guardar_lote(eid,jsonb_build_array(jsonb_build_object('bloque','agenda','contenido',jsonb_build_object('events','[]'::jsonb,'prueba','fallar'),'base',a.updated_at),jsonb_build_object('bloque','contactos','contenido','[]'::jsonb,'base','2000-01-01T00:00:00Z')));
 exception when sqlstate 'PT409' then fallo:=true;end;
 insert into pruebas_flujos select 'lote_fallido_no_guarda_primera_parte',fallo and (select contenido=a.contenido and updated_at=a.updated_at from public.datos_estudio where estudio_id=eid and bloque='agenda');
 r:=public.app_guardar_lote(eid,jsonb_build_array(jsonb_build_object('bloque','agenda','contenido',jsonb_build_object('events','[]'::jsonb,'prueba','guardado'),'base',a.updated_at),jsonb_build_object('bloque','contactos','contenido',jsonb_build_array(jsonb_build_object('name','Contacto ficticio lote')),'base',c.updated_at)));
 insert into pruebas_flujos select 'lote_correcto_guarda_ambas_partes',jsonb_array_length(r)=2 and (select contenido->>'prueba'='guardado' from public.datos_estudio where estudio_id=eid and bloque='agenda') and (select contenido#>>'{0,name}'='Contacto ficticio lote' from public.datos_estudio where estudio_id=eid and bloque='contactos');
 fallo:=false;begin perform public.app_revocar_acceso(eid,'publicacion-admin-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid',(select updated_at from public.datos_estudio where estudio_id=eid and bloque='config'));exception when insufficient_privilege then fallo:=true;end;
 insert into pruebas_flujos values('administrador_no_se_expulsa',fallo);
end $$;
reset role;
-- Preparar invitación y token ficticios para comprobar revocación completa.
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where email='publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare r record;a record;fallo boolean:=false;begin
 select * into r from public.app_leer_bloques('735c13cc-1cb5-4eb7-a197-24265f738bfb',array['contactos']);
 perform public.app_guardar_lote('735c13cc-1cb5-4eb7-a197-24265f738bfb',jsonb_build_array(jsonb_build_object('bloque','contactos','contenido',r.contenido,'base',r.updated_at)));
 insert into pruebas_flujos values('colaborador_guarda_lote_permitido',true);
 select * into a from public.app_leer_bloques('735c13cc-1cb5-4eb7-a197-24265f738bfb',array['agenda']);
 begin perform public.app_guardar_lote('735c13cc-1cb5-4eb7-a197-24265f738bfb',jsonb_build_array(jsonb_build_object('bloque','agenda','contenido','{"events":[]}'::jsonb,'base',a.updated_at),jsonb_build_object('bloque','facturas','contenido','{}'::jsonb,'base',null)));exception when insufficient_privilege then fallo:=true;end;
 select * into r from public.app_leer_bloques('735c13cc-1cb5-4eb7-a197-24265f738bfb',array['agenda']);
 insert into pruebas_flujos values('lote_colaborador_rechazado_sin_escritura_parcial',fallo and r.updated_at=a.updated_at and r.contenido=a.contenido);
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where email='publicacion-gestoria-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare fallo boolean:=false;begin
 begin perform public.app_guardar_lote('735c13cc-1cb5-4eb7-a197-24265f738bfb','[{"bloque":"agenda","contenido":{},"base":null}]');exception when insufficient_privilege then fallo:=true;end;
 insert into pruebas_flujos values('gestoria_no_guarda_lotes',fallo);
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where email='publicacion-admin-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid'),'role','authenticated')::text,true);
insert into public.invitaciones(estudio_id,email,rol) values('735c13cc-1cb5-4eb7-a197-24265f738bfb','publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid','miembro');
insert into public.calendario_tokens(user_id,estudio_id,token) select id,'735c13cc-1cb5-4eb7-a197-24265f738bfb',repeat('a',48) from auth.users where email='publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid' on conflict(user_id,estudio_id) do update set token=excluded.token;
create temp table antes_archivos as select count(*) n from storage.objects;
set local role authenticated;
do $$ declare fallo boolean:=false;r jsonb;begin
 begin perform public.app_revocar_acceso('735c13cc-1cb5-4eb7-a197-24265f738bfb','publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid','2000-01-01');exception when sqlstate 'PT409' then fallo:=true;end;
 insert into pruebas_flujos values('revocacion_version_antigua_rechazada',fallo);
 r:=public.app_revocar_acceso('735c13cc-1cb5-4eb7-a197-24265f738bfb','publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid',(select updated_at from public.datos_estudio where estudio_id='735c13cc-1cb5-4eb7-a197-24265f738bfb' and bloque='config'));
 insert into pruebas_flujos values('revocacion_confirmada',r->>'revocado'='true');
end $$;
reset role;
insert into pruebas_flujos select 'sin_membresia',not exists(select 1 from public.miembros m join auth.users u on u.id=m.user_id where m.estudio_id='735c13cc-1cb5-4eb7-a197-24265f738bfb' and u.email='publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid');
insert into pruebas_flujos select 'sin_invitacion_reutilizable',not exists(select 1 from public.invitaciones where estudio_id='735c13cc-1cb5-4eb7-a197-24265f738bfb' and email='publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid');
insert into pruebas_flujos select 'sin_token_ics',not exists(select 1 from public.calendario_tokens t join auth.users u on u.id=t.user_id where t.estudio_id='735c13cc-1cb5-4eb7-a197-24265f738bfb' and u.email='publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid');
insert into pruebas_flujos select 'archivos_conservados',(select count(*) from storage.objects)=(select n from antes_archivos);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from auth.users where email='publicacion-colaborador-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare fallo boolean:=false;begin
 insert into pruebas_flujos select 'revocado_sin_rol',public.app_rol('735c13cc-1cb5-4eb7-a197-24265f738bfb')='sin_acceso';
 begin perform public.app_guardar_lote('735c13cc-1cb5-4eb7-a197-24265f738bfb','[{"bloque":"contactos","contenido":[],"base":null}]');exception when insufficient_privilege then fallo:=true;end;
 insert into pruebas_flujos values('revocado_no_guarda',fallo);
 fallo:=false;begin perform public.app_revocar_acceso('735c13cc-1cb5-4eb7-a197-24265f738bfb','publicacion-admin-735c13cc-1cb5-4eb7-a197-24265f738bfb@example.invalid',null);exception when insufficient_privilege then fallo:=true;end;
 insert into pruebas_flujos values('no_admin_no_revoca',fallo);
end $$;
reset role;
select count(*) comprobaciones,bool_and(correcto is true) todas_correctas,jsonb_agg(nombre) filter(where correcto is distinct from true) fallos from pruebas_flujos;
rollback;
