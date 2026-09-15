-- Aditivo: no transforma datos_estudio. Validar primero en el clon.
begin;
create table if not exists public.biblioteca_marcas (
 id uuid primary key, nombre text not null check(length(nombre) between 1 and 200),
 estado text not null default 'borrador' check(estado in ('borrador','publicada','retirada'))
);
create table if not exists public.biblioteca_marca_productos (
 id uuid not null, marca_id uuid not null references public.biblioteca_marcas(id),
 revision integer not null check(revision>0), primary key(id,revision),
 estado text not null default 'borrador' check(estado in ('borrador','publicado','retirado')),
 derecho_consulta boolean not null default false, derecho_copia boolean not null default false,
 producto jsonb not null check(jsonb_typeof(producto)='object' and length(producto->>'name')>0),
 publicado_en timestamptz,
 check(estado<>'publicado' or publicado_en is not null)
);
alter table public.biblioteca_marcas enable row level security;
alter table public.biblioteca_marca_productos enable row level security;
-- No acceso directo de clientes, ni siquiera a borradores. Solo RPC con estudio autorizado.
revoke all on public.biblioteca_marcas,public.biblioteca_marca_productos from public,anon,authenticated;

create or replace function public.biblioteca_marcas_leer(p_estudio uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(public.app_rol(p_estudio),'sin_acceso') not in ('admin','colaborador') then
  raise exception 'No autorizado' using errcode='42501';end if;
 return coalesce((select jsonb_agg(x.item) from (
  select jsonb_build_object('id',p.id,'brandId',p.marca_id,'brandName',m.nombre,'revision',p.revision,
   'status','published','rights',jsonb_build_object('display',true,'saveToStudy',p.derecho_copia),
   'product',(select jsonb_object_agg(k,v) from jsonb_each(p.producto) a(k,v)
    where k in ('name','url','sku','unit','img','dims','material','color','cat') and jsonb_typeof(v)='string')) item
  from public.biblioteca_marca_productos p join public.biblioteca_marcas m on m.id=p.marca_id
  where m.estado='publicada' and p.estado='publicado' and p.derecho_consulta
   and not exists(select 1 from public.biblioteca_marca_productos n where n.id=p.id and n.revision>p.revision
     and n.estado='publicado' and n.derecho_consulta)
  order by m.nombre,p.id limit 500
 ) x),'[]'::jsonb);
end $$;
revoke all on function public.biblioteca_marcas_leer(uuid) from public,anon;
grant execute on function public.biblioteca_marcas_leer(uuid) to authenticated;

create or replace function public.biblioteca_marca_guardar(p_estudio uuid,p_producto uuid,p_revision integer,p_id uuid,p_custom jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
<<guardar>>
declare master public.biblioteca_marca_productos; contenido jsonb; item jsonb; anterior jsonb; rev timestamptz;
begin
 if coalesce(public.app_rol(p_estudio),'sin_acceso') not in ('admin','colaborador') then
  raise exception 'No autorizado' using errcode='42501';end if;
 if p_id is null or jsonb_typeof(p_custom) is distinct from 'object' then raise exception 'Datos no válidos';end if;
 select * into master from public.biblioteca_marca_productos where id=p_producto and revision=p_revision for share;
 if not found or master.estado<>'publicado' or not master.derecho_consulta or not master.derecho_copia then
  raise exception 'Producto no disponible para guardar' using errcode='42501';end if;
 perform 1 from public.biblioteca_marcas where id=master.marca_id and estado='publicada' for share;
 if not found then raise exception 'Marca no disponible' using errcode='42501';end if;
 select d.contenido,d.updated_at into contenido,rev from public.datos_estudio d
  where estudio_id=p_estudio and bloque='compras' for update;
 if not found or jsonb_typeof(contenido)<>'array' then raise exception 'Biblioteca no preparada';end if;
 select x into anterior from jsonb_array_elements(contenido) x where x->>'id'=p_id::text;
 if found then
  if anterior#>>'{libraryOrigin,productId}'=p_producto::text and anterior#>>'{libraryOrigin,revision}'=p_revision::text then
   return jsonb_build_object('status','already_saved','itemId',p_id,'updated_at',rev);end if;
  raise exception 'Identificador ocupado' using errcode='PT409';end if;
 select jsonb_object_agg(k,v) into item from jsonb_each(master.producto) a(k,v)
  where k in ('name','url','sku','unit','img','dims','material','color','cat') and jsonb_typeof(v)='string';
 item:=coalesce(item,'{}')||jsonb_build_object('id',p_id,'price',null,'cost',null,'qty',1,
  'libraryOrigin',jsonb_build_object('kind','brand','brandId',master.marca_id,'productId',p_producto,'revision',p_revision));
 if p_custom ? 'price' and p_custom->'price'<>'null'::jsonb then
  if jsonb_typeof(p_custom->'price')<>'number' or (p_custom->>'price')::numeric<0 then raise exception 'Precio no válido';end if;
  item:=item||jsonb_build_object('price',p_custom->'price');end if;
 if jsonb_typeof(p_custom->'notes')='string' then item:=item||jsonb_build_object('notes',p_custom->'notes');end if;
 if jsonb_typeof(p_custom->'supplier')='string' then item:=item||jsonb_build_object('supplier',p_custom->'supplier');end if;
 rev:=greatest(clock_timestamp(),rev+interval '1 microsecond');
 update public.datos_estudio d set contenido=guardar.contenido||jsonb_build_array(item),updated_at=rev
  where estudio_id=p_estudio and bloque='compras';
 return jsonb_build_object('status','saved','itemId',p_id,'updated_at',rev);
end $$;
revoke all on function public.biblioteca_marca_guardar(uuid,uuid,integer,uuid,jsonb) from public,anon;
grant execute on function public.biblioteca_marca_guardar(uuid,uuid,integer,uuid,jsonb) to authenticated;
commit;
