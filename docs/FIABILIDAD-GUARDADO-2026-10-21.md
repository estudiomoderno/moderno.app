# Fiabilidad del guardado — revisión del 21/10/2026

## Resultado y alcance

La aplicación no está certificada para 100.000 usuarios. Se han identificado problemas reproducibles de persistencia, trabajo repetido y coste de las funciones de guardado. v3.65.98 está publicada y verificada: mejora recuperación y solicitudes del navegador. Tras verificar BD y Storage por separado, se aplicó la optimización SQL autorizada. La ampliación Nano → Micro y la recuperación del caso de duplicación no acreditan capacidad para 100.000 usuarios. **Publicar la aplicación no aplica el SQL**. No se han escrito datos de negocio ni cambiado permisos de producción durante la auditoría.

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

## Optimización SQL: activación verificada

`SQL/optimizar-recorridos-guardado.sql` reemplaza solamente `app_rutas_storage(jsonb)` y `app_rutas_documentos_privados(jsonb)` por recorridos JSONPath equivalentes. Conserva el analizador actual de rutas y los permisos existentes. No modifica tablas, registros, RLS, roles, límites ni contratos RPC. La transacción comprueba hashes del código vigente; si ha cambiado, aborta para revisión. `SQL/revertir-recorridos-guardado.sql` contiene las dos definiciones anteriores para reversión del código.

La prueba usa el SQL candidato real, 100 casos de equivalencia y una carga ficticia de 3.592.242 bytes. En PostgreSQL 17 local aislado, última ejecución: recorrido privado 250,486 → 11,399 ms; recorrido de rutas 595,527 → 139,028 ms. La proyección de colaborador permanece intacta como control. Los tiempos son una microprueba, no la latencia del guardado completo ni una garantía de rendimiento productivo.

Se ensayó inicialmente con datos ficticios en el proyecto remoto verificado vacío y se revirtió la transacción. La revisión automática rechazó una repetición posterior al no reconocer ese destino como entorno autorizado; no se forzó. La validación final se completó en un contenedor local sin red. CI incorpora PostgreSQL 17 fijado por digest, datos ficticios, comprobación de aislamiento, equivalencia, permisos y rollback. El bootstrap rechaza un esquema Supabase existente o tablas de aplicación.

Activación autorizada condicionada al respaldo: migración `20261021155217 optimizar_recorridos_guardado`, aplicada el 21/10 a las **17:52:17 de Madrid** (15:52:17 UTC). Se comprobó identidad, código y ACL antes de ejecutar el candidato exacto. Después se verificaron estas huellas de `prosrc` normalizado:

- Analizador `app_ruta_storage(text)`, intacto: `34f83806d9ba1d4e74fe9a9e30c77094`.
- Recorrido `app_rutas_storage(jsonb)`: `56562723380a8e649557bc02e3dd42f5`.
- Privados `app_rutas_documentos_privados(jsonb)`: `807d0934e30feed50ae91ccfcc186080`.

Las tres funciones mantienen SECURITY INVOKER y ACL `{postgres=X/postgres,service_role=X/postgres}`. `anon` y `authenticated` no pueden ejecutarlas directamente; `service_role` sí, como antes. La consulta de comprobación con datos ficticios devuelve `routes_ok=true` y `private_classification_ok=true`. Se confirmó la migración en el historial. No se ejecutó un guardado ficticio contra registros reales ni se restauró la base de datos.

En la ventana inicial posterior 17:52:30–17:55:00 de Madrid no se encontraron indicadores de timeout en los eventos consultados de PostgreSQL, PgBouncer, Storage y Edge. El tráfico de esa ventana incluye la verificación del respaldo y no acredita latencia del guardado de usuarios. Observar cancelaciones y latencia de guardados reales normales mediante métricas, sin generar pruebas con datos de clientes. Revertir las dos funciones si aparece regresión; no aumentar el timeout global como sustituto de corregir el trabajo.

## Recursos y recuperación del servicio

