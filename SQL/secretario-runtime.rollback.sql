-- Reversión no destructiva de la cuota del Secretario.
-- Bloquea nuevas reservas y conserva los contadores para diagnóstico y
-- retención. La interfaz y SECRETARY_ENABLED deben desactivarse también.
begin;

do $rollback$
begin
  if to_regprocedure('public.secretary_request_reserve(uuid)') is not null then
    revoke execute on function public.secretary_request_reserve(uuid) from authenticated;
  end if;
end $rollback$;

commit;
