-- Candidato. Requiere permisos-roles.sql y permisos-colaboradores.sql.
-- Entregar junto con la nueva función calendario-ics. No modifica eventos.
begin;
create or replace function public.calendario_token(p_regenerar boolean default false)
returns text language plpgsql security definer set search_path='' as $$
declare estudio uuid; token_actual text;
begin
 if auth.uid() is null then raise exception 'No autenticado' using errcode='42501'; end if;
 select m.estudio_id into estudio from public.miembros m where m.user_id=auth.uid()
 order by m.created_at nulls last,m.estudio_id limit 1;
 if estudio is null or public.app_rol(estudio) not in ('admin','colaborador') then
  raise exception 'No tienes acceso al calendario del estudio' using errcode='42501';
 end if;
 -- Serializa la creación/regeneración de la suscripción de este usuario.
 perform 1 from public.miembros m where m.estudio_id=estudio and m.user_id=auth.uid() for update;
 if p_regenerar then delete from public.calendario_tokens where user_id=auth.uid() and estudio_id=estudio; end if;
 select t.token into token_actual from public.calendario_tokens t where t.user_id=auth.uid() and t.estudio_id=estudio;
 if token_actual is null then
  token_actual:=substr(replace(pg_catalog.gen_random_uuid()::text||pg_catalog.gen_random_uuid()::text,'-',''),1,48);
  insert into public.calendario_tokens(user_id,estudio_id,token) values(auth.uid(),estudio,token_actual);
 end if;
 return token_actual;
end $$;
revoke all on function public.calendario_token(boolean) from public,anon;
grant execute on function public.calendario_token(boolean) to authenticated;
revoke insert,update,delete on public.calendario_tokens from public,anon,authenticated;

-- Solo la función del servidor puede resolver un token. El permiso se vuelve
-- a comprobar en cada petición, también para enlaces emitidos anteriormente.
create or replace function public.app_calendario_consultar(p_token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare titular uuid; estudio uuid; rol text; proyectos jsonb; agenda jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{48}$' then return null; end if;
 select t.user_id,t.estudio_id into titular,estudio from public.calendario_tokens t where t.token=p_token;
 if estudio is null then return null; end if;
 rol:=public.app_rol_usuario(estudio,titular);
 if rol not in ('admin','colaborador') then return null; end if;
 select d.contenido into proyectos from public.datos_estudio d where d.estudio_id=estudio and d.bloque='proyectos';
 select d.contenido into agenda from public.datos_estudio d where d.estudio_id=estudio and d.bloque='agenda';
 return jsonb_build_object('proyectos',public.app_colaborador_filtrar(coalesce(proyectos,'[]')),
  'agenda',public.app_colaborador_filtrar(coalesce(agenda,'{}')));
end $$;
revoke all on function public.app_calendario_consultar(text) from public,anon,authenticated;
grant execute on function public.app_calendario_consultar(text) to service_role;
commit;
