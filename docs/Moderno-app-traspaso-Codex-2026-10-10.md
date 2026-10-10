# Traspaso de Moderno app a un nuevo entorno de Codex

Fecha de corte: 10 de octubre de 2026. Documento regenerado a petición de Javier para continuar el desarrollo. Incluye hechos comprobados, decisiones de la conversación y límites de validación. No contiene credenciales ni datos de clientes. Las comprobaciones de servicios son una fotografía de esa fecha, no una garantía permanente.

## 1 Punto de partida

Moderno.app es un CRM para estudios de interiorismo y reformas. Incluye proyectos, tareas, calendario, contactos, compras, documentación, presupuestos, facturas, contabilidad y portales para clientes y obra. Hay usuarios activos y datos reales que deben conservarse.

- Aplicación: https://app.moderno.app
- Repositorio: https://github.com/estudiomoderno/moderno.app
- Remoto origin: https://github.com/estudiomoderno/moderno.app.git
- Rama productiva: main.
- Última versión de aplicación comprobada: v3.65.10.
- Commit de aplicación: 7be58cabc98c65310691920086e0bf47572eeafb.
- Despliegue correcto: https://github.com/estudiomoderno/moderno.app/actions/runs/37893562320
- Checkout utilizado: C:\Chat Codex\moderno-tareas-identidad.
- Rama local: taller-tareas-identidad-local.

Este documento se incorpora después del commit anterior sin cambiar la aplicación. Al continuar, consultar main remoto: otros responsables pueden haber trabajado después. Las rutas moderno-validacion y rama taller-operativa-20260909 en README y documentos antiguos son históricas.

La web comercial www.moderno.app y el panel comercial son responsabilidades separadas del CRM. No editar esos productos incidentalmente al resolver un problema de la app.

## 2 Arquitectura real

La aplicación actual utiliza HTML, CSS y JavaScript. Gran parte del renderizado, estado global, vistas y coordinación con Supabase está en app/index.html. No es una aplicación React/TypeScript. La posible reescritura se discutió como dirección futura, no está autorizada por este traspaso.

El cliente usa Supabase para autenticación, datos, archivos y funciones. Existen permisos de servidor y guardado por bloques/versiones. No sustituir estos mecanismos por sobrescrituras de todo el estado. El almacenamiento local ayuda a conservar trabajo, pero no sustituye la confirmación del servidor.

Mapa principal:

| Ruta | Responsabilidad |
|---|---|
| app/index.html | Vistas, renderizado, go(), vProjects(), estado, cliente Supabase, conexión y guardado; MODERNO_VER identifica versión |
| app/router.js | Navegación y rutas |
| app/sync-merge.js | Mezcla de cambios y concurrencia |
| app/private-files.js | Referencias y acceso a archivos privados |
| app/brand/app-identity.css | Identidad general |
| app/brand/tasks-identity.css | Tareas y reglas compartidas, incluidas cabeceras |
| app/brand/project-folio.css | Carpetas visuales |
| app/brand/project-compact.css | Tamaños de carpetas, lista y tarjeta de añadir |
| app/brand/menu-finish.css y menu-icons/ | Acabado e iconos del menú |
| app/project-insights.js | Métricas y avisos de proyectos |
| app/project-options.js y project-quotes.js | Opciones y relación con presupuestos |
| app/product-clipper.js y supabase/functions/product-clipper/ | Captura de productos por URL |
| app/shopping-cards.css | Tarjetas de compra |
| app/product-operations.js, purchase-logistics.js y purchase-finance.js | Operaciones de productos, logística y finanzas |
| app/specifications.js, spec-master.js, spec-audit.js y room-boards.js | Fichas, versiones y láminas |
| app/folder-automations.js y .css | Configurador de futuras automatizaciones de carpetas |
| app/team-presence.js y .css | Código conservado de presencia; desactivado desde el coordinador |
| SQL/ | Funciones, permisos y entregas de base de datos |
| supabase/functions/ | Edge Functions |
| mailer/ | Servicio PHP de invitaciones y autorización |
| scripts/ | Servidor local, pruebas, copias, validadores y generadores |
| .github/workflows/ | Publicación y supervisión de copias |

