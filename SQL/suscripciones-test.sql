-- PREPARACION: solo clon. No cambia app_rol, datos_estudio, miembros ni Storage.
begin;
create table if not exists public.billing_test_accounts(
 estudio_id uuid primary key references public.estudios(id),
 customer_id text unique,subscription_id text unique,status text not null default 'not_started',
 eligible boolean not null default false,cancel_at_period_end boolean not null default false,period_end bigint,
 sync_token uuid,sync_until timestamptz,sync_request uuid,sync_subscription text,sync_event text,updated_at timestamptz not null default now()
);
create table if not exists public.billing_test_checkouts(
 id uuid primary key,estudio_id uuid not null references public.billing_test_accounts(estudio_id),actor uuid not null,
 plan text not null,customer_id text,session_id text unique,created_at timestamptz not null default now(),
 closed boolean not null default false
);
create unique index if not exists billing_test_one_open on public.billing_test_checkouts(estudio_id) where not closed;
create table if not exists public.billing_test_events(
 id text primary key,estudio_id uuid not null references public.billing_test_accounts(estudio_id),
 processed_at timestamptz not null default now()
);
alter table public.billing_test_accounts enable row level security;
alter table public.billing_test_checkouts enable row level security;
alter table public.billing_test_events enable row level security;
revoke all on public.billing_test_accounts,public.billing_test_checkouts,public.billing_test_events from public,anon,authenticated;

