-- Reversion segura, fase servidor. Aplicar solo despues de que los clientes
-- nuevos hayan vuelto a crear operaciones por la ruta anterior.
-- Los requestId ya enviados siguen pudiendo consultar su recibo sin repetir.
begin;
do $guard$
begin
  if to_regclass('app_private.save_protocol_settings') is null
     or to_regprocedure('public.app_guardar_lote_v2(uuid,jsonb)') is null
     or to_regprocedure('public.app_confirmar_guardado_v2(uuid,uuid)') is null then
    raise exception 'El guardado v2 no esta instalado';
  end if;
end
$guard$;
update app_private.save_protocol_settings
set accept_new=false,updated_at=clock_timestamp()
where protocol=2;
commit;
