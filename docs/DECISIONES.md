# Decisiones de TALLER

## 2026-09-09 — Pausa confirmada y hallazgos previos a v3.30

El usuario confirma que el equipo está en pausa y había guardado sin formularios pendientes ni errores. No se interpreta como cierre de todas las sesiones antiguas. La revisión identifica permisos financieros insuficientes en el candidato y límites precisos de validación del correo; véase ACCESO-CORREO-VALIDACION.md. No publicar ni cambiar permisos productivos basándose solo en la pausa o en que pasen pruebas que reproducen defectos.

## 2026-09-09 — Entorno y continuidad

- TALLER es la tarea principal. Explicar en español sencillo y resumir estado y pendientes antes de desarrollar funcionalidades, según petición del usuario.
- Mantener la aplicación actual durante la preparación; servidor Node sin dependencias y con rutas limpias.
- Actualizar README, estado y decisiones al cerrar trabajos importantes.
- Distinguir hechos comprobados de información histórica. El traspaso no sustituye al código ni a la configuración real.
- La sesión local usa Supabase real. Preparar un entorno de pruebas antes de ensayos que escriban datos.
- Revisar publicación antes de subir app/ a main: existe flujo automático FTPS.

## Criterios históricos del traspaso, a confirmar al trabajar en cada área

- Separar previsión de cobros de contabilidad real.
- Facturas inmutables y numeración preservada.
- No mostrar costes internos ni márgenes en documentos y portales de clientes; portal de obra sin precios.
- Español activo; revisar diccionario existente para textos nuevos.
- React/TypeScript y permisos por fila son una dirección futura, no una reescritura autorizada ahora.

Estas referencias no verifican la implementación técnica ni fiscal.

## 2026-09-09 — Sincronización autorizada

El usuario autoriza subir automáticamente a GitHub los cambios revisados al terminar cada trabajo. Usar la rama taller mediante Git local autenticado (scripts/git-codex.ps1 en este entorno). La autorización de publicación se amplía en la decisión siguiente.

## 2026-09-09 — Publicación y protección de usuarios reales

El usuario autoriza que TALLER desarrolle, compruebe y publique las modificaciones terminadas de la aplicación para todos los usuarios. Hay usuarios activos con datos y archivos reales que deben conservarse.

- Trabajar en taller, comprobar el cambio y llevar a main la entrega validada. No publicar cada edición intermedia. No hace falta volver a pedir autorización para publicaciones ordinarias dentro de este alcance.
- Verificar el resultado de GitHub Actions y la versión servida en producción antes de afirmar que se ha publicado. El flujo FTPS existe; su ejecución efectiva todavía no se ha verificado desde TALLER.
- Conservar la versión anterior y un procedimiento de reversión del código. Revertir HTML no restaura datos ni archivos.
- Mantener compatibilidad con datos existentes y sesiones que todavía ejecuten la versión anterior. No forzar una recarga que pueda descartar trabajo sin guardar. Los usuarios recibirán la versión al abrir o recargar la app; no prometer actualización inmediata de todas las pestañas abiertas.
- No borrar, reinicializar ni sustituir datos reales por datos de prueba. Probar escrituras con datos de prueba aislados.
- Antes de cambios que afecten al esquema, guardado, migraciones o archivos: comprobar respaldo recuperable de base de datos y de archivos de Storage por separado, ensayar recuperación y migración en un entorno de pruebas y definir reversión. Si no es posible verificarlo, detener esa publicación y explicar el bloqueo.
- Pendiente prioritario: comprobar con acceso real a Supabase los respaldos, la recuperación de archivos y la disponibilidad de un entorno de pruebas. No dar por existente una protección todavía no verificada.

## 2026-09-09 — Copias externas de archivos

- Destino: carpeta privada de la unidad compartida de la empresa en Google Workspace. Configuración y credenciales solo en secretos de Actions, nunca en este repositorio público.
- Google usa identidad temporal de GitHub, restringida al repositorio, main y workflow de copias. No se debilita la política que prohíbe claves permanentes de cuentas de servicio.
- El usuario autorizó expresamente la clave S3 de acceso completo y su almacenamiento en GitHub; el programa solo lee Storage.
- Prueba sintética de recuperación y primera copia real verificadas. Copias completas diarias a las 04:23 de Madrid, sin eliminación automática de anteriores.
- Sigue pendiente la recuperación integral de base de datos y archivos en entorno aislado, y la supervisión externa de copias ausentes. Consultar BACKUP-SETUP.md antes de cambios que afecten a datos.

## 2026-09-09 — Taller Moderno.App y futura comercialización

