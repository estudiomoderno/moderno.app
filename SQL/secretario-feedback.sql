-- Mejora opcional del Secretario. Revisar y verificar primero en Moderno Prueba.
-- No lee ni modifica facturas, presupuestos, chats, contactos o documentos.
-- Las RPC públicas son invoker. Las operaciones privadas definer constituyen
-- la única puerta a tablas sin acceso directo: validan identidad, estudio y
-- consentimiento y serializan revocación/envío dentro de una transacción.
begin;

do $guard$
begin
 if to_regprocedure('public.app_rol(uuid)') is null or to_regprocedure('public.app_rol_usuario(uuid,uuid)') is null
   or to_regclass('public.estudios') is null or to_regclass('public.miembros') is null then
  raise exception 'Falta el contrato de identidad y estudios';
 end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('estudios','miembros') and not c.relrowsecurity) then
  raise exception 'Verifica RLS y las políticas de estudios y miembros antes de instalar';
 end if;
end $guard$;

create schema if not exists moderno_secretary;
revoke all on schema moderno_secretary from public,anon,authenticated;
grant usage on schema moderno_secretary to authenticated;

create table if not exists moderno_secretary.consent (
 user_id uuid not null references auth.users(id) on delete cascade,
 estudio_id uuid not null references public.estudios(id) on delete cascade,
 enabled boolean not null default false,
 revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(user_id,estudio_id)
);
create index if not exists secretary_consent_study on moderno_secretary.consent(estudio_id);
alter table moderno_secretary.consent enable row level security;
revoke all on moderno_secretary.consent from public,anon,authenticated;

create table if not exists moderno_secretary.feedback (
 user_id uuid not null,
 estudio_id uuid not null,
 period date not null,
 task text not null check(task in ('invoice_from_quote','invoice_create','quote_create','finance_question','project_question','navigation')),
 outcome text not null check(outcome in ('helpful','unhelpful')),
 reason text not null default '',
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,estudio_id,period,task),
 foreign key(user_id,estudio_id) references moderno_secretary.consent(user_id,estudio_id) on delete cascade,
 check(reason='' or (outcome='helpful' and reason in ('clear_answer','saved_time'))
  or (outcome='unhelpful' and reason in ('too_many_questions','unclear_answer','wrong_navigation','missing_information','could_not_finish','other')))
);
create index if not exists secretary_feedback_expiry on moderno_secretary.feedback(created_at);
alter table moderno_secretary.feedback enable row level security;
revoke all on moderno_secretary.feedback from public,anon,authenticated;

create or replace function moderno_secretary.actor(p_estudio uuid,p_require_member boolean default true)
returns uuid language plpgsql stable security invoker set search_path='' as $fn$
declare actor_id uuid:=auth.uid();
begin
 if actor_id is null or p_estudio is null or not exists(select 1 from auth.users where id=actor_id) then
  raise exception 'Inicia sesión de nuevo' using errcode='42501';
 end if;
 if p_require_member then
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('estudios','miembros') and not c.relrowsecurity)
   or coalesce(public.app_rol(p_estudio),'sin_acceso') not in ('admin','colaborador','gestoria','contratista','cliente') then
   raise exception 'No tienes acceso a este estudio' using errcode='42501';
  end if;
 end if;
 return actor_id;
end $fn$;
revoke all on function moderno_secretary.actor(uuid,boolean) from public,anon,authenticated;

