-- Cancela solo invitaciones pendientes. No elimina cuentas, miembros ni documentos.
begin;
create or replace function public.app_equipo_cancelar_invitacion(p_estudio uuid,p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 delete from public.invitaciones where estudio_id=p_estudio and lower(email)=lower(trim(p_email));
 return found;
end $$;
revoke all on function public.app_equipo_cancelar_invitacion(uuid,text) from public,anon;
grant execute on function public.app_equipo_cancelar_invitacion(uuid,text) to authenticated;

-- Serializa la aceptacion con la cancelacion, tambien si el acceso ya habia empezado.
create or replace function public.app_equipo_aceptar_rol() returns trigger
language plpgsql security definer set search_path='' as $$
declare invitacion public.invitaciones;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.estudio_id::text,331));
 select i.* into invitacion from public.invitaciones i join auth.users u on lower(u.email)=lower(i.email)
 where i.estudio_id=new.estudio_id and u.id=new.user_id for update of i;
 if found then
  new.role_id:=invitacion.role_id;
  new.rol:=invitacion.rol;
 elsif auth.uid()=new.user_id and exists(select 1 from public.miembros where estudio_id=new.estudio_id) then
  raise exception 'La invitacion ya no esta disponible' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.app_equipo_aceptar_rol() from public,anon,authenticated;
commit;
