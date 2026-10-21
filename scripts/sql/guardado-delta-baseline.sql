-- Reference contracts read from production on 2026-10-21. Definitions only; no real data.
-- Applied ONLY by the disposable, guarded local fixture.
CREATE OR REPLACE FUNCTION public.app_rol(p_estudio uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.app_rol_usuario(p_estudio,auth.uid());
$function$
;
CREATE OR REPLACE FUNCTION public.portal_campos(v jsonb, campos text[])
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
 from jsonb_each(case when jsonb_typeof(v)='object' then v else '{}'::jsonb end)
 where key=any(campos);
$function$
;
CREATE OR REPLACE FUNCTION public.app_colaborador_filtrar(v jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare r jsonb; k text; hijo jsonb;
begin
 if jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.app_colaborador_filtrar(x)),'[]') into r
  from jsonb_array_elements(v) x where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  return r;
 elsif jsonb_typeof(v)='object' then
  r:='{}';
  for k,hijo in select key,value from jsonb_each(v) loop
   if k='important' and jsonb_typeof(hijo)='boolean' then
    r:=r||jsonb_build_object(k,hijo);
   elsif k=any(array['id','name','num','title','brand','client','clientIdx','status','curPhase','tpl','rooms','sections','items','tasks','files','notes','note','desc','description','url','data','type','when','date','due','start','end','color','done','col','who','assignees','assignee','subs','deps','comments','chat','cliChat','cid','txt','ts','fases','updated','off','showTasks','showObra','pid','src','subtasks','text','t','qty','price','unit','sku','supplier','dims','material','plazo','img','libId','cat','rstatus','code','email','phone','fiscal','nif','cp','folder','createdBy','createdByMail','createdAt','addr','city','country','trade','obraF','obraPlanos','obraContactos','phases','account','logos','BRAND','wsOrder','users','role','ibv','onboarded','idPrefix','series','counters','view','month','year','week','events','weekend','showWeekends','homePage','dateFmt','lang','timezone','n','chip','back','soft']) then
    r:=r||jsonb_build_object(k,public.app_colaborador_filtrar(hijo));
   end if;
  end loop;
  return r;
 end if;
 return v;
