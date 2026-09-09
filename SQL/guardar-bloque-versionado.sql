-- CANDIDATO: validar en aislamiento y coordinar transición antes de producción.
-- Las sesiones antiguas recibirán un error de permisos al intentar guardar.
begin;
create or replace function public.guardar_bloque_versionado(
  p_estudio uuid, p_bloque text, p_contenido jsonb, p_base timestamptz
) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare actual timestamptz; nueva timestamptz; existe boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.miembros m where m.user_id=auth.uid() and m.estudio_id=p_estudio
  ) then raise exception 'No autorizado' using errcode='42501'; end if;
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
revoke all on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) from public,anon;
grant execute on function public.guardar_bloque_versionado(uuid,text,jsonb,timestamptz) to authenticated;
-- Mantener SELECT/RLS e historial. El servidor es el único punto de escritura.
revoke insert,update,delete on public.datos_estudio from public,anon,authenticated;
commit;
