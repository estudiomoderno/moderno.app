# Direcciones de proyectos — v3.65.127

Buscador opcional en el Sheet Nuevo proyecto: sugerencias a partir de tres caracteres, espera de 350 ms, navegación por teclado, separación de calle/número/ciudad/provincia/país y entrada manual cuando no hay configuración o falla el servicio. SDK bajo demanda; tokens de sesión por búsqueda, consultas limitadas a 12 s y resultados antiguos descartados. Los textos se renderizan mediante React, nunca como HTML externo.

La referencia `placeId` queda preparada para resolver la posición en el futuro mapa. No se solicita ni persiste una caché permanente de coordenadas de Google. Al modificar cualquier campo de la dirección, se elimina la referencia seleccionada para evitar una ubicación incorrecta. El mapa no forma parte de esta entrega.

## Estado de activación

**Código desplegable, proveedor pendiente.** El propietario confirma que todavía no hay Google Maps Platform ni clave. El archivo versionado `app/places-config.json` deja la integración desactivada; la creación manual conserva el contrato actual. No se han creado servicios facturables, modificado Supabase productivo ni consultado direcciones reales.

En cada despliegue, `scripts/build-places-config.mjs` genera la configuración pública desde el secreto de Actions `GOOGLE_MAPS_BROWSER_KEY` y la variable `PLACES_LOCATION_READY`. Solo ambos permiten activar el componente. La clave de navegador será visible en el cliente: restringir a `https://app.moderno.app/*` y a Maps JavaScript API / Places API (New); establecer cuotas y alertas en el proyecto de Google. No añadir claves a Git ni al chat.

Antes de establecer `PLACES_LOCATION_READY=true`:

1. Configurar Google Maps Platform, facturación y límites con autorización de coste; revisar las condiciones EEA aplicables, el uso de direcciones confirmadas por el usuario y los avisos de privacidad/condiciones de la app.
2. Verificar separadamente los respaldos de BD y Storage. Preparar una copia de `pg_get_functiondef('public.app_colaborador_filtrar(jsonb)'::regprocedure)` para reversión. Obtener autorización concreta para activar el cambio de filtro en producción conforme a AGENTS.md.
3. Aplicar **solo entonces** `SQL/direcciones-place-id.sql`, ya ensayado en una BD desechable. Es una ampliación aditiva del filtro con un único campo `placeId`; no cambia RLS, grants ni datos existentes. Aborta si el contrato vigente no coincide con el esperado. El workflow FTPS no ejecuta SQL.
4. Guardar la clave restringida en el secreto de Actions, activar la variable y ejecutar el despliegue. Su verificación compara también el JSON público generado, sin imprimir la clave. Comprobar una búsqueda real con un entorno/identidad de pruebas aislado antes de anunciar la integración activa.

No se ha podido provisionar Google desde este entorno: no dispone de Google Cloud ni Stripe CLI/Projects autenticados. Este bloqueo no impide preparar y publicar el código desactivado.

## Comprobaciones

- Node: 681 pruebas aprobadas.
- PostgreSQL 17 local, Docker sin red: 1427 comprobaciones, incluidas creación por colaborador, lectura, delta y borrado de referencia; finaliza con ROLLBACK. Contenedor retirado.
- Navegador Chromium con servidor oficial aislado y proveedor ficticio: escritorio 1440/1100 y móvil 390, sugerencias/teclado/relleno, invalidación manual, fallo del proveedor, PR automático, borrador de cliente y fallback nativo. Ninguna escritura remota.
- Prueba real de Google y activación en Supabase: pendientes de configuración, autorización concreta y revisión de respaldos; no se presentan como verificadas.

## Recuperación

Para desactivar búsquedas nuevas, retirar `PLACES_LOCATION_READY` y redesplegar. Los proyectos manuales siguen funcionando. Para revertir el código, revertir el PR; no eliminar identificadores ni direcciones existentes. Si en una activación futura fuera necesario revertir el filtro, restaurar su definición previamente respaldada únicamente después de desactivar el componente y verificar que no queden borradores con referencias pendientes.

Referencias: [Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data), [políticas Places](https://developers.google.com/maps/documentation/places/web-service/policies), [condiciones EEA](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms), [usos permitidos EEA](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses).
