# Decisiones de TALLER

## 2026-10-18 — Cabecera horizontal oscura y plegado hasta el símbolo

El propietario recupera la identidad del menú lateral anterior: fondo negro, formas redondeadas y flecha circular clara con borde oscuro, ahora aplicados a la cabecera horizontal. La flecha comprime todos los accesos de la cápsula, dejando únicamente el símbolo compacto oficial y el control para desplegar. Al abrir reaparecen los iconos y se conserva el grupo de navegación. Esta petición sustituye la retirada del control de plegado de v3.65.37. El perfil y las notificaciones permanecen independientes. Alcance y reversión: [CABECERA-OSCURA-PLEGABLE](CABECERA-OSCURA-PLEGABLE.md).

## 2026-10-18 — Herramientas en el perfil y Conversaciones en el proyecto

El propietario retira Documentos del menú superior, mueve Conversaciones al dock de cada proyecto junto a AI y reúne Automatizaciones, Plugins e Integraciones en el menú del icono del usuario. Desaparece el grupo superior Más herramientas. Se conservan las rutas y los documentos existentes; Documentos del proyecto mantiene todos sus archivos. Conversaciones reutiliza su estado preparatorio «Próximamente», sin implementar chat ni guardado. Se mantienen los permisos actuales de cada apartado. Esta petición amplía el dock con un décimo acceso para los perfiles que ya tenían permitido Conversaciones. Detalles: [REUBICACION-HERRAMIENTAS](REUBICACION-HERRAMIENTAS.md).

## 2026-10-18 — Cabecera compacta por iconos y navegación interna de Finanzas

El propietario pide que el símbolo oficial mantenga el fondo fijo, incluso al pasar el cursor, y que la barra superior muestre únicamente iconos con nombres emergentes. Pulsar Finanzas reorganiza la misma cápsula con Facturas, Presupuestos, Contabilidad, Informes y Previsión de cobros, más una flecha para volver. Cambiar ese grupo no cambia la vista ni descarta formularios; navegar a un módulo sigue usando sus handlers y permisos originales. Se mantiene la identidad, el dock y el alcance de datos existente. Detalles y reversión en [MENU-SUPERIOR-ICONOS](MENU-SUPERIOR-ICONOS.md).

## 2026-10-18 — Decisiones y aprobaciones integradas en Inicio de proyecto

El propietario **aprueba desarrollar** un módulo de **Decisiones y aprobaciones** como parte del **Inicio de cada proyecto**. **No se añade ningún icono al dock**; la barra actual se mantiene con sus nueve accesos y marca, fuentes y colores corporativos. La función debe vincular elecciones de materiales, mobiliario, planos y presupuestos a la **revisión exacta** del elemento, con responsable, fecha, respuesta e historial; mostrar decisiones pendientes y aprobadas. Vincular con Compras, Tareas, Documentos, Economía y Obra **sin duplicar archivos ni entidades** ni ejecutar pedidos o pagos automáticamente.

