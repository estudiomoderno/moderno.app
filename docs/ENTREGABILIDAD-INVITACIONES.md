# Invitaciones: revisión del 11 de septiembre de 2026

El usuario informa de que la validación externa funciona y de que la invitación llega a Gmail, pero a spam. Es una confirmación del usuario; no acredita todos los dispositivos ni la recuperación de archivos.

## Corrección del servicio v1.6 (app v3.45)

El código no generaba Date ni Message-ID y enviaba texto/HTML en 8bit sin negociar esa extensión SMTP. Ahora añade fecha e identificador aleatorio, separadores MIME aleatorios y quoted-printable con CRLF y líneas acotadas. Se mantienen texto alternativo, HTML, logo y enlace a https://app.moderno.app. From y MAIL FROM siguen usando el usuario SMTP privado; Reply-To sigue siendo hola@moderno.app.

No se modifican la autorización v3.38, los permisos, los datos, la configuración SMTP privada ni el dominio. No se envían correos reales durante las pruebas.

Validación: 246 pruebas Node, 24 comprobaciones PHP de autorización y 16 comprobaciones HTTP/Auth/SMTP TLS locales con un mensaje ficticio capturado. Incluyen cabeceras, ASCII, CRLF, límites de línea, contenido MIME y conservación del remitente.

## DNS observado y límites

Consulta DNS pública: moderno.app publica `v=spf1 include:spf.dondominio.com`. No incluye un mecanismo final all; esto no demuestra por sí solo un fallo SPF del mensaje recibido. _dmarc.moderno.app resuelve mediante CNAME a hostingsrv131.dondominio.com y la consulta no devuelve un TXT DMARC. No se ha comprobado DKIM porque falta un selector acreditado.

Faltan Authentication-Results, Received y los campos d= y s= de DKIM-Signature del mensaje ya recibido para acreditar SPF, DKIM, DMARC, alineación y servidor emisor. No hace falta reenviar una invitación. No se deben publicar direcciones de destinatarios ni credenciales en el repositorio.

No hay todavía una causa demostrada de la clasificación como spam. No se sustituyen SPF ni DNS a ciegas: antes hay que identificar los emisores legítimos y la configuración del proveedor. No se promete la llegada a bandeja de entrada.

Referencia oficial consultada: [requisitos de remitentes de Gmail](https://support.google.com/mail/answer/81126), especialmente formato RFC 5322, Message-ID, autenticación y alineación. Las exigencias de baja con un clic para mensajes comerciales/suscripciones no se trasladan automáticamente a esta invitación transaccional.