- Nombre de la tarea principal: Taller Moderno.App.
- app.moderno.app seguirá siendo el CRM; www.moderno.app será el escaparate y la entrada a las suscripciones.
- Conservar el estudio piloto, sus miembros, identificadores y archivos al introducir planes comerciales.
- La revisión inicial y las propuestas se recogen en PLAN-PRODUCTO.md. Los precios, límites y condiciones comerciales todavía no están decididos.

## 2026-09-09 — Validación aislada de protección

- El usuario autorizó expresamente restaurar la copia de base de datos en un proyecto separado y usar su clave administrativa temporalmente en memoria para preparar pruebas y recuperar archivos. No guardar esa clave en GitHub ni en archivos.
- Taller Moderno.App es el único responsable de estos cambios. El candidato se desarrolla en una rama y carpeta aisladas; Web y Panelcontrol no editan el CRM.
- Se verificaron recuperación de base de datos y contenidos, permisos con identidades ficticias y guardado concurrente. Resultados, límites y transición pendientes en VALIDACION-PROTECCION.md.
- No se modifica producción ni se activa una automatización de supervisión. La publicación requiere completar los flujos pendientes y coordinar las sesiones del equipo piloto.

## 2026-09-09 — Visores privados y continuidad

- Candidato local: portales filtrados en servidor, enlaces firmados de 60 segundos y actualización que espera al guardado. Mantener referencias de archivos; nunca guardar los enlaces temporales.
- Desarrollo local conectado exclusivamente a pruebas, con almacenamiento local separado. Las claves administrativas no pertenecen a .env del cliente.
- ICS, Realtime, visores e importación ficticia ensayados en el clon. La validación del correo incluido en la entrega y la coordinación de sesiones siguen pendientes; no publicar el candidato incompleto.
- Procedimiento de transición y suspensión en TRANSICION-PROTECCION.md. Producción no se ha modificado en esta validación.

## 2026-09-09 — Google Calendar aplazado

- El usuario confirma que Google Calendar nunca llegó a conectarse y decide hacerlo más adelante. Queda fuera de la actualización de protección; no exigir sus fuentes ni una cuenta para probar Calendar como condición para publicarla.
- Esta decisión no aplaza la validación del inicio de sesión, el correo incluido en la entrega ni la coordinación de sesiones del piloto. La función calendario-ics recuperada es un flujo distinto de la integración pendiente con Google Calendar.

## 2026-09-09 — Primera tanda de operativa aprobada

- El usuario aprueba prioridades/fechas, apertura directa de tareas, estado fiel de guardado, búsquedas claras, nombres en español y encabezado móvil compacto.
- Rama taller-operativa-20260909 sobre d28c710, que conserva las protecciones previas. La entrega operativa se registra aparte; no publicar incidentalmente sus antecesores todavía pendientes de transición.
- Sin integraciones, planes, cobros, nueva gestión de visibilidad de archivos ni formulario breve de tareas. Alcance, pruebas y bloqueo de publicación en OPERATIVA-DIARIA.md.

## 2026-09-09 — Gestoría de solo lectura

- Confirmado por el usuario: Gestoría puede consultar Finanzas/Contabilidad y descargar sus PDF; no puede modificar los datos.
- La autorización se comprueba en el servidor. Ocultar botones no basta. El candidato incorpora consulta separada, bloqueo de escritura y acceso limitado a los PDF contables.
- Los PDF originales adjuntos se ofrecen por separado del resumen imprimible, que no sustituye al documento original.
- Los cambios de permisos siguen en desarrollo y no están publicados. La lectura filtrada y el guardado de colaboradores deben quedar integrados y verificados antes de entregar el conjunto.


## Cierre de recorrido 3.39–3.45 (11/09/2026)

Biblioteca, ficha, lámina, presupuesto y pedido conservan copias independientes. Actualizar biblioteca es selectivo y explícito; no se reescriben documentos anteriores. Los IDs ambiguos se diagnostican sin renumerarlos. Las revisiones de lámina se anexan y su historial es administrativo; preparar una salida para cliente/diseño/obra no concede accesos.

Una aprobación pertenece a una revisión exacta y no revive por volver a un valor anterior. Comparar ofertas exige iguales fichas/revisiones/cantidades/unidades. Fecha, incidencia, recepción, instalación, factura y pago son registros separados. Registrar un pago no mueve dinero.

Las entregas se publican tras validación y comprobación de recursos. La invitación hasta un buzón real y alta productiva necesita destinatario/alta concretos; no se certifica con pruebas locales. Mantener las limitaciones y evidencias en ENTREGA-V345.md y el estado en ESTADO-TALLER.md.
