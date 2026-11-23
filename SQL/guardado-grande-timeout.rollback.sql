-- Revierte únicamente la excepción propia de los RPC. El timeout vuelve a
-- heredarse del rol autenticado; no se modifica ningún dato ni permiso.
begin;
alter function public.app_guardar_lote(uuid,jsonb)
  reset statement_timeout;
alter function public.app_guardar_lote_delta(uuid,jsonb)
  reset statement_timeout;
commit;
