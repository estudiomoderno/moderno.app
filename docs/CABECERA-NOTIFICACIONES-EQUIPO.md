# Notificaciones, equipo y ajustes — v3.65.46

Petición del propietario: aplicar «Documento sin título.pdf» (18/10/2026). Rama `interfaz/notificaciones-equipo`, base `387f222` (#69). Se adaptan sus referencias de componentes a HTML/CSS/JavaScript nativos; no se introduce React, una biblioteca de componentes ni una nueva fuente. La nueva cabecera usa texto sans-serif, botones blancos de contorno, bordes grises y contador rojo como en las referencias. El resto de la identidad blanca, logotipo y fuentes permanece intacto.

## Comportamiento

- Campana con el número de avisos no leídos de `state.notifs`, nombre accesible dinámico, sin cifra cuando no hay pendientes y visualización `99+` por encima de 99. Se conservan `notifModal()` y el marcado como leído existente.
- Grupo «Equipo» con fotos superpuestas, iniciales si falta una foto, indicador verde y número de personas en línea. Las pestañas de la misma persona se deduplican. Los nombres aparecen al pasar el ratón y en accesibilidad. Hasta cuatro retratos y un contador adicional; presentación compacta en móvil.
- Menú de tres puntos para el perfil, ajustes y herramientas existentes. No se añaden botones de invitación ni reloj. En escritorio se mantiene el menú y selector de estudio original; en móvil/tablet y Ajustes se muestran los mismos accesos autorizados mediante una cabecera compacta.
- El ancho reservado para las pestañas de proyecto se adapta al grupo del equipo. Los menús siguen admitiendo teclado, Escape y movimiento reducido. Portales independientes, documentos en edición y visor a pantalla completa mantienen su espacio.

## Presencia y protección

`header-presence.js` utiliza exclusivamente el canal privado existente `equipo:<UUID del estudio>`, con Presence, sin cursores ni mensajes de documentos. Solo anuncia identificador de usuario, sesión aleatoria, nombre y foto ya configurados. No envía correo, rutas, texto de formularios ni contenido de proyectos. No se guardan registros, fotos ni listas de conexiones en la base de datos o Storage.

La consulta de catálogos PostgreSQL de producción del 18/10/2026 confirmó RLS activa y las dos políticas existentes `moderno_equipo_recibir`/`moderno_equipo_enviar`, limitadas a administradores y colaboradores mediante `app_presencia_autorizada` y `app_rol`. **No se aplicó SQL ni se modificaron permisos en producción.** Clientes, contratistas y gestoría no se suscriben. Los datos de presencia son declarados por los clientes y no son prueba de autoría ni de permisos.

La interfaz no muestra una cifra en línea hasta confirmar suscripción, envío de presencia y sincronización. Un fallo muestra «Sin conexión»; durante la conexión muestra «Conectando…». Desconectar, ocultar una pestaña o cambiar de estudio/identidad elimina los avatares anteriores. La propia interfaz también comprueba el ámbito antes de pintar un estado recibido con retraso. El canal de sincronización de documentos y el guardado actual no cambian.

## Verificación y límites

- 473 pruebas Node, incluidas cuatro nuevas pruebas del ciclo de presencia con un cliente simulado: confirmación, deduplicación, reconexión, rechazo de envíos, cambio de estudio/usuario/rol, callbacks antiguos, pestaña oculta y validación de fotos.
- 24 combinaciones de rol/estudio para lectura y envío mediante `scripts/team-presence-sql.mjs` en PostgreSQL local aislado (PGlite), sin credenciales de clientes.
- App completa con servidor oficial aislado y Chromium a 1440/1100/390 px: contador y marcado como leído, fotos ficticias, texto seguro, estado sin conexión, ámbito de estudio, ausencia de botones extra, ancho disponible, borradores, registros intactos y desactivación reversible. Regresión de pestañas a 1440/1100/390 px e inspección visual clara/oscura y móvil. Peticiones externas abortadas; no se ensayan escrituras productivas.
- PHP se comprueba en Actions, sin enviar correo; no está instalado localmente. No se ha probado la conexión WebSocket con dos sesiones Auth remotas ni con usuarios reales. La validación de eventos del cliente usa dobles de prueba y la validación SQL usa roles ficticios; no equivale a un ensayo extremo a extremo de Realtime.
- El proyecto preferente `moderno-pruebas` está activo pero vacío, sin los miembros ni las funciones de la app. Un ensayo transaccional de políticas no devolvió resultado válido por un error del conector; la consulta posterior confirmó que no quedaron funciones ni políticas del ensayo. No se presenta como prueba superada ni se ha aprovisionado el esquema completo.

## Publicación y recuperación

Publicación por PR tras CI, con comprobación SHA-256 de 20 recursos públicos. La evidencia final se registra en el PR. Para recuperar la interfaz anterior, revertir este commit y publicar por el mismo workflow; no restaurar datos. Desactivación local verificable: `ModernoHeaderActions.setEnabled(false)` restaura la presentación previa y detiene la presencia. No fuerza recarga de pestañas abiertas ni borra borradores.
