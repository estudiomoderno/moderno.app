# Acreditación del guardado con 1.000 usuarios ficticios

## Qué acredita y qué no

Este arnés mide la ruta real `Auth → PostgREST → app_guardar_lote_v2 → PostgreSQL` en un proyecto Supabase **aislado**. El conjunto fijo contiene 1.000 identidades, 250 estudios y cuatro miembros por estudio. Ninguna prueba usa datos, usuarios ni claves de producción.

Un `smoke` correcto solo acredita que el arnés funciona. La capacidad para 1.000 cuentas requiere completar, en orden, `replay`, `noop`, `array-sync`, `limits`, `target`, `margin`, `concurrent-1000`, `large`, `reconnect`, `contention` y `soak`, conservar los resultados y revisar también CPU, memoria, conexiones, IOPS y recuperación en el panel de Supabase. Sin esa evidencia no debe anunciarse que la aplicación soporta 1.000 usuarios.

El entorno de acreditación debe tener la misma región, versión de PostgreSQL, tamaño de cómputo, esquema, RLS, triggers, funciones y configuración del pool que producción. Si difiere, el resultado solo acredita funcionalidad.

## Barreras de seguridad

La ejecución es exclusivamente manual desde [load-save-staging.yml](../.github/workflows/load-save-staging.yml) y usa el entorno protegido de GitHub `moderno-pruebas-load`.

Antes de habilitarlo hay que configurar en ese entorno:

- variable `LOAD_ALLOWED_PROJECT_REF`: referencia exacta de 20 caracteres de `moderno-pruebas`;
- variable `LOAD_K6_IMAGE`: imagen oficial `grafana/k6@sha256:<digest revisado>`;
- secreto `LOAD_SUPABASE_URL`: URL directa `https://<ref>.supabase.co` del proyecto aislado;
- secreto `LOAD_SUPABASE_PUBLISHABLE_KEY`;
- secreto `LOAD_SUPABASE_SERVICE_ROLE_KEY`, usado solo para crear y retirar el fixture;
- secreto `LOAD_TEST_PASSWORD`, aleatorio y de al menos 20 caracteres;
- secreto `LOAD_DATABASE_URL`, conexión directa de solo ese proyecto para métricas.

El trabajo exige escribir exactamente `CARGA_FICTICIA_EN_MODERNO_PRUEBAS`. Tanto el sembrador como k6 y la limpieza vuelven a comprobar URL, referencia y ejecución. Rechazan de forma explícita `auth.moderno.app`, `app.moderno.app` y la referencia productiva conocida. La protección del entorno de GitHub debe limitar qué ramas y revisores pueden usar los secretos.

Los JWT se escriben con permisos `0600` dentro de `RUNNER_TEMP`, nunca se suben como artefacto y se eliminan al terminar. Los usuarios llevan dominio reservado `example.invalid`; estudios, proyectos y documentos contienen un `run_id` único. El manifiesto privado enumera todos los estudios antes de la primera escritura. En paralelo se crea desde el inicio un manifiesto de recuperación sanitizado —run, proyecto aislado, UUID de estudios y correos ficticios esperados, sin JWT— dentro del artefacto. Los POST de base son idempotentes; si se pierde la respuesta de Auth, el sembrador recupera el usuario solo por correo y `user_metadata.load_run` coincidentes. La limpieza usa esos UUID y recupera con los mismos dos marcadores cualquier usuario creado antes de poder registrarlo. Un fallo de limpieza hace fallar el workflow; no amplía el borrado.

## Datos reproducibles

La semilla y la mezcla viven en [config-1000.json](../scripts/load/config-1000.json):

| Tamaño del bloque `proyectos` | Estudios |
| --- | ---: |
| 75 kB | 175 |
| 1 MB | 50 |
| 6 MB | 20 |
| 9,5 MB | 5 |

El contenido grande se genera con entropía determinista; no usa millones de caracteres iguales que PostgreSQL podría comprimir de forma irreal. Cada proyecto incluye tres productos identificados para verificar reordenaciones `array_sync`. Cada estudio tiene un administrador y tres colaboradores. Las escrituras normales se hacen con los 250 administradores; la lectura cubre ambos roles y comprueba que la identidad del proyecto recibido pertenece al estudio solicitado.

El protocolo predeterminado es `v2`. Cada operación recibe un UUID v4 determinista para esa operación; cualquier repetición reutiliza exactamente el mismo `requestId` y el mismo cuerpo. El selector `legacy` solo permite comparar `app_guardar_lote_delta` con los perfiles generales. Los perfiles contractuales (`replay`, `noop`, `array-sync` y `limits`) rechazan `legacy` antes de crear el fixture.

## Perfiles

| Perfil | Propósito | Carga principal |
| --- | --- | --- |
| `smoke` | Validar fixture y contrato | 2 min, 1 lectura/s y 1 escritura/s |
| `target` | Pico operativo esperado | 20 min, 6 lecturas de versión/s, 5 guardados/s y 1 bloque/s |
| `margin` | Margen sostenido de tasa | 10 min, 23 lecturas/s, 10 guardados/s y 1 bloque/s, hasta 1.000 VU disponibles |
| `concurrent-1000` | 1.000 identidades concurrentes | 1.000 VU, una identidad distinta por VU; lectura y no-op v2 autenticados |
| `large` | Documentos de 6 y 9,5 MB | 10 min, 5 guardados/s |
| `reconnect` | Tormenta de reconexión | 1.000 iteraciones compartidas, hasta 1.000 VU |
| `contention` | Estudio caliente | 3 min, 10 guardados/s sobre un estudio |
| `replay` | Acuse perdido | 5 min, cada escritura se reenvía con el mismo cuerpo y `requestId` |
| `noop` | Guardado sin cambios | 3 min, confirma `changed:false` sin alterar la versión |
| `array-sync` | Reordenación identificada | 5 min, invierte tres productos y verifica identidad, orden y cardinalidad |
| `limits` | Fronteras del contrato | 250 iteraciones: acepta 64 operaciones y rechaza 65 o 10 bloques sin mutar |
| `soak` | Fugas y acumulación | 90 min con carga objetivo |

