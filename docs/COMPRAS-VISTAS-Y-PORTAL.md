# Compras: imágenes, filas y acceso al portal — v3.65.77

Las listas de compra permiten alternar entre tarjetas y filas mediante un icono de 32 px situado entre filtro y búsqueda. La vista inicial sigue siendo tarjetas; la preferencia dura mientras está abierta la aplicación y no escribe registros ni cambia filtros, búsqueda o datos de productos.

En filas se muestran imagen, nombre, enlace web, estado individual, etiqueta, medidas, color, plazo, material, proveedor, referencia, precio unitario, coste profesional, cantidad, total y nota interna. Los importes desconocidos indican Por confirmar; los ceros siguen siendo ceros. Se conservan edición, opciones, ampliación de imagen, adjuntos y ordenación por teclado o arrastre. El arrastre en filas usa la posición vertical del destino. En pantallas estrechas los datos se distribuyen en menos columnas.

Las imágenes usan object-fit: cover centrado para llenar el marco, recortando la vista previa cuando sea necesario. Los originales y su ampliación se conservan. Añadir producto se coloca después de los productos en el DOM y en la presentación, también al filtrar, crear o reordenar; una lista vacía conserva un único acceso para añadir.

Portal del cliente vuelve al menú inferior de cada proyecto, incluido el interior de una lista. Utiliza la sección cliente existente, su icono, selección activa y navegación. Se mantiene también el acceso anterior desde ajustes. No se cambian permisos, enlaces, tokens ni configuración del portal.

## Conservación y comprobaciones

Cambian index.html, project-ui.js y sus estilos acotados. Se mantienen contratos y funciones de guardado, importación, archivos y publicación. Sin cambios de backend, DB, Auth, Storage, dependencias o datos reales. Los enlaces nuevos admiten únicamente HTTP/HTTPS, escapan atributos y usan noopener noreferrer.

- 497 pruebas Node: regresión existente y comprobaciones de texto escapado, enlaces seguros, precios nulos/cero y cambio de vista sin mutación de registros ni sustitución de un borrador abierto.
- Chromium sobre el servidor oficial aislado a 1680, 1440, 1100 y 390 px: imágenes de distintas proporciones llenan el marco; herramientas alineadas y del mismo tamaño; filas, campos, filtros y búsqueda; alta y cancelación; posición final del acceso Añadir; lista vacía; teclado y arrastre vertical; vuelta al portal nativo y selección activa.
- Regresión de etiquetas/referencias y navegación de proyectos con borradores protegidos. Regresión del editor amplio, cálculos, adjuntos y comparación con biblioteca. Tres orígenes de alta y elección/reintento de portada URL mediante respuestas ficticias.
- Capturas revisadas en escritorio y móvil. SDK productivo nulo; red externa y escrituras HTTP bloqueadas; sin subidas ni accesos a usuarios/archivos reales.

PHP y autorización se comprueban en Actions sin enviar correos. El PR registra la evidencia final de CI, el despliegue y los hashes de los 36 recursos públicos antes de confirmar publicación.

## Recuperación

Revertir el commit y desplegar recupera la presentación anterior. No requiere restaurar datos, eliminar productos o regenerar enlaces. La vista elegida no modifica documentos ni preferencias compartidas. No forzar recargas que descarten borradores.
