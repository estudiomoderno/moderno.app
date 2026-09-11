# Invitaciones: revisión del 11 de septiembre de 2026

El usuario informa de que la validación externa funciona y de que la invitación llega a Gmail, pero a spam. Es una confirmación del usuario; no acredita todos los dispositivos ni la recuperación de archivos.

También informa de que aparece en no deseado en Apple Mail y confirma después que el buzón es iCloud. Hay, por tanto, informes del usuario para Gmail e iCloud. Falta determinar si los mensajes observados son anteriores o posteriores al despliegue; este dato no demuestra que el arreglo haya fallado ni identifica la causa del filtrado.

Actualización del usuario: responde «nueva» al preguntar si la invitación de iCloud es posterior a las correcciones. Queda registrado que una invitación nueva sigue llegando a no deseado en iCloud, según su testimonio. La entregabilidad no está resuelta. Falta contrastar Date/Received y Message-ID para correlacionarla con el despliegue; el testimonio por sí solo no acredita qué código generó ese mensaje. La antigüedad del mensaje Gmail sigue sin confirmar.

## Corrección del servicio v1.6 (app v3.45)

El código no generaba Date ni Message-ID y enviaba texto/HTML en 8bit sin negociar esa extensión SMTP. Ahora añade fecha e identificador aleatorio, separadores MIME aleatorios y quoted-printable con CRLF y líneas acotadas. Se mantienen texto alternativo, HTML, logo y enlace a https://app.moderno.app. From y MAIL FROM siguen usando el usuario SMTP privado; Reply-To sigue siendo hola@moderno.app.

No se modifican la autorización v3.38, los permisos, los datos, la configuración SMTP privada ni el dominio. No se envían correos reales durante las pruebas.

Validación: 246 pruebas Node, 24 comprobaciones PHP de autorización y 16 comprobaciones HTTP/Auth/SMTP TLS locales con un mensaje ficticio capturado. Incluyen cabeceras, ASCII, CRLF, límites de línea, contenido MIME y conservación del remitente.

Publicación confirmada: commit `bc320d1a91dc258bfb8e36c5cb8a83c342d77e1c`, [despliegue 34619103720](https://github.com/estudiomoderno/moderno.app/actions/runs/34619103720) terminado correctamente el 11 de septiembre a las 15:57:18 UTC (17:57:18 Madrid). El despliegue queda cerrado; la investigación de spam sigue abierta y no se ha enviado otro correo para verificar recepción posterior.

## DNS observado y límites

Consulta DNS pública: moderno.app publica `v=spf1 include:spf.dondominio.com`. No incluye un mecanismo final all; esto no demuestra por sí solo un fallo SPF del mensaje recibido. _dmarc.moderno.app resuelve mediante CNAME a hostingsrv131.dondominio.com y la consulta no devuelve un TXT DMARC. No se ha comprobado DKIM porque falta un selector acreditado.

La nueva consulta mantiene esos resultados; consultar directamente el destino del CNAME tampoco devuelve TXT. No se ha cambiado ninguna política DNS ni configuración privada.

Faltan Authentication-Results, Received y los campos d= y s= de DKIM-Signature del mensaje ya recibido para acreditar SPF, DKIM, DMARC, alineación y servidor emisor. No hace falta reenviar una invitación. No se deben publicar direcciones de destinatarios ni credenciales en el repositorio.

No hay todavía una causa demostrada de la clasificación como spam. No se sustituyen SPF ni DNS a ciegas: antes hay que identificar los emisores legítimos y la configuración del proveedor. No se promete la llegada a bandeja de entrada.

Referencia oficial consultada: [requisitos de remitentes de Gmail](https://support.google.com/mail/answer/81126), especialmente formato RFC 5322, Message-ID, autenticación y alineación. Las exigencias de baja con un clic para mensajes comerciales/suscripciones no se trasladan automáticamente a esta invitación transaccional.
