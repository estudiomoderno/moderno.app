-- Deploy the previous frontend first. Memberships and documents remain intact.
begin;
drop function if exists public.app_aceptar_invitacion(uuid);
commit;
