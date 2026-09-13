-- Permanent commercial exemptions. Bootstrap rows are private and never committed.
begin;
create table if not exists public.billing_exemptions (
 estudio_id uuid primary key references public.estudios(id),
 reason text not null check(length(trim(reason)) between 1 and 300),
 granted_at timestamptz not null default now(),
 authorization_ref text not null
);
alter table public.billing_exemptions enable row level security;
revoke all on public.billing_exemptions from public,anon,authenticated;
create or replace function public.billing_is_exempt(p_estudio uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.billing_exemptions where estudio_id=p_estudio)
$$;
revoke all on function public.billing_is_exempt(uuid) from public,anon,authenticated;
grant execute on function public.billing_is_exempt(uuid) to service_role;
commit;
