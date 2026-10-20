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

## Una cuadrícula y etiquetas opcionales — v3.65.68

El propietario acepta simplificar Estancia → productos. La vista interior muestra una sola cuadrícula con un único Añadir producto. Se retiran los títulos/contadores/separadores y controles de plegar secciones, Ir a la sección y Añadir sección. Los productos de agrupaciones antiguas plegadas también aparecen. Una etiqueta discreta en la tarjeta permite filtrar al pulsarla; el panel de filtros incorpora Etiqueta y Sin etiqueta, combinables con estado, proveedor, color y precio.

Compatibilidad sin migración: las agrupaciones existentes siguen almacenadas en sections y se presentan como etiquetas. General o un nombre vacío representa Sin etiqueta. La lectura no mueve productos, no asigna identificadores ni modifica banderas de plegado. No se crea una tabla, campo de etiquetas, esquema o persistencia paralela. Cada producto tiene una etiqueta opcional en esta entrega; no se añade multietiquetado. Las agrupaciones y sus nombres históricos siguen disponibles para exportaciones y funciones existentes.

La ficha incorpora Etiqueta (opcional), con sugerencias de nombres existentes, posibilidad de escribir uno nuevo o dejarlo vacío. Solo Guardar crea una agrupación necesaria o reclasifica el producto; cancelar no crea nada. Los productos nuevos manuales nacen sin etiqueta salvo si se está filtrando una etiqueta. El importador por URL conserva su destino de agrupación existente y sus comprobaciones; no se cambia ni se prueba su integración productiva. La etiqueta del producto importado se puede editar después en la ficha.

Cambiar la etiqueta utiliza la preparación nativa de referencias antes de mover posiciones, conserva identificadores, adjuntos/fotos, campos de producto y vínculos de biblioteca, y reindexa referencias de presentaciones y moodboards. No se eliminan grupos vacíos históricos. Guardar una etiqueta sin cambios conserva la posición exacta incluso con nombres duplicados. La proyección de colaborador no permite reclasificar productos que no puede revincular. Los movimientos conservan los mecanismos existentes y se limitan a productos de la misma etiqueta: arrastrar sobre otra etiqueta no reclasifica silenciosamente. El área vacía de la cuadrícula permite llevar un producto al final de su grupo interno.

Verificación: 489 pruebas Node, incluidos casos de lectura sin efectos, etiquetas heredadas/plegadas, creación/cancelación, referencias antiguas por posición y nombres repetidos, conservación de archivos/campos/identidad, permisos y escape de texto. Chromium con servidor oficial aislado, SDK nulo y red externa/escrituras HTTP bloqueadas a 1440/1100/390 px: pruebas de listas, recorrido específico de etiquetas (filtros, edición, quitar/crear, referencias, cancelación sin cambios, CSV completo, lista histórica sin General, producto gratuito y guardas de arrastre), y regresión general de la aplicación. Sin datos ni escrituras productivos. PHP/autorización se comprueba en Actions sin enviar correo.

Se conservan los mismos 33 recursos públicos para verificar el despliegue. Recuperación: revertir el commit y desplegar; los datos siguen siendo legibles por la interfaz anterior y no necesitan restauración. Las etiquetas creadas posteriormente por el usuario aparecen como agrupaciones en la interfaz anterior.

## Selector rápido de listas desde el nombre — v3.65.69

Al pulsar el icono/nombre de la estancia se abre un desplegable con las listas de compra del mismo proyecto, incluidos pavimentos y otras compras. Cada opción conserva su icono y la lista actual queda marcada. No se añaden proyectos ajenos ni acciones de crear/eliminar. La cabecera conserva Volver, estado de la lista, acciones, tipo/tamaño de texto y menú inferior.

Seleccionar otra lista utiliza openRoom y la navegación nativa, manteniendo el proyecto activo. Se limpian los filtros y el texto de búsqueda transitorios para no ocultar productos de la nueva lista; seleccionar la actual solo cierra el menú. Las pestañas de proyectos recuerdan la última lista seleccionada. Las identidades/proyecciones existentes delimitan el proyecto y se conserva canView. Un modal de edición abierto bloquea también una selección programática, preservando el borrador.

