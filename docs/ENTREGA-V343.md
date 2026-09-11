# v3.43 — Revisiones aprobadas y cantidades trazables

Estado: candidato validado; publicación pendiente.

Compras y aprobaciones muestra los acabados de la copia sometida a aprobación y su referencia de revisión. El servidor existente ya exige una revisión exacta y conserva su invalidación incluso si la ficha vuelve de A a B y luego a A. La nueva entrega comprueba ese comportamiento sin sustituir las funciones ni migrar datos.

Cantidades en presupuestos permite comparar la cantidad de cada documento con la de origen al importar. Distingue ficha modificada, eliminada, ambigua, línea manual/histórica y otro ámbito. No enlaza por nombre, suma presupuestos alternativos ni reescribe documentos emitidos. Una línea puede tener una cantidad editada propia; se muestra de forma explícita.

Las alternativas y fichas ocultas no pasan directamente a aprobación/pedido. La pantalla explica que hay que elegir explícitamente la ficha principal. No se elimina ninguna alternativa. Los estados manuales no sustituyen la aprobación del servidor.

Se refuerza el control de ámbito tras respuestas asíncronas: un portal cambiado no recibe resultados del enlace anterior y una operación del estudio anterior no se introduce en la vista nueva. Las solicitudes conservan su clave de reintento y el servidor mantiene sus validaciones.

## Evidencia

- 240 pruebas Node, con cantidades originales/documentales independientes, vínculos ambiguos/ausentes y respuestas tardías al cambiar de portal.
- 13 comprobaciones SQL correctas, ROLLBACK en clon: acabado invalida aprobación, A–B–A no la reactiva, nueva solicitud necesita respuesta, cambio de cantidad rechaza respuesta antigua, alternativa no aprobable y pedido anterior conserva su copia, además del recorrido previo.
- UI ficticia: PS-0001 sigue Aceptado con 2 ud originales y se indica que la ficha actual difiere (ahora 2 m y otro acabado). Sin modificar el presupuesto.
- Sin cambios SQL productivos ni migración. Sin test de correo a terceros.

## Reversión

Retirar el informe de trazabilidad si fuera necesario; conservar los controles de ámbito y las validaciones de revisión del servidor. No actualizar snapshots de documentos para hacerlos coincidir con fichas posteriores. El informe es un diagnóstico, no una herramienta de conciliación automática o suma de ventas.
