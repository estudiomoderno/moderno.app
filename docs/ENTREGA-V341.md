# v3.41 — Ficha propia y actualización explícita de biblioteca

Estado: publicada. Commit 3d7fba3ee1f8957d97681d74530d0f5251f72bfd; Actions 34614673718 correcto. index.html y spec-master.js verificados HTTP 200 e idénticos normalizando finales de línea.

El editor identifica una ficha independiente o su origen único en biblioteca. La revisión del maestro muestra diferencias y permite marcar campos concretos; ninguno se marca por defecto. Aplicar modifica el formulario, y Guardar conserva la ficha mediante el guardado versionado existente. Un cambio posterior del maestro o del formulario exige revisar de nuevo. Cerrar el editor o perder el rol administrador impide aplicar. No se sustituyen cantidades, foto, archivos, notas, identidad, documentos ni decisiones históricas. Si se seleccionan importes se pasa a margen libre, para no recalcular otro importe no seleccionado.

Referencia/variante, material/acabado y dimensiones a medida reutilizan SKU, material y dimensiones existentes. No se introduce un catálogo paralelo de variantes. Unidades disponibles: ud, m², m, m³, l, kg y h; se conservan unidades antiguas distintas al abrir el editor. La biblioteca, la ficha y las salidas muestran la unidad guardada.

La etiqueta manual se explica como selección/seguimiento; aprobación por revisión y estado real de pedido siguen en Compras y aprobaciones. Esta entrega no convierte una etiqueta Aprobado/Comprado en una aprobación o transacción. Las copias de presupuestos/pedidos conservadas no se regeneran.

Se corrige un defecto previo del botón Añadir a mi biblioteca: un atributo onclick truncado impedía ejecutar la acción. El manejador separado conserva copia profunda de adjuntos y enlaza la ficha al maestro creado; solo administrador.

## Evidencia

- 230 pruebas Node: aplicación selectiva, cambios concurrentes de maestro/formulario, editor cerrado, rol perdido, copia independiente y conservación de importes desconocidos/cero, además de regresiones existentes.
- Clon recuperado szbswxpkhidywaosdfcg, cuenta ficticia recorrido-v337-20260911: maestro creado a 170 EUR/m; ficha guardada a 190; comparación selecciona solo precio y vuelve a 170. Tras recargar conserva vínculo, 2 m y coste 60. Estado Guardado en nube comprobado. Sin escritura de prueba productiva.
- Sin esquema ni nuevos campos persistentes: usa las estructuras y el guardado protegido existentes. Los controles de concurrencia y los snapshots se mantienen.

## Reversión y límites

Retirar el acceso de actualización explícita si fuera necesario; mantener el botón de biblioteca corregido y la conservación de unidades. No restaurar datos antiguos sobre nuevas ediciones. Las pestañas anteriores no se fuerzan a recargar. Los cambios de campos siguen requiriendo la aprobación vigente del servidor para realizar operaciones que la exijan.

La comparación es contra el maestro actual, no una base histórica para resolver automáticamente conflictos a tres bandas. El usuario elige explícitamente qué sustituir. No se afirma validación por el equipo piloto ni recepción real de invitaciones.
