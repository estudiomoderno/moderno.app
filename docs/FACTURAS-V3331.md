# Facturas y cobros — v3.33.1

- Filas uniformes con Documento, Cobros, Editar y Más; las opciones de proyecto y eliminación quedan en Más. Documento abre el PDF generado o el adjunto original; si falta, permite adjuntarlo.
- Eliminada la etiqueta Solo en Contabilidad. Importes sin salto de línea; tabla con cabeceras y desplazamiento horizontal en pantallas estrechas.
- Cobros dispone de tres bloques de resumen y más espacio para el formulario.
- Una entrada marcada `cobr` conserva pendiente cero aunque carezca de desglose. La ventana explica la diferencia; abrirla no modifica la entrada ni inventa pagos. Al añadir o eliminar movimientos, el recálculo utiliza los importes reales, incluida la retención.
- Sin migraciones ni escrituras de datos de producción. Validación: 155 pruebas y revisión visual local con facturas ficticias pagada y parcial.
- Reversión: revertir el commit de esta versión y desplegar; no requiere restaurar datos.
