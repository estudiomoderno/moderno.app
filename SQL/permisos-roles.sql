-- CANDIDATO EN DESARROLLO. No ejecutar en producción.
-- Requiere guardar-bloque-versionado.sql y portales-filtrados.sql.
-- La integración de cliente, RLS, historial y Storage debe entregarse completa.
begin;

-- Auxiliar privado: permite comprobar también al titular de una suscripción.
create or replace function public.app_rol_usuario(p_estudio uuid,p_usuario uuid) returns text
language plpgsql stable set search_path='' as $$
declare membresia text; correo text; etiqueta text; coincidencias integer;
begin
 select m.rol into membresia from public.miembros m
 where m.estudio_id=p_estudio and m.user_id=p_usuario;
 if membresia is null then return 'sin_acceso'; end if;
 if membresia='admin' then return 'admin'; end if;
 select lower(u.email) into correo from auth.users u where u.id=p_usuario;
 select min(x->>'role'),count(*) into etiqueta,coincidencias from public.datos_estudio d
 cross join lateral jsonb_array_elements(coalesce(d.contenido->'users','[]')) x
 where d.estudio_id=p_estudio and d.bloque='config' and lower(x->>'email')=correo;
 if coincidencias>1 then return 'sin_acceso'; end if;
 -- Un rótulo Administrador en JSON nunca eleva una membresía ordinaria.
 return case etiqueta when 'Gestoría (solo lectura)' then 'gestoria'
 when 'Contratista (obra)' then 'contratista' when 'Cliente' then 'cliente'
 else 'colaborador' end;
end $$;
revoke all on function public.app_rol_usuario(uuid,uuid) from public,anon,authenticated;
create or replace function public.app_rol(p_estudio uuid) returns text
language sql stable security definer set search_path='' as $$
 select public.app_rol_usuario(p_estudio,auth.uid());
$$;
revoke all on function public.app_rol(uuid) from public,anon;
grant execute on function public.app_rol(uuid) to authenticated;

-- Lista explícita de campos para los documentos contables. Costes de líneas,
-- márgenes, notas internas y HTML almacenado no forman parte de la consulta.
create or replace function public.app_pdf_contable(v jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(public.portal_campos(f,array['name','type','data','url'])), '[]')
 from jsonb_array_elements(case when jsonb_typeof(v->'files')='array' then v->'files' else '[]'::jsonb end
  ||case when jsonb_typeof(v->'file')='object' then jsonb_build_array(v->'file') else '[]'::jsonb end) f
 where jsonb_typeof(f)='object' and (f->>'type'='application/pdf' or f->>'name' ~* '\.pdf$')
 and (jsonb_typeof(f->'data')='string' or jsonb_typeof(f->'url')='string');
$$;
revoke all on function public.app_pdf_contable(jsonb) from public,anon,authenticated;

