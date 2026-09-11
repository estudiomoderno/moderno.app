-- CANDIDATO: probar en aislamiento antes de habilitar la interfaz.
-- Aditivo. No cambia bloques, productos, archivos ni documentos existentes al instalar.
begin;
create table if not exists public.productos_entrantes(
 id uuid primary key, estudio_id uuid not null references public.estudios(id), actor uuid not null,
 url text not null check(length(url)<=3000), destino jsonb not null, destino_snapshot jsonb not null,
 estado text not null default 'procesando' check(estado in ('procesando','listo','incompleto','error','absorbido')),
 captura jsonb, error_code text, creado timestamptz not null default clock_timestamp(),
 actualizado timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '7 days',
 item_id uuid, absorbido_en timestamptz, revision jsonb, limpieza_en timestamptz
);
create index if not exists productos_entrantes_usuario on public.productos_entrantes(estudio_id,actor,creado desc);
alter table public.productos_entrantes enable row level security;
revoke all on public.productos_entrantes from public,anon,authenticated;
grant select on public.productos_entrantes to authenticated;
drop policy if exists clipper_lectura on public.productos_entrantes;
create policy clipper_lectura on public.productos_entrantes for select to authenticated using(
 actor=auth.uid() and public.app_rol(estudio_id) in ('admin','colaborador')
);

create or replace function public.clipper_destino(p_estudio uuid,p_destino jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p jsonb;r jsonb;s jsonb; cfg jsonb;dest jsonb;
begin
 if public.app_rol(p_estudio) not in ('admin','colaborador') then raise exception 'Sin permiso para añadir productos' using errcode='42501';end if;
 if p_destino->>'kind'='biblioteca' then
  select contenido into cfg from public.datos_estudio where estudio_id=p_estudio and bloque='config';
  if not exists(select 1 from jsonb_array_elements_text(coalesce(cfg->'wsOrder','[]')) b where b=p_destino->>'brand') then raise exception 'Espacio no disponible';end if;
  return jsonb_build_object('kind','biblioteca','brand',p_destino->>'brand');
 elsif p_destino->>'kind'='lista' then
  select x into strict p from public.datos_estudio d cross join lateral jsonb_array_elements(d.contenido) x where d.estudio_id=p_estudio and d.bloque='proyectos' and x->>'id'=p_destino->>'projectId';
  select x into strict r from jsonb_array_elements(coalesce(p->'rooms','[]')) x where x->>'id'=p_destino->>'roomId';
  select x into strict s from jsonb_array_elements(coalesce(r->'sections','[]')) x where x->>'id'=p_destino->>'sectionId';
  return jsonb_build_object('kind','lista','projectId',p->>'id','projectName',p->>'name','roomId',r->>'id','roomName',r->>'name','sectionId',s->>'id','sectionName',s->>'name');
 end if;
 raise exception 'Destino no válido';
exception when no_data_found or too_many_rows then raise exception 'Destino ausente o ambiguo; actualiza la pantalla' using errcode='PT409';
end $$;
revoke all on function public.clipper_destino(uuid,jsonb) from public,anon,authenticated;

create or replace function public.clipper_iniciar(p_id uuid,p_estudio uuid,p_url text,p_destino jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prev public.productos_entrantes; snap jsonb; cuota integer;
begin
 snap:=public.clipper_destino(p_estudio,p_destino);
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,7281));
 select * into prev from public.productos_entrantes where id=p_id;
 if found then
  if prev.actor<>auth.uid() or prev.estudio_id<>p_estudio or prev.url<>p_url or prev.destino<>p_destino then raise exception 'La solicitud no coincide' using errcode='42501';end if;
  return jsonb_build_object('start',false,'id',prev.id,'estado',prev.estado);
 end if;
 select count(*) into cuota from public.productos_entrantes where estudio_id=p_estudio and creado>clock_timestamp()-interval '1 day';
 if cuota>=100 then raise exception 'Límite diario del estudio alcanzado' using errcode='PT429';end if;
 select count(*) into cuota from public.productos_entrantes where estudio_id=p_estudio and actor=auth.uid() and creado>clock_timestamp()-interval '1 hour';
 if cuota>=15 then raise exception 'Espera antes de importar más productos' using errcode='PT429';end if;
 select count(*) into cuota from public.productos_entrantes where estudio_id=p_estudio and estado='procesando' and creado>clock_timestamp()-interval '2 minutes';
 if cuota>=3 then raise exception 'Hay otras capturas en curso; espera un momento' using errcode='PT429';end if;
 insert into public.productos_entrantes(id,estudio_id,actor,url,destino,destino_snapshot) values(p_id,p_estudio,auth.uid(),p_url,p_destino,snap);
 return jsonb_build_object('start',true,'id',p_id,'estado','procesando');
