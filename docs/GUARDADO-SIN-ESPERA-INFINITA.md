# Guardado atascado tras duplicar varias listas — v3.65.97

## Evidencia y límites

Después de la ampliación local de v3.65.96, el usuario confirma guardado y vuelve a duplicar listas. Informa de «Guardando…», 55 históricos y Reintentar sin efecto. No se conoce la versión de su pestaña ni el fallo subyacente de esa sesión. El JSON previamente revisado contiene ocho listas y no incluye las dos nuevas de su captura. Se solicita una descarga actual antes de otra recarga; no se afirma conservado lo que todavía no se ha revisado.

En el código hay dos esperas sin límite reproducibles: la lectura/envío del lote mantiene `_cloudBusy` para siempre si no responde; una escritura IndexedDB bloqueada mantiene la cola local y Reintentar esperando. Además, el modal mostraba una fotografía del estado inicial y `syncTag('saving')` sustituía el motivo real de una revisión por «Guardando…». Estos defectos no demuestran por sí solos cuál sucedió en el navegador del usuario; 55 cuenta históricos, no errores nuevos.

## Corrección

Cada lectura de `cloudFlush` tiene un plazo de 30 segundos; el envío dispone de 90 segundos para admitir lotes grandes o conexiones lentas; se transmite AbortSignal al SDK cuando está disponible. El vencimiento libera la operación, mantiene cambios/flag pendiente y programa el reintento existente de 15 segundos. Una respuesta tardía no puede actualizar el hash, aplicar datos ni confirmar guardado. El siguiente intento vuelve a leer y fusionar usando el RPC versionado/atómico existente; cancelar HTTP no equivale a garantizar rollback del servidor. No se fuerza una versión ni se evita la detección de conflictos. Estudio y rol se comprueban después de cada respuesta y al gestionar errores.

La conservación ampliada dispone de 20 segundos por intento. Si vence, invalida su permiso para publicar un marcador, informa del problema local y libera la cola. Un intento antiguo que termine después no puede reemplazar la copia más reciente. No se borra una copia actual ni histórica para desbloquearla. Un fallo local no se describe como falta de espacio salvo que sea realmente QuotaExceededError.

Reintentar ofrece respuesta visible y espera el intento local ya iniciado, sin añadir otra copia idéntica a la cola. El modal actualiza título y explicación mientras está abierto; un progreso nuevo no oculta el motivo de una revisión todavía sin resolver. La versión aparece ahí y en la descarga JSON para facilitar el diagnóstico sin pedir al usuario que la busque en Ajustes. No se cambian formatos de negocio, permisos, schema, RPC, contratos de fusión ni datos reales.

## Verificación

Dos regresiones de petición colgada fallan antes del cambio por carecer de plazo. Las pruebas Node comprueban lectura/envío colgados, AbortSignal, liberación del bloqueo, hash no confirmado ante respuesta tardía y reintento; vencimiento local/reintento sin esperar la escritura antigua; detalle de error no sustituido por progreso. Suite completa: 570 casos. PHP pendiente de CI.

Chromium aislado a 1440/390 px, 12 listas de 44 productos, copia de más de 6 MB y 55 históricos: duplicaciones desde el menú real durante un RPC retenido, vencimiento controlado de su plazo, modal actualizado sin cerrarlo, descarga de todas las listas, botón nativo Reintentar, guardado y relectura exactos, rechazo versionado de una respuesta antigua, bloqueo local vencido y reintento antes de completarse la operación antigua. Conserva los históricos. Se utiliza únicamente material ficticio, SDK real desactivado, cliente de memoria y red externa/escrituras reales bloqueadas. Los plazos se disparan con un reloj controlado; no se han medido tiempos ni cuota del navegador real del usuario.

Regresiones adicionales: conservación/arranque >6 MB, duplicación, Actualizar ahora y archivo automático. Resultados finales y publicación se registran en el PR.

## Recuperación y publicación

Continuación de la incidencia cuya corrección autorizó el propietario. No ensayar ni restaurar datos reales. Se mantiene la incidencia separada de respaldos de archivos (workflow 39564598195 fallido); no se afirma una nueva copia de BD/Storage ni su recuperación. No borrar los 55 históricos, limpiar cachés ni importar el JSON completo.

Antes de pasar una pestaña bloqueada a la nueva versión, descargar y comprobar la copia actual que incluya las listas más recientes. El archivo anterior no acredita esas listas. La recuperación selectiva o una restauración productiva requieren revisión y autorización concretas.

Reversión del commit de esta entrega conserva el lector/guardado ampliado de v3.65.96. No retroceder a código anterior incapaz de resolver sus marcadores ni revertir mediante cambios de datos. La corrección acota las esperas y hace visible el fallo; no acredita por sí sola que la nube haya confirmado los datos de una sesión real.

Documentación SDK consultada con search_docs: abortSignal y rpc. Changelog público devolvió 403 en el proxy; no se ha cambiado la versión del SDK ni supuesto una garantía de rollback al abortar.
