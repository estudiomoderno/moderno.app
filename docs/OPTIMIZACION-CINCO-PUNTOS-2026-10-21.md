# Optimización de guardado y carga — v3.65.99

Encargo del propietario del 21/10/2026: completar autónomamente mejoras de guardado, copias locales, carga, peticiones repetidas y detección de fallos. Se conservan los contratos anteriores y los datos; no se restaura ni se limpia ninguna copia histórica automáticamente.

## Cambios

| Área | Comportamiento incorporado | Límite práctico |
| --- | --- | --- |
| Guardado | RPC aditivo por diferencias JSON, con rutas explícitas y versiones base. Consulta ligera de versiones antes de guardar; descarga el bloque si otro usuario lo cambió. Conserva lote atómico, mezcla, permisos y costes privados. Evita serializaciones y fusiones repetidas cuando la versión remota coincide. | El servidor reconstruye y guarda el bloque JSON existente. No equivale a disponer de tablas normalizadas por producto. Cuando el parche no compensa o supera 64 operaciones, se envía el bloque mediante el contrato versionado. |
| Copia local | Copias mayores de 524.288 caracteres van directamente al almacenamiento IndexedDB verificado, sin intentar escribir primero el JSON grande en localStorage. Si ya existe un puntero, se conserva ese mecanismo. Reintentar conexión vuelve a verificar la copia actual tras un fallo temporal. | IndexedDB también depende del espacio y de los permisos del dispositivo. Un fallo real sigue visible y conserva la opción de descarga. Las copias históricas siguen intactas y no se declaran revisadas. |
| Listas largas | Renderizado inicial de 60 productos; «Mostrar más» añade otros 60. Buscar y filtrar examina la lista completa. Totales, datos, exportaciones y guardado siguen usando todos los productos. Se mantiene la carga diferida de imágenes y la caché de firmas privadas. | La carga inicial del estudio sigue usando los bloques existentes. Esta entrega pagina el renderizado y evita descargar bloques sin cambios; no introduce lectura inicial por entidad. |
| Peticiones | Sondeo por versiones sin contenido cuando nada ha cambiado; listeners de reconexión registrados una sola vez; no se consulta en pestañas ocultas o sin conexión. Reintentos de guardado con espera creciente y variación aleatoria; una edición nueva respeta la espera, el reintento explícito puede adelantarla. | Las pestañas visibles mantienen su propia sesión y sondeo. No se afirma coordinación de un único líder entre pestañas. |
| Observación | Métricas locales acotadas de guardado, sondeo, copia y renderizado: tiempos, errores, bytes y p95. Descarga de diagnóstico sin nombres, URLs, usuarios, contenido ni mensajes del servidor. Supervisor de disponibilidad cada 15 minutos y tras un despliegue correcto. | El supervisor comprueba HTML, recurso de guardado y rechazo de una lectura anónima en Postgres. No inicia sesión ni escribe datos. No mide por sí solo el guardado de un usuario ni garantiza entrega de avisos: los fallos quedan en Actions y sus notificaciones dependen de la configuración existente. |

## Pruebas verificadas antes de activar

- Suite Node completa y CI de PR: ver ejecución enlazada en la entrega.
- Candidato SQL real en PostgreSQL 17 desechable: 123 aserciones; 106 recorridos exactos JavaScript → SQL; roles, campos privados, versiones antiguas, ausencia de identidad, otro estudio, entradas malformadas y reversión completa del lote.
- Cincuenta solicitudes en cinco carreras de diez conexiones al PostgreSQL ficticio: cinco confirmaciones y 45 conflictos explícitos, sin sobrescrituras de versiones desactualizadas.
- Chromium de escritorio (1440 px) y móvil (390 px), servidor oficial aislado, transporte RPC ficticio y red externa bloqueada: 15 proyectos × 414 productos, búsqueda completa, 60/120 tarjetas, IndexedDB real y 58 archivos históricos ficticios conservados. Un cambio de cantidad envía 167 caracteres de argumentos frente a 13.072.251 del bloque ficticio completo. Es una medición de ese caso, no una promesa para todas las operaciones.
- Duplicación repetida de listas con más de 6 MB, RPC y almacenamiento bloqueados, vencimiento, descarga, reintento y respuesta tardía: escritorio/móvil, 55 copias ficticias intactas.
- Arranque con copia antigua grande y cuota real de localStorage: escritorio/móvil, fallo temporal y reintento, 53 copias anteriores más la pendiente conservadas.
- Imágenes privadas: carga diferida, firma deduplicada, máximo de cuatro peticiones simultáneas y rechazo de capacidades tras cambio de rol.
- Reversión SQL ensayada: elimina solamente los tres RPC nuevos; el guardado anterior continúa operativo y los datos ficticios permanecen. El ensayo termina en ROLLBACK.