end $$;
revoke all on function public.clipper_iniciar(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.clipper_iniciar(uuid,uuid,text,jsonb) to authenticated;

-- Only the authenticated Edge handler's server client may finish captures.
create or replace function public.clipper_finalizar(p_id uuid,p_actor uuid,p_captura jsonb,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare fila public.productos_entrantes;
begin
 select * into strict fila from public.productos_entrantes where id=p_id and actor=p_actor for update;
 if fila.estado<>'procesando' then return;end if;
 if public.app_rol_usuario(fila.estudio_id,p_actor) not in ('admin','colaborador') then raise exception 'Acceso revocado' using errcode='42501';end if;
 if p_error is null and (p_captura->>'schemaVersion'<>'1.0' or octet_length(p_captura::text)>300000) then raise exception 'Captura no válida';end if;
 update public.productos_entrantes set captura=p_captura,error_code=left(p_error,100),
 estado=case when p_error is not null then 'error' when jsonb_array_length(coalesce(p_captura->'missing','[]'))>0 then 'incompleto' else 'listo' end,
 actualizado=clock_timestamp() where id=p_id;
end $$;
revoke all on function public.clipper_finalizar(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.clipper_finalizar(uuid,uuid,jsonb,text) to service_role;

create or replace function public.clipper_absorber(p_id uuid,p_revision jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
<<absorb>>
declare fila public.productos_entrantes;actual jsonb;contenido jsonb;item jsonb;images jsonb;itemid uuid;bloque text;rev timestamptz;
 pidx integer;ridx integer;sidx integer;price numeric;name text;imagen jsonb;ref text;nombre text;
begin
 select * into strict fila from public.productos_entrantes where id=p_id and actor=auth.uid() for update;
 actual:=public.clipper_destino(fila.estudio_id,fila.destino);
 if fila.estado='absorbido' then return jsonb_build_object('status','already_absorbed','itemId',fila.item_id);end if;
 if fila.estado not in ('listo','incompleto') or fila.expires_at<clock_timestamp() then raise exception 'La captura no está lista o ha caducado';end if;
 if p_revision->>'confirmed' is distinct from 'true' then raise exception 'Revisa los datos antes de guardar';end if;
 if actual<>fila.destino_snapshot then raise exception 'El destino cambió; vuelve a capturar para revisarlo' using errcode='PT409';end if;
 if octet_length(p_revision::text)>20000 then raise exception 'Revisión demasiado grande';end if;
 name:=trim(coalesce(p_revision->>'name',fila.captura#>>'{fields,name,value}',''));
 if length(name) not between 1 and 500 then raise exception 'Escribe el nombre del producto';end if;
 if coalesce(p_revision->>'category','')='' then raise exception 'Elige una categoría';end if;
 if length(trim(coalesce(p_revision->>'unit',''))) not between 1 and 40 then raise exception 'Confirma la unidad de venta';end if;
 -- Price remains a source snapshot. Only explicitly confirmed EUR gross amounts enter the EUR app price.
 price:=null;
 if p_revision->>'useSourcePrice'='true' then
  if fila.captura#>>'{fields,currency,value}' is distinct from 'EUR' or fila.captura#>>'{tax,status}' is distinct from 'included'
   or fila.captura#>>'{variant,verified}' is distinct from 'true' then raise exception 'Confirma el precio en euros e impuestos manualmente en la ficha; el precio de origen no es compatible';end if;
  price:=(fila.captura#>>'{fields,price,value}')::numeric;
  if price is null or price<0 or price>100000000 then raise exception 'Precio no válido';end if;
 end if;
 images:='[]';
 for imagen in select value from jsonb_array_elements(coalesce(fila.captura->'images','[]')) with ordinality order by (value->>'storagePath'=p_revision->>'primaryImage') desc nulls last,ordinality loop
  ref:=imagen->>'storagePath';
  if ref is null then continue;end if;
  if ref not like fila.estudio_id::text||'/clipper/'||fila.id::text||'/%' then raise exception 'Imagen fuera de la captura';end if;
  if imagen->>'storageUrl' not like 'https://%/storage/v1/object/public/archivos/'||ref then raise exception 'Referencia de imagen no válida';end if;
  images:=images||jsonb_build_array(jsonb_build_object('name','Imagen producto','type',imagen->>'contentType','data',imagen->>'storageUrl'));
 end loop;
 itemid:=gen_random_uuid();
 item:=jsonb_build_object('id',itemid,'name',name,'status','Borrador','qty',1,'unit',coalesce(nullif(p_revision->>'unit',''),'ud'),
 'cat',left(p_revision->>'category',150),'price',price,'cost',null,'url',fila.url,'sku',fila.captura#>>'{fields,sku,value}',
 'supplier',coalesce(fila.captura#>>'{fields,brand,value}',fila.captura->>'domain'),'desc',fila.captura#>>'{fields,description,value}',
 'material',fila.captura#>>'{fields,material,value}','color',fila.captura#>>'{fields,color,value}',
 'dims',(select string_agg((x->>'axis')||': '||case when x->>'cm' is not null then x->>'cm'||' cm' else concat_ws(' ',x->>'value',x->>'unit') end,'; ') from jsonb_array_elements(coalesce(fila.captura->'dimensions','[]')) x),
 'plazo',fila.captura#>>'{fields,leadTime,value}',
 'img',coalesce(images#>>'{0,data}',''),'files',images,'capture',fila.captura,'captureId',fila.id,
 'createdBy',auth.uid(),'createdAt',clock_timestamp(),'review',p_revision);
 bloque:=case when fila.destino->>'kind'='biblioteca' then 'compras' else 'proyectos' end;
 select d.contenido,d.updated_at into contenido,rev from public.datos_estudio d where d.estudio_id=fila.estudio_id and d.bloque=absorb.bloque for update;
 if not found or jsonb_typeof(contenido)<>'array' then raise exception 'El destino no está preparado';end if;
 if public.clipper_destino(fila.estudio_id,fila.destino)<>fila.destino_snapshot then raise exception 'El destino cambió durante el guardado' using errcode='PT409';end if;
 if bloque='compras' then
  item:=item||jsonb_build_object('brand',fila.destino->>'brand');contenido:=contenido||jsonb_build_array(item);
 else
  select (ordinality-1)::integer into strict pidx from jsonb_array_elements(contenido) with ordinality where value->>'id'=fila.destino->>'projectId';
  select (ordinality-1)::integer into strict ridx from jsonb_array_elements(contenido->pidx->'rooms') with ordinality where value->>'id'=fila.destino->>'roomId';
  select (ordinality-1)::integer into strict sidx from jsonb_array_elements(contenido->pidx->'rooms'->ridx->'sections') with ordinality where value->>'id'=fila.destino->>'sectionId';
  contenido:=jsonb_set(contenido,array[pidx::text,'rooms',ridx::text,'sections',sidx::text,'items'],coalesce(contenido->pidx->'rooms'->ridx->'sections'->sidx->'items','[]')||jsonb_build_array(item));
 end if;
 rev:=greatest(clock_timestamp(),rev+interval '1 microsecond');
 update public.datos_estudio d set contenido=absorb.contenido,updated_at=rev where d.estudio_id=fila.estudio_id and d.bloque=absorb.bloque;
 update public.productos_entrantes set estado='absorbido',item_id=itemid,absorbido_en=clock_timestamp(),actualizado=clock_timestamp(),revision=p_revision where id=p_id;
 return jsonb_build_object('status','absorbed','itemId',itemid,'bloque',bloque,'updated_at',rev);
end $$;
revoke all on function public.clipper_absorber(uuid,jsonb) from public,anon;
grant execute on function public.clipper_absorber(uuid,jsonb) to authenticated;

-- Reclaim only the caller's expired, never-absorbed staging. Mark before Storage removal,
-- so an absorption cannot race a cleanup. Absorbed files are never eligible.
create or replace function public.clipper_caducadas(p_estudio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare fila public.productos_entrantes;res jsonb:='[]';
begin
 if public.app_rol(p_estudio) not in ('admin','colaborador') then raise exception 'No autorizado' using errcode='42501';end if;
 for fila in select * from public.productos_entrantes where estudio_id=p_estudio and actor=auth.uid() and expires_at<clock_timestamp() and estado<>'absorbido' and limpieza_en is null and not exists(select 1 from public.datos_estudio d where d.estudio_id=p_estudio and d.contenido::text like '%/clipper/'||productos_entrantes.id::text||'/%') order by creado limit 3 for update skip locked loop
  update public.productos_entrantes set estado='error',error_code='expired',actualizado=clock_timestamp() where id=fila.id;
  res:=res||jsonb_build_array(jsonb_build_object('id',fila.id,'images',coalesce(fila.captura->'images','[]')));
 end loop;return res;
end $$;
revoke all on function public.clipper_caducadas(uuid) from public,anon;
grant execute on function public.clipper_caducadas(uuid) to authenticated;
create or replace function public.clipper_limpieza_completa(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.productos_entrantes set limpieza_en=clock_timestamp(),captura=jsonb_set(captura,'{images}','[]')
 where id=p_id and actor=auth.uid() and public.app_rol(estudio_id) in ('admin','colaborador') and estado='error' and error_code='expired' and expires_at<clock_timestamp();
end $$;
revoke all on function public.clipper_limpieza_completa(uuid) from public,anon;
grant execute on function public.clipper_limpieza_completa(uuid) to authenticated;
commit;
