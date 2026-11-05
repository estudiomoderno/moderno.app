# Visor integrado de planos PDF y CAD — issue #202

Implementación basada en la galería, el acceso privado, PDF.js, las anotaciones y la subida privada existentes. No añade tablas, migraciones, buckets, permisos ni servicios externos.

## Comportamiento

- Al pulsar una miniatura de Planos se abre el visor integrado a pantalla completa.
- La barra de herramientas es horizontal, compacta y permanece arriba, debajo de la cabecera del archivo.
- El panel izquierdo contiene únicamente las miniaturas de las páginas, empieza contraído y se abre desde el botón de la barra. El panel derecho contiene únicamente los comentarios y se puede cerrar.
- PDF conserva páginas, zoom, desplazamiento, giro, anotaciones y exportación. `Guardar` sustituye la referencia del plano actual por el PDF editado; `Guardar como copia` crea un plano nuevo y conserva el original.
- La cabecera del visor muestra solamente `Guardar`, `Guardar como copia` y cerrar. No ofrece pantalla completa ni descarga del original.
- La edición del nombre y la eliminación de un plano usan el mismo sheet lateral, campos y pie de acciones que la edición de productos de la lista de la compra.
- DXF ASCII se interpreta y dibuja localmente, en modo estricto de solo lectura. Soporta `LINE`, `LWPOLYLINE`, `CIRCLE`, `ARC`, `POINT`, `TEXT` y `MTEXT`, con capas y colores básicos.
- DWG conserva su archivo, pero informa que necesita conversión. No se envía a un servicio externo ni se finge una previsualización.
- Imágenes PNG, JPEG y WebP continúan utilizando el visor existente.

## Seguridad, privacidad y coste

Los archivos privados siguen resolviéndose con el mecanismo vigente y enlaces de corta duración; la referencia almacenada no se sustituye por una URL firmada. La descarga para representar el archivo está limitada a 50 MB y se cancela si supera el límite. El DXF se procesa dentro del navegador y no sale del equipo. Las dos acciones de guardado reutilizan la subida privada y la persistencia autorizada que ya usa el gestor, con una nueva comprobación de identidad, proyecto, rol y acceso antes y después de subir.

PDF.js mantiene la versión 3.11.174 ya utilizada por la aplicación, cargada desde el CDN vigente. Los bytes del PDF se entregan a PDF.js como `ArrayBuffer` local y no se envían al CDN. Esta tarea no añade proveedor, retención ni coste: **0 EUR**. Queda como mejora independiente alojar PDF.js en Moderno.app para eliminar la disponibilidad externa del script.

La conversión DWG no se activa. Si se aprueba después, habrá que elegir proveedor o conversor aislado, revisar licencia, residencia, retención, borrado, cifrado y coste antes de subir un archivo privado.

## Límites reales

- DXF binario, entidades 3D, referencias externas, bloques complejos, sombreados, splines y tipografías CAD específicas pueden no representarse. El visor lo indica en vez de alterar el archivo.
- Máximo de 50 MB, 100.000 entidades y 1.500.000 pares DXF en la vista local.
- Las mediciones calibradas y el panel de propiedades no se muestran en esta fase.
- La barra utiliza los SVG definitivos entregados por el propietario. Las herramientas de medición se han retirado hasta que exista una implementación calibrada real.

## Comprobación y reversión

- Unitarias: parser DXF, capas, formatos, índices, acciones, permisos, acceso privado y originales inmutables.
- Chromium sin backend: PDF en 1280, 1024, 844, 768 y 390 px; páginas, zoom, desplazamiento, gesto táctil, anotaciones, fotos, giro, undo/redo, exportación y cierre protegido.
- Chromium sin backend: visor integrado PDF y DXF, barra superior, páginas contraíbles, comentarios, guardado, copia y ausencia de herramientas de escritura en CAD.
- Chromium sin backend: sheet de edición en 1440 y 390 px, incluidos renombrado, cancelación, eliminación protegida y acciones contenidas dentro del pie.
- Capturas ficticias: `artifacts/gestor-planos/visor-pdf-202.png`, `artifacts/gestor-planos/visor-cad-dxf-202.png`, `artifacts/gestor-planos/opciones-plano-1440.png` y `artifacts/gestor-planos/opciones-plano-390.png`.

Reversión: revertir el commit de esta rama. No hay datos, esquema ni archivos remotos que restaurar.
