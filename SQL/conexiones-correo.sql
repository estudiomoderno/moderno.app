-- Conexiones reales de correo por usuario y estudio.
-- Los secretos se cifran con Supabase Vault y nunca se exponen al navegador.
-- Aplicar primero en moderno-pruebas y desplegar la Edge Function mail-connect.
begin;

do $guard$
begin
 if to_regclass('public.estudios') is null
   or to_regprocedure('public.app_rol(uuid)') is null
   or to_regprocedure('public.app_rol_usuario(uuid,uuid)') is null then
  raise exception 'Falta el contrato vigente de estudios y permisos; no se aplicó ningún cambio';
 end if;
 if not exists(select 1 from pg_extension where extname='supabase_vault') then
  raise exception 'Supabase Vault no está disponible; no se aplicó ningún cambio';
 end if;
end $guard$;

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

create table if not exists private.mail_connections(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 estudio_id uuid not null references public.estudios(id) on delete cascade,
 provider text not null check(provider in ('gmail','icloud','server')),
 email text not null check(char_length(email) between 3 and 254 and email=lower(email)),
 display_name text not null default '' check(char_length(display_name)<=160),
 secret_id uuid not null unique,
 status text not null default 'connected' check(status in ('connected','error')),
 error_code text,
 last_checked_at timestamptz not null default clock_timestamp(),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,estudio_id,provider,email)
);
create index if not exists mail_connections_owner
 on private.mail_connections(user_id,estudio_id,updated_at desc);
create index if not exists mail_connections_estudio_fk
 on private.mail_connections(estudio_id);
revoke all on private.mail_connections from public,anon,authenticated;

create table if not exists private.mail_oauth_states(
 state_hash text primary key check(state_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 estudio_id uuid not null references public.estudios(id) on delete cascade,
 code_verifier text not null check(char_length(code_verifier) between 43 and 128),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '10 minutes'
);
create index if not exists mail_oauth_states_expiry on private.mail_oauth_states(expires_at);
create index if not exists mail_oauth_states_owner
 on private.mail_oauth_states(user_id,estudio_id);
create index if not exists mail_oauth_states_estudio_fk
 on private.mail_oauth_states(estudio_id);
revoke all on private.mail_oauth_states from public,anon,authenticated;

create or replace function public.mail_connection_status(p_estudio uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
declare result jsonb;
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then
  raise exception 'Sin permiso para gestionar el correo' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'provider',c.provider,'email',c.email,'displayName',c.display_name,
  'status',c.status,'errorCode',c.error_code,'lastCheckedAt',c.last_checked_at,
  'createdAt',c.created_at,'updatedAt',c.updated_at
 ) order by c.updated_at desc),'[]'::jsonb) into result
 from private.mail_connections c
 where c.user_id=auth.uid() and c.estudio_id=p_estudio;
 return result;
end $function$;
revoke all on function public.mail_connection_status(uuid) from public,anon,authenticated;
grant execute on function public.mail_connection_status(uuid) to authenticated;

create or replace function public.mail_connection_delete(p_estudio uuid,p_connection uuid) returns boolean
language plpgsql security definer set search_path='' as $function$
declare sid uuid;
begin
 if auth.uid() is null or public.app_rol(p_estudio)<>'admin' then
  raise exception 'Sin permiso para gestionar el correo' using errcode='42501';
 end if;
 delete from private.mail_connections
 where id=p_connection and estudio_id=p_estudio and user_id=auth.uid()
 returning secret_id into sid;
 if sid is null then return false; end if;
 delete from vault.secrets where id=sid;
 return true;
