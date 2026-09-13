# Publicación de identidad v3.54.0

Autorización directa de publicación trasladada por Cerebro el 13 septiembre 2026. Base de producción: `85f6989` (v3.53.1). Rama candidata `taller-tareas-identidad-local`. Se excluye toda la rama de suscripciones, Panelcontrol y trabajo ajeno a identidad.

## Contenido

Menú negro, control circular alineado con separador discontinuo, logotipo abierto/isotipo cerrado, selector real de estudio encima de Inicio. Se reutiliza el componente SettingsUI para preservar confirmación de formularios y permisos; se corrigió una duplicación detectada al probar la app completa. Encabezado móvil usa isotipo SVG con Acorn cargada. Títulos Acorn600; marca700. Tareas Board/Lista, contador de pendientes propias para hoy, búsqueda y marca Importante.

## Comprobaciones previas

- 318 pruebas JS correctas sobre el candidato final.
- Ensayo completo en `http://127.0.0.1:3197` contra clon `szbswxpkhidywaosdfcg`, identidad ficticia: tarea nueva, guardar Importante=true, recargar, comprobar marcado; guardar false, recargar y comprobar desmarcado. Confirmación Guardado en nube en ambos guardados.
- Revisión 390×844: Board, Lista con desplazamiento de tabla, apertura/cierre del menú y logo móvil corregido. Escritorio: marca, selector, menú expandido/contraído, título Acorn600.
- Base PostgreSQL local: 8 comprobaciones de conservación de importes y archivos privados al combinar cambios de colaborador y reabrir la base.
- Filtro actualizado primero en clon y después en producción. Se modificó dinámicamente solo la rama `important` de `app_colaborador_filtrar`, exigiendo un único marcador esperado y conservando el resto de la definición instalada. Pruebas SQL true/false y hash agregado antes/después de datos_estudio devolvieron true/true. Sin UPDATE/DELETE sobre datos del estudio, miembros o Storage; sin cambio de grants.
- Copia programada correcta del 13/09 02:31:49 UTC, Actions34733275828. No se restauró ni reintentó ninguna copia.
- Se conserva prepareAppReload: la actualización requiere guardar los cambios pendientes; no se fuerza recarga de sesiones abiertas.

## Ejecución y vuelta atrás

Publicar mediante push no forzado del candidato a main y workflow deploy-app.yml, que publica assets antes del HTML y ejecuta además pruebas PHP de invitaciones. Confirmar final success y hashes HTTP de HTML/CSS/JS/fuentes. Registrar resultado al finalizar.

Si aparece una regresión visual, preparar una reversión de los cambios de app frente a `85f6989`, con número de versión nuevo y comprobaciones, y desplegar por el mismo flujo. Mantener el filtro booleano aditivo: no hace falta borrar importancia ni restaurar bases. Nunca restaurar copias sobre producción para revertir solo la imagen.

El rediseño de las otras pantallas queda para después, por decisión del usuario. Billing permanece sin publicación.

## Resultado verificado

Publicación completada: commit `774e5850a19d20e72a12b3b0e5e183ec6398873a`, workflow https://github.com/estudiomoderno/moderno.app/actions/runs/34775909174, estado completed/success. Pruebas JS y PHP, publicación de recursos y HTML: success.

HTTP público 200 y coincidencia SHA256 con candidato (normalizando CRLF en texto) para index.html, brand/tasks-identity.css, settings-ui.js, brand/Logotipo.svg, brand/Isotipo.svg, brand/acorn/acorn-3.ttf y brand/acorn/acorn-8.ttf. HTML anuncia `v3.54.0`. Fuentes comparadas byte por byte, sin normalización. No se hizo login ni edición con un usuario real de producción durante la comprobación; recorrido funcional realizado con identidad ficticia en clon.
