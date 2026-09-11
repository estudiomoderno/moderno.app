-- CANDIDATO: privileged study-admin operations, tested separately before deployment.
begin;
create table if not exists public.app_catalogo_reemplazos(
 id uuid primary key,estudio_id uuid not null references public.estudios(id),version text not null,
 antes jsonb not null,despues_revision timestamptz not null,created_at timestamptz not null default now(),restored_at timestamptz
);
alter table public.app_catalogo_reemplazos enable row level security;
revoke all on public.app_catalogo_reemplazos from public,anon,authenticated;
create or replace function public.app_catalogo_reemplazar(p_estudio uuid,p_version text,p_base timestamptz,p_operacion uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb;rev timestamptz;tpl jsonb;nuevo jsonb;anteriores jsonb;resultado jsonb;prev public.app_catalogo_reemplazos;
begin
 if auth.uid() is null or public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 if p_operacion is null then raise exception 'Identificador de operación requerido';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select * into prev from public.app_catalogo_reemplazos where id=p_operacion;
 if found then
  if prev.estudio_id<>p_estudio or prev.version<>p_version then raise exception 'Operación distinta';end if;
  return jsonb_build_object('status','already_applied','updated_at',prev.despues_revision,'restored',prev.restored_at is not null);
 end if;
 select contenido,updated_at into cfg,rev from public.datos_estudio where estudio_id=p_estudio and bloque='config' for update;
 if not found or rev is distinct from p_base then raise exception 'La configuración cambió; conservar y volver a revisar' using errcode='PT409';end if;
 select items into tpl from public.app_catalogo_plantillas where version=p_version and activa;
 if tpl is null or jsonb_array_length(tpl)=0 then raise exception 'No existe una plantilla válida';end if;
 if cfg#>>'{catalogSeed,version}'=p_version then raise exception 'Esta plantilla ya fue aplicada; no sobrescribir personalizaciones';end if;
 select jsonb_agg((value-'id')||jsonb_build_object('id',-2000000000000-ordinality,'brand','both') order by ordinality) into nuevo from jsonb_array_elements(tpl) with ordinality;
 if exists(select 1 from public.datos_estudio d cross join jsonb_array_elements(nuevo) i where d.estudio_id=p_estudio
  and (jsonb_path_exists(d.contenido,'$.**.catId ? (@ == $candidate)',jsonb_build_object('candidate',i->'id'))
   or exists(select 1 from jsonb_array_elements(coalesce(cfg->'catalog','[]')||coalesce(cfg->'catalogArchive','[]')) c where c->'id'=i->'id'))) then raise exception 'Identificador ya existente; no se pueden cambiar vínculos históricos';end if;
 select coalesce(jsonb_agg(value||'{"archived":true}'::jsonb order by ordinality),'[]') into anteriores from jsonb_array_elements(coalesce(cfg->'catalog','[]')) with ordinality;
 -- Archived old items remain in the original array for older open clients' resolvers.
 resultado:=cfg||jsonb_build_object('catalog',anteriores||nuevo,'catalogArchive',coalesce(cfg->'catalogArchive','[]')||coalesce(cfg->'catalog','[]'),
 'catalogSeed',jsonb_build_object('version',p_version,'locale',(select locale from public.app_catalogo_plantillas where version=p_version),'studyId',p_estudio));
 rev:=(public.guardar_bloque_versionado(p_estudio,'config',resultado,p_base)->>'updated_at')::timestamptz;
 insert into public.app_catalogo_reemplazos(id,estudio_id,version,antes,despues_revision) values(p_operacion,p_estudio,p_version,cfg,rev);
 return jsonb_build_object('status','applied','updated_at',rev,'active_items',jsonb_array_length(nuevo),'archived_items',jsonb_array_length(anteriores),'backup',p_operacion);
end $$;
revoke all on function public.app_catalogo_reemplazar(uuid,text,timestamptz,uuid) from public,anon;
grant execute on function public.app_catalogo_reemplazar(uuid,text,timestamptz,uuid) to authenticated;

create or replace function public.app_catalogo_restaurar(p_estudio uuid,p_operacion uuid,p_base timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare copia public.app_catalogo_reemplazos;cfg jsonb;rev timestamptz;k text;
begin
 if auth.uid() is null or public.app_rol(p_estudio) is distinct from 'admin' then raise exception 'Solo administradores' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 select * into copia from public.app_catalogo_reemplazos where id=p_operacion and estudio_id=p_estudio for update;
 if not found or copia.restored_at is not null then raise exception 'Copia inexistente o ya restaurada';end if;
 select contenido,updated_at into cfg,rev from public.datos_estudio where estudio_id=p_estudio and bloque='config' for update;
 if not found or rev is distinct from p_base or rev is distinct from copia.despues_revision then raise exception 'Hay cambios posteriores; no se permite restauración automática' using errcode='PT409';end if;
 foreach k in array array['catalog','catalogArchive','catalogSeed'] loop
  if copia.antes ? k then cfg:=jsonb_set(cfg,array[k],copia.antes->k);else cfg:=cfg-k;end if;
 end loop;
 rev:=(public.guardar_bloque_versionado(p_estudio,'config',cfg,p_base)->>'updated_at')::timestamptz;
 update public.app_catalogo_reemplazos set restored_at=clock_timestamp() where id=p_operacion;
 return jsonb_build_object('status','restored','updated_at',rev);
end $$;
revoke all on function public.app_catalogo_restaurar(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.app_catalogo_restaurar(uuid,uuid,timestamptz) to authenticated;
commit;
