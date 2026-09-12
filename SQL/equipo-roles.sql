-- Roles con identidad estable. Los perfiles usan los permisos RLS/RPC existentes.
-- Primero validar en el clon. No cambia asignaciones ni documentos existentes.
begin;
create table if not exists public.app_roles (
 id uuid primary key default gen_random_uuid(),
 estudio_id uuid not null references public.estudios(id) on delete cascade,
 nombre text not null check(length(trim(nombre)) between 1 and 80),
 perfil text not null check(perfil in ('colaborador','gestoria','contratista','cliente')),
 revision integer not null default 1,
 unique(estudio_id,id),unique(estudio_id,nombre)
);
alter table public.app_roles enable row level security;
revoke all on public.app_roles from anon,authenticated;
insert into public.app_roles(estudio_id,nombre,perfil)
 select e.id,p.nombre,p.perfil from public.estudios e cross join (values
 ('Colaborador','colaborador'),('Gestoría (solo lectura)','gestoria'),('Contratista (obra)','contratista'),('Cliente','cliente')) p(nombre,perfil)
 on conflict(estudio_id,nombre) do nothing;
create or replace function public.app_equipo_roles_iniciales() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.app_roles(estudio_id,nombre,perfil) values
 (new.id,'Colaborador','colaborador'),(new.id,'Gestoría (solo lectura)','gestoria'),(new.id,'Contratista (obra)','contratista'),(new.id,'Cliente','cliente');
 return new;
end $$;
revoke all on function public.app_equipo_roles_iniciales() from public,anon,authenticated;
drop trigger if exists app_equipo_roles_iniciales on public.estudios;
create trigger app_equipo_roles_iniciales after insert on public.estudios for each row execute function public.app_equipo_roles_iniciales();
alter table public.miembros add column if not exists role_id uuid;
alter table public.invitaciones add column if not exists role_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='miembros_role_study_fk') then
  alter table public.miembros add constraint miembros_role_study_fk foreign key(estudio_id,role_id) references public.app_roles(estudio_id,id);
 end if;
 if not exists(select 1 from pg_constraint where conname='invitaciones_role_study_fk') then
  alter table public.invitaciones add constraint invitaciones_role_study_fk foreign key(estudio_id,role_id) references public.app_roles(estudio_id,id);
 end if;
 if to_regprocedure('public.app_rol_usuario_legacy(uuid,uuid)') is null then
  alter function public.app_rol_usuario(uuid,uuid) rename to app_rol_usuario_legacy;
 end if;
end $$;
revoke all on function public.app_rol_usuario_legacy(uuid,uuid) from public,anon,authenticated;
create or replace function public.app_rol_usuario(p_estudio uuid,p_usuario uuid) returns text
language plpgsql stable set search_path='' as $$
declare miembro public.miembros; perfil text;
begin
 select * into miembro from public.miembros where estudio_id=p_estudio and user_id=p_usuario;
 if not found then return 'sin_acceso';end if;
 if miembro.rol='admin' then return 'admin';end if;
 if miembro.role_id is null then return public.app_rol_usuario_legacy(p_estudio,p_usuario);end if;
 select r.perfil into perfil from public.app_roles r where r.estudio_id=p_estudio and r.id=miembro.role_id;
 return coalesce(perfil,'sin_acceso');
end $$;
revoke all on function public.app_rol_usuario(uuid,uuid) from public,anon,authenticated;
-- Recreate to bind the stable helper, including calendar and Storage callers by name.
create or replace function public.app_rol(p_estudio uuid) returns text language sql stable security definer set search_path='' as $$
 select public.app_rol_usuario(p_estudio,auth.uid());
$$;

create or replace function public.app_equipo(p_estudio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 return jsonb_build_object('roles',coalesce((select jsonb_agg(to_jsonb(r) order by r.nombre) from public.app_roles r where estudio_id=p_estudio),'[]'),
 'miembros',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email,'nombre',coalesce(u.raw_user_meta_data->>'full_name',u.email),'role_id',m.role_id,'perfil',public.app_rol_usuario(p_estudio,m.user_id))) from public.miembros m join auth.users u on u.id=m.user_id where m.estudio_id=p_estudio),'[]'),
 'invitaciones',coalesce((select jsonb_agg(jsonb_build_object('email',email,'rol',rol,'role_id',role_id)) from public.invitaciones where estudio_id=p_estudio),'[]'));
end $$;

