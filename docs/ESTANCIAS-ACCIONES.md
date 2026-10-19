# Estancias: acciones compactas — v3.65.60

Petición del propietario, 19/10/2026: simplificar la pantalla principal de listas de compra. Se retiran la descripción «Estancias, pavimentos y todo lo que se compra», el acceso Importar desde hoja y los controles de comprimir grupos. Los grupos con listas se muestran abiertos, incluso si antes se habían comprimido; sus preferencias históricas no se borran ni se reescriben.

En la cabecera de Estancias aparecen Crear, Exportar e Imprimir, con iconos y nombres accesibles/tooltip. Miden 50 × 50 px y comparten alineación. Se incorpora el CSS que el propietario pegó de Uiverse.io, atribuido a vinodjangid07, con clases y animaciones acotadas para evitar cambios globales. Se conservan los bordes de 2 px, radio de 15 px, fondo blanco, sombra y efecto oscuro al pasar el ratón; Crear sustituye la flecha por un más e Imprimir por una impresora. Movimiento reducido desactiva las animaciones.

Crear abre el formulario nativo de nueva estancia. Exportar reúne PDF y Hoja de cálculo (CSV), conservando el selector de listas, el generador y la descarga existentes. Imprimir abre el mismo selector con etiquetas de impresión y usa el generador PDF actual y el diálogo de impresión del navegador. Guardar como PDF sigue dependiendo del navegador, como en la exportación anterior. Se retiran los dos accesos de exportación inferiores, sin eliminar capacidades.

Generar presupuesto conserva el manejador actual y sus guardas. Adopta el segundo diseño proporcionado: 200 × 40 px, fondo gris, radio de 10 px, flecha animada y el icono de papel existente en lugar de la campana. No se cambia el proceso de generación ni se saltan sus comprobaciones de acceso/guardado.

No se modifican proyectos, estancias, fichas, precios, presupuestos, archivos, persistencia, esquemas, permisos, autenticación, almacenamiento o servicios. Los importadores se conservan para otros accesos existentes; solo se retira el botón indicado de esta pantalla. Pavimentos y otras listas conservan sus creadores.

## Verificación y reversión

Suite Node y revisión en Chromium con servidor oficial aislado, SDK nulo, credenciales ficticias y red externa/escrituras HTTP bloqueadas. Recorrido general de la aplicación a 1440/1100/390 px. Prueba específica con datos ficticios: medidas/alineación, teclado, hover y movimiento reducido, grupos previamente comprimidos, creación/cancelación nativas, selección y descarga real CSV, preparación PDF/impresión con diálogo simulado, guardas de presupuesto y conservación de colecciones. No se envía nada a una impresora física ni se prueba con datos productivos. PHP/autorización del correo se comprueba en Actions sin envío de correo.

Publicación por el workflow habitual después de CI correcta; verificar los 31 recursos públicos por SHA-256. Reversión: revertir este commit y desplegar, sin restaurar datos ni borrar almacenamiento. Versión y caché de los recursos modificados actualizadas; sin forzar recarga de sesiones.

## Ajuste posterior — v3.65.61

El propietario pide reducir los tres botones y suavizar el contraste. Crear, Exportar e Imprimir pasan a 40 × 40 px, con iconos centrados de 18 px y radio de 12 px. Se elimina del HTML el símbolo de bandeja que aparecía debajo de cada icono y sus reglas CSS. Al pasar el ratón, el fondo usa gris claro (rgb 241,241,241) y el icono conserva su gris oscuro; no pasa a blanco. Se mantienen alineación, etiquetas accesibles, teclado, animación y movimiento reducido. Generar presupuesto conserva su presentación y todos los manejadores continúan intactos.

Pruebas: suite Node y recorrido específico de creación, exportación e impresión con datos ficticios a 1440/1100/390 px; medidas, ausencia de símbolos inferiores y colores efectivos actualizados. Misma publicación y reversión, sin cambios de datos o permisos.

## Animación sin bucle — v3.65.62