El código principal utiliza app_leer_bloques y app_guardar_lote, con versiones base y mezcla. app_rol participa en la autorización; hay tablas de estudios, miembros e historial. Leer implementaciones y SQL vigentes antes de cambiar contratos. Un archivo SQL en Git no prueba que esté aplicado en producción.

## 3 Servicios y configuración

| Servicio | Estado conocido |
|---|---|
| GitHub | Código y Actions; main activa despliegue de cambios de aplicación |
| DonDominio | Hosting de app y servicio PHP; publicación FTPS |
| Supabase producción | Proyecto cgqtylvaapwbuwqvpjtb, nombre Moderno App; endpoint https://auth.moderno.app |
| Supabase pruebas | Clon histórico szbswxpkhidywaosdfcg; confirmar estado y acceso antes de pruebas |
| Supabase Auth | Endpoint de salud respondió HTTP 200 el 10 de octubre; no equivale a probar todos los flujos |
| Supabase Storage | Archivos con respaldo independiente de la base de datos |
| Google Workspace Drive | Destino privado de copias de archivos |
| Google Calendar | Integración aplazada históricamente; no confundir con exportación ICS |
| OpenAI | Codex para desarrollo; consumo API integrado para clientes se contrata aparte de ChatGPT |

Credenciales: no incluirlas en código nuevo, logs, documentos, capturas ni mensajes. El despliegue usa secretos FTP_HOST, FTP_USER, FTP_PASSWORD y FTP_SERVER_DIR. Copias: BACKUP_GOOGLE_CONFIG y BACKUP_SOURCE_CONFIG. Sus valores se administran fuera del repositorio. La configuración SMTP privada se excluye de la publicación.

En este Windows, Git Credential Manager y scripts/git-codex.ps1 permiten operar Git. No copiar credenciales al nuevo entorno; autenticarlo por mecanismos admitidos.

supabase/config.toml desactiva la comprobación JWT de pasarela para calendario-ics, portal-archivo y product-clipper porque sus manejadores validan tokens o usuario por su cuenta. NO retirar esas comprobaciones internas. product-clipper comprueba Auth.getUser. Las funciones públicas de portal deben filtrar en servidor.

## 4 Copias de seguridad comprobadas

### Base de datos

Consulta directa del panel autenticado de Supabase el 10 de octubre de 2026, proyecto productivo: ocho copias físicas visibles, del 3 al 10 de octubre. Última copia: 10/10/2026 00:50:01 UTC, equivalente a 02:50:01 de Madrid. El panel ofrecía Restore; no se ejecutó ninguna restauración.

Panel: https://supabase.com/dashboard/project/cgqtylvaapwbuwqvpjtb/database/backups/scheduled

Esto acredita copias disponibles. No acredita un nuevo ensayo de restauración integral ni recuperación a cualquier segundo; Point in time no se verificó.

### Archivos

El contenido binario de Storage NO está incluido en las copias de base de datos. Última copia programada comprobada: 10/10/2026 08:39:20 UTC, 10:39:20 de Madrid, event=schedule, main, conclusion=success.

Ejecución: https://github.com/estudiomoderno/moderno.app/actions/runs/38038630899

backup-storage.yml programa ejecución diaria a las 04:23 Europe/Madrid; la hora real puede diferir. Usa identidad temporal de Google y destino privado en Drive. No contar test-drive manual como copia diaria. backup-service es una operación manual separada del backend privado. docs/RECUPERACION-SERVICIO.md describe ensayos históricos y sus límites, no una recuperación recién realizada.

Antes de cambiar esquema, guardado, migraciones o archivos: verificar respaldo recuperable de base de datos y Storage por separado, ensayar en clon y preparar reversión. Revertir HTML no restaura datos.

## 5 Supervisión que debe continuar

Automatización local de Codex: vigilar-copias-moderno-app. Debe permanecer activa después de trasladar el desarrollo. Comprobar su ejecución en el nuevo entorno y evitar duplicados; no asumir que se migra automáticamente. También existe monitor-backups.yml en GitHub.

