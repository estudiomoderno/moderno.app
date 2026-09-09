# v3.31 — correcciones de flujos

## Cambios

- Quitar acceso llama a una operación del servidor: solo administradores, versión de equipo comprobada, sin autoexpulsión ni expulsión de administradores. Retira membresía, invitación pendiente y token ICS del estudio; conserva cuenta y documentos.
- Los bloques pendientes se preparan juntos y se envían en una transacción. Un fallo de versión o permisos revierte el lote completo. Los cambios hechos mientras se guarda permanecen pendientes para el siguiente envío.
- Los conflictos de edición detienen los reintentos automáticos y ofrecen comparación desde el estado de guardado. Solo se eligen los campos en conflicto; se combinan los independientes. Antes de aplicar la elección se conserva una copia y se comprueba de nuevo la versión.
- Los fallos de acceso muestran una explicación y permiten reintentar; las peticiones de conexión tienen límite de tiempo. Los intentos simultáneos y respuestas de sesiones anteriores no desbloquean datos locales.
- El ICS excluye tareas `listo`, `done` y las marcadas como terminadas. No añade integración con Google Calendar.

## Validación

Pruebas automáticas de guardado, conflictos, permisos, conexión y calendario. Ensayo SQL transaccional con identidades ficticias y ROLLBACK: 15 comprobaciones correctas, incluidas reversión de escritura parcial, permisos de colaborador/Gestoría y revocación sin borrar archivos. Pantalla de resolución probada en navegador con copia recuperable y conservación de cambios independientes.

## Orden de instalación

1. En una instalación existente de v3.30, aplicar únicamente `SQL/flujos-trabajo.sql`. Añade dos funciones y sus permisos de ejecución; no ejecuta revocaciones ni modifica documentos al instalarse.
2. Actualizar la función existente `calendario-ics` con el archivo versionado. Mantener su validación propia del token.
3. Publicar la app mediante el workflow que comprueba pruebas y sube recursos antes del HTML. No forzar recargas de sesiones con formularios o cambios pendientes.
4. Verificar versión y recursos públicos y carga de una sesión autorizada. Las bajas de usuarios se ensayan en aislamiento, nunca con miembros reales como prueba.

Para una instalación completa, `scripts/build-release-sql.mjs` incluye también esta migración después de los permisos anteriores.
