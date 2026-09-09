-- Suspensión segura de acceso por enlaces ante una incidencia.
-- No borra ni cambia proyectos, archivos, usuarios o historial.
-- No restaura las funciones originales sin filtro ni vuelve público Storage.
-- Recuperar el servicio aplicando de nuevo portales-filtrados.sql verificado.
begin;
revoke execute on function public.portal_cliente_lee(text),public.portal_obra_lee(text),public.portal_cliente_escribe(text,text,text,text) from public,anon,authenticated;
commit;
