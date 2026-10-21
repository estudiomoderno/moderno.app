# Fiabilidad del guardado — revisión del 21/10/2026

## Resultado y alcance

La aplicación no está certificada para 100.000 usuarios. Se han identificado problemas reproducibles de persistencia, trabajo repetido y coste de las funciones de guardado. v3.65.98 está publicada y verificada: mejora recuperación y solicitudes del navegador. La optimización SQL independiente sigue sin aplicar mientras no se complete el respaldo de Storage. **Publicar la aplicación no aplica el SQL**. No se han escrito datos de negocio ni cambiado permisos de producción durante la auditoría.

## Evidencia de producción, consultas de solo lectura

En la ventana 08:00–10:49 UTC del 21/10: `app_guardar_lote` devolvió 64 respuestas HTTP 500 y 33 respuestas 200; PostgreSQL registró 70 cancelaciones 57014. Los contextos apuntan repetidamente a los recorridos JSON de archivos privados dentro de `guardar_bloque`. El límite de ejecución de los roles autenticados es 8 segundos. Ampliar únicamente el temporizador del navegador no elimina esa cancelación.

Hay 18 bloques en dos estudios; el mayor bloque de proyectos ocupa 3.724.259 bytes y configuración 1.765.374 bytes. Los datos no se guardan por producto: una modificación puede volver a enviar y analizar un bloque completo. Las imágenes registraron 161 respuestas 429 en la ventana, además de 13.005 respuestas 200. Son observaciones de esta ventana, no una prueba de capacidad o causalidad exclusiva.

## Cambios del navegador

- Las nuevas copias pendientes incluyen identidad verificada, bloque y base confirmada del servidor. Después de cerrar y abrir se combinan cambios independientes; una respuesta perdida se reconoce sin duplicar. Los conflictos se conservan para revisión, incluso tras otro cierre. No se importan automáticamente copias antiguas sin base ni copias de otra identidad/estudio/rol.
- La carga remota limpia restos de caché de otro estudio, también para administradores cuando hay datos remotos. La recuperación exige usuario verificado por Auth y rol del servidor.
- Las imágenes privadas repetidas comparten solicitud y caché breve por identidad; hay cola de cuatro solicitudes, plazo y reintentos acotados. Las imágenes perezosas fuera de pantalla no se firman hasta aproximarse. Impresión sigue esperando su carga. Los enlaces firmados no se persisten.
- Las consultas simultáneas se agrupan y Realtime solicita solo bloques afectados, omitiendo confirmaciones propias ya recibidas. El sondeo periódico todavía lee bloques completos: queda pendiente una API de metadatos/deltas.
- No se borran las copias históricas pendientes, no se amplían permisos y no se transforma un fallo de guardado en un indicador de éxito.

Las copias creadas por versiones anteriores siguen requiriendo revisión explícita. Estas mejoras no prueban que cualquier duplicado antiguo haya llegado al servidor.

## Candidato SQL: activación separada

`SQL/optimizar-recorridos-guardado.sql` reemplaza solamente `app_rutas_storage(jsonb)` y `app_rutas_documentos_privados(jsonb)` por recorridos JSONPath equivalentes. Conserva el analizador actual de rutas y los permisos existentes. No modifica tablas, registros, RLS, roles, límites ni contratos RPC. La transacción comprueba hashes del código vigente; si ha cambiado, aborta para revisión. `SQL/revertir-recorridos-guardado.sql` contiene las dos definiciones anteriores para reversión del código.

La prueba usa el SQL candidato real, 100 casos de equivalencia y una carga ficticia de 3.592.242 bytes. En PostgreSQL 17 local aislado, última ejecución: recorrido privado 250,486 → 11,399 ms; recorrido de rutas 595,527 → 139,028 ms. La proyección de colaborador permanece intacta como control. Los tiempos son una microprueba, no la latencia del guardado completo ni una garantía de rendimiento productivo.

Se ensayó inicialmente con datos ficticios en el proyecto remoto verificado vacío y se revirtió la transacción. La revisión automática rechazó una repetición posterior al no reconocer ese destino como entorno autorizado; no se forzó. La validación final se completó en un contenedor local sin red. CI incorpora PostgreSQL 17 fijado por digest, datos ficticios, comprobación de aislamiento, equivalencia, permisos y rollback. El bootstrap rechaza un esquema Supabase existente o tablas de aplicación.

Antes de activar: verificar respaldo recuperable reciente de BD y Storage por separado, obtener autorización concreta según AGENTS.md y volver a verificar hashes/identidad. Después de activar: observar cancelaciones y latencia de guardados reales normales mediante métricas, sin generar pruebas con datos de clientes. Revertir las dos funciones si aparece regresión. No aumentar el timeout global como sustituto de corregir el trabajo.

## Copias de seguridad y bloqueo de conexión

