-- Deshabilitar el servicio sin borrar maestros ni copias privadas.
begin;
revoke execute on function public.biblioteca_marcas_leer(uuid) from authenticated;
revoke execute on function public.biblioteca_marca_guardar(uuid,uuid,integer,uuid,jsonb) from authenticated;
commit;
-- La UI oculta Marcas ante consulta denegada. Mi estudio continúa operativo.