create or replace function public.app_finanzas_lectura(v jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object(
 'invoices',coalesce((select jsonb_agg(
   public.portal_campos(f,array['ref','num','date','brand','client','clientIdx','projectId','total','subtotal','iva','irpf','disc','status','legend','due'])
   ||jsonb_build_object('files',public.app_pdf_contable(f))
   ||jsonb_build_object('lines',coalesce((select jsonb_agg(public.portal_campos(l,array['name','desc','qty','price','unit','cap','on','hidden']))
       from jsonb_array_elements(coalesce(f->'lines','[]')) l),'[]')))
   from jsonb_array_elements(coalesce(v->'invoices','[]')) f),'[]'),
 'entries',coalesce((select jsonb_agg(public.portal_campos(e,array['id','kind','date','concept','amount','status','brand','projectId','client','clientIdx','provider','supplier','nif','link','due','iva','irpf','base','total'])
   ||jsonb_build_object('files',public.app_pdf_contable(e)))
   from jsonb_array_elements(coalesce(v->'entries','[]')) e),'[]'));
$$;
revoke all on function public.app_finanzas_lectura(jsonb) from public,anon,authenticated;

create or replace function public.gestoria_consultar(p_estudio uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare rol text; datos jsonb; cfg jsonb; proyectos jsonb; contactos jsonb;
begin
 rol:=public.app_rol(p_estudio);
 if rol not in ('admin','gestoria') then raise exception 'No autorizado' using errcode='42501'; end if;
 select contenido into datos from public.datos_estudio where estudio_id=p_estudio and bloque='facturas';
 select contenido into cfg from public.datos_estudio where estudio_id=p_estudio and bloque='config';
 select coalesce(jsonb_agg(public.portal_campos(p,array['id','num','name','brand','client','total'])),'[]')
 into proyectos from public.datos_estudio d cross join lateral jsonb_array_elements(d.contenido) p
 where d.estudio_id=p_estudio and d.bloque='proyectos';
 select coalesce(jsonb_agg(public.portal_campos(c,array['name','fiscal','nif','addr','city','country','email'])),'[]')
 into contactos from public.datos_estudio d cross join lateral jsonb_array_elements(d.contenido) c
 where d.estudio_id=p_estudio and d.bloque='contactos';
 return public.app_finanzas_lectura(coalesce(datos,'{}'))||jsonb_build_object(
  'rol',rol,'readonly',true,'projects',proyectos,'clients',contactos,
  'emitter',public.portal_campos(cfg->'emitter',array['name','nif','addr','city','iban']),
  'account',public.portal_campos(cfg->'account',array['name']),
  'updated_at',(select updated_at from public.datos_estudio where estudio_id=p_estudio and bloque='facturas'));
end $$;
revoke all on function public.gestoria_consultar(uuid) from public,anon;
grant execute on function public.gestoria_consultar(uuid) to authenticated;

-- Esta puerta se aplica incluso a llamadas directas fuera de la interfaz.
-- Se conserva la función original para no cambiar su control de concurrencia.
create or replace function public.guardar_bloque_versionado_base(
  p_estudio uuid, p_bloque text, p_contenido jsonb, p_base timestamptz
) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare actual timestamptz; nueva timestamptz; existe boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.miembros m where m.user_id=auth.uid() and m.estudio_id=p_estudio
  ) then raise exception 'No autorizado' using errcode='42501'; end if;
  -- Config contiene usuarios, roles y capacidades: ningún miembro puede
  -- promoverse cambiando el JSON. La autoridad es la membresía del servidor.
  if p_bloque='config' and not exists (
    select 1 from public.miembros m where m.user_id=auth.uid()
      and m.estudio_id=p_estudio and m.rol='admin'
  ) then raise exception 'Solo un administrador puede cambiar la configuracion del estudio' using errcode='42501'; end if;
  select updated_at into actual from public.datos_estudio
    where estudio_id=p_estudio and bloque=p_bloque for update;
  existe := found;
  if (existe and actual is distinct from p_base) or (not existe and p_base is not null) then
    raise exception 'La version ha cambiado; conservar cambios y reintentar' using errcode='PT409';
  end if;
  nueva := greatest(clock_timestamp(),coalesce(actual,'-infinity'::timestamptz)+interval '1 microsecond');
  if existe then
    update public.datos_estudio set contenido=p_contenido,updated_at=nueva
      where estudio_id=p_estudio and bloque=p_bloque;
  else
    -- Una creación simultánea falla por la clave única; nunca sobrescribe.
    insert into public.datos_estudio(estudio_id,bloque,contenido,updated_at)
      values(p_estudio,p_bloque,p_contenido,nueva);
  end if;
  return jsonb_build_object('updated_at',nueva);
end;
$fn$;
revoke all on function public.guardar_bloque_versionado_base(uuid,text,jsonb,timestamptz) from public,anon,authenticated;
create or replace function public.guardar_bloque_versionado(p_estudio uuid,p_bloque text,p_contenido jsonb,p_base timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rol text;
begin
 rol:=public.app_rol(p_estudio);
 if rol in ('sin_acceso','gestoria','contratista','cliente') then
  raise exception 'Este acceso no permite modificar datos del estudio' using errcode='42501';
 end if;
 if rol<>'admin' and p_bloque in ('config','facturas','presupuestos') then
  raise exception 'No puedes modificar este bloque' using errcode='42501';
 end if;
 return public.guardar_bloque_versionado_base(p_estudio,p_bloque,p_contenido,p_base);
end $$;
revoke all on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) from public,anon;
grant execute on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) to authenticated;

-- Lectura directa e historial no pueden saltarse el resumen autorizado.
drop policy if exists gestoria_sin_datos_crudos on public.datos_estudio;
create policy gestoria_sin_datos_crudos on public.datos_estudio as restrictive
 for select to authenticated using (public.app_rol(estudio_id)<>'gestoria');
drop policy if exists gestoria_sin_historial_crudo on public.datos_estudio_hist;
create policy gestoria_sin_historial_crudo on public.datos_estudio_hist as restrictive
 for select to authenticated using (public.app_rol(estudio_id)<>'gestoria');

create or replace function public.app_bloquear_escritura_gestoria() returns trigger
language plpgsql security definer set search_path='' as $$
declare estudio uuid;
begin
 estudio:=case when TG_OP='DELETE' then OLD.estudio_id else NEW.estudio_id end;
 if auth.uid() is not null and public.app_rol(estudio)='gestoria' then
  raise exception 'Gestoria es solo lectura' using errcode='42501';
 end if;
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
revoke all on function public.app_bloquear_escritura_gestoria() from public,anon,authenticated;
drop trigger if exists app_gestoria_solo_lectura on public.datos_estudio;
create trigger app_gestoria_solo_lectura before insert or update or delete on public.datos_estudio
 for each row execute function public.app_bloquear_escritura_gestoria();

