-- Solo lectura. Ejecutar en el destino confirmado; no cambia permisos ni datos.
-- Los resultados describen la configuración, no certifican todos los flujos.
-- Requiere que las funciones del candidato estén instaladas. No ejecutar este
-- archivo sobre producción sin comprobar antes esas dependencias: las consultas
-- con firmas inexistentes fallan; no es un instalador ni una migración.
select
  (select relrowsecurity from pg_class where oid='public.datos_estudio'::regclass) as rls_datos,
  not has_table_privilege('authenticated','public.datos_estudio','INSERT,UPDATE,DELETE') as escritura_directa_cerrada,
  has_table_privilege('authenticated','public.datos_estudio','SELECT') as lectura_miembros,
  has_function_privilege('authenticated','public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz)','EXECUTE') as guardado_versionado_disponible,
  not has_function_privilege('anon','public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz)','EXECUTE') as guardado_anonimo_cerrado,
  not has_function_privilege('anon','public.portal_cliente_lee_original(text)','EXECUTE') as portal_original_cerrado,
  not has_function_privilege('authenticated','public.portal_cliente_lee_original(text)','EXECUTE') as portal_original_cerrado_miembro,
  has_function_privilege('anon','public.portal_cliente_lee(text)','EXECUTE') as portal_filtrado_disponible,
  exists(select 1 from pg_trigger where tgrelid='public.datos_estudio'::regclass and not tgisinternal) as trigger_datos_presente,
  exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='datos_estudio') as realtime_datos,
  (select not public from storage.buckets where id='archivos') as archivos_privados;

-- Revisar políticas completas; la autorización por estudio no equivale a limitar campos por rol.
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where (schemaname='public' and tablename in ('datos_estudio','miembros','estudios','invitaciones'))
   or (schemaname='storage' and tablename='objects')
order by schemaname,tablename,policyname;
