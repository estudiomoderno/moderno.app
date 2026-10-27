-- CANDIDATO, NO APLICADO EN PRODUCCIÓN. Activar solo tras respaldo, ensayo y
-- autorización concreta. No cambia datos, políticas RLS ni permisos SQL.
-- El identificador de Google se guarda para resolver la ubicación del mapa.
do $migration$
declare definition text;patched text;
begin
 definition:=pg_get_functiondef('public.app_colaborador_filtrar(jsonb)'::regprocedure);
 if position('''placeId''' in definition)>0 then return; end if;
 if (length(definition)-length(replace(definition,'''country''','')))/length('''country''')<>1 then
  raise exception 'Contrato de filtrado inesperado; revisar antes de activar';
 end if;
 patched:=replace(definition,'''country''','''country'',''placeId''');
 execute patched;
 if public.app_colaborador_filtrar('{"placeId":"fictitious-place","fee":123}'::jsonb) <> '{"placeId":"fictitious-place"}'::jsonb then
  raise exception 'Falló el ensayo de campos de ubicación';
 end if;
end $migration$;
