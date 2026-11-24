# Guardado de estudios grandes — v3.67.72

## Incidencia

El diagnóstico del 23/11/2026 registró dos intentos de guardado delta fallidos, de 4.734.025 bytes cada uno y 12.009 ms, mientras las cinco copias locales terminaron correctamente. Los logs de PostgreSQL confirmaron cancelaciones `57014` por `statement_timeout` en `app_guardar_lote_delta`: el rol autenticado mantenía su límite general de 8 segundos y el bloque `proyectos` creció después hasta unos 9,5 MB de JSON. Un primer margen de 30 segundos también resultó demasiado ajustado: hubo ejecuciones correctas de hasta 25,15 segundos y nuevas cancelaciones al alcanzar ese límite.

Las 69 entradas mostradas por la interfaz son copias locales históricas `_pendiente_` conservadas deliberadamente. No son 69 errores actuales ni 69 operaciones que deban aplicarse. No se eliminan ni se restauran automáticamente.

## Corrección

- `app_guardar_lote(uuid,jsonb)` y `app_guardar_lote_delta(uuid,jsonb)` tienen una excepción propia de 60 segundos, mecanismo recomendado por Supabase para RPC recurrentes que necesitan un margen especial. La interfaz espera hasta 90 segundos y conserva los cambios si el servidor no confirma.
- Los límites generales siguen intactos: `anon` 3 s y `authenticated`/`authenticator` 8 s. No cambian los datos actuales del estudio, RLS, permisos, formato ni atomicidad.
- El historial conserva como máximo una revisión completa por bloque cada cinco minutos. La retención de 30 días deja de borrar un atraso entero dentro de un guardado: elimina como máximo una revisión vencida y usa `SKIP LOCKED` para no esperar por otro guardado.
- Un fallo remoto reintentable muestra **Pendiente de guardar** y el siguiente intento vuelve a **Guardando**. **Necesita revisión** queda reservado para conflictos u otros problemas que requieren intervención.
- El indicador principal ya no suma las copias históricas. El detalle explica que son copias de seguridad de sesiones anteriores y las mantiene disponibles para descarga.

## Verificación

- Prueba aislada en `moderno-pruebas` con rol autenticado: baseline de 3,2 MB más delta de 4,7 MB, resultado superior a 7,9 MB, relectura exacta y `ROLLBACK`. No quedaron datos canary.
- Segundo ensayo aislado del recorrido completo: delta de 4,7 MB sobre un documento ficticio hasta 9,4 MB, incluyendo historial, completado en 871,3 ms y revertido. Dos actualizaciones consecutivas generaron una sola revisión reciente y retiraron exactamente una vencida cada vez.
- El rollback del historial se aplicó en pruebas y después se repuso la versión acotada, verificando ambos sentidos antes de producción.
- Comprobación posterior en producción: ambos RPC contienen `statement_timeout=60s`; los roles conservan sus límites anteriores; los asesores de salud no detectan incidencias nuevas.
- Las pruebas automatizadas cubren el diagnóstico agregado exacto, reintento frente a conflicto, conservación de copias, timeout cliente, permisos y alcance/rollback de la migración.

## Reversión y evolución

La reversión del margen está en `SQL/guardado-grande-timeout.rollback.sql`; la del historial en `SQL/historial-guardado-acotado.rollback.sql`. Ninguna exige restaurar una copia de la base ni borrar copias locales. Revertir el historial recupera también su antigua limpieza masiva, por lo que debe hacerse con cautela.

Este ajuste desbloquea el volumen actual, pero no convierte el documento monolítico en una arquitectura para 1.000 usuarios. La evolución posterior debe separar proyectos —y después listas/partidas— en filas versionadas independientes, con migración compatible y recuperación ensayadas.

## Investigación de escala posterior

La medición completa encontró tres amplificadores que el cambio de timeout no resolvía:

- Nueve imágenes Base64 ocupaban 5.893.002 bytes dentro de `proyectos`; otra imagen histórica estaba en `folderPhotos`. Cada guardado transportaba y reescribía esos binarios.
- Insertar, borrar o reordenar una lista identificada podía enviar todo el tramo restante como un `splice`. El diagnóstico adjunto contiene dos deltas de 4.734.025 bytes.
- El delta reducía el transporte, pero el servidor seguía reconstruyendo el JSONB, reescribiendo el bloque completo y alimentando un historial que ya ocupaba aproximadamente 1,88 GB.

La revisión siguiente prepara `array_sync`, cola durable de archivos con referencias estables e idempotencia por `requestId`. La cola no sube un borrador hasta que su referencia entra en el estado guardable, reutiliza la misma ruta sin sobrescribir ante respuestas perdidas, protege formularios abiertos y reintenta fallos transitorios con backoff ligado a la identidad. En un fixture local de unos 10,5 MB, la reordenación/alta identificada baja a menos de 5 KB. El histórico se prepara para limpieza fuera de la transacción del usuario. El writer v2 final aún debe compilarse y validarse en PostgreSQL 17 aislado antes de cualquier despliegue.

El candidato está diseñado y probado localmente para proteger el estudio frente al mismo patrón de crecimiento. La capacidad de 1.000 usuarios no se certificará hasta validar el writer final en PostgreSQL 17, migrar de un bloque monolítico a filas por proyecto, ejecutar la carga v2 completa y revisar p95, errores, conexiones, locks, WAL, temporales y recuperación.
