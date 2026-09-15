# Presupuestos — v3.57.4

- Se corrige saveDoc: conserva el proyecto elegido en el borrador, incluso al quitarlo. Varios presupuestos pueden apuntar al mismo proyecto.
- Filtros de estado con selección/deselección, sin Limpiar filtros; campos alineados y transición de resultados respetando movimiento reducido.
- Convertido en Factura se calcula contra facturas guardadas del mismo espacio/marca, por sourceQuoteRef o por la leyenda histórica exacta Según presupuesto REF. No se deduce por cliente, importe ni proyecto. Abrir una conversión sin guardar no cambia el presupuesto.
- Se usa heart-check.svg facilitado por Javier. No se migran ni borran datos.
- Validación: 335 pruebas correctas, incluyendo guardado de vínculo, desvinculación y detección de factura explícita.