El propietario aportó un correo de Supabase sobre agotamiento progresivo de Disk IO Budget y una captura con CPU al 98 %. El aviso no mide espacio libre de almacenamiento ni prueba por sí solo una causa única. El proyecto estaba en Nano, hasta 0,5 GB de memoria. El propietario aplicó **Nano → Micro, 1 GB**, con resumen de Compute **9,68 → 9,68 USD/mes**. La base de datos reinició a las 17:07:17 de Madrid; posteriormente respondió a diagnóstico. El propietario confirmó que la app vuelve a conectar y guarda el nuevo duplicado de lista. Las gráficas históricas pueden incluir el periodo anterior; no se ha medido todavía p95/p99 ni ausencia de recurrencias.

Antes del cambio, Storage registraba `DatabaseTimeout`, HTTP 544 y 5002 ms en `PgPoolExecutor.beginTransaction`; PgBouncer registraba `connect timeout`. También hubo cancelaciones 57014 de lecturas `app_leer_bloques`. Una consulta posterior mostró 22 conexiones frente a máximo 60 y la inspección no encontró esperas por bloqueo. Estas observaciones no acreditan saturación de conexiones ni que los dos síntomas compartieran una causa exclusiva.

## Respaldos de BD y Storage verificados por separado

La captura del panel acredita un respaldo físico de BD del 21/10 a las **02:33:40 de Madrid** (00:33:40 UTC) y copias diarias anteriores. No se ha ensayado su restauración durante esta intervención. Las copias de BD no incluyen objetos de Storage.

La identidad de automatización y el destino autorizado de la unidad compartida se verificaron por separado. El propietario corrigió el identificador de carpeta del override; la comprobación devuelve HTTP 200, carpeta/unidad correctas y permiso para añadir hijos. La configuración primaria antigua sigue devolviendo 404; el override verificado es el destino efectivo. No se ampliaron permisos ni se desactivó el límite de gasto.

La copia inicial se detenía por conexión a Supabase. Después de Micro volvió a inventariar. La verificación encontró tres objetos que parecían ausentes en Drive. La inspección privada confirmó dos carpetas con el mismo nombre: una tenía esos tres archivos y la otra estaba vacía. Se verificaron unidad, padre, contenido vacío y ausencia de manifiesto/COMPLETE; se renombró únicamente la carpeta vacía de forma reversible, manteniendo padre y permisos. No se borraron archivos, se movieron carpetas ni se modificó el origen. El registro operativo privado queda fuera de Git.

**Copia real completada y verificada:** ejecución 39626314674 / job 119319029694. Comparación por descarga: **493 idénticos, 0 ausentes en origen, 0 ausentes en destino, 0 distintos y 0 errores de lectura**. Se leyeron manifiesto y COMPLETE del destino privado: versión 1, **493 objetos y 127.797.959 bytes**, inventario iniciado a las **17:43:47.784 de Madrid**, verificación a las **17:49:23.409 de Madrid**. Los 493 archivos del manifiesto están presentes; la inspección del árbol confirmó rutas únicas, sin nombres duplicados de carpetas ni archivos, y rutas compatibles con el verificador de recuperación.

El alcance es `initial-inventory`: cada respaldo copia y compara exactamente la lista inicial y exige cobertura positiva de todos sus objetos. Si uno cambia o desaparece, falla. **12 archivos llegaron después del inventario**: se registran como `newObjectsAfterInventory` y pertenecen a la siguiente instantánea. No se afirma que esta copia represente el estado al terminar ni un punto transaccional coordinado con la BD. La recuperación debe seleccionar únicamente los `Path` del manifiesto; el verificador rechaza archivos adicionales en el directorio restaurado.

Las pruebas locales con rclone real y la prueba sintética de Drive comprueban copia y recuperación, altas concurrentes y rechazo de contenido distinto. No sustituyen la comparación real anterior ni acreditan un ensayo completo de restauración de la app. El programa comprueba también que el destino no tenga rutas duplicadas antes de comparar bytes; no elimina ni fusiona directorios automáticamente. Las ejecuciones normales vuelven a crear instantáneas nuevas; `verify-copy` queda como recuperación manual explícita de una copia incompleta.

