# Permisos de roles: candidato sin publicar

Fecha: 9 de septiembre de 2026. Rama `taller-operativa-20260909`.

Gestoría tiene autorización del usuario para consultar Finanzas/Contabilidad y descargar PDF, sin editar. No queda ninguna decisión pendiente sobre esta regla.

## Comprobado

- `node --test scripts/*.test.mjs`: 100 pruebas correctas. Incluyen separación de PDF original y resumen, rechazo de descarga sin firma, respuesta tardía después de cambiar de estudio y descarga terminada después de salir de la cuenta.
- `SQL/permisos-roles.sql` ensayado en el clon de recuperación dentro de una transacción revertida. Con una identidad ficticia de Gestoría: consulta contable permitida, costes de líneas ocultos, lectura directa de bloques rechazada, escritura rechazada, PDF contable autorizado, otro PDF rechazado y modificación de PDF rechazada.
- Esas comprobaciones SQL verifican las decisiones de autorización. No equivalen todavía a probar la descarga HTTP de un PDF con una sesión real de Gestoría.
- Ensayo SQL adicional con JSON ficticio: seis comprobaciones correctas de ocultación de costes, conservación al cambiar cantidades y reordenar filas, rechazo de inyección de campos privados, borrado protegido y duplicación de identificadores. Transacción revertida; no acredita aún la integración completa del colaborador.

## Pendiente antes de publicar

- Completar e integrar `SQL/permisos-colaboradores.sql`: la proyección actual es provisional y necesita revisar mapas dinámicos, identidades de filas y acceso a archivos. No ejecutarla en producción.
- Sustituir lecturas directas del cliente por lecturas filtradas y adaptar recuperación, sondeo, Realtime y cachés al rol. Preservar cualquier trabajo pendiente antes de cambiar datos locales.
- Revisar las demás funciones que pueden devolver información y probar los flujos de cada rol en el navegador del clon.
- Validar el conjunto de SQL y cliente, el orden de subida de archivos, la copia previa y la transición voluntaria de las sesiones del piloto.

Los nuevos SQL no están instalados de forma permanente ni en producción ni en el clon. El cliente candidato depende de ellos: no desplegarlo aisladamente. La versión en uso por el equipo no se ha modificado.
