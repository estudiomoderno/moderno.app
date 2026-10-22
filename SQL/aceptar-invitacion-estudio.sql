-- Accept exactly the invited study using verified Auth identity. Never creates a study.
begin;
create function public.app_aceptar_invitacion(p_estudio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identidad uuid:=auth.uid(); correo text; confirmado timestamptz; miembro public.miembros; invitacion public.invitaciones; nombre text;
begin
 if identidad is null or p_estudio is null then raise exception 'Inicia sesion con la cuenta invitada' using errcode='42501';end if;
 select lower(trim(u.email)),u.email_confirmed_at into correo,confirmado from auth.users u where u.id=identidad;
 if correo is null or confirmado is null then raise exception 'Confirma tu correo antes de aceptar la invitacion' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(identidad::text,332));
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select * into miembro from public.miembros where user_id=identidad;
 if found then
  if miembro.estudio_id<>p_estudio then raise exception 'Esta cuenta ya pertenece a otro estudio. Contacta con quien te ha invitado para revisar el acceso' using errcode='42501';end if;
 else
  select * into invitacion from public.invitaciones where estudio_id=p_estudio and lower(trim(email))=correo for update;
  if not found then raise exception 'La invitacion no esta disponible para esta cuenta. Pide un nuevo enlace al administrador' using errcode='42501';end if;
  insert into public.miembros(user_id,estudio_id,rol,role_id) values(identidad,p_estudio,invitacion.rol,invitacion.role_id) returning * into miembro;
  delete from public.invitaciones where estudio_id=p_estudio and lower(trim(email))=correo;
 end if;
 select e.nombre into nombre from public.estudios e where e.id=p_estudio;
 return jsonb_build_object('estudio_id',p_estudio,'rol',miembro.rol,'nombre',nombre,'nuevo',false);
end $$;
revoke all on function public.app_aceptar_invitacion(uuid) from public,anon;
grant execute on function public.app_aceptar_invitacion(uuid) to authenticated;
commit;
