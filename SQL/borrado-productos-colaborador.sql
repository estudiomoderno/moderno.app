-- Authorize removal of shopping products, never entire projects. No table data changes.
begin;
do $guard$ begin
 if to_regprocedure('public.app_colaborador_borrados_productos(jsonb,jsonb,text)') is not null then raise exception 'La corrección ya existe'; end if;
 if md5(pg_get_functiondef('public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz)'::regprocedure)) <> 'c4cccb6143eb9d03a17a02f8eb8e77e3' then raise exception 'El escritor ha cambiado; revisar'; end if;
end $guard$;
create function public.app_colaborador_borrados_productos(anterior jsonb,nuevo jsonb,nivel text)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare previo jsonb; fresh jsonb; result jsonb[]:='{}'; row_old jsonb; key_name text; ident jsonb;
 old_index jsonb; new_index jsonb; bucket text; count_old integer; count_new integer; position_new integer; child_level text;
begin
 if anterior is not distinct from nuevo or anterior is null then return anterior; end if;
 if jsonb_typeof(anterior) is distinct from jsonb_typeof(nuevo) then return anterior; end if;
 if nivel='items' and nuevo=public.app_colaborador_filtrar(anterior) then return anterior; end if;
 if nivel in ('proyecto','room','section') and jsonb_typeof(anterior)='object' then
  key_name:=case nivel when 'proyecto' then 'rooms' when 'room' then 'sections' else 'items' end;
  if not (anterior ? key_name and nuevo ? key_name) then return anterior; end if;
  return jsonb_set(anterior,array[key_name],public.app_colaborador_borrados_productos(anterior->key_name,nuevo->key_name,key_name),false);
 elsif nivel in ('proyectos','rooms','sections','items') and jsonb_typeof(anterior)='array' then
  old_index:=public.app_colaborador_indice(anterior,'id',true);
  new_index:=public.app_colaborador_indice(nuevo,'id',true);
  for row_old in select value from jsonb_array_elements(anterior) loop
   key_name:=case when row_old ? 'id' then 'id' when row_old ? 'name' then 'name' else null end;
   if key_name is null or row_old->key_name='null'::jsonb then
    if nivel='proyectos' then raise exception 'Un administrador debe revisar los identificadores de los proyectos' using errcode='42501'; end if;
    result:=array_append(result,row_old);continue;
   end if;
   ident:=row_old->key_name;bucket:=pg_catalog.jsonb_hash_extended(ident,0)::text;
   if key_name='id' then
    select count(*) into count_old from jsonb_array_elements(old_index->bucket) x where x->0=ident;
    select count(*),min((x->>1)::integer) into count_new,position_new from jsonb_array_elements(new_index->bucket) x where x->0=ident;
   else
    select count(*) into count_old from jsonb_array_elements(anterior) x where not x ? 'id' and x->'name'=ident;
    select count(*),min((n-1)::integer) into count_new,position_new from jsonb_array_elements(nuevo) with ordinality a(x,n) where not x ? 'id' and x->'name'=ident;
   end if;
   if nivel='proyectos' and (key_name<>'id' or count_old<>1 or count_new<>1) then
    raise exception 'Solo un administrador puede eliminar proyectos' using errcode='42501';
   end if;
   if count_old<>1 or count_new>1 then raise exception 'Identidad de fila ambigua; conservar cambios' using errcode='42501'; end if;
   if nivel='items' and count_new=0 and row_old ?& array['name','price','qty'] and not (row_old ? 'docRef' or row_old ? 'docKind') then
    continue;
   end if;
   fresh:=nuevo->position_new;
   child_level:=case nivel when 'proyectos' then 'proyecto' when 'rooms' then 'room' when 'sections' then 'section' else '' end;
   previo:=case when count_new=1 and child_level<>'' then public.app_colaborador_borrados_productos(row_old,fresh,child_level) else row_old end;
   result:=array_append(result,previo);
  end loop;
  return to_jsonb(result);
 end if;
 return anterior;
end $fn$;
revoke all on function public.app_colaborador_borrados_productos(jsonb,jsonb,text) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.guardar_bloque_versionado(p_estudio uuid, p_bloque text, p_contenido jsonb, p_base timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rol text; anterior jsonb; version_actual timestamptz; combinado jsonb; candidato jsonb;
begin
 rol:=public.app_rol(p_estudio);
 if rol='admin' then return public.guardar_bloque_versionado_base(p_estudio,p_bloque,p_contenido,p_base); end if;
 if rol<>'colaborador' or p_bloque not in ('proyectos','compras','contactos','fases','agenda') then
  raise exception 'No puedes modificar este bloque' using errcode='42501';
 end if;
 select contenido,updated_at into anterior,version_actual from public.datos_estudio
 where estudio_id=p_estudio and bloque=p_bloque for update;
 if version_actual is distinct from p_base then raise exception 'La version ha cambiado' using errcode='PT409'; end if;
 candidato:=case when p_bloque in ('proyectos','compras') then public.app_colaborador_preparar_lista(p_contenido) else p_contenido end;
 if p_bloque='proyectos' then
  if jsonb_typeof(candidato) is distinct from 'array' then raise exception 'Lista de proyectos no válida' using errcode='42501'; end if;
  anterior:=public.app_colaborador_borrados_productos(anterior,candidato,'proyectos');
 end if;
 combinado:=public.app_colaborador_combinar(anterior,candidato);
 return public.guardar_bloque_versionado_base(p_estudio,p_bloque,combinado,p_base);
end $function$
;
notify pgrst,'reload schema';
commit;
