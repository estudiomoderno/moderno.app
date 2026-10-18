# Casa permanente y rutas superiores — v3.65.54

Solicitud del propietario: mantener la casa en Proyectos aunque no haya pestañas abiertas y mostrar en las demás páginas la ruta a la misma altura que la navegación y el perfil.

En escritorio (desde 1100 px), la barra de Proyectos mantiene su Button outline/icon con HouseIcon y el buscador «+», incluso sin pestañas. La casa sigue abriendo Todos los proyectos. Cerrar la última pestaña solo retira esa pestaña y vuelve al listado; no elimina proyectos ni registros. Las pestañas abiertas siguen en memoria al visitar otros módulos.

Las páginas generales muestran el patrón Card/Breadcrumb original recibido: Inicio / sección, con categorías Finanzas y Productos y servicios cuando corresponda. Etiquetas de la navegación existente, en español, y última sección semibold. Inicio usa el enrutador existente y conserva sus guardas de borradores. Las categorías sin página propia son texto, sin enlaces ni funcionalidades inventadas. En Inicio se muestra solo Inicio con su casa; Proyectos utiliza su barra, sin ruta duplicada.

Se incorporan los originales MIT Breadcrumb y Card del mismo commit público ReUI registrado en `ui/team-profile/vendor/reui/SOURCE.json`, sin modificaciones, y sus secciones Nova. Se conservan Inter 14 px, padding y separaciones del patrón. Alineación por centro con los controles superiores, reserva del ancho del perfil y recorte de rutas largas. CSS y React aislados; sin cambio global de fuentes. Sin dependencias nuevas.

No cambia la base de datos, autenticación, permisos, archivos, persistencia, documentos, presupuestos ni la lógica de negocio. Solo se utiliza la información de navegación ya disponible y sus permisos. Móvil/tablet conserva su navegación actual. Portales, gestoría, sesiones no reconocidas, carga de acceso y editores independientes no reciben la ruta nueva. Ante un error de CSS se muestra una ruta nativa navegable; desactivar la presentación recupera la navegación anterior.

## Comprobación y recuperación

- Suite Node e identidad Git de las primitivas; manifiesto SHA-256 de fuentes y artefactos compilados.
- Chromium aislado con servidor oficial, SDK desactivado, registros ficticios y solicitudes externas/escrituras HTTP bloqueadas: 1440, 1100 y 390 px.
- Casa sin pestañas; cierre de última pestaña sin borrar registros; pestañas, buscador, borradores, teclado, roles/ámbito y recuperación nativa.
- Recorrido de todos los módulos: etiquetas, Inter/tamaño original, mismo centro vertical que el perfil, ancho sin colisiones, retorno a Inicio, desactivación y recuperación por fallo de CSS; sin ruta duplicada en Proyectos ni nueva cabecera móvil.
- Regresión de secciones de proyecto, Ajustes, menús y formularios existentes. PHP se comprueba en Actions sin enviar correo; no está instalado localmente.
- Despliegue habitual y verificación SHA-256 de 28 recursos públicos. El PR registra los resultados efectivos y la publicación completada.

No se certifican dispositivos físicos ni autenticación productiva mediante estas pruebas de presentación. Reversión: revertir el commit y publicar por el proceso habitual; no restaurar datos ni limpiar almacenamiento. Para diagnóstico, `ModernoPageBreadcrumbs.setEnabled(false)` oculta las rutas sin tocar información; `ModernoProjectWorkspace.setEnabled(false)` recupera la cabecera original de proyectos. No se fuerzan recargas de sesiones abiertas.
