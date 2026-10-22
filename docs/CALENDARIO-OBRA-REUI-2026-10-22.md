# Calendario de obra con ReUI — v3.65.112

El propietario pide el estilo de Event Calendar, retirar la frase «Las fechas y el avance de las fases de obra», la exportación en esta sección y el aviso de fases sin fecha. Confirma reutilizar el componente público de ReUI ya incluido. No se instala el bloque Pro `@reui/event-calendar-1`, no se configura una licencia ni se cambia la arquitectura global a shadcn. Se conservan originales MIT, dependencias fijadas y compilación aislada existentes.

## Resultado

- Calendario de obra usa la misma composición original EventCalendar/Card/Nav/Toolbar/Content que el calendario general, sin filtros globales por proyecto, tareas ni citas externas.
- Mes, semana, día, cinco días y agenda, Hoy, navegación de fechas y ajustes visuales existentes. El encabezado tiene Añadir fase en lugar de crear citas en el calendario general.
- Las fases conservan su inicio y fin inclusivos. El visor convierte el fin a exclusivo para ReUI y lo reconvierte al mover o ampliar el borde final. Pulsar una fase abre el editor nativo de fechas. Arrastrar y ampliar conservan los manejadores y guardado originales.
- Añadir fase o seleccionar un intervalo abre un formulario de nombre, inicio y fin. Se valida la fecha y el ámbito antes de añadir un registro con los campos ya admitidos por el guardado. No añade citas globales ni cambia las tareas.
- Fases sin fecha permanecen en Obra. El calendario nativo de recuperación también pierde el aviso solicitado. La exportación ICS disponible en otras pantallas se conserva.
- Los callbacks rechazan sesiones, proyectos o pestañas cambiados, incluidas escrituras aplazadas tras el arrastre. Una fase de otro proyecto no puede aparecer ni editarse desde este calendario. Las preferencias de vista se mantienen en memoria por estudio, usuario y proyecto, separadas del calendario general.

## Pruebas

- 662 pruebas Node aprobadas, incluidas separación del calendario general, ámbito, fechas, creación y rechazo de callbacks antiguos.
- Chromium aislado con servidor oficial y bloqueo de red externa: 1440, 1100 y 390 px. Vistas, edición, creación como colaborador, arrastre real de ratón en escritorio, ausencia de los tres elementos retirados y recuperación del calendario nativo.
- Aplicación completa a 1440, 1100 y 390 px: rutas, paneles, ajustes y persistencia local sin escrituras remotas.
- Calendario general original: regresión a los mismos tres anchos, con filtros, ajustes, formularios, arrastre y recuperación.
- PostgreSQL 17 efímero: 1.417 comprobaciones del contrato vigente, incluida creación de una fase y lectura posterior como colaborador. Sin migraciones ni escrituras productivas. Comando: `node scripts/build-project-sections-checks.mjs`, ya incorporado a CI.
- Artefactos compilados localmente y manifiesto de fuentes/resultados actualizados. Se recompila el perfil porque comparte el cargador de CSS versionado; no se cambia su comportamiento.

El alcance es la adaptación al componente existente y a las fases de Moderno, no instalar ni anunciar el bloque Pro completo con recursos y recurrencia. No se introducen modelos de recurrencia ni reservas por hora que el guardado de fases no admite.

## Publicación y reversión

Integrar después de CI y comprobar el despliegue y los 50 recursos públicos antes de anunciar publicación. Revertir el commit para restaurar la presentación anterior; no restaurar la base de datos. Las fases creadas conservan el formato ordinario de Obra y sus fechas.
