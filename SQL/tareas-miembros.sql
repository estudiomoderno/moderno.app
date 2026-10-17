-- Read-only directory for task assignment. No invitations or local-only users.
-- Requires explicit approval before installation in production.
create or replace function public.app_tareas_miembros(p_estudio uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(public.app_rol(p_estudio),'') not in ('admin','colaborador') then
  raise exception 'No autorizado para consultar participantes de este estudio' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email,'name',coalesce(
  (select nullif(trim(person->>'name'),'') from public.datos_estudio d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.contenido->'users')='array' then d.contenido->'users' else '[]'::jsonb end) person where d.estudio_id=p_estudio and d.bloque='config' and lower(trim(person->>'email'))=lower(u.email) limit 1),
  nullif(trim(u.raw_user_meta_data->>'full_name'),''),u.email),'role',public.app_rol_usuario(p_estudio,m.user_id)) order by u.email)
 from public.miembros m join auth.users u on u.id=m.user_id where m.estudio_id=p_estudio),'[]'::jsonb);
end $$;
revoke all on function public.app_tareas_miembros(uuid) from public,anon;
grant execute on function public.app_tareas_miembros(uuid) to authenticated;
-- Rollback: drop function public.app_tareas_miembros(uuid); after reverting the UI PR.
