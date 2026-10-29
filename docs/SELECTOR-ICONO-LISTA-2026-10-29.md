# Botón y resaltado de iconos de lista — v3.65.142

Cambiar icono pasa de summary con flechas a un botón secundario del Sheet. Abre/cierra el selector con aria-expanded y aria-controls; conserva nombre/icono en el borrador hasta Guardar. Cada icono tiene nombre accesible y aria-pressed para indicar la selección. El hover resalta fondo, borde e icono en azul; el seleccionado conserva su marca y el foco de teclado no se pierde al elegirlo. Movimiento reducido desactiva las transiciones de color.

Solo cambia este selector. El selector general de iconos usado en otros formularios sigue intacto. No hay cambios de datos, contratos, permisos, backend ni dependencias.

Validación: 700 pruebas Node y ensayo Chromium aislado a 1440×900, 1100×768, 390×844 y 320×568: botón, apertura/cierre, hover sin modificar el registro, elección con Enter y foco conservado, estado seleccionado, cancelación y guardado, además de los recorridos vigentes del Sheet. Servidor oficial con registros ficticios, solicitudes externas y escrituras HTTP bloqueadas. Capturas de escritorio y móvil revisadas.

La entrega usa el workflow existente. El PR registra CI, despliegue, verificación de los 58 recursos públicos y monitor antes del anuncio. Revertir el commit recupera el control anterior sin restaurar datos.
