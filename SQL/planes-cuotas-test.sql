-- TEST ONLY. Opt-in policies: installing never enrolls or restricts existing/pilot studies.
-- Requires equipo-roles.sql, productos-entrantes.sql and suscripciones-test.sql.
begin;
alter table public.billing_test_accounts add column if not exists plan_slug text;
alter table public.billing_test_accounts add column if not exists seats integer;
alter table public.billing_test_checkouts add column if not exists quantity integer;
alter table public.billing_test_checkouts add column if not exists seat_revision text;
create table if not exists public.billing_test_policy(
 estudio_id uuid primary key references public.estudios(id),enforced boolean not null default false,
 free_selected boolean not null default false,
 team_rules_confirmed boolean not null default false,team_minimum integer check(team_minimum>0),
 paid_capture_limit integer check(paid_capture_limit>=0),paid_capture_unlimited boolean not null default false,
 free_library_confirmed boolean not null default false,pdf_definition_confirmed boolean not null default false
);
create table if not exists public.billing_test_member_kind(
 estudio_id uuid references public.estudios(id),user_id uuid,kind text not null check(kind in ('internal','unresolved')),
 primary key(estudio_id,user_id)
);
create table if not exists public.billing_test_periods(
 estudio_id uuid references public.estudios(id),starts_at timestamptz,ends_at timestamptz not null,
 primary key(estudio_id,starts_at),check(ends_at>starts_at)
);
create table if not exists public.billing_test_usage(
 estudio_id uuid references public.estudios(id),metric text check(metric in ('capture','pdf')),operation_id uuid,
 period_start timestamptz not null,state text not null check(state in ('reserved','succeeded','failed')),
 reserved_until timestamptz,completed_at timestamptz,
 primary key(estudio_id,metric,operation_id),foreign key(estudio_id,period_start) references public.billing_test_periods(estudio_id,starts_at)
);
alter table public.billing_test_policy enable row level security;
alter table public.billing_test_member_kind enable row level security;
alter table public.billing_test_periods enable row level security;
alter table public.billing_test_usage enable row level security;
revoke all on public.billing_test_policy,public.billing_test_member_kind,public.billing_test_periods,public.billing_test_usage from public,anon,authenticated;

