-- Persistent only inside a dedicated disposable PostgreSQL database.
begin;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public') or exists(select 1 from auth.users) then
  raise exception 'Requires an empty isolated database';
 end if;
end $$;
create schema extensions;
create extension pgcrypto with schema extensions;
create table public.estudios(id uuid primary key);
create table public.miembros(estudio_id uuid references public.estudios(id),user_id uuid references auth.users(id),rol text,primary key(estudio_id,user_id));
create table public.datos_estudio(estudio_id uuid references public.estudios(id),bloque text,contenido jsonb,updated_at timestamptz,primary key(estudio_id,bloque));
create function public.app_rol_usuario(e uuid,u uuid) returns text language sql stable security definer set search_path='' as $$select coalesce((select case when rol='admin' then 'admin' else 'colaborador' end from public.miembros where estudio_id=e and user_id=u),'sin_acceso')$$;
-- BASELINE_HERE
revoke all on all functions in schema public from public,anon,authenticated;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function public.app_rol(uuid),public.app_leer_bloques(uuid,text[]),public.app_guardar_lote(uuid,jsonb),public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) to authenticated;
alter table public.datos_estudio enable row level security;
grant select on public.datos_estudio to authenticated;
create policy fixture_admin_only on public.datos_estudio for select to authenticated using(public.app_rol(estudio_id)='admin');
-- DELTA_HERE
-- CANDIDATE_HERE
insert into auth.users values('00000000-0000-4000-8000-000000000011');
insert into public.estudios values('00000000-0000-4000-8000-000000000001');
insert into public.miembros values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','admin');
insert into public.datos_estudio values('00000000-0000-4000-8000-000000000001','proyectos','[{"id":1,"name":"Antes"}]','2026-01-01');
commit;
