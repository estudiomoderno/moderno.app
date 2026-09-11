# Invitaciones autorizadas

`enviar-invitacion.php` conserva el transporte SMTP y diseño recuperados; `autorizar-invitacion.php` verifica sesión mediante Auth, rol admin mediante RPC, invitación vigente por email/estudio y nombre del estudio. Las consultas usan el token del solicitante y clave pública, nunca service_role. No se confía en rol, remitente ni estudio enviados por el navegador.

La configuración SMTP permanece en `api/config.php` del alojamiento, fuera de Git. Actions sube primero el comprobador, luego el endpoint y después la interfaz; usa inventarios independientes y excluye config.php. La cabecera Authorization se transmite a PHP mediante la regla de Apache en app/.htaccess.

Límite: 20 intentos por estudio/hora y uno por destinatario/minuto, con bloqueo en directorio temporal privado. Un error incierto de SMTP consume el intento y no activa un segundo transporte: comprobar recepción antes de reenviar. Este límite depende del almacenamiento temporal del alojamiento y no es una cola persistente.

Pruebas: `php scripts/invitation-auth.test.php` (sin red ni correo) y `node --test scripts/access-mail.test.mjs`. No poner claves SMTP en variables del navegador ni publicar config.php. Si falla la verificación, el servicio no envía. Retirar la interfaz nueva no justifica restaurar el endpoint anterior sin autenticación.
