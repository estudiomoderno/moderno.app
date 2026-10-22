-- Pure ephemeral indexes. No rows, RLS, roles or timeouts change.
begin;
do $guard$
begin
 if to_regprocedure('public.app_colaborador_indice(jsonb,text,boolean)') is not null or to_regprocedure('public.app_colaborador_combinar_vista(jsonb,jsonb,jsonb)') is not null then raise exception 'El índice de colaboración ya existe; revisar antes de aplicar'; end if;
 if md5(regexp_replace(pg_get_functiondef('public.app_colaborador_combinar(jsonb,jsonb)'::regprocedure),'\s','','g')) is distinct from '557b215c79e0ccd7446e5242f6015777' then raise exception 'El combinador ha cambiado; revisar antes de aplicar'; end if;
end $guard$;

create or replace function public.app_colaborador_indice(v jsonb,llave text,filas boolean)
returns jsonb language sql immutable security invoker set search_path='' as $index$
 -- Buckets store identities and source ordinals, never copies of complete rows.
 select coalesce(jsonb_object_agg(bucket,entries),'{}') from (
  select pg_catalog.jsonb_hash_extended(x->llave,0)::text as bucket,
   jsonb_agg(case when filas then jsonb_build_array(x->llave,n-1) else x->llave end) as entries
  from jsonb_array_elements(v) with ordinality a(x,n) where x->llave is not null
  group by pg_catalog.jsonb_hash_extended(x->llave,0)
 ) indexed;
$index$;
revoke all on function public.app_colaborador_indice(jsonb,text,boolean) from public,anon,authenticated;