No se han realizado escrituras de prueba con identidades o datos de clientes en producción. No se presenta este ensayo como certificación de capacidad para 100.000 usuarios.

## Activación y recuperación

El SQL nuevo es aditivo y rechaza instalarse si sus nombres ya existen. `app_guardar_lote_delta` usa SECURITY INVOKER, lector filtrado y escritor existentes; no lee tablas crudas desde el cliente. `app_leer_versiones` verifica identidad y rol antes de devolver únicamente nombres de bloque y fechas. Anónimo no tiene EXECUTE. No cambia tablas, RLS, límites, historial ni funciones anteriores.

Prerequisitos ya verificados durante la incidencia: copia física de BD del 21/10/2026 a las 00:33:40 UTC, según el panel aportado por el propietario, y copia independiente de Storage verificada a las 16:22:13 UTC, con 507 objetos idénticos y cero diferencias o ausencias. No se afirma un nuevo ensayo de restauración integral de BD y Storage coordinados.

Aplicar `SQL/guardado-delta.sql` solamente después de pasar las comprobaciones. El HTML v3.65.99 negocia la disponibilidad; exclusivamente un RPC ausente permite volver al lote anterior. Un error de permisos, red o conflicto nunca provoca una sobrescritura de reserva.

Para revertir: desplegar el HTML y recursos de la entrega anterior y, si corresponde, aplicar `SQL/guardado-delta.rollback.sql`. Los clientes nuevos también reconocen la ausencia del RPC y conservan el contrato versionado anterior. No restaurar una copia de datos para revertir código. No forzar la recarga de pestañas con borradores.

La evolución posterior para mayor escala debe medir tráfico real, coste por operación, CPU, I/O y latencia de guardado; separar entidades e historial exige una migración específica con compatibilidad y recuperación probadas.

## Activación comprobada

- [PR 138](https://github.com/estudiomoderno/moderno.app/pull/138), integrado en `444e46d139d23f042668af16227d4df59fb201da`.
- [CI independiente](https://github.com/estudiomoderno/moderno.app/actions/runs/39656285191): 637 pruebas Node, 100 comprobaciones de los recorridos SQL anteriores, 123 del guardado delta y 24 de autorización PHP, correctas.
- Migración productiva `20261021185128 guardado_delta_y_versiones`, aplicada a las 18:51:28 UTC. Verificación posterior: los nueve contratos de referencia siguen idénticos, los tres nuevos RPC tienen los permisos previstos, anónimo no tiene EXECUTE y el cálculo puro con datos ficticios devuelve el resultado esperado. No se ejecutó un guardado de prueba sobre datos reales.
- [Despliegue v3.65.99](https://github.com/estudiomoderno/moderno.app/actions/runs/39656654192), correcto: recursos primero, HTML después y 44 hashes públicos coincidentes, incluido el nuevo módulo.
- [Primer control real de disponibilidad](https://github.com/estudiomoderno/moderno.app/actions/runs/39656765169), 18:53 UTC: app HTTP 200 (711 ms), módulo HTTP 200 (100 ms), lectura anónima rechazada por Postgres HTTP 401 / código 42501 (786 ms). Es una muestra de disponibilidad desde Actions, no el p95 de guardado de usuarios. El control queda programado cada 15 minutos; la hora efectiva depende de GitHub Actions.
- Las carreras finales sobre el candidato exacto volvieron a producir cinco confirmaciones y 45 conflictos en 50 solicitudes ficticias (1.839 ms de tiempo total del ensayo local).
- Actualizador y recuperación de copia actual mayor de 6 MB: pruebas finales de escritorio y móvil correctas, con fallos de disco, lectura, descarga, reintento y recarga segura.

Los asesores mantienen los avisos de seguridad previos documentados en [la incidencia](FIABILIDAD-GUARDADO-2026-10-21.md). El lector nuevo aparece en el [aviso de función SECURITY DEFINER ejecutable por autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): se revisaron identidad, membresía, rol y salida limitada a metadatos, además de su rechazo entre estudios y sin identidad. Los otros dos RPC usan SECURITY INVOKER. No se abrieron permisos anónimos ni se cambiaron las políticas existentes para silenciar avisos.

Las pestañas antiguas siguen siendo compatibles; no se ha forzado su recarga. Los cambios del cliente se cargan mediante la actualización segura existente o una apertura posterior.
