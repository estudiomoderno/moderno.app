# v3.44 — Ofertas comparables y logística con historial

Estado: función instalada en clon y producción con conservación verificada; interfaz pendiente de publicación.

Comparar ofertas agrupa solo mismas identidades tipadas de ficha, revisión, unidad y cantidad. Muestra proveedor, referencia, importe sin impuestos y notas de la oferta. Cantidades/revisiones distintas permanecen separadas. No elige proveedor ni crea pedidos automáticamente; Preparar pedido usa la acción existente y rechaza duplicar una solicitud que ya tenga pedido activo.

Entrega e incidencias permite registrar fecha prevista, abrir incidencia (retraso, daño, faltante u otra) y resolverla conservando el detalle original y la solución. El servidor exige administrador, pedido confirmado, versión actual y detalle de 5–2000 caracteres. Fecha válida, reintentos idempotentes, historial de cambios. No cambia líneas, recepción, instalación, pagos, abonos o documentos contables. Las recepciones parciales, instalación/retirada y vínculo contable existentes se reutilizan.

## Evidencia

- 243 pruebas Node: comparación homogénea, separación de cantidades/revisiones/tipos de ID, exclusión de cancelados y lectura sin mutación, más las regresiones previas.
- 16 pruebas SQL en clon con ROLLBACK: fecha, fecha imposible, versión obsoleta, reintento, incidencia y resolución, dinero/recepción conservados y reinstalación de función v3.43 manteniendo la incidencia.
- Instalación conservadora tanto en clon como producción: datos_intactos, pedidos_intactos, historial_intacto y archivos_intactos, los cuatro true. La comparación de archivos es de inventario; el paquete no realiza operaciones de Storage.
- UI ficticia: pedido C1C1F851 mantiene 1 ud recibida e instalada y 72,60 EUR; fecha 15/09/2026, incidencia de embalaje abierta y resuelta, ambas descripciones conservadas. Comparador muestra OF-ENSAYO-337 con 1 ud / 60 EUR sin impuestos. No hay escritura ficticia productiva.
- Copia programada comprobada saludable: 11/09/2026 02:32:53Z, Actions 34555039416. Esta comprobación no equivale a una restauración nueva de todos los archivos posteriores a esa copia.

## Reversión

La instalación no reescribe registros existentes ni añade tablas. Los campos de logística solo se crean al registrar la operación. Retirar su interfaz o reinstalar la función previa conserva el contenido de incidencias y su historial, tal como se ensayó. No borrar esos campos ni restaurar una base antigua sobre datos nuevos.

Las fechas representan previsiones registradas por el equipo, no confirmaciones automáticas del proveedor. Una incidencia resuelta no implica un abono, pago, sustitución ni recepción. Esas operaciones requieren su registro separado.