end $function$;
revoke all on function public.mail_connection_delete(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mail_connection_delete(uuid,uuid) to authenticated;

create or replace function public.mail_connection_admin_store(
 p_user uuid,p_estudio uuid,p_provider text,p_email text,p_display_name text,p_secret text
) returns uuid
language plpgsql security definer set search_path='' as $function$
declare row private.mail_connections; sid uuid; normalized_email text; connection_id uuid;
begin
 if auth.role()<>'service_role' then
  raise exception 'Solo servicio interno' using errcode='42501';
 end if;
 if public.app_rol_usuario(p_estudio,p_user)<>'admin' then
  raise exception 'Acceso revocado' using errcode='42501';
 end if;
 normalized_email:=lower(btrim(coalesce(p_email,'')));
 if p_provider not in ('gmail','icloud','server')
   or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   or char_length(normalized_email)>254
   or char_length(coalesce(p_display_name,''))>160
   or octet_length(coalesce(p_secret,'')) not between 2 and 30000 then
  raise exception 'Datos de conexión no válidos' using errcode='22023';
 end if;
 select * into row from private.mail_connections
 where user_id=p_user and estudio_id=p_estudio and provider=p_provider and email=normalized_email
 for update;
 if found then
  perform vault.update_secret(row.secret_id,p_secret,null,'Moderno Mail '||p_provider||' '||row.id::text);
  update private.mail_connections set display_name=coalesce(p_display_name,''),status='connected',
   error_code=null,last_checked_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=row.id returning id into connection_id;
 else
  sid:=vault.create_secret(p_secret,null,'Moderno Mail '||p_provider||' '||p_user::text);
  insert into private.mail_connections(user_id,estudio_id,provider,email,display_name,secret_id)
  values(p_user,p_estudio,p_provider,normalized_email,coalesce(p_display_name,''),sid)
  returning id into connection_id;
 end if;
 return connection_id;
end $function$;
revoke all on function public.mail_connection_admin_store(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.mail_connection_admin_store(uuid,uuid,text,text,text,text) to service_role;

create or replace function public.mail_connection_admin_get(
 p_user uuid,p_estudio uuid,p_connection uuid
) returns jsonb
language plpgsql stable security definer set search_path='' as $function$
declare result jsonb;
begin
 if auth.role()<>'service_role' then
  raise exception 'Solo servicio interno' using errcode='42501';
 end if;
 if public.app_rol_usuario(p_estudio,p_user)<>'admin' then
  raise exception 'Acceso revocado' using errcode='42501';
 end if;
 select jsonb_build_object('id',c.id,'provider',c.provider,'email',c.email,
  'displayName',c.display_name,'secret',v.decrypted_secret)
 into result
 from private.mail_connections c
 join vault.decrypted_secrets v on v.id=c.secret_id
 where c.id=p_connection and c.user_id=p_user and c.estudio_id=p_estudio;
 if result is null then raise exception 'Conexión no disponible' using errcode='P0002'; end if;
 return result;
end $function$;
revoke all on function public.mail_connection_admin_get(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.mail_connection_admin_get(uuid,uuid,uuid) to service_role;

create or replace function public.mail_connection_admin_touch(
 p_user uuid,p_estudio uuid,p_connection uuid,p_status text,p_error text default null
) returns void
language plpgsql security definer set search_path='' as $function$
begin
 if auth.role()<>'service_role' then
  raise exception 'Solo servicio interno' using errcode='42501';
 end if;
 if p_status not in ('connected','error') then raise exception 'Estado no válido'; end if;
 update private.mail_connections set status=p_status,error_code=left(p_error,80),
  last_checked_at=clock_timestamp(),updated_at=clock_timestamp()
 where id=p_connection and user_id=p_user and estudio_id=p_estudio;
 if not found then raise exception 'Conexión no disponible' using errcode='P0002'; end if;
end $function$;
revoke all on function public.mail_connection_admin_touch(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mail_connection_admin_touch(uuid,uuid,uuid,text,text) to service_role;

create or replace function public.mail_oauth_admin_begin(
 p_user uuid,p_estudio uuid,p_state_hash text,p_code_verifier text
) returns void
language plpgsql security definer set search_path='' as $function$
begin
 if auth.role()<>'service_role' then
  raise exception 'Solo servicio interno' using errcode='42501';
 end if;
 if public.app_rol_usuario(p_estudio,p_user)<>'admin' then
  raise exception 'Acceso revocado' using errcode='42501';
 end if;
 if p_state_hash !~ '^[a-f0-9]{64}$' or char_length(p_code_verifier) not between 43 and 128 then
  raise exception 'Estado OAuth no válido' using errcode='22023';
 end if;
 delete from private.mail_oauth_states where expires_at<clock_timestamp();
 delete from private.mail_oauth_states where user_id=p_user and estudio_id=p_estudio;
 insert into private.mail_oauth_states(state_hash,user_id,estudio_id,code_verifier)
 values(p_state_hash,p_user,p_estudio,p_code_verifier);
end $function$;
revoke all on function public.mail_oauth_admin_begin(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mail_oauth_admin_begin(uuid,uuid,text,text) to service_role;

create or replace function public.mail_oauth_admin_claim(p_state_hash text) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare row private.mail_oauth_states;
begin
 if auth.role()<>'service_role' then
  raise exception 'Solo servicio interno' using errcode='42501';
 end if;
 delete from private.mail_oauth_states
 where state_hash=p_state_hash and expires_at>=clock_timestamp()
 returning * into row;
 if not found then raise exception 'Autorización caducada o ya utilizada' using errcode='P0002'; end if;
 if public.app_rol_usuario(row.estudio_id,row.user_id)<>'admin' then
  raise exception 'Acceso revocado' using errcode='42501';
 end if;
 return jsonb_build_object('userId',row.user_id,'studyId',row.estudio_id,'codeVerifier',row.code_verifier);
end $function$;
revoke all on function public.mail_oauth_admin_claim(text) from public,anon,authenticated;
grant execute on function public.mail_oauth_admin_claim(text) to service_role;

notify pgrst,'reload schema';
commit;