La captura del panel acredita un respaldo físico de BD del 21/10 a las 00:33:40 UTC y copias diarias anteriores; no se ha ensayado su restauración. Las copias de BD no incluyen objetos de Storage.

La identidad de automatización y el destino autorizado de la unidad compartida se verifican por separado. El propietario corrigió el identificador de carpeta del override; la comprobación devuelve HTTP 200, carpeta/unidad correctas y permiso para añadir hijos. La configuración primaria antigua sigue devolviendo 404; el override verificado es el destino efectivo. No se ampliaron permisos.

La ejecución real 39612740479, job 119267315953, comparó bytes: **431 idénticos, 3 ausentes solo en destino, 0 ausentes en origen, 0 distintos y 0 errores de lectura**. No acredita una copia completa: el destino aún carece de manifiesto y marcador COMPLETE. Las pruebas con dos archivos ficticios sí completan copia y recuperación, pero no sustituyen la verificación de los archivos reales.

La recuperación añade únicamente objetos ausentes de una copia incompleta del mismo día, sin sobrescribir existentes ni escribir en Supabase. Después exige comparación de todos los bytes e inventario de origen estable antes de publicar manifiesto/COMPLETE. La consulta S3 agota su conexión antes de alcanzar esta fase. Se ensayó listado plano `--fast-list` para reducir consultas por directorio, conservando comparación íntegra. La ejecución 39618535109 / job 119285527966 también falló en el inventario inicial; no solucionó el bloqueo. Rclone instalado: 1.60.1-DEV.

En la ventana 14:38:20–14:39:05 UTC, Storage registró `storage.s3.object.list`, HTTP 544, código `DatabaseTimeout`, mensaje `The connection to the database timed out`, 5002 ms y contexto `PgPoolExecutor.beginTransaction`. PgBouncer registró `closing because: connect timeout`. Una consulta independiente de diagnóstico también falló por tiempo de conexión; otra posterior respondió y mostró 22 conexiones frente a máximo 60. Esto no acredita saturación, ni identifica por sí solo su causa. El estado del proyecto figura ACTIVE_HEALTHY y no invalida estos errores observados.

**La activación de las dos funciones SQL sigue bloqueada.** La autorización del propietario está condicionada a verificar el respaldo reciente de BD y Storage. No se ejecutó ninguna migración, restauración, reinicio, cambio de límites ni escritura de negocio. No se reintenta el mismo fallo indefinidamente ni se marca la copia incompleta como válida. La siguiente intervención requiere aclarar la conexión Storage/PgBouncer con Supabase y repetir después la verificación completa.

## Puertas de salida antes de crecer

1. Corregir y verificar copia/restauración automática con RPO y RTO definidos; alertar por antigüedad y fallo, sin depender del cliente.
2. Activar de forma autorizada la optimización SQL y comparar métricas; revisar los seis índices de claves foráneas ausentes y las evaluaciones Auth repetidas en RLS sin ampliar accesos.
3. Diseñar y aprobar escrituras por entidad/proyecto y lecturas de versiones/deltas: límites por estudio, concurrencia y conflictos explícitos. Evitar reanalizar todo el estudio por producto.
4. Medir con usuarios ficticios aislados: estudios pequeños/grandes, edición concurrente, desconexión, cuota agotada, respuesta perdida, reinicio y cambio de rol. Fijar presupuesto de p95/p99, tasas de error y tamaño; probar carga por etapas. 100.000 cuentas y 100.000 sesiones simultáneas requieren dimensionamientos distintos.
5. Observabilidad sin contenido privado: duración/resultado por operación, tamaño de bloques, reintentos, conflictos, cuota local, 429 y cancelaciones. Revisar conexiones Auth fijas y protección de contraseñas filtradas; no habilitar políticas a ciegas en tablas de servicio.

## Validación de esta entrega y reversión

La entrega del navegador pasó 603 pruebas Node; el circuito de respaldo actualizado pasa 612 pruebas Node, 100 casos SQL de equivalencia y 24 comprobaciones PHP en CI 39616907337 / job 119280280661. Chromium a 1440 y 390 px verifica cierre abrupto/reapertura con copia >6 MB, cuatro duplicados sin conexión, cambios remotos independientes, confirmación perdida y conflicto persistente; además caché por identidad, carga perezosa e impresión privada. Pruebas de cuota, duplicación y actualización se ejecutan por separado. PHP y SQL se verifican en CI. Ninguna de estas pruebas escribe en producción.

Para revertir el navegador, revertir el commit de esta entrega y publicar mediante el workflow habitual; conservar las copias locales y el archivo de recuperación, sin purgar IndexedDB. La reversión SQL es separada y solo necesaria si se llegó a aplicar. No restaurar una base de datos completa para deshacer estas dos funciones.
