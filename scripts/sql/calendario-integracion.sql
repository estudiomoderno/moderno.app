-- Se añade al ensayo de colaborador antes de su SELECT final y ROLLBACK.
create temp table token_prueba_calendario(token text);
grant insert,select on token_prueba_calendario to authenticated,service_role;
grant insert,select on resultado_prueba to service_role;
set local role authenticated;
insert into token_prueba_calendario values(public.calendario_token(false));
insert into resultado_prueba select 'calendario_token_emitido',length(token)=48 from token_prueba_calendario;
insert into resultado_prueba select 'calendario_rpc_privado',not has_function_privilege('authenticated','public.app_calendario_consultar(text)','EXECUTE') and not has_function_privilege('anon','public.app_calendario_consultar(text)','EXECUTE');
set local role service_role;
insert into resultado_prueba select 'calendario_colaborador_permitido',public.app_calendario_consultar(token)#>>'{proyectos,0,tasks,0,title}'='Después' from token_prueba_calendario;
reset role;
update public.datos_estudio set contenido=jsonb_set(contenido,'{users}','[{"email":"ui-portales-af1bd5ff-e836-483e-a45f-2c1a71eb1ff5@example.invalid","role":"Gestoría (solo lectura)"}]') where estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5' and bloque='config';
set local role authenticated;
do $$ declare ok boolean:=false;begin
 begin perform public.calendario_token(true);exception when insufficient_privilege then ok:=true;end;
 insert into resultado_prueba values('gestoria_no_regenera_calendario',ok);
end $$;
set local role service_role;
insert into resultado_prueba select 'calendario_cambio_rol_revocado',public.app_calendario_consultar(token) is null from token_prueba_calendario;
reset role;
delete from public.miembros where user_id='0705b805-d29b-47e5-abd5-4576047c6369' and estudio_id='af1bd5ff-e836-483e-a45f-2c1a71eb1ff5';
set local role service_role;
insert into resultado_prueba select 'calendario_baja_revocada',public.app_calendario_consultar(token) is null from token_prueba_calendario;
reset role;