create or replace function public.billing_test_entitlements(p_estudio uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.billing_test_policy;a public.billing_test_accounts;plan text;
begin
 if public.billing_is_exempt(p_estudio) then return '{"enforced":false,"billingExempt":true,"plan":"team","pilotPreserved":true,"clientPortal":true,"personalLibrary":true,"sharedLibrary":true,"teamManagement":true,"modernoBrand":false}';end if;
 select * into p from public.billing_test_policy where estudio_id=p_estudio;
 if not found or not p.enforced then return '{"enforced":false,"pilotPreserved":true}';end if;
 select * into a from public.billing_test_accounts where estudio_id=p_estudio;
 plan:=case when a.eligible and a.plan_slug in ('pro','team') then a.plan_slug else 'free' end;
 return jsonb_build_object('enforced',true,'plan',plan,'projectsUnlimited',true,'fullEditing',true,
 'internalUsers',case when plan='team' then a.seats else 1 end,'clientPortal',plan<>'free','modernoBrand',plan='free',
 'personalLibrary',case when plan='free' then case when p.free_library_confirmed then false else null end else true end,
 'sharedLibrary',plan='team','teamManagement',plan='team',
 'captureLimit',case when plan='free' then 25 else p.paid_capture_limit end,'captureUnlimited',plan<>'free' and p.paid_capture_unlimited,
 'pdfLimit',case when plan='free' then 10 else null end,'pdfUnlimited',plan<>'free','pdfDefinitionConfirmed',p.pdf_definition_confirmed);
end $$;

-- Active memberships only. Clients and the restricted gestoria profile never count.
-- Pending invitations do not reserve seats or authorize payment. Ambiguous profiles block quotation.
create or replace function public.billing_test_seat_quote(p_actor uuid,p_estudio uuid,p_plan text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n integer;unknowns integer;pending integer;fingerprint text;p public.billing_test_policy;
begin
 perform public.billing_test_authorize(p_actor,p_estudio);
 if p_plan not in ('free','pro','team') then raise exception 'Plan no disponible';end if;
 select * into p from public.billing_test_policy where estudio_id=p_estudio;
 select count(*) filter(where role not in ('cliente','gestoria') and (role in ('admin','colaborador') or kind='internal')),
 count(*) filter(where role not in ('admin','colaborador','cliente','gestoria') and coalesce(kind,'unresolved')<>'internal'),
 md5(coalesce(string_agg(user_id::text||':'||role||':'||coalesce(kind,''),'|' order by user_id) filter(where role not in ('cliente','gestoria')),''))
 into n,unknowns,fingerprint from (
 select m.user_id,public.app_rol_usuario(p_estudio,m.user_id) role,k.kind from public.miembros m left join public.billing_test_member_kind k on k.estudio_id=m.estudio_id and k.user_id=m.user_id where m.estudio_id=p_estudio
 ) x;
 select count(*) into pending from public.invitaciones i left join public.app_roles r on r.id=i.role_id where i.estudio_id=p_estudio and coalesce(r.perfil,'admin')<>'cliente';
 -- Pending invitations are informational only; acceptance must pass the paid-seat guard.
 return jsonb_build_object('quantity',case when p_plan='team' then greatest(n,1) else 1 end,
 'salesRequired',p_plan='team' and n>=5,'internalMembers',n,'unclassified',unknowns,'pendingInvitations',pending,'revision',fingerprint,
 'ready',coalesce(p.enforced,false) and unknowns=0 and case when p_plan='team' then n between 1 and 4 else n<=1 end);
end $$;

create or replace function public.billing_test_begin_plan(p_actor uuid,p_estudio uuid,p_request uuid,p_plan text,p_revision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb;c jsonb;old public.billing_test_checkouts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 q:=public.billing_test_seat_quote(p_actor,p_estudio,p_plan);
 if not coalesce((q->>'ready')::boolean,false) then raise exception 'Reglas de usuarios pendientes' using errcode='PT409';end if;
 if q->>'revision' is distinct from p_revision then raise exception 'El equipo ha cambiado' using errcode='PT409';end if;
 if p_plan='free' then raise exception 'Free no necesita Checkout';end if;
 c:=public.billing_test_begin(p_actor,p_estudio,p_request,p_plan);
 select * into old from public.billing_test_checkouts where id=(c->>'requestId')::uuid;
 if old.quantity is not null and (old.quantity<>(q->>'quantity')::integer or old.seat_revision<>p_revision) then raise exception 'Conciliar intento anterior' using errcode='PT409';end if;
 update public.billing_test_checkouts set quantity=(q->>'quantity')::integer,seat_revision=p_revision where id=old.id;
 return c||jsonb_build_object('quantity',(q->>'quantity')::integer,'seatRevision',p_revision);
end $$;

-- Explicit periods supplied by trusted configuration. No calendar/anniversary assumption.
create or replace function public.billing_test_period_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.estudio_id::text,355));
 if exists(select 1 from public.billing_test_periods where estudio_id=new.estudio_id and starts_at<new.ends_at and ends_at>new.starts_at and starts_at<>new.starts_at) then raise exception 'Periodos solapados';end if;
 return new;
end $$;
drop trigger if exists billing_test_period_guard on public.billing_test_periods;
create trigger billing_test_period_guard before insert or update on public.billing_test_periods for each row execute function public.billing_test_period_guard();

create or replace function public.billing_test_usage_change(p_estudio uuid,p_metric text,p_operation uuid,p_result text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e jsonb;u public.billing_test_usage;period public.billing_test_periods;lim integer;used integer;unlimited boolean;
begin
 if p_metric not in ('capture','pdf') or p_result not in ('reserve','success','failure') or p_operation is null then raise exception 'Operacion no valida';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,355));
 select * into u from public.billing_test_usage where estudio_id=p_estudio and metric=p_metric and operation_id=p_operation;
 if found and u.state='succeeded' then return '{"consumed":true,"duplicate":true}';end if;
 if p_result='failure' then update public.billing_test_usage set state='failed',reserved_until=null where estudio_id=p_estudio and metric=p_metric and operation_id=p_operation;return '{"consumed":false}';end if;
 e:=public.billing_test_entitlements(p_estudio);if not (e->>'enforced')::boolean then return '{"enforced":false}';end if;
 if p_metric='pdf' and not (e->>'pdfDefinitionConfirmed')::boolean then raise exception 'Criterio PDF pendiente' using errcode='PT409';end if;
 lim:=(e->>case when p_metric='capture' then 'captureLimit' else 'pdfLimit' end)::integer;
 unlimited:=coalesce((e->>case when p_metric='capture' then 'captureUnlimited' else 'pdfUnlimited' end)::boolean,false);
 if lim is null and not unlimited then raise exception 'Condiciones de cuota pendientes' using errcode='PT409';end if;
 select * into period from public.billing_test_periods where estudio_id=p_estudio and starts_at<=clock_timestamp() and ends_at>clock_timestamp();
 if not found then raise exception 'Ciclo mensual pendiente' using errcode='PT409';end if;
 select count(*) into used from public.billing_test_usage where estudio_id=p_estudio and metric=p_metric and period_start=period.starts_at and operation_id<>p_operation and (state='succeeded' or (state='reserved' and reserved_until>clock_timestamp()));
 if not unlimited and used>=lim then raise exception 'Cuota mensual agotada' using errcode='PT429';end if;
 insert into public.billing_test_usage(estudio_id,metric,operation_id,period_start,state,reserved_until,completed_at)
 values(p_estudio,p_metric,p_operation,period.starts_at,case when p_result='success' then 'succeeded' else 'reserved' end,clock_timestamp()+interval '15 minutes',case when p_result='success' then clock_timestamp() end)
 on conflict(estudio_id,metric,operation_id) do update set period_start=excluded.period_start,state=excluded.state,reserved_until=excluded.reserved_until,completed_at=excluded.completed_at;
 return jsonb_build_object('consumed',p_result='success','limit',lim,'unlimited',unlimited,'periodStart',period.starts_at,'periodEnd',period.ends_at,'usedIncludingReservation',used+1);
