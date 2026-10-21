-- First deploy the previous HTML; old tabs automatically fall back only when an RPC is absent.
begin;
drop function if exists public.app_guardar_lote_delta(uuid,jsonb);
drop function if exists public.app_leer_versiones(uuid,text[]);
drop function if exists public.app_aplicar_delta(jsonb,jsonb);
commit;
