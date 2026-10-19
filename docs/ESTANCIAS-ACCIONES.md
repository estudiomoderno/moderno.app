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
