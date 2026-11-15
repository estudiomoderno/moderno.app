-- Revierte únicamente la infraestructura de conexiones de correo.
-- Elimina las credenciales cifradas asociadas antes de retirar las tablas.
begin;
do $cleanup$
declare sid uuid;
begin
 if to_regclass('private.mail_connections') is not null then
  for sid in execute 'select secret_id from private.mail_connections' loop
   delete from vault.secrets where id=sid;
  end loop;
 end if;
end $cleanup$;
drop function if exists public.mail_oauth_admin_claim(text);
drop function if exists public.mail_oauth_admin_begin(uuid,uuid,text,text);
drop function if exists public.mail_connection_admin_touch(uuid,uuid,uuid,text,text);
drop function if exists public.mail_connection_admin_get(uuid,uuid,uuid);
drop function if exists public.mail_connection_admin_store(uuid,uuid,text,text,text,text);
drop function if exists public.mail_connection_delete(uuid,uuid);
drop function if exists public.mail_connection_status(uuid);
drop table if exists private.mail_oauth_states;
drop table if exists private.mail_connections;
notify pgrst,'reload schema';
commit;