create or replace function public.app_colaborador_combinar_vista(anterior jsonb,nuevo jsonb,visible jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $combine$
declare combined_one jsonb; resultado jsonb; previo_visto jsonb; posicion integer; k text; valor jsonb; previo jsonb; llave text;
 visibles_anteriores jsonb; indice integer; visto integer:=0; identidad jsonb; bucket text;
 ids_nuevos jsonb; nombres_nuevos jsonb; ids_previos jsonb; nombres_previos jsonb;
 candidatos jsonb; coincidencias integer; anteriores integer;
 combinados jsonb[]:='{}'; conservados jsonb[]:='{}';
begin
 if nuevo=visible then return anterior; end if;
 if anterior is null or anterior=visible then return nuevo; end if;
 if jsonb_typeof(anterior)<>jsonb_typeof(nuevo) then
  raise exception 'No se puede reemplazar contenido protegido' using errcode='42501';
 end if;
 if jsonb_typeof(anterior)='object' then
  for k in select key from jsonb_each(visible) loop
   if not nuevo ? k and anterior->k is distinct from visible->k then
    raise exception 'No se puede eliminar contenido protegido' using errcode='42501';
   end if;
  end loop;
  if nuevo is null then return anterior; end if;
  -- Aggregate once instead of copying the complete object for each property.
  select coalesce(jsonb_object_agg(key,value),'{}') into resultado from (
   select key,value from jsonb_each(anterior) where not visible ? key and not nuevo ? key
   union all
   select key,public.app_colaborador_combinar_vista(anterior->key,value,case when visible ? key then visible->key else public.app_colaborador_filtrar(anterior->key) end) from jsonb_each(nuevo)
  ) fields;
  return resultado;
 elsif jsonb_typeof(anterior)='array' then
  select coalesce(jsonb_agg(x order by n),'[]') into visibles_anteriores
  from jsonb_array_elements(anterior) with ordinality a(x,n)
  where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  ids_nuevos:=public.app_colaborador_indice(nuevo,'id',false);
  nombres_nuevos:=public.app_colaborador_indice(nuevo,'name',false);
  ids_previos:=public.app_colaborador_indice(visibles_anteriores,'id',true);
  if exists(select 1 from jsonb_array_elements(nuevo) x where not x ? 'id' and x ? 'name') then
   nombres_previos:=public.app_colaborador_indice(visibles_anteriores,'name',true);
  end if;
  for previo in select value from jsonb_array_elements(anterior) loop
   if jsonb_typeof(previo)='object' and (previo ? 'docRef' or previo ? 'docKind') then
    if exists(select 1 from jsonb_array_elements(ids_nuevos->pg_catalog.jsonb_hash_extended(previo->'id',0)::text) x where x=previo->'id')
     or exists(select 1 from jsonb_array_elements(nombres_nuevos->pg_catalog.jsonb_hash_extended(previo->'name',0)::text) x where x=previo->'name') then
     raise exception 'Identidad de fila reservada' using errcode='42501';
    end if;
    continue;
   end if;
   if visible->visto is distinct from previo then
    llave:=case when previo ? 'id' then 'id' when previo ? 'name' then 'name' else null end;
    if llave is null then raise exception 'Un administrador debe modificar esta lista protegida sin identificadores' using errcode='42501'; end if;
    identidad:=previo->llave;bucket:=pg_catalog.jsonb_hash_extended(identidad,0)::text;
    select count(*) into coincidencias from jsonb_array_elements((case when llave='id' then ids_nuevos else nombres_nuevos end)->bucket) x where x=identidad;
    if coincidencias<>1 then raise exception 'No se puede eliminar o renombrar una fila con contenido protegido' using errcode='42501'; end if;
   end if;
   visto:=visto+1;
  end loop;
  for valor in select value from jsonb_array_elements(nuevo) loop
   llave:=case when valor ? 'id' then 'id' when valor ? 'name' then 'name' else null end;
   previo:=null;previo_visto:=null;
   if llave is not null then
    identidad:=valor->llave;bucket:=pg_catalog.jsonb_hash_extended(identidad,0)::text;
    candidatos:=(case when llave='id' then ids_previos else nombres_previos end)->bucket;
    -- Hash buckets only narrow the search. Exact JSONB equality still decides identity.
    select count(*) into anteriores from jsonb_array_elements(candidatos) x where x->0=identidad;
    select count(*) into coincidencias from jsonb_array_elements((case when llave='id' then ids_nuevos else nombres_nuevos end)->bucket) x where x=identidad;
    if anteriores>1 or coincidencias>1 then raise exception 'Identidad de fila ambigua; conservar cambios' using errcode='42501'; end if;
    select (x->>1)::integer into posicion from jsonb_array_elements(candidatos) x where x->0=identidad;
    previo:=visibles_anteriores->posicion;previo_visto:=visible->posicion;
   end if;
   -- Evaluate recursive merging separately before appending large JSONB values.
   combined_one:=public.app_colaborador_combinar_vista(previo,valor,previo_visto);
   combinados:=array_append(combinados,combined_one);
  end loop;
  indice:=1;
  for previo in select value from jsonb_array_elements(anterior) loop
   if jsonb_typeof(previo)='object' and (previo ? 'docRef' or previo ? 'docKind') then
    conservados:=array_append(conservados,previo);
   elsif indice<=cardinality(combinados) then
    conservados:=array_append(conservados,combinados[indice]);indice:=indice+1;
   end if;
  end loop;
  while indice<=cardinality(combinados) loop
   conservados:=array_append(conservados,combinados[indice]);indice:=indice+1;
  end loop;
  return to_jsonb(conservados);
 end if;
 raise exception 'Cambio no autorizado' using errcode='42501';
end $combine$;
revoke all on function public.app_colaborador_combinar_vista(jsonb,jsonb,jsonb) from public,anon,authenticated;

-- Validate the full candidate once; private helper only receives an authorized tree.
create or replace function public.app_colaborador_combinar(anterior jsonb,nuevo jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $entry$
declare visible jsonb;
begin
 visible:=public.app_colaborador_filtrar(anterior);
 if nuevo=visible then return anterior; end if;
 if nuevo is distinct from public.app_colaborador_filtrar(nuevo) then
  raise exception 'El cambio contiene campos no autorizados' using errcode='42501';
 end if;
 return public.app_colaborador_combinar_vista(anterior,nuevo,visible);
end $entry$;
notify pgrst,'reload schema';
commit;
