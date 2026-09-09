-- Solo para una reversión coordinada y autorizada.
-- Restaura los tres permisos anteriores observados; RLS sigue activo.
-- REINTRODUCE el riesgo de escrituras antiguas sin control de versión.
-- No elimina datos, historial ni la RPC, para no romper sesiones nuevas.
begin;
grant insert,update,delete on public.datos_estudio to anon,authenticated;
commit;