end $$;

-- Connected to the actual database transition, not a client-side counter.
create or replace function public.billing_test_capture_usage() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then perform public.billing_test_usage_change(new.estudio_id,'capture',new.id,'reserve');
 elsif new.estado='error' and old.estado is distinct from new.estado then perform public.billing_test_usage_change(new.estudio_id,'capture',new.id,'failure');
 elsif new.estado='absorbido' and old.estado is distinct from new.estado then perform public.billing_test_usage_change(new.estudio_id,'capture',new.id,'success');end if;
 return new;
end $$;
drop trigger if exists billing_test_capture_usage on public.productos_entrantes;
create trigger billing_test_capture_usage after insert or update on public.productos_entrantes for each row execute function public.billing_test_capture_usage();

-- Prevent additional unpaid internal memberships in opted-in test studies.
create or replace function public.billing_test_member_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare e jsonb;q jsonb;administrator uuid;pending_quantity integer;
begin
 e:=public.billing_test_entitlements(new.estudio_id);if not (e->>'enforced')::boolean then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.estudio_id::text,354));
 select user_id into administrator from public.miembros where estudio_id=new.estudio_id and public.app_rol_usuario(estudio_id,user_id)='admin' limit 1;
 q:=public.billing_test_seat_quote(administrator,new.estudio_id,e->>'plan');
 if (q->>'unclassified')::integer>0 then raise exception 'Clasificacion de colaboradores pendiente' using errcode='PT409';end if;
 if (q->>'internalMembers')::integer>(e->>'internalUsers')::integer then raise exception 'Pendiente de ampliación por el administrador: no hay plazas disponibles' using errcode='PT409';end if;
 select quantity into pending_quantity from public.billing_test_checkouts where estudio_id=new.estudio_id and not closed;
 if pending_quantity is not null and (q->>'internalMembers')::integer>pending_quantity then raise exception 'Finaliza o concilia el pago del equipo' using errcode='PT409';end if;
 return new;
end $$;
drop trigger if exists billing_test_member_guard on public.miembros;
create trigger billing_test_member_guard after insert or update on public.miembros for each row execute function public.billing_test_member_guard();
drop trigger if exists billing_test_role_seats_guard on public.app_roles;
create trigger billing_test_role_seats_guard after update on public.app_roles for each row execute function public.billing_test_member_guard();
drop trigger if exists billing_test_kind_seats_guard on public.billing_test_member_kind;
create trigger billing_test_kind_seats_guard after insert or update on public.billing_test_member_kind for each row execute function public.billing_test_member_guard();

