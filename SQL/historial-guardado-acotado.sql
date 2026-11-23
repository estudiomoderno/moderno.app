-- Evita que el historial de documentos grandes monopolice el guardado.
-- Conserva una revision por bloque cada cinco minutos y amortiza la retencion:
-- como maximo elimina una revision vencida, sin esperar por filas bloqueadas.
begin;

do $guard$
begin
  if to_regclass('public.datos_estudio') is null
     or to_regclass('public.datos_estudio_hist') is null
     or to_regprocedure('public.datos_estudio_archiva()') is null then
    raise exception 'Falta el historial de datos que debe protegerse';
  end if;
  if not exists (
    select 1
      from pg_trigger t
     where t.tgrelid='public.datos_estudio'::regclass
       and t.tgname='trg_datos_estudio_archiva'
       and not t.tgisinternal
       and t.tgfoid='public.datos_estudio_archiva()'::regprocedure
  ) then
    raise exception 'El trigger de historial no coincide';
  end if;
end
$guard$;

create or replace function public.datos_estudio_archiva()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Una copia completa cada cinco minutos mantiene recuperacion util sin
  -- duplicar varios megabytes en cada pulsacion de guardado.
  if not exists (
    select 1
      from public.datos_estudio_hist h
     where h.estudio_id=old.estudio_id
       and h.bloque=old.bloque
       and h.guardado_en >= statement_timestamp() - interval '5 minutes'
  ) then
    insert into public.datos_estudio_hist
      (estudio_id, bloque, contenido, version_de, actor)
    values
      (old.estudio_id, old.bloque, old.contenido, old.updated_at,
       coalesce(auth.jwt() ->> 'email', 'sistema'));
  end if;

  -- La limpieza deja de ser masiva dentro de la transaccion del usuario.
  -- SKIP LOCKED impide que dos guardados esperen por la misma revision.
  with vencida as (
    select h.id
      from public.datos_estudio_hist h
     where h.estudio_id=old.estudio_id
       and h.guardado_en < statement_timestamp() - interval '30 days'
     order by h.guardado_en, h.id
     for update skip locked
     limit 1
  )
  delete from public.datos_estudio_hist h
   using vencida
   where h.id=vencida.id;

  return new;
end;
$function$;

do $verify$
declare
  source text;
begin
  select lower(p.prosrc) into source
    from pg_proc p
   where p.oid='public.datos_estudio_archiva()'::regprocedure
     and p.prosecdef
     and 'search_path=public'=any(p.proconfig);
  if source is null
     or position('5 minutes' in source)=0
     or position('for update skip locked' in source)=0
     or position('limit 1' in source)=0 then
    raise exception 'No se pudo acotar el historial del guardado';
  end if;
end
$verify$;

commit;