create or replace function public.app_rol_guardar(p_estudio uuid,p_id uuid,p_nombre text,p_perfil text,p_revision integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare resultado public.app_roles;
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 if p_id is null then
  insert into public.app_roles(estudio_id,nombre,perfil) values(p_estudio,trim(p_nombre),p_perfil) returning * into resultado;
 else
  update public.app_roles set nombre=trim(p_nombre),perfil=p_perfil,revision=revision+1 where estudio_id=p_estudio and id=p_id and revision=p_revision returning * into resultado;
  if not found then raise exception 'El rol ha cambiado; vuelve a cargar Equipo' using errcode='PT409';end if;
 end if;
 return to_jsonb(resultado);
end $$;

create or replace function public.app_rol_borrar(p_estudio uuid,p_id uuid,p_revision integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 -- FK restrict prevents deleting a role still assigned to a person or invitation.
 delete from public.app_roles where estudio_id=p_estudio and id=p_id and revision=p_revision;
 if not found then raise exception 'El rol ha cambiado; vuelve a cargar Equipo' using errcode='PT409';end if;
end $$;

create or replace function public.app_equipo_asignar(p_estudio uuid,p_usuario uuid,p_role_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 if p_usuario=auth.uid() or exists(select 1 from public.miembros where estudio_id=p_estudio and user_id=p_usuario and rol='admin') then
  raise exception 'Se conserva el acceso del administrador' using errcode='42501';
 end if;
 if not exists(select 1 from public.app_roles where estudio_id=p_estudio and id=p_role_id) then raise exception 'Rol no disponible';end if;
 update public.miembros set role_id=p_role_id where estudio_id=p_estudio and user_id=p_usuario;
 if not found then raise exception 'La persona ya no pertenece al estudio';end if;
end $$;

create or replace function public.app_equipo_invitar(p_estudio uuid,p_email text,p_role_id uuid,p_admin boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare correo text:=lower(trim(p_email)); cfg jsonb; version_cfg timestamptz; etiqueta text;
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 if correo is null or correo!~'^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Correo no valido';end if;
 if p_admin and p_role_id is not null then raise exception 'Seleccion de rol no valida';end if;
 if not p_admin and not exists(select 1 from public.app_roles where estudio_id=p_estudio and id=p_role_id) then raise exception 'Selecciona un rol del estudio';end if;
 if exists(select 1 from public.miembros m join auth.users u on u.id=m.user_id where m.estudio_id=p_estudio and lower(u.email)=correo) then raise exception 'Esta persona ya pertenece al estudio';end if;
 insert into public.invitaciones(estudio_id,email,rol,role_id) values(p_estudio,correo,case when p_admin then 'admin' else 'miembro' end,p_role_id)
 on conflict(estudio_id,email) do update set rol=excluded.rol,role_id=excluded.role_id;
 -- Keep the task-assignee directory in sync, atomically with the invitation.
 -- Existing names, assignments and history are never replaced here.
 select contenido,updated_at into cfg,version_cfg from public.datos_estudio where estudio_id=p_estudio and bloque='config' for update;
 if found and not exists(select 1 from jsonb_array_elements(coalesce(cfg->'users','[]')) u where lower(u->>'email')=correo) then
  select case when p_admin then 'Administrador' else nombre end into etiqueta from public.app_roles where id=p_role_id;
  cfg:=jsonb_set(cfg,'{users}',coalesce(cfg->'users','[]')||jsonb_build_array(jsonb_build_object('name',split_part(correo,'@',1),'email',correo,'role',coalesce(etiqueta,'Administrador'),'roleId',p_role_id)));
  perform public.guardar_bloque_versionado(p_estudio,'config',cfg,version_cfg);
 end if;
end $$;

-- Existing acceptance inserts the membership before deleting its invitation.
-- Copy the ID at that point; role names never determine permissions.
create or replace function public.app_equipo_aceptar_rol() returns trigger
language plpgsql security definer set search_path='' as $$
declare invitacion public.invitaciones;
begin
 select i.* into invitacion from public.invitaciones i join auth.users u on lower(u.email)=lower(i.email)
 where i.estudio_id=new.estudio_id and u.id=new.user_id;
 if found then new.role_id:=invitacion.role_id;end if;
 return new;
end $$;
revoke all on function public.app_equipo_aceptar_rol() from public,anon,authenticated;
drop trigger if exists app_equipo_aceptar_rol on public.miembros;
create trigger app_equipo_aceptar_rol before insert on public.miembros for each row execute function public.app_equipo_aceptar_rol();

revoke all on function public.app_equipo(uuid),public.app_rol_guardar(uuid,uuid,text,text,integer),public.app_rol_borrar(uuid,uuid,integer),public.app_equipo_asignar(uuid,uuid,uuid),public.app_equipo_invitar(uuid,text,uuid,boolean) from public,anon;
grant execute on function public.app_equipo(uuid),public.app_rol_guardar(uuid,uuid,text,text,integer),public.app_rol_borrar(uuid,uuid,integer),public.app_equipo_asignar(uuid,uuid,uuid),public.app_equipo_invitar(uuid,text,uuid,boolean) to authenticated;
commit;
