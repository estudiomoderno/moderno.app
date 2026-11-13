-- Colaboración del cliente en listas de compra.
-- Aditivo: conserva listas y productos existentes. Aplicar primero en Moderno Prueba.
begin;

do $guard$
begin
 if to_regclass('public.datos_estudio') is null
   or to_regprocedure('public.portal_estudio(text,text)') is null
   or to_regprocedure('public.portal_cliente_lee(text)') is null then
  raise exception 'Falta el contrato vigente del portal; no se aplicó ningún cambio';
 end if;
 if to_regprocedure('public.portal_cliente_lee_pre_colaboracion(text)') is not null
   or to_regprocedure('public.portal_cliente_producto_anadir(text,text,integer,text,jsonb,uuid)') is not null then
  raise exception 'La colaboración de compras ya existe; revisar antes de reaplicar';
 end if;
end $guard$;

alter function public.portal_cliente_lee(text) rename to portal_cliente_lee_pre_colaboracion;
revoke all on function public.portal_cliente_lee_pre_colaboracion(text) from public,anon,authenticated,service_role;

create function public.portal_cliente_lee(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare payload jsonb; project jsonb; study uuid;
begin
 if p_token is null or p_token !~ '^[a-zA-Z0-9]{6,128}$' then return null; end if;
 payload:=public.portal_cliente_lee_pre_colaboracion(p_token);
 if payload is null then return null; end if;
 study:=public.portal_estudio(p_token,'cliente');
 if study is null then return null; end if;
 select p into strict project
 from public.datos_estudio d
 cross join lateral jsonb_array_elements(case when jsonb_typeof(d.contenido)='array' then d.contenido else '[]'::jsonb end) p
 where d.estudio_id=study and d.bloque='proyectos'
   and lower(p#>>'{cliShare,token}')=lower(p_token)
   and p#>>'{cliShare,active}' is distinct from 'false';
 return jsonb_set(payload,'{proyecto,clientShoppingCollaboration}',
   to_jsonb(project->'clientShoppingCollaboration'='true'::jsonb),true);
exception when no_data_found or too_many_rows then return null;
end $function$;
revoke all on function public.portal_cliente_lee(text) from public;
grant execute on function public.portal_cliente_lee(text) to anon,authenticated,service_role;

create function public.portal_cliente_producto_anadir(
 p_token text,
 p_lista text,
 p_seccion integer,
 p_seccion_nombre text,
 p_producto jsonb,
 p_operacion uuid
) returns jsonb
language plpgsql security definer set search_path='' as $function$
declare
 study uuid; block jsonb; project jsonb; room jsonb; section jsonb; item jsonb; existing jsonb;
 project_index integer; room_index integer; updated timestamptz; path text[];
 name text; url text; supplier text; sku text; unit text; dims text; material text; color text; lead_time text;
 price numeric; qty numeric;
begin
 if p_token is null or p_token !~ '^[a-zA-Z0-9]{6,128}$' or p_operacion is null
   or p_lista is null or char_length(p_lista) not between 1 and 128
   or p_seccion is null or p_seccion not between 0 and 200
   or p_seccion_nombre is null or char_length(p_seccion_nombre) not between 1 and 160
   or jsonb_typeof(p_producto) is distinct from 'object' then
  raise exception 'Solicitud no válida' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_object_keys(p_producto) key
   where key not in ('name','url','supplier','sku','price','qty','unit','dims','material','color','plazo')) then
  raise exception 'El producto contiene campos no autorizados' using errcode='42501';
 end if;
 if exists(select 1 from (values ('name'),('url'),('supplier'),('sku'),('unit'),('dims'),('material'),('color'),('plazo')) fields(key)
   where p_producto ? key and jsonb_typeof(p_producto->key)<>'string')
   or jsonb_typeof(p_producto->'price') is distinct from 'number'
   or jsonb_typeof(p_producto->'qty') is distinct from 'number' then
  raise exception 'Los tipos del producto no son válidos' using errcode='22023';
 end if;

 name:=btrim(p_producto->>'name');url:=btrim(coalesce(p_producto->>'url',''));
 supplier:=btrim(coalesce(p_producto->>'supplier',''));sku:=btrim(coalesce(p_producto->>'sku',''));
 unit:=btrim(coalesce(p_producto->>'unit','ud'));dims:=btrim(coalesce(p_producto->>'dims',''));
 material:=btrim(coalesce(p_producto->>'material',''));color:=btrim(coalesce(p_producto->>'color',''));
 lead_time:=btrim(coalesce(p_producto->>'plazo',''));price:=(p_producto->>'price')::numeric;qty:=(p_producto->>'qty')::numeric;
 if name='' or char_length(name)>180 or char_length(url)>2000 or char_length(supplier)>180 or char_length(sku)>120
   or char_length(dims)>240 or char_length(material)>240 or char_length(color)>240 or char_length(lead_time)>240
   or (url<>'' and url !~* '^https?://[^[:space:]]+$') or unit not in ('ud','m2','m','m3','l','kg','h')
   or price<0 or price>1000000000 or qty<=0 or qty>1000000 then
  raise exception 'Los datos del producto no son válidos' using errcode='22023';
 end if;

 study:=public.portal_estudio(p_token,'cliente');
 if study is null then raise exception 'Acceso no disponible' using errcode='42501'; end if;
 select d.contenido,d.updated_at into strict block,updated from public.datos_estudio d
 where d.estudio_id=study and d.bloque='proyectos' for update;
 select (entry.ordinality-1)::integer,entry.value into strict project_index,project
 from jsonb_array_elements(block) with ordinality entry(value,ordinality)
 where lower(entry.value#>>'{cliShare,token}')=lower(p_token)
   and entry.value#>>'{cliShare,active}' is distinct from 'false';
 if project->>'clientShoppingCollaboration' is distinct from 'true' then
  raise exception 'La colaboración está desactivada' using errcode='42501';
 end if;

 select item.value into existing from jsonb_array_elements(coalesce(project->'rooms','[]'::jsonb)) room_entry
 cross join lateral jsonb_array_elements(coalesce(room_entry.value->'sections','[]'::jsonb)) section_entry
 cross join lateral jsonb_array_elements(coalesce(section_entry.value->'items','[]'::jsonb)) item
 where item.value->>'clientOperation'=p_operacion::text limit 1;
 if existing is not null then return jsonb_build_object('created',false,'item',existing-'clientOperation'); end if;

 select (entry.ordinality-1)::integer,entry.value into strict room_index,room
 from jsonb_array_elements(coalesce(project->'rooms','[]'::jsonb)) with ordinality entry(value,ordinality)
 where entry.value->>'id'=p_lista and entry.value->>'cliMode' is distinct from 'off';
 section:=room#>array['sections',p_seccion::text];
 if jsonb_typeof(section) is distinct from 'object' or coalesce(nullif(section->>'name',''),'Productos')<>p_seccion_nombre
   or jsonb_typeof(section->'items') is distinct from 'array' then
  raise exception 'La lista ha cambiado; vuelve a abrir el formulario' using errcode='PT409';
 end if;

 item:=jsonb_strip_nulls(jsonb_build_object(
  'id','cliente-'||p_operacion::text,'name',name,'url',url,'supplier',supplier,'sku',sku,
  'price',price,'qty',qty,'unit',unit,'dims',dims,'material',material,'color',color,'plazo',lead_time,
  'status','Borrador','addedAt',clock_timestamp(),'clientAdded',true,'clientAddedAt',clock_timestamp(),
  'createdBy','Cliente','clientOperation',p_operacion::text,'img','','files',jsonb_build_array()
 ));
 path:=array[project_index::text,'rooms',room_index::text,'sections',p_seccion::text,'items'];
 block:=jsonb_set(block,path,(block#>path)||jsonb_build_array(item),false);
 updated:=greatest(clock_timestamp(),coalesce(updated,'-infinity'::timestamptz)+interval '1 microsecond');
 update public.datos_estudio set contenido=block,updated_at=updated
 where estudio_id=study and bloque='proyectos';
 return jsonb_build_object('created',true,'item',item-'clientOperation','updated_at',updated);
exception
 when no_data_found or too_many_rows then raise exception 'Acceso o destino no disponible' using errcode='42501';
end $function$;
revoke all on function public.portal_cliente_producto_anadir(text,text,integer,text,jsonb,uuid) from public;
grant execute on function public.portal_cliente_producto_anadir(text,text,integer,text,jsonb,uuid) to anon,authenticated;

notify pgrst,'reload schema';
commit;