Los guardados incluyen la lectura de versión previa y una relectura del acuse, por lo que la tasa HTTP real es deliberadamente superior a la tasa nominal. `constant-arrival-rate` evita que una respuesta lenta reduzca artificialmente la carga ofrecida.

En `replay`, la primera respuesta se descarta a nivel de la lógica de la prueba y se repite la solicitud exacta. La segunda respuesta debe indicar `replayed:true`, conservar el mismo `updated_at` y no ejecutar una segunda escritura. En `noop`, el recibo debe existir aunque el documento no cambie. En `limits`, los rechazos deben devolver `54000` o `22023` y conservar la versión confirmada anterior.

La prueba local [`delta-concurrency-local.mjs`](../scripts/delta-concurrency-local.mjs) sigue siendo la comprobación exacta de contención: una misma versión debe producir un ganador y nueve conflictos `PT409`. El perfil remoto `contention` añade presión sostenida y considera esos conflictos previstos, no indisponibilidad.

## Umbrales automáticos

- lecturas válidas: al menos 99,9 %;
- escrituras válidas: al menos 99,5 %, excluidos los `PT409` intencionados de contención;
- `app_leer_versiones` p95 inferior a 250 ms;
- guardado p95: 1 s (75 kB), 2 s (1 MB), 8 s (6 MB), 15 s (9,5 MB);
- ninguna escritura por encima de 55 s;
- cero `57014`, `40P01`, 5xx, respuesta de otro estudio o iteración descartada;
- cero conflicto inesperado fuera del perfil de contención.
- 100 % de replays con `replayed:true`, no-op con `changed:false`, reordenaciones exactas y límites rechazados sin escritura.

k6 falla el trabajo al incumplir un umbral. El resumen no contiene tokens y se imprime en el log. `summary.json`, las capturas SQL anterior/posterior y el manifiesto de recuperación sanitizado se suben como un artefacto sin credenciales, con retención de 30 días. El manifiesto con JWT queda fuera de ese directorio y se elimina al terminar.

## Métricas de servidor y criterio final

[server-metrics.sql](../scripts/load/server-metrics.sql) captura, sin resetear estadísticas, antes y después:

- conexiones, commits, rollbacks, deadlocks, temporales y tiempos de I/O;
- tamaño de base, datos e historial;
- actividad y esperas, locks y filas muertas;
- autovacuum/analyze;
- llamadas, latencia, buffers, temporales y WAL tanto de `app_guardar_lote_v2` como del baseline `app_guardar_lote_delta`;
- tamaño y cardinalidad del libro privado de recibos, incluido el máximo por actor y estudio (nunca mayor de 32).

Además se deben exportar del panel de Supabase CPU, RAM e IOPS del mismo intervalo. Criterios operativos:

- CPU p95 menor del 70 % y nunca por encima del 85 % durante cinco minutos;
- conexiones por debajo del 70 % del límite;
- sin espera independiente entre estudios superior a un segundo;
- sin atraso creciente de autovacuum o historial;
- recuperación a valores normales antes de cinco minutos tras detener la carga.

Se aprueba una versión solo si todos los perfiles, umbrales y criterios de servidor pasan y la limpieza deja cero registros del `run_id`. Si falla, no se aumenta un timeout como solución: se conserva el informe, se identifica el recurso limitante y se repite primero `smoke` después de corregirlo.

## Recuperación

El arnés no modifica código ni configuración del proyecto. La reversión normal es automática: elimina primero `datos_estudio_hist` —no tiene cascade— y después `datos_estudio`, membresías, estudios y usuarios Auth de la ejecución. Finalmente consulta cada tabla y Auth y exige cero filas del `run_id`. Si falta el manifiesto privado, la limpieza usa automáticamente `recovery-manifest.json`; ambos contienen desde el inicio los 250 UUID deterministas.

Si el teardown se interrumpe o el runner se cancela, se descarga `recovery-manifest.json` del artefacto y se usa como `LOAD_USERS_FILE` en una limpieza revisada con el mismo `LOAD_RUN_ID` y exclusivamente contra `moderno-pruebas`; nunca se amplía el filtro ni se ejecuta contra producción. Si el runner murió antes de subir el artefacto, el manifiesto se puede reconstruir sin tokens ni acceso a datos previos:

```bash
export LOAD_RUN_ID='load-<github_run_id>-<github_run_attempt>'
export LOAD_SUPABASE_URL='https://<ref-moderno-pruebas>.supabase.co'
export LOAD_ALLOWED_PROJECT_REF='<ref-moderno-pruebas>'
export LOAD_ISOLATION_ACK='CARGA_FICTICIA_EN_MODERNO_PRUEBAS'
export LOAD_USERS_FILE='/tmp/moderno-load-recovery/users.json'
mkdir -p /tmp/moderno-load-recovery
node scripts/load/recovery-manifest.mjs
```

Tras revisar el JSON reconstruido, se configura temporalmente `LOAD_SUPABASE_SERVICE_ROLE_KEY` del proyecto aislado y se ejecuta `node scripts/load/teardown.mjs`. El script vuelve a validar URL, referencia, confirmación y `run_id`; deriva exactamente los mismos UUID, busca usuarios solo por el prefijo reservado y `user_metadata.load_run`, y exige cero filas al terminar.