end $function$
;
CREATE OR REPLACE FUNCTION public.app_config_colaborador(v jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select public.app_colaborador_filtrar(v)||jsonb_build_object(
 'logos',coalesce((select jsonb_object_agg(key,value) from jsonb_each(case when jsonb_typeof(v->'logos')='object' then v->'logos' else '{}'::jsonb end) where jsonb_typeof(value)='string'),'{}'),
 'BRAND',coalesce((select jsonb_object_agg(key,public.portal_campos(value,array['name','front','back','soft','chip','color','ink'])) from jsonb_each(case when jsonb_typeof(v->'BRAND')='object' then v->'BRAND' else '{}'::jsonb end) where jsonb_typeof(value)='object'),'{}'),
 'idPrefix',coalesce((select jsonb_object_agg(key,value) from jsonb_each(case when jsonb_typeof(v->'idPrefix')='object' then v->'idPrefix' else '{}'::jsonb end) where jsonb_typeof(value)='string'),'{}'),
 'series',coalesce((select jsonb_object_agg(key,value) from jsonb_each(case when jsonb_typeof(v->'series')='object' then v->'series' else '{}'::jsonb end) where jsonb_typeof(value)='string'),'{}'));
$function$
;
CREATE OR REPLACE FUNCTION public.app_colaborador_combinar(anterior jsonb, nuevo jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare visible jsonb; resultado jsonb; k text; valor jsonb; previo jsonb; identidad text; llave text;
 visibles_anteriores jsonb; conservado jsonb; indice integer;
begin
 visible:=public.app_colaborador_filtrar(anterior);
 if nuevo=visible then return anterior; end if;
 if nuevo is distinct from public.app_colaborador_filtrar(nuevo) then
  raise exception 'El cambio contiene campos no autorizados' using errcode='42501';
 end if;
 if anterior is null or anterior=visible then return nuevo; end if;
 if jsonb_typeof(anterior)<>jsonb_typeof(nuevo) then
  raise exception 'No se puede reemplazar contenido protegido' using errcode='42501';
 end if;
 if jsonb_typeof(anterior)='object' then
  resultado:=anterior;
  for k in select key from jsonb_each(visible) loop
   if not nuevo ? k then
    if anterior->k is distinct from visible->k then raise exception 'No se puede eliminar contenido protegido' using errcode='42501'; end if;
    resultado:=resultado-k;
   end if;
  end loop;
  for k,valor in select key,value from jsonb_each(nuevo) loop
   resultado:=jsonb_set(resultado,array[k],public.app_colaborador_combinar(anterior->k,valor),true);
  end loop;
  return resultado;
 elsif jsonb_typeof(anterior)='array' then
  resultado:='[]';
  select coalesce(jsonb_agg(x),'[]') into visibles_anteriores from jsonb_array_elements(anterior) x
   where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  for previo in select value from jsonb_array_elements(anterior) loop
   if jsonb_typeof(previo)='object' and (previo ? 'docRef' or previo ? 'docKind') then
    -- No aceptar una fila visible que suplante un documento oculto.
    if exists(select 1 from jsonb_array_elements(nuevo) x where
     (previo ? 'id' and x->'id'=previo->'id') or (previo ? 'name' and x->'name'=previo->'name')) then
     raise exception 'Identidad de fila reservada' using errcode='42501';
    end if;
    continue;
   end if;
   if public.app_colaborador_filtrar(previo) is distinct from previo then
    llave:=case when previo ? 'id' then 'id' when previo ? 'name' then 'name' else null end;
    if llave is null then raise exception 'Un administrador debe modificar esta lista protegida sin identificadores' using errcode='42501'; end if;
    if (select count(*) from jsonb_array_elements(nuevo) x where x->llave=previo->llave)<>1 then
     raise exception 'No se puede eliminar o renombrar una fila con contenido protegido' using errcode='42501';
    end if;
   end if;
  end loop;
  for valor in select value from jsonb_array_elements(nuevo) loop
   llave:=case when valor ? 'id' then 'id' when valor ? 'name' then 'name' else null end;
   previo:=null;
   if llave is not null then
    if (select count(*) from jsonb_array_elements(visibles_anteriores) x where x->llave=valor->llave)>1
      or (select count(*) from jsonb_array_elements(nuevo) x where x->llave=valor->llave)>1 then
     raise exception 'Identidad de fila ambigua; conservar cambios' using errcode='42501';
    end if;
    select x into previo from jsonb_array_elements(visibles_anteriores) x where x->llave=valor->llave;
   end if;
   resultado:=resultado||jsonb_build_array(public.app_colaborador_combinar(previo,valor));
  end loop;
  -- Intercalar las filas ocultas intactas, manteniendo su orden. Los huecos
  -- visibles toman el orden solicitado; las altas restantes van al final.
  conservado:='[]';indice:=0;
  for previo in select value from jsonb_array_elements(anterior) loop
   if jsonb_typeof(previo)='object' and (previo ? 'docRef' or previo ? 'docKind') then
    conservado:=conservado||jsonb_build_array(previo);
   elsif indice<jsonb_array_length(resultado) then
    conservado:=conservado||jsonb_build_array(resultado->indice);indice:=indice+1;
   end if;
  end loop;
  while indice<jsonb_array_length(resultado) loop
   conservado:=conservado||jsonb_build_array(resultado->indice);indice:=indice+1;
  end loop;
  return conservado;
 end if;
 raise exception 'Cambio no autorizado' using errcode='42501';
end $function$
;
CREATE OR REPLACE FUNCTION public.app_leer_bloques(p_estudio uuid, p_bloques text[] DEFAULT NULL::text[])
 RETURNS TABLE(bloque text, contenido jsonb, updated_at timestamp with time zone, rol text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare acceso text;
begin
 acceso:=public.app_rol(p_estudio);
 if acceso not in ('admin','colaborador') then raise exception 'No autorizado' using errcode='42501'; end if;
 return query select d.bloque,case when acceso='admin' then d.contenido
  when d.bloque in ('facturas','presupuestos') then '{}'::jsonb
  when d.bloque='config' then public.app_config_colaborador(d.contenido)
  else public.app_colaborador_filtrar(d.contenido) end,d.updated_at,acceso
 from public.datos_estudio d where d.estudio_id=p_estudio and (p_bloques is null or d.bloque=any(p_bloques));
end $function$
;
CREATE OR REPLACE FUNCTION public.guardar_bloque_versionado_base(p_estudio uuid, p_bloque text, p_contenido jsonb, p_base timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.guardar_bloque_versionado(p_estudio uuid, p_bloque text, p_contenido jsonb, p_base timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rol text; anterior jsonb; version_actual timestamptz; combinado jsonb;
begin
 rol:=public.app_rol(p_estudio);
 if rol='admin' then return public.guardar_bloque_versionado_base(p_estudio,p_bloque,p_contenido,p_base); end if;
 if rol<>'colaborador' or p_bloque not in ('proyectos','compras','contactos','fases','agenda') then
  raise exception 'No puedes modificar este bloque' using errcode='42501';
 end if;
 select contenido,updated_at into anterior,version_actual from public.datos_estudio
 where estudio_id=p_estudio and bloque=p_bloque for update;
 if version_actual is distinct from p_base then raise exception 'La version ha cambiado' using errcode='PT409'; end if;
 combinado:=public.app_colaborador_combinar(anterior,p_contenido);
 return public.guardar_bloque_versionado_base(p_estudio,p_bloque,combinado,p_base);
end $function$
;
CREATE OR REPLACE FUNCTION public.app_guardar_lote(p_estudio uuid, p_cambios jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cambio jsonb; resultado jsonb:='[]'; guardado jsonb;
begin
 if public.app_rol(p_estudio) not in ('admin','colaborador') then raise exception 'No autorizado' using errcode='42501'; end if;
 if jsonb_typeof(p_cambios) is distinct from 'array' or jsonb_array_length(p_cambios) not between 1 and 9 then raise exception 'Lote no valido'; end if;
 if exists(select 1 from jsonb_array_elements(p_cambios) c where not(c ? 'contenido') or c->>'bloque' is null or c->>'bloque' not in ('proyectos','compras','presupuestos','facturas','contactos','contratistas','fases','agenda','config'))
 or (select count(distinct c->>'bloque') from jsonb_array_elements(p_cambios) c)<>jsonb_array_length(p_cambios) then raise exception 'Bloques no validos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_estudio::text,331));
 -- Orden estable para evitar bloqueos cruzados. Cualquier error revierte TODO.
 for cambio in select value from jsonb_array_elements(p_cambios) order by value->>'bloque' loop
  guardado:=public.guardar_bloque_versionado(p_estudio,cambio->>'bloque',cambio->'contenido',(cambio->>'base')::timestamptz);
  resultado:=resultado||jsonb_build_array(jsonb_build_object('bloque',cambio->>'bloque','updated_at',guardado->>'updated_at'));
 end loop;
 return resultado;
end $function$
;

