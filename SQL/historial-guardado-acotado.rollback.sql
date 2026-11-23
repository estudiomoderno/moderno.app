-- Restaura literalmente el comportamiento anterior. Puede volver a hacer una
-- limpieza masiva dentro de un guardado; usar solo para revertir la migracion.
begin;

create or replace function public.datos_estudio_archiva()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.datos_estudio_hist
    (estudio_id, bloque, contenido, version_de, actor)
  values
    (old.estudio_id, old.bloque, old.contenido, old.updated_at,
     coalesce(auth.jwt() ->> 'email', 'sistema'));
  delete from public.datos_estudio_hist
   where estudio_id=old.estudio_id
     and guardado_en < now() - interval '30 days';
  return new;
end;
$function$;

commit;
