# Activación de Google Places — v3.65.128

## Resultado y alcance

Se activa el buscador de direcciones del Sheet Nuevo proyecto cuando el despliegue recibe la clave de navegador de Google. El propietario confirma que habilitó Maps JavaScript API y Places API (New), restringió el sitio a `https://app.moderno.app/*`, restringió las APIs y guardó `GOOGLE_MAPS_BROWSER_KEY` en Actions. La clave se consume únicamente en el despliegue y se publica como configuración de navegador; no se incorpora al repositorio ni se imprime.

**Esta activación no modifica Supabase.** Las direcciones seleccionadas se guardan como `addr`, `city` y `country`, campos ya admitidos por el contrato actual de administradores y colaboradores. Los usuarios revisan y pueden corregir los datos antes de crear el proyecto. No se guardan coordenadas ni `placeId` en la nube mientras `PLACES_LOCATION_READY` no sea exactamente `true`. La variable queda sin activar. La identidad geográfica específica y el mapa siguen pendientes; las direcciones guardadas sí quedan disponibles para ese desarrollo.

Esta entrega sustituye el requisito de activar simultáneamente buscador y referencia descrito inicialmente en `DIRECCIONES-AUTOCOMPLETAR-2026-10-27.md`. El adaptador distingue `available()` (clave válida), `enabled()` (SDK cargado) y `canPersistLocation()` (permiso explícito de persistencia). `createProject()` usa exclusivamente el último para añadir `placeId`.

## Comprobaciones

- 681 pruebas Node, incluidos buscador disponible con referencia desactivada, gate de guardado, edición manual y tokens.
- Chromium 1440/1100/390 con proveedor ficticio: sugerencias, teclado, cancelación, relleno y fallo externo; creación de proyectos sin propiedades no autorizadas. Sin escrituras remotas.
- Ensayo del candidato de referencia con la definición exacta vigente de `app_colaborador_filtrar` en PostgreSQL 17 desechable sin red: 1427 comprobaciones y ROLLBACK. El servidor productivo no admite aún `placeId`; se mantiene así.
- Conservada copia privada local de la función antes del ensayo; ACL vigente `{postgres=X/postgres,service_role=X/postgres}`, SECURITY INVOKER. Storage: ejecución programada 40478700966 del 27/10 correcta; no se afirma haber verificado una copia física actual de toda la BD. No hace falta modificarla para esta activación.
- El despliegue incorpora una comprobación **real de Google antes de subir archivos**: un navegador nuevo recibe una página ficticia con origen app.moderno.app. Intercepta todos los recursos de la app, bloquea otros destinos y solo permite los dominios públicos de Google necesarios. Hace una búsqueda de una dirección pública y selecciona una sugerencia. No abre la app real, no inicia sesión ni conecta con Supabase. No imprime clave, dirección ni URLs. Si falla, se detiene antes del FTPS. La comprobación queda pendiente hasta la ejecución de Actions; no se da por realizada por los tests locales.

## Recuperación

Revertir este PR devuelve la exigencia del gate anterior y desactiva el buscador con la configuración actual. No es necesario restaurar base de datos ni modificar direcciones existentes. No activar `PLACES_LOCATION_READY` para intentar reparar un fallo de Google: necesita un cambio de filtro independiente y sus requisitos de respaldo/autorización.

La configuración de Google, facturación y restricciones fue realizada por el propietario en su consola; desde este entorno no se ha inspeccionado su cuenta ni acreditado cuotas o alertas de gasto.