-- Busca exclusivamente referencias PDF en el bloque contable, no cualquier URL.
create or replace function public.app_ruta_storage(enlace text) returns text
language plpgsql immutable set search_path='' as $$
declare ruta text; salida bytea:=''::bytea; i integer:=1; parte text;
begin
 if enlace like 'storage://archivos/%' then ruta:=substr(enlace,20);
 elsif enlace ~ '^https://(auth\.moderno\.app|cgqtylvaapwbuwqvpjtb\.supabase\.co|lypsmptuastbgxvlwfzj\.supabase\.co)/storage/v1/object/(public|authenticated)/archivos/' then
  ruta:=substring(enlace from '/storage/v1/object/(?:public|authenticated)/archivos/(.*)$');
  ruta:=split_part(split_part(ruta,'?',1),'#',1);
  while i<=length(ruta) loop
   if substr(ruta,i,1)='%' then
    parte:=substr(ruta,i+1,2);if parte !~ '^[a-fA-F0-9]{2}$' then return null;end if;
    salida:=salida||decode(parte,'hex');i:=i+3;
   else salida:=salida||convert_to(substr(ruta,i,1),'UTF8');i:=i+1;end if;
  end loop;
  ruta:=convert_from(salida,'UTF8');
 else return null;end if;
 if ruta !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/'
  or ruta ~ '[[:cntrl:]?#%]' or position(chr(92) in ruta)>0
  or exists(select 1 from unnest(string_to_array(ruta,'/')) segmento where segmento in ('','.','..')) then return null;end if;
 return ruta;
exception when others then return null;
end $$;
revoke all on function public.app_ruta_storage(text) from public,anon,authenticated;

create or replace function public.app_rutas_pdf(v jsonb) returns setof text
language plpgsql immutable set search_path='' as $$
declare hijo jsonb; enlace text; ruta text;
begin
 if jsonb_typeof(v)='object' then
  if v->>'type'='application/pdf' or lower(coalesce(v->>'name','')) like '%.pdf' then
   foreach enlace in array array[v->>'data',v->>'url'] loop
    ruta:=public.app_ruta_storage(enlace);
    if ruta is not null then return next ruta; end if;
   end loop;
  end if;
  for hijo in select value from jsonb_each(v) loop return query select * from public.app_rutas_pdf(hijo); end loop;
 elsif jsonb_typeof(v)='array' then
  for hijo in select value from jsonb_array_elements(v) loop return query select * from public.app_rutas_pdf(hijo); end loop;
 end if;
end $$;
revoke all on function public.app_rutas_pdf(jsonb) from public,anon,authenticated;

create or replace function public.app_archivo_gestoria(nombre text,escritura boolean default false) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare estudio uuid; rol text;
begin
 if split_part(nombre,'/',1) !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then return false; end if;
 estudio:=split_part(nombre,'/',1)::uuid; rol:=public.app_rol(estudio);
 if rol='sin_acceso' then return false; end if;
 if rol<>'gestoria' then return true; end if;
 if escritura then return false; end if;
 return exists(select 1 from public.datos_estudio d cross join lateral public.app_rutas_pdf(d.contenido) ruta
  where d.estudio_id=estudio and d.bloque='facturas' and ruta=nombre);
end $$;
revoke all on function public.app_archivo_gestoria(text,boolean) from public,anon;
grant execute on function public.app_archivo_gestoria(text,boolean) to authenticated;
drop policy if exists gestoria_lectura_pdf on storage.objects;
create policy gestoria_lectura_pdf on storage.objects as restrictive for select to authenticated
 using (bucket_id<>'archivos' or public.app_archivo_gestoria(name,false));
drop policy if exists gestoria_no_subidas on storage.objects;
create policy gestoria_no_subidas on storage.objects as restrictive for insert to authenticated
 with check (bucket_id<>'archivos' or public.app_archivo_gestoria(name,true));
drop policy if exists gestoria_no_cambios on storage.objects;
create policy gestoria_no_cambios on storage.objects as restrictive for update to authenticated
 using (bucket_id<>'archivos' or public.app_archivo_gestoria(name,true))
 with check (bucket_id<>'archivos' or public.app_archivo_gestoria(name,true));
drop policy if exists gestoria_no_borrados on storage.objects;
create policy gestoria_no_borrados on storage.objects as restrictive for delete to authenticated
 using (bucket_id<>'archivos' or public.app_archivo_gestoria(name,true));

commit;