El selector tiene nombre accesible, aria-expanded, relación con su menú y opciones menuitemradio con aria-checked. Flechas, Inicio/Fin, Enter, Escape y Tab permiten abrir, recorrer, seleccionar y salir; pulsar fuera cierra. El desplegable limita anchura/altura al espacio disponible, puede abrirse hacia arriba y permite desplazamiento vertical en listas largas. Nombres/estados se escapan y los índices se resuelven contra las listas del proyecto activo, sin interpolar nombres o identificadores en código.

Verificado: 491 pruebas Node y Chromium aislado a 1440/1100/390 px: todas las categorías, iconos/selección, navegación nativa y restablecimiento de filtros, lista actual sin cambios, teclado/foco, fuera/Escape, borradores, memoria de pestañas, menú largo/anchura móvil y nombres con marcado literal. Regresión específica de listas y sus acciones. SDK nulo, registros ficticios, red externa/escrituras HTTP bloqueadas; sin usar datos reales. PHP/autorización se verifica en Actions sin enviar correos.

Sin cambios de registros, permisos de servidor, esquema, autenticación, almacenamiento o dependencias. Se actualizan versión/caché y se mantienen los 33 recursos de comprobación pública. Reversión: revertir este commit y desplegar; no requiere restaurar datos.

## Estado general y confirmación original — v3.65.70

«En curso» pasa a ser un selector compacto del estado general de la estancia. Reutiliza rstatus y las opciones anteriores Especificación / En curso / Revisión / Terminado; añade Borrador, coherente con el estado por defecto que ya mostraban las tarjetas. Un valor histórico distinto sigue visible y no se transforma al abrir la vista. Solo seleccionar una opción válida cambia el campo de la lista actual; no afecta a estados de productos ni a otras listas. Ajustes conserva las mismas opciones.

La confirmación de eliminar usa el AlertDialog original ReUI/Base UI que envió el propietario, con size sm, icono Trash2Icon, Media destructivo, Cancel ghost y Action destructive. Texto: «¿Eliminar «nombre»?», explicación de eliminación de lista/productos y acciones Cancelar / Eliminar. Se conservan medidas, tipografía Inter y estilos Nova originales. Sin enlace ni datos de la demostración. Código y estilos de la revisión MIT ya utilizada; procedencia y adaptación mínima del portal registradas en ui/team-profile/vendor/reui/SOURCE.json.

La confirmación nativa sigue siendo la autoridad de la acción. El componente llama a askConfirmGo/askCancelGo y limita cada decisión a una ejecución, comprobando que sus callbacks e instancia sigan vigentes. Abrir no borra nada. El diálogo recibe foco después de cargar CSS; Cancelar es la primera acción, Tab/Shift+Tab quedan dentro, Escape cancela y el foco vuelve al botón. El fondo no confirma el borrado. La trampa nativa de teclado se omite solo mientras Base UI presenta esta confirmación. Si el componente o su CSS falla, se recupera la confirmación nativa. Al cerrar o sustituir un modal se limpia el componente, sin afectar otros formularios.

Se recompilan los recursos compartidos y se actualizan sus versiones de caché, incluida la carga del calendario que comparte el montaje aislado. No cambian permisos de servidor, esquema, autenticación, Storage ni persistencia; el borrado mantiene su operación anterior sobre la lista identificada, resuelta de nuevo al confirmar. No se borra ningún registro real durante desarrollo o comprobaciones.

Verificación: suite Node, identidad Git de los originales y manifiesto de compilación; Chromium con servidor oficial aislado, SDK nulo, datos ficticios y red externa/escrituras HTTP bloqueadas a 1440/1100/390 px. Selector sin efectos de lectura, estados por defecto/históricos, cambio solo de la lista actual; diálogo original 320 px, título 16 px, Media 40 px/icono 24 px, teclado/foco, cancelar/Escape, fondo, recuperación nativa y confirmación explícita solo sobre listas ficticias. Regresión de listas y de toda la aplicación, incluido perfil/calendario. PHP y autorización se comprueban en Actions sin enviar correos.

Se verifican los mismos 33 recursos públicos. Reversión: revertir el commit y desplegar, sin restaurar datos; rstatus conserva el formato anterior.