A petición del propietario, los iconos de Crear, Exportar e Imprimir animan una sola vez por entrada del ratón. Tras completar el efecto quedan visibles y quietos, y se repite únicamente al salir y volver a entrar. Se conserva la duración de un segundo, el gris claro, los tamaños y todas las acciones. Comprobados los tres iconos en Chromium aislado, junto con la suite Node y los recorridos existentes. Misma reversión mediante commit y despliegue; sin cambios de datos.

## Tarjeta ilustrada de nueva estancia — v3.65.63

El propietario solicita dar sentido visual al cuadro de añadir estancia, con una imagen en grises inspirada en una referencia arquitectónica. La tarjeta incluye una ilustración isométrica original de un salón con sofá, mesa y lámpara; conserva el signo más y «Nueva estancia». No se copia la referencia ni se usan fotografías del proyecto. El recurso generado se sirve localmente como WebP transparente de 640 × 427 px y unos 15 KB, con presentación en escala de grises y proporciones conservadas.

La tarjeta de Estancias pasa a ser un botón nativo accesible con teclado, con el mismo manejador newRoom. La ilustración es decorativa y no duplica el nombre para lectores de pantalla. Si falla su carga, permanecen el texto y la acción de crear. Las tarjetas de pavimentos y otras listas mantienen su presentación. No cambia ningún dato, permiso o proceso de guardado.

La prueba de navegador valida decodificación del recurso local, escala de grises, nombre accesible, activación por teclado, cancelación sin cambios y recuperación ante fallo de imagen, además de los recorridos existentes a 1440/1100/390 px. El verificador de publicación comprueba ahora 32 recursos, incluida la ilustración. Misma reversión por commit y despliegue, sin restaurar datos.

## Cabecera única e iconos sin movimiento — v3.65.64

El propietario pide retirar el movimiento de Crear, Exportar e Imprimir y simplificar la cabecera. Se elimina su animación y su keyframe; se mantiene el gris claro al pasar el ratón. El título «Listas de compra» incorpora el contador de estancias y comparte la fila con las tres acciones. Desaparecen el rótulo «Estancias» y su línea separadora, sin añadir una fila vacía. El contador utiliza la misma agrupación de antes, incluidos los registros históricos sin kind; no incluye pavimentos ni otras listas. La cabecera se adapta al ancho móvil.

Comprobados contador, ausencia del rótulo/separador y movimiento, creación, ilustración, exportaciones y guardas en Chromium aislado a 1440/1100/390 px y suite Node. Se conservan las demás categorías, datos y manejadores, con la misma publicación/reversión.

## Tarjetas con nombre e icono — v3.65.65

A petición del propietario, las tarjetas de listas de compra muestran únicamente su icono y nombre en el pie. Se retiran la fecha visible y el botón «Opciones de la lista» que aparecía al pasar el ratón. Las fechas almacenadas no se borran ni se modifican, y la tarjeta sigue abriendo la misma lista. Se conservan las opciones internas y el manejador roomMenu para los accesos existentes; no se implementa todavía un nuevo menú. Mosaicos, estados y demás pantallas permanecen intactos.

Verificado con la suite Node y Chromium aislado a 1440/1100/390 px: pies sin fechas ni opciones, iconos/nombres conservados, apertura de la lista correcta y colecciones ficticias intactas, además de los recorridos de creación/exportación/impresión. Misma publicación y reversión por commit, sin restaurar datos.

## Interior de una lista — v3.65.66

El menú inferior del proyecto aparece también dentro de cada lista, con Compras seleccionado. Se reutilizan los iconos, separadores, etiquetas, teclado y restricciones existentes. Seleccionar una sección sale de la lista hacia esa sección del mismo proyecto; Compras vuelve a la pantalla de listas aunque ya estuviera seleccionado. Se limpian los filtros transitorios al salir, como hacía la ruta anterior. En móvil/tablet se fija abajo con desplazamiento horizontal y margen para el contenido; las pestañas de proyectos de escritorio conservan el contexto de la lista.

