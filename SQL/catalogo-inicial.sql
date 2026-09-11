-- CANDIDATO. Ensayar en recuperación antes de publicar. No modifica estudios existentes.
begin;
create table if not exists public.app_catalogo_plantillas(
 version text primary key,locale text not null,items jsonb not null check(jsonb_typeof(items)='array'),
 activa boolean not null default false,created_at timestamptz not null default now()
);
create unique index if not exists app_catalogo_locale_activa on public.app_catalogo_plantillas(locale) where activa;
create table if not exists public.app_catalogo_inicios(
 estudio_id uuid primary key references public.estudios(id),version text,created_at timestamptz not null default now(),initialized_at timestamptz
);
alter table public.app_catalogo_plantillas enable row level security;
alter table public.app_catalogo_inicios enable row level security;
revoke all on public.app_catalogo_plantillas,public.app_catalogo_inicios from public,anon,authenticated;

create or replace function public.app_catalogo_nuevo_estudio() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.app_catalogo_inicios(estudio_id) values(new.id) on conflict do nothing;
 return new;
end $$;
revoke all on function public.app_catalogo_nuevo_estudio() from public,anon,authenticated;
drop trigger if exists app_catalogo_nuevo_estudio on public.estudios;
create trigger app_catalogo_nuevo_estudio after insert on public.estudios for each row execute function public.app_catalogo_nuevo_estudio();
-- Deliberately no backfill: existing studies are ineligible, even if their catalog is empty.
create or replace function public.app_catalogo_inicial(p_estudio uuid,p_base timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare inicio public.app_catalogo_inicios;cfg jsonb;rev timestamptz;idioma text;tpl public.app_catalogo_plantillas;items jsonb;guardado jsonb;
begin
 if auth.uid() is null or public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select * into inicio from public.app_catalogo_inicios where estudio_id=p_estudio for update;
 if not found then return jsonb_build_object('status','existing_study');end if;
 if inicio.initialized_at is not null then return jsonb_build_object('status','already_initialized');end if;
 select contenido,updated_at into cfg,rev from public.datos_estudio where estudio_id=p_estudio and bloque='config' for update;
 if not found then return jsonb_build_object('status','config_pending');end if;
 if rev is distinct from p_base then raise exception 'La configuración cambió; reintenta con su última versión' using errcode='PT409';end if;
 if jsonb_typeof(cfg->'catalog') is distinct from 'array' or jsonb_array_length(cfg->'catalog')>0 or cfg->'catalogSeed' is not null and cfg->'catalogSeed'<>'null'::jsonb then
  update public.app_catalogo_inicios set version='custom',initialized_at=clock_timestamp() where estudio_id=p_estudio;
  return jsonb_build_object('status','custom_catalog');
 end if;
 idioma:=case coalesce(cfg#>>'{account,lang}','es') when 'es' then 'es-ES' else cfg#>>'{account,lang}' end;
 select * into tpl from public.app_catalogo_plantillas where locale=idioma and activa;
 if not found then return jsonb_build_object('status','locale_unavailable');end if;
 if jsonb_array_length(tpl.items)=0 then raise exception 'Plantilla vacía';end if;
 select jsonb_agg((value-'id')||jsonb_build_object('id',-2000000000000-ordinality,'brand','both') order by ordinality) into items from jsonb_array_elements(tpl.items) with ordinality;
 -- Refuse rather than rebind a historical ID, even in an unusual new-study import.
 if exists(select 1 from public.datos_estudio d cross join jsonb_array_elements(items) i where d.estudio_id=p_estudio
  and jsonb_path_exists(d.contenido,'$.**.catId ? (@ == $candidate)',jsonb_build_object('candidate',i->'id'))) then raise exception 'Identificador ya referenciado';end if;
 cfg:=cfg||jsonb_build_object('catalog',items,'catalogSeed',jsonb_build_object('version',tpl.version,'locale',tpl.locale,'studyId',p_estudio));
 guardado:=public.guardar_bloque_versionado(p_estudio,'config',cfg,rev);
 update public.app_catalogo_inicios set version=tpl.version,initialized_at=clock_timestamp() where estudio_id=p_estudio;
 return jsonb_build_object('status','initialized','contenido',cfg,'updated_at',guardado->>'updated_at');
end $$;
revoke all on function public.app_catalogo_inicial(uuid,timestamptz) from public,anon;
grant execute on function public.app_catalogo_inicial(uuid,timestamptz) to authenticated;
commit;
