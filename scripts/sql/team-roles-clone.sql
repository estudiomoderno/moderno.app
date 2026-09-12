-- SOLO clon szbswxpkhidywaosdfcg. Todo se revierte, no envía correos.
begin;
do $$ begin
 if not exists(select 1 from public.miembros m join auth.users u on u.id=m.user_id where m.estudio_id='b25c0772-3db1-46ad-a4ed-8f191d1e9781' and u.email='clipper-ui-20260912@example.invalid' and m.rol='admin') then raise exception 'No es el estudio de ensayo esperado';end if;
end $$;
create temp table equipo_control as select estudio_id,bloque,md5((case when bloque='config' then contenido-'users' else contenido end)::text) hash from public.datos_estudio;
insert into auth.users(id,email,raw_user_meta_data) values('35300000-0000-4000-8000-000000000001','roles-353@example.invalid','{}');
select set_config('request.jwt.claim.sub','5fa5231a-216f-42b3-890f-cefe786907c7',true);
do $$ declare r jsonb; begin
 r:=public.app_rol_guardar('b25c0772-3db1-46ad-a4ed-8f191d1e9781',null,'Ensayo SQL temporal 353','gestoria',null);
 perform set_config('test.role_id',r->>'id',true);
 perform public.app_equipo_invitar('b25c0772-3db1-46ad-a4ed-8f191d1e9781','roles-353@example.invalid',(r->>'id')::uuid,false);
 if not exists(select 1 from public.datos_estudio d cross join lateral jsonb_array_elements(d.contenido->'users') u where d.estudio_id='b25c0772-3db1-46ad-a4ed-8f191d1e9781' and d.bloque='config' and u->>'email'='roles-353@example.invalid') then raise exception 'Falta en el directorio de tareas';end if;
end $$;
select set_config('request.jwt.claim.sub','35300000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare j jsonb; begin
 j:=public.unirse_al_estudio();
 if j->>'estudio_id'<>'b25c0772-3db1-46ad-a4ed-8f191d1e9781' or public.app_rol('b25c0772-3db1-46ad-a4ed-8f191d1e9781')<>'gestoria' then raise exception 'No se conservó el permiso de la invitación';end if;
 begin perform public.app_equipo('b25c0772-3db1-46ad-a4ed-8f191d1e9781');raise exception 'ERROR: gestoría pudo administrar equipo';exception when insufficient_privilege then null;end;
 begin perform public.app_guardar_lote('b25c0772-3db1-46ad-a4ed-8f191d1e9781','[{"bloque":"contactos","contenido":[],"base":null}]');raise exception 'ERROR: gestoría pudo escribir';exception when insufficient_privilege then null;end;
 begin perform * from public.app_roles;raise exception 'ERROR: lectura directa de roles';exception when insufficient_privilege then null;end;
 if public.app_rol('b25c0772-3db1-46ad-a4ed-8f191d1e9782')<>'sin_acceso' then raise exception 'Se cruzó otro estudio';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','5fa5231a-216f-42b3-890f-cefe786907c7',true);
do $$ declare r uuid:=current_setting('test.role_id')::uuid; begin
 perform public.app_rol_guardar('b25c0772-3db1-46ad-a4ed-8f191d1e9781',r,'Ensayo renombrado','colaborador',1);
 if public.app_rol_usuario('b25c0772-3db1-46ad-a4ed-8f191d1e9781','35300000-0000-4000-8000-000000000001')<>'colaborador' then raise exception 'Editar el perfil no fue efectivo';end if;
 begin perform public.app_rol_borrar('b25c0772-3db1-46ad-a4ed-8f191d1e9781',r,2);raise exception 'ERROR: se borró un rol asignado';exception when foreign_key_violation then null;end;
 begin perform public.app_equipo_asignar('b25c0772-3db1-46ad-a4ed-8f191d1e9781','5fa5231a-216f-42b3-890f-cefe786907c7',r);raise exception 'ERROR: se retiró al administrador';exception when insufficient_privilege then null;end;
 if exists(select 1 from equipo_control c full join public.datos_estudio d using(estudio_id,bloque) where c.hash is distinct from md5((case when d.bloque='config' then d.contenido-'users' else d.contenido end)::text)) then raise exception 'Se modificaron documentos durante cambios de roles';end if;
 perform public.app_revocar_acceso('b25c0772-3db1-46ad-a4ed-8f191d1e9781','roles-353@example.invalid',(select updated_at from public.datos_estudio where estudio_id='b25c0772-3db1-46ad-a4ed-8f191d1e9781' and bloque='config'));
 if public.app_rol_usuario('b25c0772-3db1-46ad-a4ed-8f191d1e9781','35300000-0000-4000-8000-000000000001')<>'sin_acceso' then raise exception 'La revocación no fue efectiva';end if;
 if not exists(select 1 from auth.users where id='35300000-0000-4000-8000-000000000001') then raise exception 'Se borró la cuenta global';end if;
end $$;
rollback;
select 'OK: aceptación, perfiles efectivos, aislamiento, bloqueo de escritura, protección de administrador, revocación y conservación. Todo revertido.' as resultado;
