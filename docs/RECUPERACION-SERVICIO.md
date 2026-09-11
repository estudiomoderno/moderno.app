# Ensayo de recuperación del servicio — 11 septiembre 2026

El clon posterior a v3.35 conserva la base y los 121 archivos verificados. La restauración física no desplegó las funciones Edge: se recuperaron `portal-archivo` y `calendario-ics` desde el código del repositorio. Se aplicó `verify_jwt=false` tal como indica supabase/config.toml; ambas funciones mantienen su propia autorización por token. No se extrajeron claves administrativas para estas pruebas: se utilizó la clave pública del clon y una cuenta ficticia confirmada mediante el panel.

15 comprobaciones HTTP reales correctas: login ficticio, rol, lectura de proyecto, subida autorizada, guardado/relectura, descarga privada, rechazo de otro estudio, autorización y comparación de bytes de los portales de cliente y obra, rechazo de token inválido, calendario con eventos, revocación del enlace ICS y cierre de sesión. También se comprobó el acceso desde la interfaz local aislada.

El estudio sintético tiene sus propios registros y un archivo de ensayo. Ningún usuario de prueba pertenece al estudio real recuperado. Los originales permanecen separados. El ensayo de recuperación no escribió en producción.

## Lo que no restaura automáticamente Supabase

- Funciones Edge y sus ajustes: restauradas y comprobadas en este ensayo.
- Proveedor Google de inicio de sesión: el nuevo clon lo muestra desactivado. La prueba de correo/contraseña no acredita OAuth Google. Requiere un cliente de pruebas con su callback y configuración propios; no copiar sin control la configuración de producción.
- Servicio PHP de invitaciones y su configuración de alojamiento/SMTP: no está incluido en la copia de Supabase ni en el repositorio. Se preparó el modo manual `backup-service` del workflow de copias para respaldar por FTPS la carpeta api al Drive privado. El usuario autorizó expresamente copiar código y configuración al Drive empresarial. Los intentos se detuvieron antes de descargar por discrepancia entre el nombre FTP y su certificado TLS (código 62). No se ha efectuado esa exportación ni un nuevo envío de correo.

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

Pendiente identificar el proveedor/panel de alojamiento y confirmar allí el nombre FTPS cubierto por su certificado. El usuario ya autorizó esta copia concreta: no pedir de nuevo permiso para la misma operación. No desactivar validación TLS ni adoptar un nombre obtenido únicamente de una conexión no autenticada. Corregir el destino contra información fiable del proveedor, repetir backup-service y comprobar COMPLETE antes de declarar la copia terminada. Estos fallos manuales no reemplazan ni invalidan la última copia programada de Storage.