create or replace function moderno_secretary.consent_get(p_estudio uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare actor_id uuid:=moderno_secretary.actor(p_estudio); current_row moderno_secretary.consent;
begin
 select * into current_row from moderno_secretary.consent where user_id=actor_id and estudio_id=p_estudio;
 return jsonb_build_object('version',1,'enabled',coalesce(current_row.enabled,false),'revision',coalesce(current_row.revision,0));
end $fn$;

create or replace function moderno_secretary.consent_set(p_estudio uuid,p_enabled boolean,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor_id uuid; current_row moderno_secretary.consent;
begin
 if p_enabled is null or p_expected_revision is null or p_expected_revision<0 then
  raise exception 'Preferencia no válida' using errcode='22023';
 end if;
 -- Una persona que ya no pertenece al estudio puede retirar su propio permiso.
 actor_id:=moderno_secretary.actor(p_estudio,p_enabled);
 if not p_enabled and not exists(select 1 from moderno_secretary.consent where user_id=actor_id and estudio_id=p_estudio) then
  -- Sin fila propia y sin pertenencia, responder de forma neutral: no crear
  -- relaciones con estudios ajenos ni revelar su existencia mediante la FK.
  begin
   perform moderno_secretary.actor(p_estudio,true);
  exception when insufficient_privilege then
   return jsonb_build_object('version',1,'enabled',false,'revision',0);
  end;
 end if;
 insert into moderno_secretary.consent(user_id,estudio_id) values(actor_id,p_estudio) on conflict do nothing;
 select * into current_row from moderno_secretary.consent where user_id=actor_id and estudio_id=p_estudio for update;
 if p_enabled and current_row.revision<>p_expected_revision then
  raise exception 'La preferencia cambió; vuelve a consultarla' using errcode='PT409';
 end if;
 update moderno_secretary.consent set enabled=p_enabled,revision=revision+1,updated_at=clock_timestamp()
 where user_id=actor_id and estudio_id=p_estudio returning * into current_row;
 if not p_enabled then
  delete from moderno_secretary.feedback where user_id=actor_id and estudio_id=p_estudio;
 end if;
 return jsonb_build_object('version',1,'enabled',current_row.enabled,'revision',current_row.revision);
end $fn$;

create or replace function moderno_secretary.submit(p_estudio uuid,p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor_id uuid:=moderno_secretary.actor(p_estudio); allowed boolean; task_value text; outcome_value text; reason_value text;
begin
 if p_event is null or jsonb_typeof(p_event)<>'object' or octet_length(p_event::text)>600
  or exists(select 1 from jsonb_object_keys(p_event) k where k not in ('version','event','task','outcome','reason'))
  or coalesce(p_event->'version','null'::jsonb)<>'1'::jsonb
  or coalesce(p_event->>'event','')<>'secretary_feedback'
  or jsonb_typeof(p_event->'task') is distinct from 'string'
  or jsonb_typeof(p_event->'outcome') is distinct from 'string'
  or (p_event ? 'reason' and jsonb_typeof(p_event->'reason') is distinct from 'string') then
  raise exception 'Valoración no válida' using errcode='22023';
 end if;
 task_value:=p_event->>'task'; outcome_value:=p_event->>'outcome'; reason_value:=coalesce(p_event->>'reason','');
 if task_value not in ('invoice_from_quote','invoice_create','quote_create','finance_question','project_question','navigation')
  or outcome_value not in ('helpful','unhelpful')
  or (p_event ? 'reason' and not (
    (outcome_value='helpful' and reason_value in ('clear_answer','saved_time')) or
    (outcome_value='unhelpful' and reason_value in ('too_many_questions','unclear_answer','wrong_navigation','missing_information','could_not_finish','other')))) then
  raise exception 'Valoración no válida' using errcode='22023';
 end if;
 -- Misma fila/bloqueo que consent_set: un envío posterior a revocar se rechaza.
 select enabled into allowed from moderno_secretary.consent where user_id=actor_id and estudio_id=p_estudio for update;
 if allowed is distinct from true then raise exception 'La mejora compartida está desactivada' using errcode='42501'; end if;
 insert into moderno_secretary.feedback(user_id,estudio_id,period,task,outcome,reason)
 values(actor_id,p_estudio,date_trunc('month',clock_timestamp() at time zone 'UTC')::date,task_value,outcome_value,reason_value)
 on conflict(user_id,estudio_id,period,task) do update set outcome=excluded.outcome,reason=excluded.reason,created_at=clock_timestamp();
 return jsonb_build_object('accepted',true);
end $fn$;

revoke all on function moderno_secretary.consent_get(uuid),moderno_secretary.consent_set(uuid,boolean,bigint),moderno_secretary.submit(uuid,jsonb) from public,anon,authenticated;
grant execute on function moderno_secretary.consent_get(uuid),moderno_secretary.consent_set(uuid,boolean,bigint),moderno_secretary.submit(uuid,jsonb) to authenticated;

create or replace function public.secretary_feedback_consent_get(p_estudio uuid)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select moderno_secretary.consent_get(p_estudio);
$fn$;
create or replace function public.secretary_feedback_consent_set(p_estudio uuid,p_enabled boolean,p_expected_revision bigint)
returns jsonb language sql security invoker set search_path='' as $fn$
 select moderno_secretary.consent_set(p_estudio,p_enabled,p_expected_revision);
$fn$;
create or replace function public.secretary_feedback_submit(p_estudio uuid,p_event jsonb)
returns jsonb language sql security invoker set search_path='' as $fn$
 select moderno_secretary.submit(p_estudio,p_event);
$fn$;
revoke all on function public.secretary_feedback_consent_get(uuid),public.secretary_feedback_consent_set(uuid,boolean,bigint),public.secretary_feedback_submit(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.secretary_feedback_consent_get(uuid),public.secretary_feedback_consent_set(uuid,boolean,bigint),public.secretary_feedback_submit(uuid,jsonb) to authenticated;

-- Solo operación interna/revisión humana. Sin RPC pública ni acceso del modelo.
-- Suprimir grupos pequeños reduce exposición; no garantiza anonimización.
create or replace function moderno_secretary.report(p_month date)
returns table(task text,outcome text,reason text,contributors bigint,studies bigint)
language sql stable security invoker set search_path='' as $fn$
 select f.task,f.outcome,f.reason,count(distinct f.user_id),count(distinct f.estudio_id)
 from moderno_secretary.feedback f join moderno_secretary.consent c using(user_id,estudio_id)
 where c.enabled and f.period=date_trunc('month',p_month)::date
  and f.created_at>=now()-interval '90 days'
  and public.app_rol_usuario(f.estudio_id,f.user_id) in ('admin','colaborador','gestoria','contratista','cliente')
 group by f.task,f.outcome,f.reason
 having count(distinct f.user_id)>=5 and count(distinct f.estudio_id)>=3
 order by f.task,f.outcome,f.reason;
$fn$;
revoke all on function moderno_secretary.report(date) from public,anon,authenticated;

-- Programar antes de activar: elimina datos crudos vencidos, incluso sin tráfico.
create or replace function moderno_secretary.purge_expired()
returns bigint language plpgsql security invoker set search_path='' as $fn$
declare affected bigint;
begin
 delete from moderno_secretary.feedback where created_at<now()-interval '90 days';
 get diagnostics affected=row_count;
 return affected;
end $fn$;
revoke all on function moderno_secretary.purge_expired() from public,anon,authenticated;
commit;
