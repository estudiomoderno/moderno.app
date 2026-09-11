# Ensayo de recuperación del servicio — 11 septiembre 2026

El clon posterior a v3.35 conserva la base y los 121 archivos verificados. La restauración física no desplegó las funciones Edge: se recuperaron `portal-archivo` y `calendario-ics` desde el código del repositorio. Se aplicó `verify_jwt=false` tal como indica supabase/config.toml; ambas funciones mantienen su propia autorización por token. No se extrajeron claves administrativas para estas pruebas: se utilizó la clave pública del clon y una cuenta ficticia confirmada mediante el panel.

15 comprobaciones HTTP reales correctas: login ficticio, rol, lectura de proyecto, subida autorizada, guardado/relectura, descarga privada, rechazo de otro estudio, autorización y comparación de bytes de los portales de cliente y obra, rechazo de token inválido, calendario con eventos, revocación del enlace ICS y cierre de sesión. También se comprobó el acceso desde la interfaz local aislada.

El estudio sintético tiene sus propios registros y un archivo de ensayo. Ningún usuario de prueba pertenece al estudio real recuperado. Los originales permanecen separados. El ensayo de recuperación no escribió en producción.

## Lo que no restaura automáticamente Supabase

- Funciones Edge y sus ajustes: restauradas y comprobadas en este ensayo.
- Proveedor Google de inicio de sesión: el nuevo clon lo muestra desactivado. La prueba de correo/contraseña no acredita OAuth Google. Requiere un cliente de pruebas con su callback y configuración propios; no copiar sin control la configuración de producción.
- Servicio PHP de invitaciones y su configuración de alojamiento/SMTP: no está incluido en la copia de Supabase ni en el repositorio. Se preparó el modo manual `backup-service` del workflow de copias para respaldar por FTPS la carpeta api al Drive privado. El usuario autorizó expresamente copiar código y configuración al Drive empresarial. Tras corregir el nombre FTPS y conservar la ruta completa del despliegue, la copia de los dos archivos de api terminó y se verificó en Drive. No se ha probado todavía SMTP restaurado ni efectuado un nuevo envío de correo.

Por tanto, el núcleo de acceso por contraseña, datos, archivos y calendario está comprobado; no declarar recuperado de extremo a extremo todo el servicio externo de correo y OAuth.

## Repetición desde otro ordenador

1. Restaurar la base en un destino aislado y completar el ensayo de archivos documentado en BACKUP-SETUP.md.
2. Desplegar los dos directorios de supabase/functions con sus ajustes de config.toml. Los secretos estándar pertenecen al nuevo proyecto. Las referencias antiguas de Storage se resuelven como rutas del clon, nunca como lecturas o escrituras al origen.
3. Configurar el servidor local con la URL y clave pública del clon. El servidor de desarrollo rechaza producción y claves administrativas.
4. Crear una cuenta y estudio ficticios. Comprobar login, pertenencia, lectura, guardado versionado, archivos, portales, ICS y revocación. No usar identidades del piloto para escribir pruebas.
5. Recuperar por separado el backend PHP y configurar correo/OAuth en un entorno sin envíos reales. Verificar dependencias y secretos antes de abrir el servicio.

`backup-service` usa FTPS con validación de certificado y solo comandos de lectura. Rechaza enlaces simbólicos, cambios de inventario y contenido fuera de api. Guarda la copia en una carpeta privada `servicio-*`, verifica su contenido por descarga y escribe COMPLETE.json al final. No publica código ni configuración privados en logs o artefactos de GitHub. La copia de código no demuestra por sí sola el funcionamiento de SMTP ni que incluya configuraciones externas al directorio api.

## Intentos autorizados y bloqueo técnico

El 11 de septiembre se ejecutaron 34594792073, 34594952587 y 34595074736. Los dos últimos incorporaron diagnóstico por etapas, clase y código numérico, sin mostrar host, rutas privadas, mensajes del servidor ni credenciales. El último confirmó SSLCertVerificationError / 62 durante la negociación FTPS, antes del inventario y de la transferencia. La conexión temporal a Google funcionó; no hubo subida del servicio ni marcador COMPLETE. No se alteraron servidor ni datos del CRM.

