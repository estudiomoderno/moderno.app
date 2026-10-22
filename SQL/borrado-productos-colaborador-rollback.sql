begin;
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
 combinado:=public.app_colaborador_combinar(anterior,case when p_bloque in ('proyectos','compras') then public.app_colaborador_preparar_lista(p_contenido) else p_contenido end);
 return public.guardar_bloque_versionado_base(p_estudio,p_bloque,combinado,p_base);
end $function$
;
drop function public.app_colaborador_borrados_productos(jsonb,jsonb,text);
notify pgrst,'reload schema';
commit;
