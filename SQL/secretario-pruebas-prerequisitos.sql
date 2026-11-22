-- Contrato mínimo de Moderno.app para el entorno aislado moderno-pruebas.
-- Aplicar únicamente al proyecto chsilowzrtumbcofspwv. No es una migración de
-- producción: se detiene si encuentra estudios, miembros o datos existentes.
begin;

do $guard$
begin
  if to_regclass('public.estudios') is null or to_regclass('public.miembros') is null then
    raise exception 'Falta el esquema base de Moderno Prueba';
  end if;
  if exists(select 1 from public.estudios) or exists(select 1 from public.miembros)
     or to_regclass('public.datos_estudio') is not null then
    raise exception 'El entorno ya contiene datos o contrato; revisar antes de aplicar';
  end if;
end $guard$;

-- Las dos tablas llegaron al proyecto de pruebas sin RLS. Se habilitan con
-- políticas explícitas; no se permite ninguna escritura directa desde el SDK.
alter table public.estudios enable row level security;
alter table public.miembros enable row level security;
revoke all on public.estudios,public.miembros from public,anon,authenticated;
grant select on public.estudios,public.miembros to authenticated;
create index if not exists miembros_estudio_user on public.miembros(estudio_id,user_id);

drop policy if exists miembros_propios_select on public.miembros;
create policy miembros_propios_select on public.miembros
for select to authenticated using(user_id=(select auth.uid()));

drop policy if exists estudios_propios_select on public.estudios;
create policy estudios_propios_select on public.estudios
for select to authenticated using(exists(
  select 1 from public.miembros m
  where m.estudio_id=estudios.id and m.user_id=(select auth.uid())
));

create table public.datos_estudio(
  estudio_id uuid not null references public.estudios(id) on delete cascade,
  bloque text not null check(bloque in (
    'proyectos','compras','presupuestos','facturas','contactos',
    'contratistas','fases','agenda','config'
  )),
  contenido jsonb not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key(estudio_id,bloque)
);
alter table public.datos_estudio enable row level security;
revoke all on public.datos_estudio from public,anon,authenticated;
grant select on public.datos_estudio to authenticated;

create or replace function public.app_rol_usuario(p_estudio uuid,p_usuario uuid)
returns text language sql stable security definer set search_path='' as $fn$
  select coalesce((
    select case when m.rol='admin' then 'admin' else 'colaborador' end
    from public.miembros m
    where m.estudio_id=p_estudio and m.user_id=p_usuario
  ),'sin_acceso');
$fn$;
revoke all on function public.app_rol_usuario(uuid,uuid) from public,anon,authenticated;

create or replace function public.app_rol(p_estudio uuid)
returns text language sql stable security invoker set search_path='' as $fn$
  select coalesce((
    select case when m.rol='admin' then 'admin' else 'colaborador' end
    from public.miembros m
    where m.estudio_id=p_estudio and m.user_id=auth.uid()
  ),'sin_acceso');
$fn$;
revoke all on function public.app_rol(uuid) from public,anon,authenticated;
grant execute on function public.app_rol(uuid) to authenticated;

drop policy if exists datos_estudio_miembros_select on public.datos_estudio;
create policy datos_estudio_miembros_select on public.datos_estudio
for select to authenticated using(
  public.app_rol_usuario(estudio_id,(select auth.uid())) in ('admin','colaborador')
);

-- Alta aislada: cada cuenta de pruebas obtiene como máximo un estudio. No
-- copia datos ni identidades de producción y no acepta un estudio del cliente.
create or replace function public.unirse_al_estudio()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
  actor_id uuid:=auth.uid();
  membership public.miembros;
  new_study uuid;
begin
  if actor_id is null or not exists(select 1 from auth.users u where u.id=actor_id) then
    raise exception 'Inicia sesión de nuevo' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text,907));
  select * into membership from public.miembros m where m.user_id=actor_id;
  if found then
    return jsonb_build_object('estudio_id',membership.estudio_id,'rol',membership.rol);
  end if;
  insert into public.estudios(nombre) values('Estudio ficticio de pruebas') returning id into new_study;
  insert into public.miembros(user_id,estudio_id,rol) values(actor_id,new_study,'admin') returning * into membership;
  return jsonb_build_object('estudio_id',membership.estudio_id,'rol',membership.rol);
end $fn$;
revoke all on function public.unirse_al_estudio() from public,anon,authenticated;
grant execute on function public.unirse_al_estudio() to authenticated;

