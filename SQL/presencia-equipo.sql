-- Presencia efímera: no crea ni modifica datos de clientes o proyectos.
begin;
create or replace function public.app_presencia_autorizada(p_topic text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare estudio uuid;
begin
  if p_topic !~ '^equipo:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  estudio := substring(p_topic from 8)::uuid;
  return coalesce(public.app_rol(estudio) in ('admin','colaborador'),false);
end $$;
revoke all on function public.app_presencia_autorizada(text) from public,anon;
grant execute on function public.app_presencia_autorizada(text) to authenticated;
drop policy if exists moderno_equipo_recibir on realtime.messages;
create policy moderno_equipo_recibir on realtime.messages for select to authenticated
using (extension in ('presence','broadcast') and public.app_presencia_autorizada((select realtime.topic())));
drop policy if exists moderno_equipo_enviar on realtime.messages;
create policy moderno_equipo_enviar on realtime.messages for insert to authenticated
with check (extension in ('presence','broadcast') and public.app_presencia_autorizada((select realtime.topic())));
commit;