Los cambios de respaldo están en PR 133–136. La copia nueva 39629069208 se detuvo en el inventario de Drive con `teamDriveMembershipRequired`; no recibió marcador completo. El ajuste posterior verifica carpeta/unidad por huella y metadatos y opera con rclone desde la carpeta, evitando el corpus de toda la unidad. Además elimina alternativas no verificadas y limita publicaciones normales a archivos ficticios. **Verificación real del ajuste completada:** run 39632723504 / job 119334983112, `BACKUP_MODE=backup`, termina con success. La prueba sintética con varias subcarpetas restaura tres archivos; la copia nueva compara **507 archivos idénticos, cero ausencias, diferencias o errores de lectura**. Se leyeron manifiesto y COMPLETE en el destino: **507 objetos, 128.850.246 bytes**, inventario iniciado a las **18:13:19.417 de Madrid**, verificación a las **18:22:13.755 de Madrid**, `newObjectsAfterInventory=0`. También pasó la validación de rutas únicas del destino. Es una instantánea nueva; no se reutilizó la copia reparada ni se amplió la pertenencia a la unidad. Falta observar el siguiente disparo diario y mantener alertas por fallo/antigüedad. La configuración antigua debe unificarse con la ruta efectiva verificada; el flujo actualizado bloquea rutas no verificadas en lugar de usarlas como alternativa.

## Puertas de salida antes de crecer

1. Corregir y verificar copia/restauración automática con RPO y RTO definidos; alertar por antigüedad y fallo, sin depender del cliente.
2. Comparar métricas tras la optimización SQL aplicada; revisar los seis índices de claves foráneas ausentes y las evaluaciones Auth repetidas en RLS sin ampliar accesos.
3. Diseñar y aprobar escrituras por entidad/proyecto y lecturas de versiones/deltas: límites por estudio, concurrencia y conflictos explícitos. Evitar reanalizar todo el estudio por producto.
4. Medir con usuarios ficticios aislados: estudios pequeños/grandes, edición concurrente, desconexión, cuota agotada, respuesta perdida, reinicio y cambio de rol. Fijar presupuesto de p95/p99, tasas de error y tamaño; probar carga por etapas. 100.000 cuentas y 100.000 sesiones simultáneas requieren dimensionamientos distintos.
5. Observabilidad sin contenido privado: duración/resultado por operación, tamaño de bloques, reintentos, conflictos, cuota local, 429 y cancelaciones. Revisar conexiones Auth fijas y protección de contraseñas filtradas; no habilitar políticas a ciegas en tablas de servicio.

## Asesores de seguridad tras la activación

La revisión posterior devuelve avisos sobre funciones SECURITY DEFINER accesibles por roles públicos y protección de contraseñas filtradas desactivada. Ninguno de los avisos SECURITY DEFINER menciona los tres analizadores revisados, que siguen siendo SECURITY INVOKER. Los contratos RPC deben revisarse antes de retirar accesos necesarios; no se han cambiado permisos ni políticas como parte de esta optimización. Referencias: [ejecución por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [ejecución por authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). El aviso informativo de una tabla con RLS sin política no justifica abrir su acceso.

## Validación de esta entrega y reversión

La entrega del navegador pasó 603 pruebas Node. El circuito actualizado pasa 620 pruebas Node, 100 casos SQL de equivalencia y 24 comprobaciones PHP en CI 39632398536 / job 119333830834. La integración con rclone local real comprueba nombres UTF-8, espacios y comentarios literales, incorporación concurrente, recuperación exacta y rechazo de contenido modificado. La prueba de rutas duplicadas bloquea el respaldo antes de check/COMPLETE. Chromium a 1440 y 390 px verifica cierre abrupto/reapertura con copia >6 MB, cuatro duplicados sin conexión, cambios remotos independientes, confirmación perdida y conflicto persistente; además caché por identidad, carga perezosa e impresión privada. Pruebas de cuota, duplicación y actualización se ejecutan por separado. PHP y SQL se verifican en CI. Ninguna de estas pruebas escribe en producción.

Para revertir el navegador, revertir el commit de esta entrega y publicar mediante el workflow habitual; conservar las copias locales y el archivo de recuperación, sin purgar IndexedDB. La reversión SQL es separada: se aplicó únicamente la migración de las dos funciones descrita arriba. No restaurar una base de datos completa para deshacer estas dos funciones.
