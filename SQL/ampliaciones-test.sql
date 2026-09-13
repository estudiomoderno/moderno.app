-- Solo ensayo. Cotizaciones persistentes; no cobra, no concede plazas.
begin;
create table if not exists public.billing_test_seat_quotes(
 id uuid primary key,estudio_id uuid not null references public.billing_test_accounts(estudio_id),
 actor uuid not null,subscription_id text not null,source_seats integer not null,target_seats integer not null,
 amount_due bigint not null check(amount_due>=0),expires_at bigint not null,payload jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.billing_test_seat_quotes enable row level security;
revoke all on public.billing_test_seat_quotes from public,anon,authenticated;
create or replace function public.billing_test_seat_preview_save(p_actor uuid,p_estudio uuid,p_id uuid,p_value jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.billing_test_accounts;q public.billing_test_seat_quotes;stamp bigint:=extract(epoch from clock_timestamp())::bigint;
begin
 perform public.billing_test_authorize(p_actor,p_estudio);
 if public.billing_is_exempt(p_estudio) then raise exception 'Estudio exento' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 select * into a from public.billing_test_accounts where estudio_id=p_estudio for update;
 if not found or not a.eligible or a.status<>'active' or a.cancel_at_period_end or a.period_end<=stamp then raise exception 'Suscripcion no disponible' using errcode='PT409';end if;
 if p_id is null or p_value is null or jsonb_typeof(p_value)<>'object' then raise exception 'Propuesta no valida' using errcode='22023';end if;
 if (p_value->>'subscriptionId') is distinct from a.subscription_id
 or (p_value->>'currentSeats')::integer is distinct from a.seats
 or (p_value->>'periodEnd')::bigint is distinct from a.period_end
 or (p_value->>'currency') is distinct from 'eur'
 or (p_value->>'targetSeats')::integer is null
 or (p_value->>'targetSeats')::integer not between a.seats+1 and 4
 or (p_value->>'amountDue')::bigint is null or (p_value->>'amountDue')::bigint<0
 or (p_value->>'expiresAt')::bigint is null or (p_value->>'expiresAt')::bigint<=stamp
 or (p_value->>'expiresAt')::bigint>least(stamp+300,a.period_end)
 or (p_value->>'prorationDate')::bigint is null or (p_value->>'prorationDate')::bigint not between stamp-300 and stamp
 then raise exception 'La propuesta ya no coincide' using errcode='PT409';end if;
 select * into q from public.billing_test_seat_quotes where id=p_id;
 if found then
  if q.estudio_id<>p_estudio or q.actor<>p_actor or q.payload<>p_value then raise exception 'Solicitud reutilizada' using errcode='PT409';end if;
 else
  insert into public.billing_test_seat_quotes(id,estudio_id,actor,subscription_id,source_seats,target_seats,amount_due,expires_at,payload)
  values(p_id,p_estudio,p_actor,a.subscription_id,a.seats,(p_value->>'targetSeats')::integer,(p_value->>'amountDue')::bigint,(p_value->>'expiresAt')::bigint,p_value) returning * into q;
 end if;
 return q.payload||jsonb_build_object('quoteId',q.id);
end $$;
revoke all on function public.billing_test_seat_preview_save(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.billing_test_seat_preview_save(uuid,uuid,uuid,jsonb) to service_role;
commit;
