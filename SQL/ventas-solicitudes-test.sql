-- Clone only. No public reads or anonymous writes. No email delivery.
begin;
create table if not exists public.sales_test_requests (
 id uuid primary key, estudio_id uuid not null references public.estudios(id), actor uuid not null,
 name text not null, company text not null, email text not null, internal_users integer not null check(internal_users between 5 and 10000),
 message text not null default '', status text not null default 'received' check(status='received'),
 created_at timestamptz not null default now()
);
alter table public.sales_test_requests enable row level security;
revoke all on public.sales_test_requests from public,anon,authenticated;
create or replace function public.sales_test_submit(p_actor uuid,p_estudio uuid,p_id uuid,p_name text,p_company text,p_email text,p_users integer,p_message text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.sales_test_requests;
begin
 perform public.billing_test_authorize(p_actor,p_estudio);
 p_name:=trim(p_name);p_company:=trim(p_company);p_email:=lower(trim(p_email));p_message:=trim(coalesce(p_message,''));
 if p_id is null or p_name is null or length(p_name) not between 1 and 120 or p_company is null or length(p_company) not between 1 and 160
 or p_email is null or length(p_email)>254 or p_email!~'^[^@\s]+@[^@\s]+\.[^@\s]+$'
 or p_users is null or p_users not between 5 and 10000 or length(p_message)>2000 then raise exception 'Invalid request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,356));
 select * into existing from public.sales_test_requests where id=p_id;
 if found then
  if existing.estudio_id<>p_estudio or existing.actor<>p_actor or existing.name<>p_name or existing.company<>p_company or existing.email<>p_email or existing.internal_users<>p_users or existing.message<>p_message then
   raise exception 'Request conflict' using errcode='PT409';end if;
  return jsonb_build_object('id',existing.id,'status',existing.status,'createdAt',existing.created_at,'duplicate',true);
 end if;
 if (select count(*) from public.sales_test_requests where estudio_id=p_estudio and created_at>now()-interval '1 hour')>=3
 or (select count(*) from public.sales_test_requests where actor=p_actor and created_at>now()-interval '1 hour')>=3 then raise exception 'Too many requests' using errcode='PT429';end if;
 insert into public.sales_test_requests(id,estudio_id,actor,name,company,email,internal_users,message)
 values(p_id,p_estudio,p_actor,p_name,p_company,p_email,p_users,p_message) returning * into existing;
 return jsonb_build_object('id',existing.id,'status',existing.status,'createdAt',existing.created_at,'duplicate',false);
end $$;
revoke all on function public.sales_test_submit(uuid,uuid,uuid,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.sales_test_submit(uuid,uuid,uuid,text,text,text,integer,text) to service_role;
commit;
