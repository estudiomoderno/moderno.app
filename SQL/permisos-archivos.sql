-- Candidato: validar inventario y flujos antes de producción.
-- Requiere permisos-roles.sql y permisos-colaboradores.sql.
-- No borra, mueve ni reescribe objetos de Storage.
begin;
create or replace function public.app_rutas_storage(v jsonb) returns setof text
language plpgsql immutable set search_path='' as $$
declare hijo jsonb; ruta text;
begin
 if jsonb_typeof(v)='string' then
  ruta:=public.app_ruta_storage(v#>>'{}');if ruta is not null then return next ruta;end if;
 elsif jsonb_typeof(v)='object' then
  for hijo in select value from jsonb_each(v) loop return query select * from public.app_rutas_storage(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from public.app_rutas_storage(hijo);end loop;
 end if;
end $$;
revoke all on function public.app_rutas_storage(jsonb) from public,anon,authenticated;

create or replace function public.app_rutas_documentos_privados(v jsonb) returns setof text
language plpgsql immutable set search_path='' as $$
declare hijo jsonb;
begin
 if jsonb_typeof(v)='object' then
  if v ? 'docRef' or v ? 'docKind' then return query select * from public.app_rutas_storage(v);return;end if;
  for hijo in select value from jsonb_each(v) loop return query select * from public.app_rutas_documentos_privados(hijo);end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from public.app_rutas_documentos_privados(hijo);end loop;
 end if;
end $$;
revoke all on function public.app_rutas_documentos_privados(jsonb) from public,anon,authenticated;

-- Un colaborador no puede concederse acceso pegando una ruta en una tarea.
-- El registro solo se alimenta del inventario inicial, de referencias guardadas
-- por administradores o de archivos subidos por el propio colaborador.
create table if not exists public.app_archivos_compartidos(
 estudio_id uuid not null,nombre text not null,creado_en timestamptz not null default now(),
 primary key(estudio_id,nombre)
);
create table if not exists public.app_archivos_inicializados(
 estudio_id uuid primary key,creado_en timestamptz not null default now()
);
create table if not exists public.app_archivos_privados(
 estudio_id uuid not null,nombre text not null,creado_en timestamptz not null default now(),
 primary key(estudio_id,nombre)
);
alter table public.app_archivos_compartidos enable row level security;
alter table public.app_archivos_inicializados enable row level security;
alter table public.app_archivos_privados enable row level security;
revoke all on public.app_archivos_compartidos,public.app_archivos_inicializados,public.app_archivos_privados from public,anon,authenticated;

-- La clasificación privada se conserva aunque se retire su referencia del
-- documento contable. Retirar una factura no vuelve público su antiguo PDF.
insert into public.app_archivos_privados(estudio_id,nombre)
 select distinct d.estudio_id,r.ruta from public.datos_estudio d
 cross join lateral public.app_rutas_storage(d.contenido) r(ruta)
 where d.bloque in ('facturas','presupuestos') and split_part(r.ruta,'/',1)=d.estudio_id::text
 on conflict do nothing;
insert into public.app_archivos_privados(estudio_id,nombre)
 select distinct d.estudio_id,r.ruta from public.datos_estudio d
 cross join lateral public.app_rutas_documentos_privados(d.contenido) r(ruta)
 where d.bloque='proyectos' and split_part(r.ruta,'/',1)=d.estudio_id::text
 on conflict do nothing;

insert into public.app_archivos_compartidos(estudio_id,nombre)
 select distinct d.estudio_id,r.ruta from public.datos_estudio d
 cross join lateral public.app_rutas_storage(case when d.bloque='config' then public.app_config_colaborador(d.contenido) else public.app_colaborador_filtrar(d.contenido) end) r(ruta)
 join storage.objects o on o.bucket_id='archivos' and o.name=r.ruta
 where d.bloque in ('proyectos','compras','contactos','fases','agenda','config')
 and split_part(r.ruta,'/',1)=d.estudio_id::text
 and not exists(select 1 from public.app_archivos_inicializados m where m.estudio_id=d.estudio_id)
 on conflict do nothing;
insert into public.app_archivos_inicializados(estudio_id) select distinct estudio_id from public.datos_estudio on conflict do nothing;

create or replace function public.app_registrar_archivos() returns trigger
language plpgsql security definer set search_path='' as $$
declare rol text;
begin
 insert into public.app_archivos_inicializados(estudio_id) values(NEW.estudio_id) on conflict do nothing;
 if NEW.bloque in ('facturas','presupuestos','proyectos') then
  insert into public.app_archivos_privados(estudio_id,nombre)
   select distinct NEW.estudio_id,r.ruta
   from (select * from public.app_rutas_storage(NEW.contenido) where NEW.bloque in ('facturas','presupuestos')
    union select * from public.app_rutas_documentos_privados(NEW.contenido) where NEW.bloque='proyectos') r(ruta)
   where split_part(r.ruta,'/',1)=NEW.estudio_id::text on conflict do nothing;
 end if;
 if auth.uid() is null then return NEW;end if;
 rol:=public.app_rol(NEW.estudio_id);
 if rol not in ('admin','colaborador') or NEW.bloque not in ('proyectos','compras','contactos','fases','agenda','config') then return NEW;end if;
 insert into public.app_archivos_compartidos(estudio_id,nombre)
  select distinct NEW.estudio_id,r.ruta
  from public.app_rutas_storage(case when NEW.bloque='config' then public.app_config_colaborador(NEW.contenido) else public.app_colaborador_filtrar(NEW.contenido) end) r(ruta)
  join storage.objects o on o.bucket_id='archivos' and o.name=r.ruta
  where split_part(r.ruta,'/',1)=NEW.estudio_id::text and (rol='admin' or o.owner_id=auth.uid()::text)
  on conflict do nothing;
 return NEW;
end $$;
revoke all on function public.app_registrar_archivos() from public,anon,authenticated;
drop trigger if exists app_registra_adjuntos on public.datos_estudio;
create trigger app_registra_adjuntos after insert or update on public.datos_estudio for each row execute function public.app_registrar_archivos();

create or replace function public.app_archivo_sensible(estudio uuid,nombre text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.app_archivos_privados a where a.estudio_id=$1 and a.nombre=$2)
 or exists(select 1 from public.datos_estudio d cross join lateral public.app_rutas_storage(d.contenido) r(ruta)
  where d.estudio_id=estudio and d.bloque in ('facturas','presupuestos') and r.ruta=nombre)
 or exists(select 1 from public.datos_estudio d cross join lateral public.app_rutas_documentos_privados(d.contenido) r(ruta)
  where d.estudio_id=estudio and d.bloque='proyectos' and r.ruta=nombre);
$$;
revoke all on function public.app_archivo_sensible(uuid,text) from public,anon,authenticated;

create or replace function public.app_archivo_roles(nombre text,operacion text default 'leer') returns boolean
language plpgsql stable security definer set search_path='' as $$
declare estudio uuid; rol text;
begin
 if public.app_ruta_storage('storage://archivos/'||nombre) is distinct from nombre then return false;end if;
 estudio:=split_part(nombre,'/',1)::uuid;rol:=public.app_rol(estudio);
 if rol='admin' then return true;end if;
 if rol='gestoria' then return public.app_archivo_gestoria(nombre,operacion<>'leer');end if;
 if rol<>'colaborador' then return false;end if;
 if operacion='crear' then return true;end if;
 if operacion<>'leer' or public.app_archivo_sensible(estudio,nombre) then return false;end if;
 return exists(select 1 from public.app_archivos_compartidos a where a.estudio_id=estudio and a.nombre=app_archivo_roles.nombre)
  or exists(select 1 from storage.objects o where o.bucket_id='archivos' and o.name=nombre and o.owner_id=auth.uid()::text);
end $$;
revoke all on function public.app_archivo_roles(text,text) from public,anon;
grant execute on function public.app_archivo_roles(text,text) to authenticated;

drop policy if exists app_archivos_roles_lectura on storage.objects;
create policy app_archivos_roles_lectura on storage.objects as restrictive for select to authenticated
 using(bucket_id<>'archivos' or public.app_archivo_roles(name,'leer'));
drop policy if exists app_archivos_roles_crear on storage.objects;
create policy app_archivos_roles_crear on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'archivos' or public.app_archivo_roles(name,'crear'));
drop policy if exists app_archivos_roles_actualizar on storage.objects;
create policy app_archivos_roles_actualizar on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'archivos' or public.app_archivo_roles(name,'modificar'))
 with check(bucket_id<>'archivos' or public.app_archivo_roles(name,'modificar'));
drop policy if exists app_archivos_roles_borrar on storage.objects;
create policy app_archivos_roles_borrar on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'archivos' or public.app_archivo_roles(name,'borrar'));
commit;