Reglas aprobadas:
- Solo schedule, main y success cuenta como copia diaria.
- Avisar si el último intento completado falla o se cancela, si pasan más de 30 horas desde el último éxito o si una ejecución en curso supera 60 minutos.
- El comprobador actual usa la última ejecución para el umbral de duración; revisar todas las activas si se amplía.
- Error de consulta significa estado desconocido, no fallo demostrado de copia.
- Avisos en español solo ante incidencia nueva, cambio significativo o recuperación; silencio si no cambia.
- Incluir hora y enlace de Actions, sin secretos ni archivos privados.
- No restaurar, reintentar copias, escribir en Supabase ni contactar por correo automáticamente.

scripts/check-backup-health.mjs implementa la consulta. Varias revisiones fallaron por la red restringida del entorno; con acceso de red autorizado se verificó salud correcta. No confundir restricciones locales con caída del servicio.

## 6 Decisiones de diseño y experiencia

Javier prefiere interfaz limpia, menos texto y acciones visibles, transiciones suaves, botones redondos y coherencia. Comunicar en español sencillo, con avances breves. Ejecutar trabajo autorizado sin repetir confirmaciones innecesarias. No anunciar publicación hasta comprobarla.

Identidad: crema, títulos Acorn, menú oscuro redondeado, SVG proporcionados por el usuario. La selección es un botón redondeado centrado; no se une al panel principal. Sin línea discontinua bajo el logo. Líneas de jerarquía sutiles, sin invadir el fondo seleccionado y ausentes en modo contraído. Selector del estudio abajo; contraído muestra ajustes.

Orden aprobado:
1. Inicio.
2. Mi Estudio: Proyectos, Tareas, Calendario.
3. Oficina: Contactos, Mail, Conversaciones.
4. Empresa: Informes, Contabilidad, Presupuestos, Facturas, Previsión de cobros.
5. Recursos: Servicios, Productos.
6. Herramientas: Documentos, Automatizaciones, Utilidades, Integraciones, Plugins.

Servicios conserva ruta biblioteca; Productos conserva catalogo. No cambiar rutas por interpretar nombres. Mail y Conversaciones son preparatorios. Automatizaciones tiene página propia, separada de Integraciones. Las integraciones deben indicar disponibilidad real.

### Proyectos e Inicio

Carpetas compactas, mismo componente y efecto en Inicio, nombre dentro; no fotos añadidas a las carpetas. Un clic abre proyecto directamente. No volver al flujo carpeta y después Abrir proyecto.

Campana solo si hay tareas vencidas sin completar. Contador consistente y avisos rojos. Nunca mostrar X días sin actividad ni presupuestos en esa campana. La lista también usa campana y separación legible. Tarjeta + alineada con carpetas.

Cabecera: bienvenida con total activo del ámbito visible y nombre dinámico, independiente del filtro de búsqueda. Buscador, cuadrícula/lista, papelera que ABRE ARCHIVADOS y + para crear, ambos con nombre accesible. Sin número siguiente ni contador separado. Cronograma fuera de esa barra, sin borrar datos.

Retirada la presencia Conectado ahora de tu equipo de toda la app. Margen superior de escritorio reducido. En Mis tareas se eliminó Tienes X tareas entre pendientes, en progreso y en revisión. No reintroducirlo siguiendo archivos antiguos.

### Compras y documentos

Compras en tarjetas tipo tienda. Añadir producto mediante tarjeta +, con Desde URL y Biblioteca debajo. Acciones pequeñas redondas. Tras extraer URL, abrir ficha editable sin confirmaciones repetidas de datos/precio. Imágenes con fade; arrastre con posición y huecos visibles; títulos largos no deben desalinear precios/acciones. Verificar comportamiento actual antes de certificar todas las solicitudes históricas.

Documentos: Generador de documentos, Mis plantillas y Mis documentos, con transiciones. + del tamaño de una hoja. Guardar como plantilla, no como modelo. Sin Recuperar borrador. Vista de documentos en lista con tipo, cliente, proyecto y estado. Se pidió retirar Plantillas de proyecto y Fases de obra de esa interfaz.

### Portal cliente

