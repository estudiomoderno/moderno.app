# Capturas de producto sin cuotas — v3.65.79

El propietario autoriza el 20/10/2026 retirar los límites horarios y diarios del importador. El bloqueo observado era la cuota de 15 intentos por usuario/hora; los errores también contaban. Se retiran esa cuota y los 100 intentos por estudio/día.

## Cambio

La migración generada con Supabase CLI (archivo alineado con la versión registrada al aplicarla por MCP) reemplaza exclusivamente `clipper_iniciar`, tras comprobar la huella de la definición productiva anterior. No cambia tablas, datos, permisos, RLS, Storage ni configuración de proveedores. El SQL canónico coincide con el nuevo contrato.

Se mantienen autorización del destino, identidad, bloqueo transaccional e idempotencia. Se conservan tres capturas simultáneas recientes por estudio como protección técnica; la interfaz espera y reintenta cada tres segundos con el mismo UUID y URL. Mientras espera, bloquea otra solicitud y conserva la captura anterior recuperable. Cerrar la ventana cancela la espera; un cambio de identidad impide continuarla. La espera requiere mantener la ventana abierta, no es una cola persistida.

Solo se reintenta el rechazo nativo `PT429`/HTTP 429, que ocurre antes de crear la captura. Otros errores de red/HTTP pueden corresponder a solicitudes aceptadas: se conserva su ID para consultar el estado, sin repetirlas automáticamente. Las restricciones de red, archivos, duración y privacidad siguen vigentes. No implica eliminar los límites de la infraestructura o de las tiendas externas.

## Validación

- 501 pruebas Node correctas, incluidas espera, identidad, UUID estable, recuperación y errores de red.
- 142 comprobaciones PostgreSQL aisladas con PGlite 0.5.8: más de 100 capturas consecutivas, errores, concurrencia, idempotencia, permisos, conservación de documentos y reversión/reactivación sin pérdida de filas.
- En `moderno-pruebas`, 110 capturas ficticias consecutivas y controles de concurrencia, reintento e identidad en un esquema privado transaccional. Rollback completo verificado; no se conservan fixtures ni se modifica el esquema de la app de pruebas.
- Navegador aislado a 1440, 1100 y 390 px: rechazo temporal, espera visible y continuación automática con el mismo ID; tres orígenes, revisión de portada, error de guardado y confirmación explícita preservados. Sin llamadas a tiendas ni escrituras reales.
- PHP no está instalado localmente: la sintaxis y las 24 comprobaciones de autorización se verifican en CI antes de integrar.

## Recuperación y activación

Se revisaron separadamente las evidencias previas de copia física de BD (17/10) y última copia Storage correcta (18/10). La copia programada de Storage del 20/10 falló y continúa pendiente de reparación; este cambio no corrige ni modifica las copias. Se conserva además la definición exacta de la única función afectada. La reversión no depende de restaurar la base ni los archivos.

Antes de aplicar, comprobar la huella instalada y que la migración contiene únicamente la sustitución esperada. Después, consultar definición, ACL, propietario, RLS y privacidad del bucket; no crear capturas de prueba en producción. Comparar asesores de seguridad con su estado previo: los avisos ya existentes no se corrigen cambiando permisos en este encargo.

SQL y frontend se activan por separado: aplicar la migración autorizada, verificarla, integrar el PR con CI del mismo commit correcto y comprobar el workflow final y las huellas de recursos servidos.

Reversión acotada: `SQL/rollback-clipper-cuotas.sql` repone la función anterior conservando las capturas, productos y archivos. Revertir el commit de interfaz si procede. No restaurar una copia completa sobre las ediciones de los usuarios. No reintroducir cuotas sin una decisión posterior del propietario.

Activación de BD verificada el 20/10/2026: huella de función `c852cebefe822f2a04eb78030f3d2474` → `3e6432e2d953092bee7df087528b8ec2`. Definición sin cuotas horarias/diarias, ACL, propietario, búsqueda vacía, RLS y bucket privado conservados; acceso anónimo a la función denegado. Asesores de seguridad sin cambios respecto a antes. No se ejecutaron capturas ni escrituras de prueba en producción.
