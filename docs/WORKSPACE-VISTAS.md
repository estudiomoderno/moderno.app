# Workspace: selector y propuesta de vistas

Petición del usuario, 9 de septiembre de 2026: seleccionar Mis tareas/Todas mediante fondo, sin aumentar negrita ni tamaño; investigar vistas de Monday.com.

## Cambio preparado

Selector daily-scope de Inicio y Workspace: peso 600 constante, transición solo de colores. No se altera el estilo de los demás selectores. No hay cambios en datos ni permisos.

Comprobación en navegador local conectado al clon: Mis tareas conserva 83.453125 × 28 px y Todas las tareas 113.21875 × 28 px antes y después de seleccionar Todas. Ambos mantienen peso 600 y los fondos intercambian sus colores. Cada botón conserva su tamaño; no se exige que ambos tengan igual ancho. Cambio local pendiente de publicación junto con la versión candidata.

## Investigación y recomendación, aún sin implementar vistas nuevas

La documentación de [My Work de Monday.com](https://support.monday.com/hc/en-us/articles/360019300579-My-Work), consultada el 9 de septiembre, describe agrupaciones por fecha, estado, prioridad, tablero o lista única y una vista Calendario. Su [catálogo de vistas de tablero](https://support.monday.com/hc/en-us/articles/360001267945-The-board-views) incluye opciones adicionales, como Kanban y Timeline. No confundir vistas del tablero con las de My Work.

Para el CRM se propone:

- Tablero: mantener el actual, por estado.
- Lista: filas con tarea, proyecto, responsable, vencimiento y estado; agrupación opcional por fecha o proyecto. Recomendada como siguiente incorporación para revisar muchas tareas.
- Calendario: vencimientos por semana/mes, con apartado visible Sin fecha. No requiere Google Calendar.
- Cronograma: posterior, cuando las tareas tengan inicio y fin fiables; no inventar duraciones desde un único vencimiento.

El selector de vista debe ser independiente de Mis tareas/Todas las tareas. Las tres primeras vistas usarían el mismo conjunto filtrado y las mismas tareas, sin duplicarlas ni modificar fechas al cambiar de vista. Recordar la preferencia por usuario/dispositivo, sin alterar datos compartidos del estudio. Abrir el formulario existente al pulsar una tarea.

La carga de trabajo por persona queda para después: contar tareas no mide esfuerzo sin estimaciones y capacidad. Estas propuestas no añaden permisos ni certifican los pendientes financieros de la entrega.