create or replace function public.billing_test_authorize(p_actor uuid,p_estudio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.billing_test_accounts;
begin
 if p_actor is null or public.app_rol_usuario(p_estudio,p_actor)<>'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 select * into a from public.billing_test_accounts where estudio_id=p_estudio;
 return jsonb_build_object('customerId',a.customer_id,'subscriptionId',a.subscription_id,'status',coalesce(a.status,'not_started'),'eligible',coalesce(a.eligible,false),'cancelAtPeriodEnd',coalesce(a.cancel_at_period_end,false),'periodEnd',a.period_end);
end $$;
create or replace function public.billing_test_begin(p_actor uuid,p_estudio uuid,p_request uuid,p_plan text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.billing_test_accounts;c public.billing_test_checkouts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 perform public.billing_test_authorize(p_actor,p_estudio);
 if p_plan is null or p_plan!~'^[a-z0-9][a-z0-9_-]{0,63}$' or p_request is null then raise exception 'Solicitud no valida';end if;
 insert into public.billing_test_accounts(estudio_id) values(p_estudio) on conflict do nothing;
 select * into a from public.billing_test_accounts where estudio_id=p_estudio;
 if a.subscription_id is not null and a.status not in ('canceled','incomplete_expired') then raise exception 'Ya existe una suscripcion';end if;
 select * into c from public.billing_test_checkouts where estudio_id=p_estudio and not closed;
 if found then
  if c.plan<>p_plan or c.actor<>p_actor then raise exception 'Hay un intento pendiente';end if;
 else
  insert into public.billing_test_checkouts(id,estudio_id,actor,plan,customer_id) values(p_request,p_estudio,p_actor,p_plan,a.customer_id) returning * into c;
 end if;
 return jsonb_build_object('requestId',c.id,'createdAt',c.created_at,'customerId',c.customer_id,'sessionId',c.session_id);
end $$;
create or replace function public.billing_test_checkout_save(p_actor uuid,p_estudio uuid,p_request uuid,p_customer text,p_session text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.billing_test_checkouts;a public.billing_test_accounts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 perform public.billing_test_authorize(p_actor,p_estudio);
 select * into c from public.billing_test_checkouts where id=p_request and estudio_id=p_estudio and actor=p_actor;
 if not found or c.closed then raise exception 'Intento no disponible';end if;
 select * into a from public.billing_test_accounts where estudio_id=p_estudio;
 if p_customer is null or p_customer!~'^cus_[a-zA-Z0-9]+$' or (a.customer_id is not null and a.customer_id<>p_customer) or (c.customer_id is not null and c.customer_id<>p_customer) then raise exception 'Cliente distinto';end if;
 if p_session is not null and (p_session!~'^cs_test_[a-zA-Z0-9]+$' or (c.session_id is not null and c.session_id<>p_session)) then raise exception 'Sesion distinta';end if;
 update public.billing_test_accounts set customer_id=p_customer,updated_at=now() where estudio_id=p_estudio;
 update public.billing_test_checkouts set customer_id=p_customer,session_id=coalesce(p_session,session_id) where id=p_request;
end $$;
create or replace function public.billing_test_claim(p_event text,p_estudio uuid,p_request uuid,p_customer text,p_subscription text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.billing_test_accounts;c public.billing_test_checkouts;token uuid:=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 if exists(select 1 from public.billing_test_events where id=p_event) then return '{"duplicate":true}';end if;
 select * into a from public.billing_test_accounts where estudio_id=p_estudio;
 if not found or a.customer_id is distinct from p_customer then return '{"ignored":true}';end if;
 select * into c from public.billing_test_checkouts where id=p_request and estudio_id=p_estudio and customer_id=p_customer;
 if not found then return '{"ignored":true}';end if;
 -- A superseded checkout can never overwrite the newer subscription.
 if a.subscription_id is not null and a.subscription_id<>p_subscription and c.closed then return '{"ignored":true}';end if;
 if a.sync_until>clock_timestamp() then return '{}';end if;
 update public.billing_test_accounts set sync_token=token,sync_until=clock_timestamp()+interval '90 seconds',sync_request=p_request,sync_subscription=p_subscription,sync_event=p_event where estudio_id=p_estudio;
 return jsonb_build_object('token',token,'plan',c.plan);
end $$;
create or replace function public.billing_test_expire(p_actor uuid,p_estudio uuid,p_request uuid,p_session text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 perform public.billing_test_authorize(p_actor,p_estudio);
 update public.billing_test_checkouts set closed=true where id=p_request and estudio_id=p_estudio and actor=p_actor and session_id=p_session;
end $$;
create or replace function public.billing_test_finish(p_event text,p_estudio uuid,p_token uuid,p_value jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 if not exists(select 1 from public.billing_test_accounts where estudio_id=p_estudio and sync_token=p_token and sync_until>clock_timestamp() and customer_id=p_value->>'customerId' and sync_subscription=p_value->>'subscriptionId' and sync_event=p_event) then raise exception 'Sincronizacion caducada';end if;
 if p_value->>'status' not in ('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused') or p_value->>'subscriptionId' !~ '^sub_[a-zA-Z0-9]+$' then raise exception 'Estado no valido';end if;
 update public.billing_test_checkouts set closed=true where estudio_id=p_estudio and id=(select sync_request from public.billing_test_accounts where estudio_id=p_estudio);
 update public.billing_test_accounts set subscription_id=p_value->>'subscriptionId',status=p_value->>'status',eligible=p_value->>'status'='active' and coalesce((p_value->>'eligible')::boolean,false),cancel_at_period_end=coalesce((p_value->>'cancelAtPeriodEnd')::boolean,false),period_end=(p_value->>'periodEnd')::bigint,sync_token=null,sync_until=null,sync_request=null,sync_subscription=null,sync_event=null,updated_at=now() where estudio_id=p_estudio;
 insert into public.billing_test_events(id,estudio_id) values(p_event,p_estudio);
end $$;
create or replace function public.billing_test_release(p_estudio uuid,p_token uuid) returns void
language sql security definer set search_path='' as $$
 update public.billing_test_accounts set sync_token=null,sync_until=null where estudio_id=p_estudio and sync_token=p_token;
$$;
-- Only the authenticated Edge handler may supply the verified actor UUID.
revoke all on function public.billing_test_authorize(uuid,uuid),public.billing_test_begin(uuid,uuid,uuid,text),public.billing_test_checkout_save(uuid,uuid,uuid,text,text),public.billing_test_claim(text,uuid,uuid,text,text),public.billing_test_finish(text,uuid,uuid,jsonb),public.billing_test_release(uuid,uuid) from public,anon,authenticated;
grant execute on function public.billing_test_authorize(uuid,uuid),public.billing_test_begin(uuid,uuid,uuid,text),public.billing_test_checkout_save(uuid,uuid,uuid,text,text),public.billing_test_claim(text,uuid,uuid,text,text),public.billing_test_finish(text,uuid,uuid,jsonb),public.billing_test_release(uuid,uuid) to service_role;
revoke all on function public.billing_test_expire(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.billing_test_expire(uuid,uuid,uuid,text) to service_role;
commit;
