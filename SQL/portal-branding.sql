-- Branding only. Token validity and portal access rules remain unchanged.
-- Production billing is not live yet: only the existing internal exemption
-- currently grants this capability. Live billing must extend this function
-- with effective paid subscription rights, never sandbox records.
begin;
create or replace function public.portal_custom_branding(p_estudio uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(public.billing_is_exempt(p_estudio),false);
$$;
revoke all on function public.portal_custom_branding(uuid) from public,anon,authenticated;

create or replace function public.portal_cliente_lee(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare estudio uuid; payload jsonb; custom_branding boolean;
begin
 if p_token is null or p_token !~ '^[a-zA-Z0-9]{6,128}$' then return null; end if;
 estudio:=public.portal_estudio(p_token,'cliente'); if estudio is null then return null; end if;
 payload:=public.portal_filtrar(public.portal_cliente_lee_original(p_token),'cliente');
 if payload is null then return null; end if;
 custom_branding:=public.portal_custom_branding(estudio);
 if not custom_branding then payload:=payload #- '{marca,logo}'; end if;
 return payload||jsonb_build_object('estudio_id',estudio,'capabilities',jsonb_build_object('customBranding',custom_branding));
end $$;
revoke all on function public.portal_cliente_lee(text) from public;
grant execute on function public.portal_cliente_lee(text) to anon,authenticated,service_role;
commit;