create or replace function public.billing_test_select_free(p_actor uuid,p_estudio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,354));
 perform public.billing_test_authorize(p_actor,p_estudio);
 if not exists(select 1 from public.billing_test_policy where estudio_id=p_estudio and enforced) then raise exception 'Estudio no habilitado para ensayo';end if;
 if exists(select 1 from public.billing_test_accounts where estudio_id=p_estudio and subscription_id is not null and status not in ('canceled','incomplete_expired')) then raise exception 'Gestiona primero la suscripcion existente';end if;
 update public.billing_test_policy set free_selected=true where estudio_id=p_estudio;
 return public.billing_test_entitlements(p_estudio);
end $$;

-- PDF receipt is stable per document revision. Only a trusted renderer can finalize it.
create table if not exists public.billing_test_pdf_receipts(
 id uuid primary key default gen_random_uuid(),estudio_id uuid not null references public.estudios(id),
 document_key text not null,revision text not null,object_path text,sha256 text,
 unique(estudio_id,document_key,revision),check(length(document_key)<=200),check(length(revision)<=100)
);
alter table public.billing_test_pdf_receipts enable row level security;
revoke all on public.billing_test_pdf_receipts from public,anon,authenticated;
create or replace function public.billing_test_pdf_reserve(p_actor uuid,p_estudio uuid,p_document text,p_revision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare receipt public.billing_test_pdf_receipts;
begin
 perform public.billing_test_authorize(p_actor,p_estudio);
 if nullif(p_document,'') is null or nullif(p_revision,'') is null then raise exception 'Documento sin revision';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,355));
 select * into receipt from public.billing_test_pdf_receipts where estudio_id=p_estudio and document_key=p_document and revision=p_revision;
 if found and receipt.object_path is not null then return jsonb_build_object('id',receipt.id,'cached',true,'path',receipt.object_path);end if;
 if not found then insert into public.billing_test_pdf_receipts(estudio_id,document_key,revision) values(p_estudio,p_document,p_revision) returning * into receipt;end if;
 perform public.billing_test_usage_change(p_estudio,'pdf',receipt.id,'reserve');
 return jsonb_build_object('id',receipt.id,'cached',false,'modernoBrand',public.billing_test_entitlements(p_estudio)->'modernoBrand');
end $$;
create or replace function public.billing_test_pdf_finish(p_estudio uuid,p_receipt uuid,p_path text,p_sha256 text,p_success boolean) returns void
language plpgsql security definer set search_path='' as $$
declare receipt public.billing_test_pdf_receipts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,355));
 select * into strict receipt from public.billing_test_pdf_receipts where id=p_receipt and estudio_id=p_estudio;
 if receipt.object_path is not null then return;end if;
 if not p_success then perform public.billing_test_usage_change(p_estudio,'pdf',p_receipt,'failure');return;end if;
 if p_path is null or p_path<>p_estudio::text||'/billing-pdf/'||p_receipt::text||'.pdf' or coalesce(p_sha256,'')!~'^[a-f0-9]{64}$' then raise exception 'PDF no confirmado';end if;
 -- The renderer calls this only after generating, validating and storing PDF bytes.
 perform public.billing_test_usage_change(p_estudio,'pdf',p_receipt,'success');
 update public.billing_test_pdf_receipts set object_path=p_path,sha256=p_sha256 where id=p_receipt;
end $$;

revoke all on function public.billing_test_entitlements(uuid),public.billing_test_seat_quote(uuid,uuid,text),public.billing_test_begin_plan(uuid,uuid,uuid,text,text),public.billing_test_usage_change(uuid,text,uuid,text),public.billing_test_period_guard(),public.billing_test_capture_usage() from public,anon,authenticated;
grant execute on function public.billing_test_entitlements(uuid),public.billing_test_seat_quote(uuid,uuid,text),public.billing_test_begin_plan(uuid,uuid,uuid,text,text),public.billing_test_usage_change(uuid,text,uuid,text) to service_role;
revoke all on function public.billing_test_member_guard(),public.billing_test_pdf_reserve(uuid,uuid,text,text),public.billing_test_pdf_finish(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.billing_test_pdf_reserve(uuid,uuid,text,text),public.billing_test_pdf_finish(uuid,uuid,text,text,boolean) to service_role;
revoke all on function public.billing_test_select_free(uuid,uuid) from public,anon,authenticated;
grant execute on function public.billing_test_select_free(uuid,uuid) to service_role;
commit;