## Selector de estado centrado — v3.65.71

Corrección visual acotada al estado general de la estancia: el texto seleccionado queda centrado con espacio simétrico y flecha independiente. El desplegable se centra respecto al botón; todas sus opciones tienen la misma altura y texto centrado horizontal y verticalmente, incluida la selección actual. Se conservan fuente, tamaño compacto, estados, teclado y funcionamiento nativo. Los navegadores sin selector personalizable conservan su menú nativo y el texto centrado del control. No se modifican componentes compartidos ni datos, permisos, guardado o dependencias.

Verificado con 493 pruebas Node y Chromium aislado a 1440/1100/390 px, datos ficticios, SDK nulo y red externa/escrituras HTTP bloqueadas. Se comprueban geométricamente centros, altura uniforme, alineación de cabecera en escritorio y apertura/cierre sin modificar registros, además del recorrido existente de estados y confirmación. Inspección visual del desplegable. PHP/autorización se verifica en Actions sin enviar correos. Publicación por el proceso habitual y comprobación de los 33 recursos públicos; recuperación mediante reversión del commit y despliegue, sin restaurar datos.

## Estado como etiqueta y apertura suave — v3.65.72

A petición del propietario, se elimina el aspecto de campo de formulario del selector de estado: etiqueta gris suave sin borde visible, radio de 8 px, altura de 28 px, texto de 12 px y una sola flecha desplegable. El gris se conserva al recibir foco; una regla global de formularios lo sustituía por blanco. El menú mantiene sus opciones centradas, alturas uniformes y anclaje centrado. La flecha gira al abrir.

En navegadores que admiten el selector personalizable, el menú aparece durante 180 ms con opacidad de 0 a 1 y desplazamiento descendente de 6 px; al cerrar se desvanece. Se utilizan transiciones de display/overlay y @starting-style para conservar la capa superior durante el efecto. Con movimiento reducido se desactivan las transiciones. Los navegadores sin selector personalizable mantienen su desplegable nativo y su accesibilidad. No cambian estados, registros ni operaciones de guardado.

Verificación: 493 pruebas Node; Chromium aislado a 1440/1100/390 px con datos ficticios, SDK nulo y red externa/escrituras HTTP bloqueadas. Se muestrean fotogramas reales para comprobar opacidad intermedia y desplazamiento hasta la posición final, movimiento reducido, fondos/borde, centrado, estados y confirmación existentes. Inspección visual. PHP/autorización se comprueba en Actions sin enviar correos. Misma publicación y 33 recursos públicos; reversión por commit y despliegue sin restaurar datos.

## Listas sin estado general — v3.65.73

El propietario decide retirar el estado general de las listas. Se elimina el selector de la cabecera, la opción de los ajustes y las etiquetas de las tarjetas de compras y de la configuración del portal. También se retiran el manejador y CSS exclusivos del selector. Los valores históricos rstatus permanecen intactos en los registros; no se migran ni borran datos. Los estados individuales de productos y las opciones de visibilidad/aprobación del cliente conservan su funcionamiento.

Comprobaciones: 492 pruebas Node (se sustituyen las pruebas del selector retirado por conservación de datos históricos); Chromium aislado a 1440/1100/390 px, sin datos reales ni acceso al backend, verifica ausencia del estado y conservación del registro al abrir/cerrar ajustes, además de la confirmación existente. La misma entrega ilustra la tarjeta de subir planos; detalles en DOCUMENTOS-PLANOS-v36517.md. Publicación habitual, verificación de 34 recursos públicos incluida la nueva imagen. Reversión por commit y despliegue, sin restauración de datos.

## Origen al añadir producto — v3.65.75

La tarjeta abre Manualmente / Desde URL (IA) / Desde la biblioteca. La biblioteca permite buscar y copiar; la captura desde URL permite elegir la portada entre miniaturas antes de añadir a la lista. Se conservan ficha, etiquetas, archivos, copias independientes y contratos de guardado. Sin cambios de backend ni pruebas con datos reales. Alcance, comprobaciones y recuperación: [PRODUCTOS-ORIGEN-PORTADA](PRODUCTOS-ORIGEN-PORTADA.md).
