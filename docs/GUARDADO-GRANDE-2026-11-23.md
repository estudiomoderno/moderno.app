# Guardado de estudios grandes — v3.67.70

## Incidencia

El diagnóstico del 23/11/2026 registró dos intentos de guardado delta fallidos, de 4.734.025 bytes cada uno y 12.009 ms, mientras las cinco copias locales terminaron correctamente. Los logs de PostgreSQL confirmaron cuatro cancelaciones `57014` por `statement_timeout` en `app_guardar_lote_delta`: el rol autenticado mantenía su límite general de 8 segundos y el bloque `proyectos` del estudio ya ronda los 8 MB de JSON.

Las 69 entradas mostradas por la interfaz son copias locales históricas `_pendiente_` conservadas deliberadamente. No son 69 errores actuales ni 69 operaciones que deban aplicarse. No se eliminan ni se restauran automáticamente.

## Corrección

- `app_guardar_lote(uuid,jsonb)` y `app_guardar_lote_delta(uuid,jsonb)` tienen una excepción propia de 30 segundos, mecanismo recomendado por Supabase para RPC recurrentes que necesitan un margen especial.
- Los límites generales siguen intactos: `anon` 3 s y `authenticated`/`authenticator` 8 s. No cambian datos, RLS, permisos, formato ni atomicidad.
- Un fallo remoto reintentable muestra **Pendiente de guardar** y el siguiente intento vuelve a **Guardando**. **Necesita revisión** queda reservado para conflictos u otros problemas que requieren intervención.
- El indicador principal ya no suma las copias históricas. El detalle explica que son copias de seguridad de sesiones anteriores y las mantiene disponibles para descarga.

## Verificación

- Prueba aislada en `moderno-pruebas` con rol autenticado: baseline de 3,2 MB más delta de 4,7 MB, resultado superior a 7,9 MB, relectura exacta y `ROLLBACK`. No quedaron datos canary.
- Comprobación posterior en producción: ambos RPC contienen `statement_timeout=30s`; los roles conservan sus límites anteriores; los asesores de salud no detectan incidencias nuevas.
- Las pruebas automatizadas cubren el diagnóstico agregado exacto, reintento frente a conflicto, conservación de copias, timeout cliente, permisos y alcance/rollback de la migración.

## Reversión y evolución

La reversión está en `SQL/guardado-grande-timeout.rollback.sql` y solo elimina la excepción de los dos RPC. No se debe restaurar una copia de la base ni borrar copias locales para revertir.

Este ajuste desbloquea el volumen actual, pero no convierte el documento monolítico en una arquitectura para 1.000 usuarios. La evolución posterior debe separar proyectos —y después listas/partidas— en filas versionadas independientes, con migración compatible y recuperación ensayadas.
