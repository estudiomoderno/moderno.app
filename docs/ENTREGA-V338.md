# v3.38 — Autorización de invitaciones

Estado: publicada y verificada el 11 de septiembre de 2026.

El servicio de correo ahora exige sesión válida de Supabase, rol administrador y una invitación existente para ese email dentro del estudio indicado. Consulta con el token del usuario y RLS; no utiliza service_role. El remitente y el estudio se obtienen del servidor. El navegador ya no puede inventar esos datos ni el rol del correo.

Los dos formularios crean primero la invitación antes de solicitar correo. El cambio de estudio durante la operación cancela el envío desde la sesión actual. Los clientes antiguos sin cabecera de sesión reciben un rechazo; no se fuerzan recargas de formularios abiertos. Una invitación creada puede seguir pendiente aunque falle su notificación.

Se limita a 20 intentos por estudio/hora y uno por email/minuto. El contador se bloquea entre procesos y vive en un directorio temporal privado del alojamiento. No se presenta como cola duradera ni garantía de entrega única. Un fallo incierto de SMTP ya no dispara automáticamente mail(), evitando un segundo intento por otro transporte. El usuario debe comprobar recepción antes de reenviar.

## Pruebas

- 215 pruebas Node y 24 comprobaciones PHP correctas: sesión, rol, estudio, destinatario, respuestas inválidas, límites y cambio de contexto.
- HTTP local: sin sesión 401, origen falso 403 y GET 405.
- Diez comprobaciones del handler completo con Auth/REST simulados localmente y SMTP TLS local: un único mensaje capturado, destinatario correcto, nombre de estudio verificado, MIME y logo. El handler probado coincide byte a byte con el candidato; solo la URL de consulta del helper se sustituye en la copia temporal de pruebas. No se enviaron correos externos.
- La autenticación SMTP real ya fue validada en RECUPERACION-SERVICIO.md. No se repite ni se confunde con esta prueba de autorización; tampoco se acredita entrega nueva en un buzón real.

Repetir las pruebas PHP con `php scripts/invitation-auth.test.php`. El ensayo HTTP de Windows se ejecuta con `python scripts/invitation-mailer-http.test.py <ruta-php.exe>`, necesita cryptography, extensiones mbstring/openssl y puertos locales libres 465, 3172 y 3177. Crea únicamente configuración ficticia temporal.

## Despliegue y continuidad

Actions publica primero autorizar-invitacion.php, luego enviar-invitacion.php y después los recursos y HTML. Los inventarios FTP son independientes; config.php queda excluido y no se introduce en Git. La regla de Apache conserva Authorization para PHP. No hay migración SQL ni cambios a documentos, usuarios existentes o archivos.

No restaurar el motor v1.4 sin autorización ante un fallo: mantener el rechazo del servidor y corregir la causa. La copia privada anterior y sus credenciales permanecen fuera del repositorio. Una sesión antigua necesita cargar la nueva versión para enviar invitaciones; no recargarla con cambios pendientes.

## Publicación confirmada

Commit f9e252f024073dad3382280b9434c7052a7d508a. Actions terminó correctamente: https://github.com/estudiomoderno/moderno.app/actions/runs/34609210903. HTML público HTTP 200 y contenido coincidente con el candidato (solo se normalizan finales de línea). En producción: petición sin sesión 401, origen falso 403, cabecera recibida con email inválido 400 y token ficticio rechazado por Auth 403. Ninguna prueba creó invitaciones, alteró datos ni envió correo externo. El flujo autorizado completo se probó con servicios simulados y SMTP local; no se afirma nueva entrega real de correo.