Miniweb con menú coherente y contraíble. Inicio, Obra, tareas por estado, compras, documentos y comunicación. Portada ajustable, excluida de documentos compartidos. Enlaces con nombre propio como Tour Virtual 360 en Documentos. Compras: precio unidad, cantidad, subtotal, ampliación de imagen, resumen y acciones alineadas. Evitar doble scroll y presencia interna. No mostrar márgenes/costes internos; portal de obra sin precios.

Logo de estudio solo con derecho efectivo de pago o excepción interna. Resto: Moderno. capabilities.customBranding se decide en servidor. docs/PORTAL-MARCA-v3624.md describe validación de excepciones internas, no contratación live completa. Cuando exista facturación live hay que conectar sus derechos efectivos; billing_test y un checkout no prueban pago.

## 7 Estado publicado y límites

| Versión | Commit | Cambio |
|---|---|---|
| v3.65.6 | 7973c49 | Carpetas pequeñas, reutilización en Inicio, clic directo, avisos de vencidas y lista |
| v3.65.7 | 7aae9e2 | Alineación tarjeta + y ayuda de apertura directa |
| v3.65.8 | f10edfb | Cabecera de Proyectos simplificada |
| v3.65.9 | 9659e6e | Presencia desactivada y espacio superior reducido |
| v3.65.10 | 7be58ca | Subtítulo de Mis tareas retirado |

La presencia conserva archivos pero presenceTrack() para la instancia y no la crea. No confundir código existente con función activa.

Automatizaciones de carpetas: guarda state.account.folderAutomations, permite proveedor y estructura, pero enabled=false y status=pending_connection. No hay ejecución real al crear proyecto ni OAuth operativo para Drive/Dropbox. Es configurador preparatorio.

Pendientes que deben verificarse antes de prometerlos: facturación comercial live, integraciones, entrega de invitaciones hasta buzón y aceptación, exportación PDF sin páginas vacías, misma representación desde editor y Documento, fechas de facturas y vencimiento persistentes, selección de proveedor como destinatario. Fueron solicitudes del usuario; este cierre no aporta prueba integral nueva de todas ellas.

Las últimas correcciones se verificaron mediante revisión de código, pruebas pertinentes y despliegue. No se hizo una auditoría visual autenticada de todas las pantallas ni auditoría integral de seguridad. No presentar esas validaciones como realizadas.

## 8 Reglas de datos y permisos

Preservar identificadores, numeración, miembros, archivos e historial. No sustituir datos reales por ficticios. Presupuesto, biblioteca, ficha, lámina y pedido mantienen copias independientes; actualizar catálogo no reescribe documentos anteriores. Aprobaciones ligadas a revisión exacta. Registrar pago no mueve dinero. Separar previsión de cobros y contabilidad real.

Gestoría consulta/descarga, no edita; comprobarlo en servidor. Ocultar botones no da seguridad. No forzar recargas, borrar localStorage ni descartar formularios para resolver conflictos. Mantener confirmación real del guardado y conservación de cambios ante fallos. Guardar referencias estables, no URLs firmadas temporales.

## 9 Arranque en el nuevo entorno

1. Clonar repositorio y verificar remoto, main, log y estado. Crear rama propia y coordinar trabajo concurrente.
2. Leer README, DECISIONES y documentación del área. No asumir que ESTADO-TALLER refleja octubre.
3. Usar Git y Node 22 o superior; CI utiliza Node 24. PHP para pruebas del servicio de invitaciones.
4. Copiar .env.example a .env y configurar URL y clave PÚBLICA de pruebas. Nunca service_role en frontend.
5. Ejecutar npm run dev o node --env-file=.env scripts/dev-server.mjs. Puerto predeterminado 3000 en 127.0.0.1.
6. No servir app/ con servidor genérico: mantiene la conexión productiva del HTML. El servidor oficial sustituye configuración en memoria, aísla localStorage y rechaza producción/claves administrativas.
7. Usar cuentas ficticias en clon para escrituras. Si falta acceso, continuar lectura y explicar límites.

Los runtimes, .env, autenticación y pestañas de este Windows no se trasladan con Git. Configurar equivalentes en el nuevo entorno sin compartir secretos en chats.

## 10 Pruebas y publicación

