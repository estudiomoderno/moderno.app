-- Actualización aditiva: ejecutar después del paquete de permisos v3.30.
begin;
create or replace function public.app_guardar_lote(p_estudio uuid,p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cambio jsonb; resultado jsonb:='[]'; guardado jsonb;
begin
 if public.app_rol(p_estudio) not in ('admin','colaborador') then raise exception 'No autorizado' using errcode='42501'; end if;
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios) not between 1 and 9 then raise exception 'Lote no valido'; end if;
 if exists(select 1 from jsonb_array_elements(p_cambios) c where not(c ? 'contenido') or c->>'bloque' is null or c->>'bloque' not in ('proyectos','compras','presupuestos','facturas','contactos','contratistas','fases','agenda','config'))
 or (select count(distinct c->>'bloque') from jsonb_array_elements(p_cambios) c)<>jsonb_array_length(p_cambios) then raise exception 'Bloques no validos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 -- Orden estable para evitar bloqueos cruzados. Cualquier error revierte TODO.
 for cambio in select value from jsonb_array_elements(p_cambios) order by value->>'bloque' loop
  guardado:=public.guardar_bloque_versionado(p_estudio,cambio->>'bloque',cambio->'contenido',(cambio->>'base')::timestamptz);
  resultado:=resultado||jsonb_build_array(jsonb_build_object('bloque',cambio->>'bloque','updated_at',guardado->>'updated_at'));
 end loop;
 return resultado;
end $$;
revoke all on function public.app_guardar_lote(uuid,jsonb) from public,anon;
grant execute on function public.app_guardar_lote(uuid,jsonb) to authenticated;

create or replace function public.app_revocar_acceso(p_estudio uuid,p_email text,p_base timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare correo text:=lower(trim(p_email)); objetivo uuid; config_actual jsonb; version_actual timestamptz; guardado jsonb;
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501'; end if;
 if correo is null or correo='' then raise exception 'Correo requerido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select id into objetivo from auth.users where lower(email)=correo;
 if objetivo=auth.uid() or exists(select 1 from public.miembros where estudio_id=p_estudio and user_id=objetivo and rol='admin') then
  raise exception 'No se puede retirar al administrador desde esta accion' using errcode='42501';
 end if;
 select contenido,updated_at into config_actual,version_actual from public.datos_estudio where estudio_id=p_estudio and bloque='config' for update;
 if not found or version_actual is distinct from p_base then raise exception 'El equipo ha cambiado; actualiza y reintenta' using errcode='PT409'; end if;
 config_actual:=jsonb_set(config_actual,'{users}',coalesce((select jsonb_agg(u) from jsonb_array_elements(coalesce(config_actual->'users','[]')) u where lower(coalesce(u->>'email',''))<>correo),'[]'));
 -- No se elimina la cuenta ni sus documentos: solo el acceso a este estudio.
 delete from public.calendario_tokens where estudio_id=p_estudio and user_id=objetivo;
 delete from public.invitaciones where estudio_id=p_estudio and lower(email)=correo;
 delete from public.miembros where estudio_id=p_estudio and user_id=objetivo;
 guardado:=public.guardar_bloque_versionado(p_estudio,'config',config_actual,p_base);
 return jsonb_build_object('revocado',true,'contenido',config_actual,'updated_at',guardado->>'updated_at');
end $$;
revoke all on function public.app_revocar_acceso(uuid,text,timestamptz) from public,anon;
grant execute on function public.app_revocar_acceso(uuid,text,timestamptz) to authenticated;
commit;