Implementación a cargo de **Taller Codex Moderno.app**, en etapas pequeñas: (1) UI/recorrido de presentación y demostración con datos inventados, sin persistencia real; (2) aprobación interna persistente y auditada, con RLS y modelo de revisiones **solo tras validación y nueva autorización específica de operaciones sensibles productivas**; (3) vínculos comprobados con tareas/compras/planos/presupuestos; (4) opción de aprobación por cliente solo con identidad/alcance/evidencia verificables y autorización separada. Los permisos, copias de BD/Storage, pruebas aisladas y rollback sin restaurar datos son condiciones imprescindibles. No modificar el logotipo actual ni implementar IA (que sigue aplazada). **Encargo principal: [#60](https://github.com/estudiomoderno/moderno.app/issues/60).**


## 2026-10-18 — IA de proyectos reservada para algún plan de pago; desarrollo aplazado

La pestaña **AI** del proyecto se ha definido como futuro asistente de **gestión del estudio** (consultar estado y pendientes, proponer tareas y compras revisables, redactar documentos y comunicaciones). **No** será un generador de renders o diseño alternativo a Rayon. Estará incluida en **algún plan de pago de Moderno.app**, todavía sin elegir cuál ni fijar cuotas o precio. El modelo/proveedor y presupuesto de consumo API también quedan por decidir.

**Por orden expresa del propietario, la IA queda en pausa: no implementarla, conectar APIs, contratar servicios, cobrar, activar con clientes o enviar datos reales hasta una futura solicitud explícita.** El foco actual es **terminar el diseño** de Moderno.app. Conservar la pestaña AI existente sin funcionalidad ni gasto. Los requisitos de permisos, confirmación humana antes de escribir, privacidad, coste, fases y seguridad quedan recogidos en [encargo #59](https://github.com/estudiomoderno/moderno.app/issues/59).


## 2026-10-18 — Dock de proyecto por grupos, Planos, AI y Utilidades

El propietario solicita expresamente nueve accesos inferiores solo con iconos y nombres al pasar el ratón: Inicio | Planos / Obra | Tareas / Compras | Economía / Documentos | AI | Utilidades. La cápsula y los separadores siguen su esquema, con identidad oficial. Esta decisión actualiza la restricción histórica que situaba Planos exclusivamente dentro de Documentos: ahora es un acceso del proyecto que filtra los PDF e imágenes existentes; Documentos sigue mostrando todos los archivos. No se crean ni migran entidades. Utilidades se traslada del menú general al proyecto, reutilizando las calculadoras y sus permisos; AI queda vacío hasta concretar su contenido, sin servicios nuevos. El Portal del cliente se conserva en las opciones del proyecto. Pruebas, límites y reversión: [DOCK-PROYECTOS](DOCK-PROYECTOS.md).

## 2026-10-17 — Cabecera flotante y símbolo compacto en escritorio

El propietario solicita una cápsula superior superpuesta como el dock inferior, sin la fila de espacio de trabajo ni el control de tema y con notificaciones junto al perfil. Se usa exclusivamente el símbolo compacto original del menú antiguo comprimido, conservando su SVG, Acorn y paleta; esta indicación actualiza la presentación ancha del primer lote de #49, sin introducir otro logotipo. Los selectores reales de estudio/espacios siguen accesibles dentro del perfil y todos los módulos actuales se mantienen. Alcance, pruebas y reversión en [BARRA-SUPERIOR-FLOTANTE](BARRA-SUPERIOR-FLOTANTE.md).

## 2026-10-17 — Segundo taller: «Taller Nueva app Codex», sin conexión a Supabase

El propietario aprueba un segundo taller llamado exactamente **«Taller Nueva app Codex»**, separado del **Taller Codex Moderno.app**. Su misión es probar una nueva navegación de escritorio inspirada en herramientas de diseño, usando **exclusivamente datos ficticios** y **sin ninguna conexión a Supabase** (ni producción ni pruebas), tampoco otros sistemas reales ni credenciales. Trabajo exclusivo en la rama `experimento/taller-nueva-app-codex` y el directorio `prototipos/nueva-app/`, sin modificar `app/`, tocar producción ni fusionar el prototipo a `main`.

Cuando la interfaz resulte convincente y técnicamente verificable, se estudiará **más adelante** un plan de traslado a la app real; no hay permiso actual para migrar ni sustituir nada. El Taller actual sigue construyendo y manteniendo la app productiva. [Instrucciones completas](TALLER-NUEVA-APP-CODEX.md) · [Encargo #47](https://github.com/estudiomoderno/moderno.app/issues/47).

## 2026-10-11 — Taller entrega en app.moderno.app; pruebas técnicas invisibles para el propietario

El propietario aclara: cuando encargue cambios al 🔧 Taller Codex quiere **verlos funcionando directamente en `app.moderno.app`**, sin gestionar él una aplicación de pruebas. Se prioriza un circuito autónomo: **rama → controles automatizados → PR revisado → despliegue a la app real y comprobación**, siempre que sea un cambio ordinario acotado y seguro.

**No se elimina la obligación de probar antes de publicar.** El entorno aislado es una herramienta interna, no el producto que el propietario deba usar. Las nuevas funciones con guardado, archivos privados, permisos o migraciones —incluyendo «Documentos → Planos interactivos», fases #24–#26— requieren pruebas con datos ficticios, aislamiento entre estudios y autorización específica antes de aplicar cambios sensibles a producción. Si no se dispone del entorno `moderno-pruebas`, resolver el bloqueo #3 y no experimentar con la base real. Evitar pedir aprobaciones reiteradas para cambios visuales ordinarios una vez verificados; informar solo de resultados confirmados.

## 2026-10-11 — Encargo integral: Documentos y Planos interactivos (3 fases)

**El propietario aprueba la implementación de las tres fases de «Planos interactivos» dentro de «Documentos» en la pantalla de cada proyecto**, con ejecución a cargo de 🔧 **Taller Codex Moderno.app**. La sección existente de «Espacio de trabajo»/«Archivos y notas» evoluciona a «Documentos», sin perder archivos o notas previos. Mantener «Tareas» y «Listas de compra» al mismo nivel del proyecto; **«Planos» no se añade al menú principal**, sino que vive dentro de «Documentos». Organización prevista: **Planos, Archivos, Referencias y Revisiones**. Verificar el estado de la interfaz real porque el propietario está reorganizándola manualmente.

Las entregas aprobadas y sus criterios son:
1. [**Fase 1 — Planos, visor y anotaciones**](https://github.com/estudiomoderno/moderno.app/issues/24): PDF/imágenes, dibujar y escribir, zoom/páginas, guardado recuperable de anotaciones sin modificar el original y exportación.
2. [**Fase 2 — Conexión con tareas y listas de compra**](https://github.com/estudiomoderno/moderno.app/issues/25): convertir anotaciones en elementos de trabajo con vínculos navegables, permisos y trazabilidad.
3. [**Fase 3 — Lápiz, revisiones y colaboración**](https://github.com/estudiomoderno/moderno.app/issues/26): interacción táctil y stylus compatible, versiones, aprobaciones y trabajo colaborativo con reglas claras de sincronización.

**Encargo general:** [#23](https://github.com/estudiomoderno/moderno.app/issues/23). El Taller desarrollará **por fases con PR y pruebas independientes**, sin reescribir la app ni contratar dependencias de pago. Antes de escrituras integradas, resolver/validar [Supabase de pruebas #3](https://github.com/estudiomoderno/moderno.app/issues/3); no probar con clientes reales. Diseño, migraciones, permisos, RLS y Storage nuevos requieren tests de aislamiento entre estudios y autorización específica **antes de operaciones productivas sensibles**. El usuario ha aprobado el objetivo de las tres fases, no manipular la base productiva. Crear issues y documentos **no inicia una sesión Codex Cloud automáticamente**, ni equivale a haber implementado o publicado nada.

## 2026-10-11 — Google Drive exclusivo para Moderno.app

El propietario establece **«Unidades compartidas» → «03 Moderno App»** como la **única unidad compartida de Google Drive autorizada** para todo trabajo referente a Moderno.app. Las demás unidades compartidas quedan **fuera del alcance**; no buscar ni trabajar en ellas para el proyecto sin autorización específica. Se ha comprobado en la conexión Google Drive que la unidad existe, es accesible y contiene carpetas internas organizadas por áreas. Los nuevos materiales y documentación se organizarán dentro de esta unidad.

Esto **no** cambia los servicios canónicos de código (GitHub), documentación pública (GitBook) ni datos operativos (Supabase). **No migrar, eliminar ni cambiar ubicaciones de copias automatizadas existentes** sin una revisión de seguridad y permiso concreto. No subir credenciales ni información sensible a repositorios públicos. Referencia de coordinación: [COORDINACION-CEREBRO-CODEX.md](COORDINACION-CEREBRO-CODEX.md).


## 2026-10-11 — Moderno.app Premium: evolución visual, no reconstrucción

El propietario aprueba convertir `app.moderno.app` en una aplicación de **acabado visual premium**, elegante, moderna y consistente **sin perder ni rehacer lo que ya funciona**. El orden prioritario es **perfeccionar escritorio web (tipografías, botones, iconos, tarjetas, efectos y transiciones)** y **después** la experiencia visual móvil/tablet. No se autoriza una reescritura, cambios de permisos, datos o lógica de negocio por motivos estéticos. El Taller empezará por auditar los estilos existentes y preparar una propuesta de sistema visual más un piloto pequeño y reversible; solo se aplicarán cambios con pruebas verificadas. Referencia: [DIRECCION-VISUAL-PREMIUM.md](DIRECCION-VISUAL-PREMIUM.md).


## 2026-10-10 — Prioridad: terminar la app y ofrecerla en web y dispositivos

El propietario establece como **prioridad principal terminar Moderno.app** y preparar su disponibilidad en **navegador web**, **descargas para Windows y Mac**, **iPhone**, **iPad** y **teléfonos/tabletas Android**. Estas son plataformas **objetivo**, no versiones cuya existencia se haya comprobado. 🔧 Taller Moderno.app en Codex Cloud sigue siendo exclusivo de la aplicación, incluidas sus variantes multiplataforma; el escaparate `www.moderno.app` y otras webs independientes se desarrollarán en chats separados.

Coordinar Cerebro, Taller, Control, Negocio, Academia e Integraciones mediante GitHub; la existencia de un documento compartido no sincroniza automáticamente las conversaciones ni inicia Codex. Antes de decidir PWA, contenedores o apps nativas, auditar estado actual, compatibilidad, restricciones y plan de pruebas sin datos reales. **Decisión operativa y responsabilidades completas: [PRIORIDAD-APP-MULTIPLATAFORMA.md](PRIORIDAD-APP-MULTIPLATAFORMA.md).** No se autoriza una reescritura o publicación en tiendas por esta declaración.


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
