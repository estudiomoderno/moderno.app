-- CANDIDATO EN DESARROLLO. Depende de permisos-roles.sql. No publicar aisladamente.
begin;
create or replace function public.app_colaborador_filtrar(v jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare r jsonb; k text; hijo jsonb;
begin
 if jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.app_colaborador_filtrar(x)),'[]') into r
  from jsonb_array_elements(v) x where not (jsonb_typeof(x)='object' and (x ? 'docRef' or x ? 'docKind'));
  return r;
 elsif jsonb_typeof(v)='object' then
  r:='{}';
  for k,hijo in select key,value from jsonb_each(v) loop
   if k=any(array['id','name','num','title','brand','client','clientIdx','status','curPhase','tpl','rooms','sections','items','tasks','files','notes','note','desc','description','url','data','type','when','date','due','start','end','color','done','col','who','assignees','assignee','subs','deps','comments','chat','cliChat','cid','txt','ts','fases','updated','off','showTasks','showObra','pid','src','subtasks','text','t','qty','price','unit','sku','supplier','dims','material','plazo','img','libId','cat','rstatus','code','email','phone','fiscal','addr','city','country','trade','obraF','obraPlanos','obraContactos','phases','account','logos','BRAND','wsOrder','users','role','ibv','onboarded','idPrefix','series','counters','view','month','year','week','events','weekend','showWeekends','homePage','dateFmt','lang','timezone','n','chip','back','soft']) then
    r:=r||jsonb_build_object(k,public.app_colaborador_filtrar(hijo));
   end if;
  end loop;
  return r;
 end if;
 return v;
end $$;
revoke all on function public.app_colaborador_filtrar(jsonb) from public,anon,authenticated;

-- Los nombres de marcas son claves dinámicas; no tratarlos como campos del
-- modelo. Solo pasan los valores previstos para logotipos y colores.
create or replace function public.app_config_colaborador(v jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select public.app_colaborador_filtrar(v)||jsonb_build_object(
 'logos',coalesce((select jsonb_object_agg(key,value) from jsonb_each(case when jsonb_typeof(v->'logos')='object' then v->'logos' else '{}'::jsonb end) where jsonb_typeof(value)='string'),'{}'),
 'BRAND',coalesce((select jsonb_object_agg(key,public.portal_campos(value,array['name','front','back','soft','chip','color','ink'])) from jsonb_each(case when jsonb_typeof(v->'BRAND')='object' then v->'BRAND' else '{}'::jsonb end) where jsonb_typeof(value)='object'),'{}'),
 'idPrefix',coalesce((select jsonb_object_agg(key,value) from jsonb_each(case when jsonb_typeof(v->'idPrefix')='object' then v->'idPrefix' else '{}'::jsonb end) where jsonb_typeof(value)='string'),'{}'),
 'series',coalesce((select jsonb_object_agg(key,value) from jsonb_each(case when jsonb_typeof(v->'series')='object' then v->'series' else '{}'::jsonb end) where jsonb_typeof(value)='string'),'{}'));
$$;
revoke all on function public.app_config_colaborador(jsonb) from public,anon,authenticated;

create or replace function public.app_leer_bloques(p_estudio uuid,p_bloques text[] default null)
returns table(bloque text,contenido jsonb,updated_at timestamptz,rol text)
language plpgsql stable security definer set search_path='' as $$
declare acceso text;
begin
 acceso:=public.app_rol(p_estudio);
 if acceso not in ('admin','colaborador') then raise exception 'No autorizado' using errcode='42501'; end if;
 return query select d.bloque,case when acceso='admin' then d.contenido
  when d.bloque in ('facturas','presupuestos') then '{}'::jsonb
  when d.bloque='config' then public.app_config_colaborador(d.contenido)
  else public.app_colaborador_filtrar(d.contenido) end,d.updated_at,acceso
 from public.datos_estudio d where d.estudio_id=p_estudio and (p_bloques is null or d.bloque=any(p_bloques));
end $$;
revoke all on function public.app_leer_bloques(uuid,text[]) from public,anon;
grant execute on function public.app_leer_bloques(uuid,text[]) to authenticated;

-- Combina únicamente campos visibles. Las propiedades privadas siguen en el
-- servidor. En arrays con datos privados exige una identidad estable; si no
-- puede demostrarla, rechaza el cambio en lugar de asociar costes a otra fila.
create or replace function public.app_colaborador_combinar(anterior jsonb,nuevo jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
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
end $$;
revoke all on function public.app_colaborador_combinar(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.guardar_bloque_versionado(p_estudio uuid,p_bloque text,p_contenido jsonb,p_base timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
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
end $$;
revoke all on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) from public,anon;
grant execute on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) to authenticated;

drop policy if exists solo_admin_datos_crudos on public.datos_estudio;
create policy solo_admin_datos_crudos on public.datos_estudio as restrictive for select to authenticated
 using (public.app_rol(estudio_id)='admin');
drop policy if exists solo_admin_historial_crudo on public.datos_estudio_hist;
create policy solo_admin_historial_crudo on public.datos_estudio_hist as restrictive for select to authenticated
 using (public.app_rol(estudio_id)='admin');
commit;