Bloqueo resuelto: el usuario identificó DonDominio y la carpeta app/. El usuario ya autorizó esta copia concreta: no pedir de nuevo permiso para la misma operación. No desactivar validación TLS ni adoptar un nombre obtenido únicamente de una conexión no autenticada. Corregir el destino contra información fiable del proveedor, repetir backup-service y comprobar COMPLETE antes de declarar la copia terminada. Estos fallos manuales no reemplazan ni invalidan la última copia programada de Storage.

## Copia privada completada

El 11 de septiembre de 2026 la ejecución https://github.com/estudiomoderno/moderno.app/actions/runs/34595566064 terminó correctamente con el commit 9fd7b41. El registro confirma descarga estable, subida privada, comprobación por descarga, marcador COMPLETE y 2 archivos verificados. El contenido privado permanece en Drive, no en el repositorio ni en artefactos de Actions.

DonDominio documenta ftp.dondominio.com como servidor alternativo oficial: https://www.dondominio.com/es/help/120/como-subo-web-mediante-ftp/. Su certificado y nombre se verificaron con el almacén de confianza estándar. ftp.moderno.app apunta al mismo servicio pero no está cubierto por el certificado. El workflow manual utiliza el nombre oficial con validación completa y la ruta FTP_SERVER_DIR que ya usa el despliegue. La ruta relativa app/ produjo 550 y se descartó; no reemplazar la ruta completa por esa abreviatura.

Alcance: copia manual verificada del directorio api actual. No constituye todavía un ensayo de ejecución del correo restaurado ni una copia de configuración externa a api. Google OAuth del clon también continúa pendiente. La programación diaria sigue copiando Storage; backup-service se ejecuta manualmente.

## Comprobación de correo y Google — cierre del 11 septiembre 2026

Esta sección actualiza los pendientes históricos anteriores. Producción no recibió escrituras durante el ensayo.

**Correo:** se descargaron los dos archivos privados de la copia verificada de Drive y se ejecutó el manejador PHP original, sin cambios de bytes, con PHP 8.4.25 NTS, OpenSSL y mbstring. Las 12 comprobaciones pasaron: destino SMTP restringido, TLS y autenticación reales con DonDominio, rechazo de GET/origen ajeno/destinatario inválido, envío mediante SMTP simulado, un único mensaje, MIME HTML/texto y logo, destinatario ficticio, asunto, saneamiento HTML e igualdad del código restaurado. La conexión real terminó después de autenticarse, sin enviar correo. El mensaje de ensayo se capturó exclusivamente en un servidor TLS local con credenciales ficticias y mail() deshabilitado.

Esto acredita que la copia del servicio se puede ejecutar y que sus credenciales SMTP funcionan. No acredita entrega a un buzón externo, aceptación de invitación desde la aplicación ni una auditoría completa de autorización del servicio. Antes de ampliar su exposición debe revisarse su control de acceso. La configuración privada no se incorpora al repositorio.

**Google:** se creó el cliente independiente «Moderno App Recuperacion 20260911», dentro del proyecto Google Cloud existente, y se activó únicamente en el clon szbswxpkhidywaosdfcg. Callback autorizado: https://szbswxpkhidywaosdfcg.supabase.co/auth/v1/callback. Supabase permite el retorno exacto http://127.0.0.1:3173/callback para el ensayo. El cliente de producción permanece intacto.

El inicio de sesión real pasó siete comprobaciones: intercambio PKCE, consulta autenticada de identidad, proveedor Google, cuenta esperada, emisor del clon, correo confirmado y cierre de la sesión creada (scope=local). No se modificaron proyectos. El secreto del cliente se introdujo directamente en Supabase sin guardarlo en archivos o GitHub. No se habilitó Google Calendar.

Para repetir: recuperar api desde la copia privada COMPLETE, usar PHP con OpenSSL/mbstring y un receptor SMTP local; comprobar por separado TLS/AUTH sin MAIL FROM. Para OAuth, usar un cliente exclusivo del clon y callback exacto, iniciar PKCE S256 desde un servidor local ligado a 127.0.0.1, validar origen y cookie de sesión, intercambiar el código con el verificador, comprobar /auth/v1/user y cerrar solo esa sesión. Guardar únicamente resultados booleanos, nunca tokens ni contraseñas. Detener los servidores temporales al terminar.
