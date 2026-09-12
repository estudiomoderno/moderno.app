# Menú y Ajustes — v3.52

## Alcance

El selector de estudio se sitúa debajo del logo. Reúne los espacios visibles para la persona, Ajustes, invitación al equipo, notificaciones y salida. Ajustes sustituye la navegación principal por Mi cuenta, Estudio, Equipo, Facturación, Órdenes, Impuestos, Idioma y región y Notificaciones, en ese orden. Los perfiles no administradores solo ven las secciones personales. Se conservan logo, favicon, iconos del menú principal y navegación contraíble/móvil.

Referencia visual: las seis páginas de `Documento Actualizacion Menu y ajustes.pdf` y los trece SVG de `Nuevo Archivo WinRAR ZIP.zip` entregados por el usuario. `app/settings-icons.js` conserva el contenido vectorial aportado; no utiliza imágenes o servicios remotos. Los componentes nuevos están en `settings-ui.js`, `settings-ui.css` y `settings-core.js`.

## Guardado y datos

- Mi cuenta utiliza Supabase Auth: nombre, apellidos, foto reducida y zona horaria en metadatos personales. La foto se convierte a WebP de hasta 256 px; admite JPG/PNG/WebP de hasta 5 MB y limita el resultado a 180.000 caracteres. No modifica archivos existentes de Storage.
- El cambio de correo de administradores usa `auth.updateUser({email})`, conserva el correo actual hasta confirmación y no llama a `memberEmailSync`. Para miembros no administradores el correo es de lectura: el modelo actual vincula algunos roles al correo y su cambio requiere una operación coordinada. No se modifica esa arquitectura en esta versión.
- Estudio guarda solo los campos editados, en `account.name` y `account.studioDetails`. No publica datos de contacto. No modifica emisores, marcas, proyectos ni documentos por el mero hecho de abrir/guardar un campo del estudio.
- Impuestos reúne los campos anteriores de `account`, `emitter`, `irpf`, `defMargin` y `series`. Aplica únicamente campos cambiados. No recalcula documentos ni sustituye valores vacíos, ceros o valores antiguos al guardar otros campos.
- Los borradores del formulario se mantienen aparte del estado compartido. Cambiar de sección, salir o actualizar requiere resolver el borrador; cerrar pestaña activa el aviso del navegador. La confirmación de guardado compartido exige que el bloque config coincida con la versión confirmada en nube; espera una sincronización ya activa y conserva el borrador ante error. Los cambios concurrentes incompatibles no se sobrescriben silenciosamente.
- Se preservan accesos a espacios, importación, papelera, historial y estado de sincronización desde Estudio. Son acciones explícitas del usuario, no se ejecutan durante la publicación.

## Límites reales respecto a la referencia

Facturación y Órdenes se refieren a la suscripción de Moderno.app. No existe todavía una fuente de planes contratados, precios o recibos conectada a esta app: se muestra ese estado sin inventar un plan o activar pagos. No se configura Stripe ni DNS.

Equipo muestra personas, roles registrados, explicación de permisos e invitaciones reales mediante el servicio existente. El formulario nuevo permite invitar como Colaborador o Administrador. No implementa cambios de rol de miembros existentes ni los antiguos interruptores de capacidades que no controlaban permisos reales. No añade incorporación automática por dominio.

Español es el único idioma disponible. La zona horaria se conserva como preferencia personal; no se reinterpreta el calendario de los proyectos. Los correos automáticos de tareas no están conectados: se guardan seis preferencias personales para la futura integración y se indica expresamente que no activan envíos. Las invitaciones y mensajes de acceso mantienen sus mecanismos independientes. Los estados personalizados y condiciones generales de la referencia no se añaden en esta reorganización.

## Validación

12/09/2026: 302 pruebas JavaScript y 24 comprobaciones PHP correctas. Se añadieron casos de conflicto, conservación de valores fiscales y documentos, guardado remoto no confirmado, conservación del borrador, correo pendiente de confirmación y permisos de colaborador. El ensayo de correo es simulado, sin mensajes reales.

App completa contra el clon `szbswxpkhidywaosdfcg`, con la identidad ficticia `clipper-ui-20260912@example.invalid`: guardado real y recarga de nombre personal, tipo de estudio, IBAN ficticio del emisor y preferencias; protección al salir de un formulario modificado; navegación de las secciones. Revisión visual de escritorio, menú compacto, claro/oscuro y móvil de 390 × 844 sin desbordamiento horizontal. La interfaz móvil se inspeccionó también en un iframe de ese tamaño debido a la escala de captura del navegador. No se guardaron cambios ni se enviaron correos con cuentas del equipo real.

No hay migraciones SQL, restauraciones ni cambios de backend en esta publicación. Antes de publicar se comprobó la copia programada correcta del 12/09/2026 a las 02:32:37 UTC, ejecución 34667956252.

## Puesta en marcha y reversión

Usar `scripts/dev-server.mjs` con las variables de un clon en `.env`, según la documentación de arranque del repositorio. Nunca usar producción para ensayos de escritura. Ejecutar `node --test scripts/*.test.mjs` y `php scripts/invitation-auth.test.php`.

Publicación mediante el flujo habitual `deploy-app.yml`: recursos primero y HTML después. Revertir únicamente el código a la versión anterior si hiciera falta; conservar los campos nuevos de configuración y metadatos personales, sin restaurar bloques antiguos encima de ediciones posteriores.

Publicada y verificada el 12/09/2026: commit `e5dcc4b6ef9541ba344a94fe03ad33b4d16486f5`, [ejecución 34705901492 correcta](https://github.com/estudiomoderno/moderno.app/actions/runs/34705901492). HTML v3.52 y los cuatro recursos nuevos devolvieron HTTP 200 y coincidieron con el candidato, normalizando únicamente los finales de línea. No se hicieron escrituras de prueba en producción.

## Corrección de textos v3.52.1

Se retiran la explicación de Supabase y la nota de almacenamiento/zona horaria de Mi cuenta. La instrucción «Revisa tu correo para confirmar el cambio» aparece tras solicitar realmente el cambio. Las ayudas y estados vacíos usan mensajes breves de disponibilidad; no se inventan funciones ni se ocultan errores. Los errores externos se traducen a instrucciones útiles sin mostrar nombres de servicios, códigos internos o respuestas sin tratar. No cambia el comportamiento de guardado, autenticación, permisos o datos.

304 pruebas JavaScript correctas y revisión en interfaz de Mi cuenta y estados de disponibilidad. Publicada y verificada: commit `9657e89dcb555822dbf0f822ef0d853123b3bcae`, [ejecución 34706195987, intento 2 correcto](https://github.com/estudiomoderno/moderno.app/actions/runs/34706195987). El primer intento agotó el tiempo de conexión FTPS antes de subir recursos; se reintentó sin cambiar el código. HTML identifica v3.52.1; los cinco archivos comprobados devuelven HTTP 200 y coinciden con el candidato, normalizando finales de línea. Sin escrituras de prueba en producción.