-- Filtrado conservador para colaboradores. El Secretario colaborador solo
-- solicita proyectos; costes, importes, documentos contables y campos no
-- enumerados permanecen en el servidor.
create or replace function public.app_colaborador_filtrar(v jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare r jsonb; k text; child jsonb;
begin
  if jsonb_typeof(v)='array' then
    select coalesce(jsonb_agg(public.app_colaborador_filtrar(x)),'[]'::jsonb) into r
    from jsonb_array_elements(v) x
    where not(jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
    return r;
  elsif jsonb_typeof(v)='object' then
    r:='{}'::jsonb;
    for k,child in select key,value from jsonb_each(v) loop
      if k='important' and jsonb_typeof(child)='boolean' then
        r:=r||jsonb_build_object(k,child);
      elsif k=any(array[
        'id','name','num','title','brand','client','status','curPhase','tpl',
        'rooms','sections','items','tasks','files','notes','note','desc',
        'description','url','type','when','date','due','start','end','color',
        'done','col','who','assignees','assignee','subs','deps','comments',
        'chat','cliChat','cid','txt','ts','fases','updated','off','showTasks',
        'showObra','pid','src','subtasks','text','t','qty','unit','sku',
        'supplier','dims','material','plazo','img','libId','cat','rstatus',
        'code','email','phone','cp','folder','createdBy','createdByMail',
        'createdAt','addr','city','country','trade','obraF','obraPlanos',
        'obraContactos','phases'
      ]) then
        r:=r||jsonb_build_object(k,public.app_colaborador_filtrar(child));
      end if;
    end loop;
    return r;
  end if;
  return v;
end $fn$;
revoke all on function public.app_colaborador_filtrar(jsonb) from public,anon,authenticated;

create or replace function public.app_leer_bloques(p_estudio uuid,p_bloques text[] default null)
returns table(bloque text,contenido jsonb,updated_at timestamptz,rol text)
language plpgsql stable security definer set search_path='' as $fn$
declare access_role text:=public.app_rol_usuario(p_estudio,auth.uid());
begin
  if access_role not in ('admin','colaborador') then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  if p_bloques is not null and (cardinality(p_bloques)>16 or exists(
    select 1 from unnest(p_bloques) b where b not in (
      'proyectos','compras','presupuestos','facturas','contactos',
      'contratistas','fases','agenda','config'
    )
  )) then raise exception 'Bloques no válidos' using errcode='22023'; end if;
  return query
  select d.bloque,
    case when access_role='admin' then d.contenido else public.app_colaborador_filtrar(d.contenido) end,
    d.updated_at,access_role
  from public.datos_estudio d
  where d.estudio_id=p_estudio
    and (p_bloques is null or d.bloque=any(p_bloques))
    and (access_role='admin' or d.bloque='proyectos')
  order by d.bloque;
end $fn$;
revoke all on function public.app_leer_bloques(uuid,text[]) from public,anon,authenticated;
grant execute on function public.app_leer_bloques(uuid,text[]) to authenticated;

create or replace function public.guardar_bloque_versionado(
  p_estudio uuid,p_bloque text,p_contenido jsonb,p_base timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare current_version timestamptz; new_version timestamptz; exists_now boolean;
begin
  if public.app_rol_usuario(p_estudio,auth.uid())<>'admin' then
    raise exception 'Solo un administrador puede guardar en este entorno de pruebas' using errcode='42501';
  end if;
  select updated_at into current_version from public.datos_estudio
  where estudio_id=p_estudio and bloque=p_bloque for update;
  exists_now:=found;
  if (exists_now and current_version is distinct from p_base)
     or (not exists_now and p_base is not null) then
    raise exception 'La versión ha cambiado; conservar cambios y reintentar' using errcode='PT409';
  end if;
  new_version:=greatest(clock_timestamp(),coalesce(current_version,'-infinity'::timestamptz)+interval '1 microsecond');
  if exists_now then
    update public.datos_estudio set contenido=p_contenido,updated_at=new_version
    where estudio_id=p_estudio and bloque=p_bloque;
  else
    insert into public.datos_estudio(estudio_id,bloque,contenido,updated_at)
    values(p_estudio,p_bloque,p_contenido,new_version);
  end if;
  return jsonb_build_object('updated_at',new_version);
end $fn$;
revoke all on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) from public,anon,authenticated;

create or replace function public.app_guardar_lote(p_estudio uuid,p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare change jsonb; result jsonb:='[]'::jsonb; saved jsonb;
begin
  if public.app_rol_usuario(p_estudio,auth.uid())<>'admin' then
    raise exception 'No autorizado' using errcode='42501';
  end if;
  if jsonb_typeof(p_cambios) is distinct from 'array'
     or jsonb_array_length(p_cambios) not between 1 and 9
     or exists(select 1 from jsonb_array_elements(p_cambios) c
       where not(c ? 'contenido') or c->>'bloque' not in (
        'proyectos','compras','presupuestos','facturas','contactos',
        'contratistas','fases','agenda','config'
       ))
     or (select count(distinct c->>'bloque') from jsonb_array_elements(p_cambios) c)<>jsonb_array_length(p_cambios)
  then raise exception 'Lote no válido' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
  for change in select value from jsonb_array_elements(p_cambios) order by value->>'bloque' loop
    saved:=public.guardar_bloque_versionado(
      p_estudio,change->>'bloque',change->'contenido',(change->>'base')::timestamptz
    );
    result:=result||jsonb_build_array(jsonb_build_object(
      'bloque',change->>'bloque','updated_at',saved->>'updated_at'
    ));
  end loop;
  return result;
end $fn$;
revoke all on function public.app_guardar_lote(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.app_guardar_lote(uuid,jsonb) to authenticated;

commit;
