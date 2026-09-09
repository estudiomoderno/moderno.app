# Primera tanda de operativa diaria

Fecha: 9 de septiembre de 2026. Versión candidata: v3.31-operativa-pruebas.

## Base y alcance exactos

Rama local taller-operativa-20260909, creada sobre d28c710. Ese commit conserva el candidato de protección previo, construido sobre 896bee5. No es una rama basada directamente en producción: sus antecesores incluyen guardado versionado y portales privados todavía sin publicar. No fusionar toda la rama en main como si contuviera solo cambios visuales.

Esta entrega añade app/daily-work.js, adapta app/index.html, incorpora pruebas y documentación. No añade SQL, cambia permisos, despliega funciones ni activa integraciones. Las escrituras de validación se hicieron exclusivamente con datos ficticios en el clon.

## Cambios

- Inicio y Mis tareas comparten la selección personal/equipo. Incluyen asignaciones múltiples y antiguas por nombre/correo; las tareas sin asignar aparecen en Todas las tareas. No cambia permisos de acceso.
- Fechas Vencida/Hoy/Próxima/Sin fecha, calculadas según el día local del dispositivo. Orden por urgencia y fecha sin reordenar el array guardado; el tablero conserva sus columnas y ordena dentro de cada una.
- Las tareas de Inicio abren directamente su formulario en el proyecto correcto.
- Estado textual de sincronización: pendiente, guardando, confirmado o revisión. Una subida de archivo aislada no acredita que todo el estudio esté guardado. Los cambios actuales y las copias anteriores se presentan por separado.
- Acceso a descarga de la copia actual, copias anteriores y reintento. No se borran ni reaplican copias automáticamente. El panel no sustituye un formulario abierto; se indica Formulario abierto hasta guardar/cerrar.
- Navegar sin cambios en bloques ya confirmados no marca una nueva escritura pendiente.
- Búsquedas por número, nombre o cliente, texto conservado, contador y Limpiar búsqueda. Una consulta inexistente no pasa silenciosamente a todos los proyectos.
- Inicio/Mis tareas/Herramientas y ayudas correspondientes a cuadrícula, lista o cronograma. Ajustes deja de afirmar que los datos viven solo en el navegador.
- Encabezado móvil más compacto y opciones de personalizar/duplicar agrupadas. Se conservan las acciones, las carpetas, los colores y las secciones.

## Comprobaciones

71 pruebas Node satisfactorias: 53 previas y 18 de esta tanda. Ejecutar `node --test scripts/*.test.mjs`. Sintaxis de los tres scripts inline y daily-work.js comprobada; git diff --check sin errores.

Navegador conectado al clon, con copia previa de los datos ficticios conservada antes de ampliar el escenario:

- Dos proyectos, nombres largo/corto; siete tareas abiertas con fechas vencidas, hoy, futura y vacía. Usuario ficticio propio, Luis Prueba, Marta Prueba, asignación compartida y sin asignar. Inicio muestra cinco propias/compartidas y siete al seleccionar Todas; Mis tareas mantiene la selección.
- Apertura directa de la tarea de hoy y edición de su título. Se observó Pendiente en este dispositivo antes de Guardado en nube. Tras recargar con conexión, se mantiene el cambio.
- Filtros inexistentes: cero proyectos/tareas con explicación y limpieza, tanto en escritorio como en móvil. Búsqueda de proyecto y ayudas de la vista de lista comprobadas.
- Fallo REST simulado solo contra el clon mediante instrumentación del servidor temporal, fuera del repositorio y retirada después. La tarea editada se conservó, se mostró Necesita revisión y la descarga JSON contenía exactamente la edición. Al restaurar la red y reintentar, el servidor confirmó el guardado; el cambio seguía presente tras recargar. No se simuló una caída de producción ni se modificó su red.
- Móvil 390 × 844: encabezado largo de 241 px y corto de 214 px, sin desbordamiento horizontal de la página en ambos puntos medidos. Opciones secundarias se abren y cierran. Escritorio 1280 × 800 y filtro móvil comprobados. No equivale a prueba en Safari/iOS/Android físico.
- Las pruebas automáticas verifican espera a la respuesta del servidor, error de red, cuota local, copias conservadas y que el panel no sustituye formularios.

Las capturas y copias ficticias detalladas quedan fuera del repositorio público. No se incluyen archivos ni datos reales del piloto.

## Publicación y reversión

Estado: candidato local probado, sin push, merge ni despliegue de esta tanda. No se ha lanzado Actions ni se afirma que producción tenga v3.31.

Bloqueo de publicación: esta base depende del guardado versionado del candidato anterior. Antes de trasladarla a producción falta completar la transición de sesiones antiguas coordinada con el piloto, según TRANSICION-PROTECCION.md. Publicar la rama completa activaría también cambios anteriores de datos y portales. Google Calendar no es requisito: sigue aplazado.

Para una entrega futura se debe revisar el paquete completo y resolver esa transición, o preparar y validar explícitamente una entrega independiente sobre la versión productiva. No basta con copiar index.html o eliminar la RPC, porque eso cambiaría las garantías de guardado ensayadas.

Reversión de esta tanda en pruebas: restaurar el cliente de d28c710 con sus archivos correspondientes; no necesita revertir datos o SQL adicionales. La reversión del candidato de protección completo tiene sus propias condiciones. No borrar almacenamiento local ni forzar recargas; conservar pendientes.
