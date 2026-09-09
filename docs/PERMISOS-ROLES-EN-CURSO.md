# Permisos de roles: candidato sin publicar

Fecha: 9 de septiembre de 2026. Rama `taller-operativa-20260909`.

Gestoría tiene autorización del usuario para consultar Finanzas/Contabilidad y descargar PDF, sin editar. No queda ninguna decisión pendiente sobre esta regla.

## Comprobado

- `node --test scripts/*.test.mjs`: 112 pruebas correctas. Incluyen separación de PDF original y resumen, rechazo de descarga sin firma, respuesta tardía después de cambiar de estudio, descarga terminada después de salir de la cuenta y sincronización filtrada.
- `SQL/permisos-roles.sql` ensayado en el clon de recuperación dentro de una transacción revertida. Con una identidad ficticia de Gestoría: consulta contable permitida, costes de líneas ocultos, lectura directa de bloques rechazada, escritura rechazada, PDF contable autorizado, otro PDF rechazado y modificación de PDF rechazada.
- Esas comprobaciones SQL verifican las decisiones de autorización. No equivalen todavía a probar la descarga HTTP de un PDF con una sesión real de Gestoría.
- Ensayo SQL adicional con JSON ficticio: seis comprobaciones correctas de ocultación de costes, conservación al cambiar cantidades y reordenar filas, rechazo de inyección de campos privados, borrado protegido y duplicación de identificadores. Transacción revertida; no acredita aún la integración completa del colaborador.
- Segundo ensayo integrado: diez comprobaciones correctas con identidad ficticia autenticada. Consulta filtrada y guardado de tarea permitidos; costes e importes privados conservados en servidor; configuración y otro estudio rechazados; subtareas, comentarios y mapas de marcas conservados. Admite mapas nulos antiguos. Todo termina en `ROLLBACK`.
- Carga, recuperación, guardado y sondeo usan `app_leer_bloques`. Una respuesta de otra sesión o con un rol distinto se rechaza. No hay fallback a la tabla completa.
- La copia filtrada no se combina con facturas, configuración o comentarios de la caché antigua. El procedimiento previo conserva las copias pendientes; no se borran dichas copias.
- No se muestran las pantallas de la caché mientras se verifican permisos. Las tareas de colaboradores no envían campos contables ni muestran controles para crearlos. El perfil muestra la identidad real.
- Colaboradores no se suscriben a los mensajes completos de `datos_estudio`: usan sondeo cada 45 segundos y al volver a la pestaña. Los administradores reciben avisos de cambio y consultan de nuevo el servidor. Valorar una notificación de versión sin contenido para recuperar actualización inmediata sin exponer bloques completos.

## Repetir el ensayo en el clon

Ejecutar `node scripts/build-role-probe.mjs ensayo-roles.sql` genera un archivo; no ejecuta SQL ni se conecta a Supabase. El generador reúne los candidatos y `scripts/sql/colaborador-integracion.sql` en una única transacción que termina en `ROLLBACK`. Ejecutar únicamente en el clon de recuperación. La identidad ficticia se comprueba antes de modificar sus registros y todas las modificaciones se revierten. No ejecutar los candidatos por separado con sus `COMMIT` para este ensayo.

## Pendiente antes de publicar

- Completar permisos de archivos de colaboradores y verificar los demás formularios frente a la proyección. Las listas sin identidad estable y las filas con campos privados rechazan ciertos borrados o renombrados; hace falta comprobar el flujo de resolución, sin perder datos.
- Inventario del clon: `calendario_token(boolean)` todavía permite crear/regenerar una suscripción a cualquier miembro; la función ICS lee el estudio por token sin volver a comprobar la membresía. Adaptar al rol y a la revocación de acceso. Esto corresponde al calendario ICS existente, no a conectar Google Calendar, que sigue aplazado.
- Probar los flujos completos de cada rol y las descargas HTTP en el navegador del clon. Las pruebas SQL y locales no sustituyen esta comprobación.
- Validar el conjunto de SQL y cliente, el orden de subida de archivos, la copia previa y la transición voluntaria de las sesiones del piloto.

Los nuevos SQL no están instalados de forma permanente ni en producción ni en el clon. El cliente candidato depende de ellos: no desplegarlo aisladamente. La versión en uso por el equipo no se ha modificado.
