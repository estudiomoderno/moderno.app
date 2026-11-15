# Conexiones reales de correo

## Alcance

La pantalla **Mail** permite conectar cuentas de Gmail, iCloud Mail y servidores externos IMAP/SMTP. Gmail e iCloud reutilizan exactamente el mismo módulo desde **Ajustes → Integraciones**; no existen conexiones ni credenciales duplicadas.

La conexión pertenece al usuario administrador y al estudio activo. Se pueden conectar varias cuentas. Esta entrega comprueba y conserva las conexiones; la bandeja de entrada y la redacción de mensajes se desarrollarán sobre este contrato, no forman parte de este cambio.

## Seguridad

- Gmail usa Authorization Code con PKCE, `state` de un solo uso y caducidad de diez minutos. La sesión de Moderno no se sustituye por la cuenta de Google.
- iCloud exige una contraseña específica para aplicaciones. Nunca se solicita la contraseña ordinaria del Apple ID.
- Los servidores externos comprueban IMAP y SMTP antes de guardar la cuenta. Solo se admiten TLS/STARTTLS y los puertos seguros compatibles 143/993 y 465/587.
- La función rechaza destinos DNS privados, reservados o locales para reducir riesgo SSRF.
- Tokens y contraseñas se cifran en Supabase Vault. El navegador solo recibe metadatos de conexión.
- La autorización se comprueba en backend con el usuario autenticado, el estudio y el rol `admin`.
- Desconectar elimina tanto la fila privada como el secreto de Vault.

## Componentes

- `app/mail-connections.js`: estado y UI compartidos por Mail e Integraciones.
- `supabase/functions/mail-connect/`: OAuth de Google, comprobación IMAP/SMTP y acceso interno a Vault.
- `SQL/conexiones-correo.sql`: tablas privadas y RPC con permisos mínimos.
- `SQL/conexiones-correo-rollback.sql`: retirada del contrato de backend.

## Estado de activación productiva

Autorización recibida y backend aplicado el 15/11/2026:

- migración `mail_connections_v1` aplicada en producción;
- tablas privadas creadas vacías, sin conexiones ni estados OAuth;
- Edge Function `mail-connect` versión 1 activa;
- RPC administrativas inaccesibles para `anon` y `authenticated`, disponibles únicamente para `service_role`;
- frontend todavía sin fusionar ni publicar;
- Gmail pendiente de cliente OAuth y secretos de Google.

## Configuración pendiente antes de publicar

1. Verificar copia recuperable de la base de datos antes de la migración.
2. Confirmar que la migración `mail_connections_v1` y la Edge Function `mail-connect` continúan activas.
3. Mantener `verify_jwt=false`; el callback OAuth es público, pero la función valida por sí misma JWT, permisos y `state` para todas las operaciones protegidas.
4. Crear un cliente OAuth web de Google y configurar el URI de retorno exacto de la función.
5. Guardar como secretos de la Edge Function, nunca en Git:
   - `GOOGLE_MAIL_CLIENT_ID`
   - `GOOGLE_MAIL_CLIENT_SECRET`
   - `GOOGLE_MAIL_REDIRECT_URI`
   - `MAIL_APP_RETURN_URL` solo si el retorno no debe ser `https://app.moderno.app/`, por ejemplo durante una prueba aislada.
6. Añadir primero usuarios de prueba en la pantalla de consentimiento. Antes de abrir Gmail al público, completar la verificación de Google requerida por los ámbitos restringidos de Gmail.
7. Probar con identidades ficticias autorizadas: conexión, recarga, comprobación, desconexión y denegación entre estudios.
8. Publicar el frontend solo cuando el backend productivo esté activo y verificado.

## Pruebas realizadas

- Migración y Edge Function desplegadas únicamente en `moderno-pruebas`.
- Contrato SQL transaccional: aislamiento, acceso exclusivo de servicio a secretos, ausencia de secretos en respuestas públicas y borrado conjunto de conexión/Vault.
- Compilación real de la Edge Function en Supabase.
- Pruebas unitarias de normalización, cifrado en tránsito, puertos, errores seguros e integración UI.
- Recorrido completo aislado a 1440, 1100 y 390 px, incluido el acceso compartido desde Mail e Integraciones, sin escrituras remotas.

No se han probado credenciales reales de Gmail, iCloud o un servidor externo porque no deben incorporarse a las pruebas ni al repositorio.

## Reversión

1. Retirar/inhabilitar la Edge Function y el acceso UI.
2. Revocar el cliente OAuth de Google y sus secretos.
3. Ejecutar `SQL/conexiones-correo-rollback.sql` solamente tras confirmar que las cuentas pueden borrarse. La reversión elimina las credenciales de Vault asociadas a este módulo.
