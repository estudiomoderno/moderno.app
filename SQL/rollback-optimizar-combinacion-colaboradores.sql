-- Restore the previous pure combiner; no records or roles change.
begin;
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
drop function if exists public.app_colaborador_combinar_vista(jsonb,jsonb,jsonb);
drop function public.app_colaborador_indice(jsonb,text,boolean);
notify pgrst,'reload schema';
commit;