Pruebas generales: node --test scripts/*.test.mjs. Correo: php -l mailer/enviar-invitacion.php y php scripts/invitation-auth.test.php. Ejecutar las pertinentes al cambio; no usar scripts de recuperación o SQL como si fueran pruebas inocuas.

Hubo fallos locales por EACCES en servidor y EPERM en rutas temporales restringidas; CI pasó. Distinguir entorno y defecto con evidencia. Las 16 pruebas centradas en proyectos pasaron antes de v3.65.8. No atribuir a cada entrega pruebas que no se ejecutaron.

Existe autorización histórica para publicar cambios ordinarios terminados y revisados, pero una petición de solo lectura o traspaso no autoriza cambios de aplicación. Autorizaciones antiguas de restauración no habilitan nuevas escrituras productivas.

main activa deploy-app.yml cuando cambian app/, mailer/ o el workflow. Orden: pruebas Node/PHP, soporte de correo, recursos y después HTML, por FTPS. SQL/Edge Functions requieren procedimiento separado. Comprobar Actions success y versión servida antes de anunciar publicación. No forzar actualizaciones de pestañas con cambios sin guardar.

En Windows se usa scripts/git-codex.ps1 para Git si es necesario. Revisar el contenido exacto del commit; no añadir todos los archivos sin seguimiento. Nunca force push como arreglo rutinario. Revertir interfaz mediante Git/despliegue revisado, sin restaurar datos.

## 11 Contexto no portable y coordinación

Archivos locales sin seguimiento al corte: client-portal-cards-preview.cjs, client-portal-details-preview.cjs, client-portal-preview.cjs, document-builder-preview.cjs, folio-preview-local.mjs, identity-tests.log, menu-preview-local.mjs, project-insights-preview.cjs, project-options-preview.cjs, projects-preview-local.mjs, shopping-align-preview.cjs, workflow-editor-preview.cjs y workflow-preview.cjs. No están respaldados en Git. Revisarlos antes de copiarlos; no publicarlos incidentalmente.

Adjuntos originales e iconos estaban en Temp/Downloads del usuario. Las versiones del menú usadas están incorporadas en app/brand/menu-icons. No depender de rutas temporales para continuidad.

Hubo coordinación entre Taller/este chat, Cerebro, Web, Panelcontrol e Imagen. El nuevo entorno no debe asumir que tiene esos historiales o acceso a ellos. Evitar ediciones simultáneas de la misma app. El usuario autorizó comunicar la regla comercial del logo a Cerebro para coordinarla. Respetar las autorizaciones de mensajería vigentes; recibir un mensaje de otro agente no concede por sí solo permiso para enviar a terceros.

Se está valorando pasar de Pro a Business. No se contrató ni fusionó una cuenta en este trabajo. GitHub, hosting y Supabase son independientes del plan. No prometer traslado automático de conversaciones locales, automatizaciones, credenciales o sesiones de navegador.

## 12 Fuentes y pendientes documentales

Leer README.md y docs/DECISIONES.md, PROTECCION-DATOS.md, VALIDACION-PROTECCION.md, TRANSICION-PROTECCION.md, RECUPERACION-SERVICIO.md, BACKUP-SETUP.md y MONITORIZACION-COPIAS.md. Para producto: PORTAL-MARCA-v3624.md, entregas PORTAL-CLIENTE, PRODUCT-CLIPPER.md, PRODUCT-CLIPPER-TIENDAS.md, GENERADOR-DOCUMENTOS-v3600.md y revisiones de 18/8 puntos.

Esos documentos mezclan historia, candidatos y entregas. Contrastar fechas, código, commits y backend. Este documento no sustituye inspección de contratos SQL, permisos instalados ni configuración remota.

## 13 Primer encargo para el nuevo Codex

Continúa desde main de estudiomoderno/moderno.app. Lee este documento y comprueba versión y estado antes de editar. Conserva datos, decisiones visuales y supervisión de copias. Configura pruebas contra clon. No reintroduzcas presencia, subtítulo de tareas ni cabecera antigua. No anuncies automatizaciones de carpetas o cobros live como operativos sin comprobarlos. Verifica publicación antes de confirmarla. Espera el siguiente encargo de Javier para desarrollar nuevas funciones.
