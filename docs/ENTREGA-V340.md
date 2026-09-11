# v3.40 — Identidad y diagnóstico sin fusión

Estado: publicada y verificada. Commit d2c1efe3fddbf7468aedde3fc0ead6c58f69c3e4; Actions 34613450326 completado correctamente. index.html, specifications.js y spec-audit.js responden HTTP 200 y coinciden con el código local normalizando finales de línea.

«Revisar referencias» en el proyecto ofrece al administrador un diagnóstico de identificadores ausentes/repetidos y referencias no resolubles. Indica si cada ficha es independiente, procede de biblioteca o tiene origen ausente/ambiguo. La consulta no modifica datos, fusiona homónimos ni asigna un maestro por nombre.

Se elimina la reasignación automática de identificadores repetidos al preparar una edición. Si existe ambigüedad, se detiene la operación de reorganizar o vincular antes de cambiar IDs/referencias y se explica el motivo. Los IDs únicos existentes se conservan; solo los ausentes se preparan como antes cuando la correspondencia es inequívoca. Los vínculos legacy por posición se fijan antes de mover elementos y siguen sin recurrir a un vecino cuando desaparece la ficha original.

No se migra todo el estudio ni se cambia la separación vigente entre biblioteca privada, catálogo de partidas y ficha del proyecto. Maestro y especificación conservan identidades diferentes. Los IDs de tipos distintos no se normalizan ni mezclan por su representación textual.

## Validación y límites

224 pruebas Node correctas, incluidos diagnóstico sin efectos, duplicados sin renumerar, procedencia ambigua, reordenación, eliminación, independencia de archivos/cantidades y referencias legacy. Interfaz del clon: informe del proyecto ficticio con una ficha independiente y ninguna observación; estado guardado en nube. Los casos ambiguos se prueban con fixtures automatizados, no con datos del piloto.

No hay cambio de esquema, campos persistidos nuevos ni migración productiva. El guardado versionado y las proyecciones de roles permanecen vigentes. Las pestañas antiguas conservan su código hasta recargar voluntariamente; esta entrega no fuerza una transición ni certifica su actualización instantánea.

Reversión: retirar el acceso de diagnóstico si fuese necesario. No reintroducir la renumeración implícita sobre IDs repetidos; mantener el bloqueo de ambigüedad. Un caso real duplicado exige revisión de su origen y referencias antes de cualquier reparación específica. No borrar documentos o archivos para resolver el aviso.
