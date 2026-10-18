# Calendario original ReUI — v3.65.56

El propietario solicita reemplazar la presentación de Calendario por el código EventCalendar adjunto y retirar «Tu calendario, [nombre]». Se utiliza el componente público original ReUI y la composición Card / EventCalendar / Nav / Toolbar / Content de su ejemplo, conectados al estado y los formularios actuales de Moderno.app. Español, fuente Inter y medidas originales Nova. No se instancian personas ni actividades de demostración.

## Presentación y funciones

- Mes, semana, día y agenda; Hoy, periodo anterior/siguiente y selector de vista. Las fases conservan barras continuas; las citas con hora en su título se colocan en la franja horaria correspondiente. Las fechas de tareas siguen siendo días completos.
- Filtro por proyecto existente, quitar filtro y abrir el proyecto seleccionado. Controles Tareas y Obra. Se conserva el ámbito de marca/espacio, excluyendo plantillas y proyectos archivados como el calendario actual.
- Una tarea abre `taskModal`, una fase `obraPlanModal`, y una cita la actividad del día existente. Nuevo evento y seleccionar un hueco abren los formularios nativos. React no mantiene una copia editable de los registros.
- Arrastrar y cambiar el borde final de una fase usa `calSpanDrop`, su guardado e historial existentes. Se rechazan tareas/citas arrastradas, borde inicial no soportado, propuestas antiguas, ámbitos cambiados y rangos inválidos. El final inclusivo de obra se transforma solo para la presentación exclusiva de ReUI y se reconvierte al volver al manejador actual.
- Se corrige en ese manejador la conversión a UTC de una fecha de calendario: mover una fase usa el día local y evita desplazarla un día en zonas horarias positivas. Verificado incluyendo el cambio de hora de octubre en Europe/Madrid.
- Ajustes de presentación en memoria: fines de semana, números de semana, hora actual, días de descanso, botón diario, horario, intervalo y comportamiento. Los valores de descanso y visibilidad iniciales respetan Ajustes de la cuenta; no escriben esa configuración. Lenguaje español, semana desde el lunes y zona local del navegador. No se incluyen los selectores multilingües/regiones de demostración ni personas ficticias para una vista de recursos.
- Los días llenos ofrecen «+N más», también en móvil, conservando acceso a todas sus actividades. Menús, tooltips y elementos de arrastre permanecen dentro de sus estilos aislados. Movimiento reducido conserva su regla previa.

## Arquitectura y límites

`app/calendar-ui.js` adapta los registros ya cargados. No consulta APIs, tablas ni proyectos adicionales. Delega en `go`, filtros, modales y guardado originales, verificando sesión, rol, ámbito y referencias antes de actuar; los formularios abiertos bloquean cambios. No cambia autenticación, permisos, esquema, Storage, ICS, Google Calendar ni otros servicios. No incorpora nuevas escrituras de tareas/citas ni un nuevo modelo de eventos.

El calendario se compila como recurso estático independiente `app/calendar-component.js`, cargado solo al abrir Calendario. La aplicación mantiene su arquitectura y despliegue actuales. Usa la compilación aislada existente de `ui/team-profile/`, añadiendo dependencias requeridas por el componente original: date-fns 4.1.0, @date-fns/tz 1.5.0 y react-day-picker 9.14.0, fijadas con lockfile. Sin CDN ni servidor nuevo. Fuente local, licencias y manifiesto SHA-256 versionados.

Originales del commit ReUI `067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a` registrados con su identidad Git en SOURCE.json. Adaptaciones acotadas: contenedor opcional en Popover/Tooltip/Select y elementos visuales de arrastre dentro del portal de su Shadow DOM, con body como recuperación. Las pruebas reconstruyen los originales y comprueban sus hashes. También se reserva una fila para el botón «+N más» cuando hay barras que desbordan una semana: el original podía dejar ese botón sin altura y ocultarlo. Se comprueba abriendo esas actividades en los tres anchos. El resto de primitivas y motor se conservan literalmente.

La vista anterior permanece como recuperación ante fallo de descarga/CSS/React, para impresión y al desactivar el nuevo componente. El título solicitado se retira también en esa vista. Las opciones visuales y el ancla temporal viven en memoria; no se promete sincronización de preferencias entre dispositivos. No se construye una integración nueva de calendarios externos ni cambia el formato de los registros existentes.

## Verificación y reversión

Pruebas Node de toda la aplicación, más adaptación de eventos, fechas válidas, final inclusivo, hora de citas, ámbitos, referencias antiguas, delegación, bloqueo por sesión/formulario y actualización de fases incluyendo DST. Verificación de originales, compilación y sintaxis de los dos bundles.

Chromium con servidor oficial aislado, backend desactivado, identidad y registros ficticios y solicitudes externas/escrituras HTTP bloqueadas: 1440/1100/390 px. Vistas, filtros, Tareas/Obra, «+N más», menús, ajustes, formularios y recuperación por desactivación/fallo de CSS; arrastre real de una fase a un día posterior en escritorio conservando duración. Regresión del conjunto de módulos, proyectos, Ajustes y navegación en esos anchos. Sin dispositivos físicos ni autenticación productiva. PHP en Actions sin enviar correo; no está disponible localmente.

El PR registra resultados finales y publicación. El proceso habitual compara SHA-256 de 31 recursos públicos, incluidos el nuevo controlador, sus estilos, bundle y los recursos ReUI compartidos.

Reversión: revertir la entrega y desplegar, sin restaurar datos ni borrar almacenamiento. `ModernoCalendarUI.setEnabled(false)` recupera la vista anterior durante diagnóstico. Los nodos/formularios de edición originales se conservan y no se fuerzan recargas de sesiones abiertas.

## Ajustes legibles — v3.65.57

Se corrige la composición del panel de Ajustes: pestañas horizontales arriba, lista de 32 px que no se estira y panel de opciones debajo a todo el ancho. El contenedor Tabs original estaba quedando en fila porque su variante data-horizontal no coincidía con el atributo data-orientation de esta integración. Se explicita la distribución en la composición del calendario, sin cambiar las primitivas originales, Inter 14 px, tamaño de interruptores ni valores/opciones. Verificación geométrica y visual de Vista/Horario/Interacción a 1440/1100/390 px: panel debajo de pestañas, anchos alineados, botones compactos, etiquetas legibles, menú dentro de pantalla, selectores y restablecimiento funcionales. Sin cambios de datos o permisos. Reversión: revertir esta corrección y desplegar.
