# Editor de producto más amplio — v3.65.76

El editor de las listas de compra usaba el diálogo general de 480 px y acumulaba todos los campos en una columna. Ahora dispone de hasta 1020 px en escritorio, dos columnas y bloques separados: Producto, Características, Precios y cantidades, Seguimiento y archivos. Los precios aparecen junto a los datos principales al abrirlo. La imagen crece a 112 px y se puede activar con teclado.

La cabecera y el pie permanecen visibles mientras se desplaza únicamente el contenido. Guardar, Cancelar y Añadir a mi biblioteca mantienen sus acciones originales. En móvil los bloques se apilan; el pie conserva los botones accesibles incluso en una pantalla de 320 × 568 px.

## Alcance y conservación

Cambian únicamente la plantilla de itemModal y estilos exclusivos de .shopping-product-editor. Se conservan todos los identificadores de campos, valores, eventos, cálculos de precio/coste/margen/cantidad, etiquetas, selector individual de seguimiento, adjuntos, borradores de subida y revisión explícita desde biblioteca. El estado general de la estancia continúa oculto. No cambian saveItem, itemToLibrary, SpecMaster, importación URL, permisos ni contratos.

El ancho se aplica al modal únicamente mientras contiene este editor; no se modifica modal(), closeModal() ni el comportamiento de los demás diálogos. Se actualizan la versión de la app y la caché de project-ui.css. No hay cambios de BD, Auth, Storage, backend, dependencias o datos reales.

## Validación

- 494 pruebas Node aprobadas.
- Chromium con servidor oficial y registros ficticios, SDK nulo, solicitudes externas y escrituras HTTP bloqueadas: editor a 1440 × 900, 1100 × 768, 390 × 844 y 320 × 568 px. Dos columnas en escritorio, una en móvil, sin desbordamiento horizontal y pie visible al desplazar el contenido.
- Subida de imagen accesible por botón con el mismo control de archivo, sin efectuar subidas. Comparación con biblioteca y cancelación sin cambios; ancho original de otros diálogos recuperado.
- Edición y guardado ficticios con cálculo bidireccional de margen, margen personalizado y total por cantidad; identidad, vínculo de biblioteca, campos personalizados, notas, imagen y adjuntos conservados.
- Regresión de los tres orígenes de producto, revisión URL y selección de portada; etiquetas, referencias y navegación entre listas. Revisión visual de capturas de escritorio y móvil.

No se prueban usuarios, tiendas ni archivos reales. PHP y autorización se verifican en Actions sin enviar correo. El PR registra la evidencia final de CI y despliegue y la comprobación de los 36 recursos públicos antes de confirmar publicación.

## Recuperación

Revertir el commit y desplegar recupera la presentación anterior. No requiere restaurar datos ni modificar documentos. No forzar recargas que descarten borradores abiertos.