Se retiran de esta vista la ruta y los accesos Board de la estancia y Compras y aprobaciones, conservando sus funciones. La cabecera mantiene nombre/icono/estado e incorpora dos botones alineados de 40 × 40 px: engranaje «Ajustes de la lista» y papelera «Eliminar lista». Esta última se vuelve roja al pasar el ratón o recibir foco. Ajustes abre roomMenu; ambos accesos de eliminar reutilizan askConfirm y la misma eliminación de lista. Cancelar no modifica registros y confirmar vuelve a Compras si se estaba viendo la lista eliminada. No se elimina ninguna lista real durante desarrollo ni comprobaciones.

Añadir producto pasa a ser una única tarjeta accesible «+ Añadir producto», con ilustración original de lámpara, sillón y mesa en grises, servida localmente en WebP de 640 × 427 px. Imagen decorativa con recuperación si no carga. Se retiran sus enlaces inferiores Desde URL/Biblioteca; se conserva itemModal, la importación por URL de la ficha y las funciones de biblioteca. Sin movimiento nuevo en los iconos.

Comprobaciones con servidor oficial aislado, SDK nulo y peticiones externas/escrituras HTTP bloqueadas: suite Node; listas a 1440/1100/390 px (medidas, color, imagen, teclado, ajustes, cancelación, navegación, eliminación de una lista creada únicamente en el fixture); regresión de pestañas/contexto de proyectos y recorrido general. No cambian esquemas, permisos, autenticación, Storage ni el contrato de persistencia. CI comprueba PHP/autorización de correo sin enviar mensajes. El verificador de despliegue comprueba ahora 33 recursos, incluida la nueva ilustración. Reversión: revertir el commit y desplegar, sin restauraciones de datos.

## Volver, filtros y búsqueda — v3.65.67

Se añade un botón Volver de 32 × 32 px antes del icono/nombre de la estancia, con la altura de la casa de la barra de proyectos. Regresa a Compras del mismo proyecto mediante projTab. Los controles de filtro y lupa comparten esa medida y muestran solo sus iconos, con etiquetas accesibles y tooltip.

El ejemplo Filters adjunto por el propietario importa componentes ReUI no incluidos en su fragmento y muestra datos ficticios de tareas, asignados y prioridades. Se adapta su organización visual de filtros y etiquetas al renderizador nativo y a los campos ya existentes: estado, proveedor, color y precio. No se presenta como una incorporación literal del componente React ni se añade el JSON de demostración. El panel se abre junto al icono, permite aplicar/restablecer y quitar filtros individuales; cancelar, Escape o pulsar fuera no aplica cambios. Usa las opciones de productos ya cargadas y conserva el predicado de filtrado de vRoom.

La lupa revela un campo a su derecha mediante una transición horizontal de 220 ms. Permite buscar por nombre, SKU o proveedor con la normalización existente. Escape o volver a pulsar la lupa cierra y limpia la búsqueda, devolviendo el foco. El estado de apertura vive en memoria, no en registros. Movimiento reducido desactiva la transición.

Se retiran el texto de ayuda inferior y los botones Margen general, Compartir con el cliente y Exportar PDF/hoja de esa zona. Margen y compartir siguen en Ajustes. Exportar lista pasa a la cabecera, entre Ajustes y Eliminar, con los mismos 40 × 40 px y el exportador nativo. Añadir sección conserva su posición y función.

Pruebas con datos ficticios, SDK nulo y red externa/escrituras HTTP bloqueadas: suite Node, recorrido de listas a 1440/1100/390 px (medidas, orden, filtros/precios/proveedor, cancelar/restablecer/chips, búsqueda y movimiento reducido, volver, exportación y conservación de colecciones) y regresión general. Sin cambios de datos productivos, permisos, esquema, almacenamiento o dependencias. Verificación de los mismos 33 recursos públicos. Recuperación mediante revertir el commit y desplegar, sin restaurar datos.
