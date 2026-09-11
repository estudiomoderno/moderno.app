# v3.42 — Láminas de estancia con revisiones

Estado: candidato validado; publicación pendiente.

Dos plantillas: Visual y Fichas técnicas. Destinos Cliente, Diseño y Obra para preparar la salida; elegir destino no crea accesos ni envía archivos. Obra excluye precios incluso si se habían marcado antes. Todas las salidas excluyen costes, márgenes, notas internas, proveedor y adjuntos. Las alternativas y fichas ocultas no entran en esta lámina.

Conservar revisión añade una copia por valor de los campos públicos de las fichas, con ID y fecha, en rooms[].boardRevisions del proyecto. No se reescriben revisiones anteriores. La exportación usa la revisión mostrada, no las fichas actuales. Cambiar plantilla/destino produce una nueva vista actual y se avisa. Las imágenes mantienen su referencia privada; no se publican ni se duplican sus bytes. Si no se pueden cargar, el exportador existente detiene el PDF incompleto.

Solo el administrador conserva y consulta el historial en la app. Un colaborador puede preparar la vista actual con los datos que ya puede ver; las revisiones guardadas permanecen fuera de su proyección y se preservan al combinar sus cambios. El administrador puede descargar la salida preparada para cliente/diseño/obra. No se ha añadido un nuevo portal ni otorgado permisos de acceso remoto al historial.

## Validación

- 236 pruebas Node: allowlist de campos, obra sin precio, independencia después de edición/eliminación, serialización/recuperación, anexado concurrente y PDF basado en la vista conservada, con bloqueo si cambia la identidad.
- 11 comprobaciones SQL correctas en clon recuperado, con ROLLBACK: recorrido de compras previo más guardado versionado del nuevo campo, ocultación al colaborador, conservación tras edición y rechazo de inyección de revisiones.
- UI ficticia: revisión 8d426ca8-6b92-49bd-9cff-7429782afcde a las 15:17:03Z, plantilla fichas, 2 m / 340 EUR / Metal. Tras cambiar la ficha a Metal satinado y recargar, el historial sigue mostrando Metal. Guardado en nube confirmado. Presentación revisada en pantalla.
- No migración SQL ni escrituras de prueba en producción. No se afirma descarga/impresión física en un dispositivo del piloto; el ensamblado y la selección de contenido del PDF están probados automáticamente. Se reutiliza printAs y sus controles de imágenes.

## Conservación y reversión

El nuevo campo viaja dentro del proyecto, su guardado versionado y sus copias. Los clientes anteriores que conservan el objeto completo mantienen el campo; los conflictos del guardado no se resuelven borrando versiones. Primera adición concurrente a una propiedad ausente puede requerir resolver un conflicto, en lugar de perder una revisión.

Retirar el botón/lector si fuera necesario, conservando boardRevisions. No restaurar un proyecto antiguo sobre nuevas escrituras. El historial no es un archivo legal inmutable: el administrador conserva capacidad de editar datos; la interfaz de esta entrega no ofrece sustitución ni borrado de revisiones. No garantiza disponer de una imagen si su archivo original se elimina posteriormente.
