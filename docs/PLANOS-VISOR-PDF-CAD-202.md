# Visor integrado de planos PDF y CAD — issue #202

Implementación aislada en `feat/planos-visor-pdf-cad-202`, basada en la galería, el acceso privado, PDF.js y las anotaciones existentes. No añade tablas, migraciones, buckets, permisos, servicios externos ni escrituras nuevas.

## Comportamiento

- Al pulsar una miniatura de Planos se abre el visor integrado a pantalla completa.
- La barra de herramientas es horizontal, compacta y permanece arriba, debajo de la cabecera del archivo.
- El panel izquierdo muestra páginas y miniaturas; el derecho muestra propiedades y, en DXF, capas y número de entidades. Ambos se pueden contraer.
- PDF conserva páginas, zoom, desplazamiento, giro, anotaciones temporales, exportación y descarga del original.
- DXF ASCII se interpreta y dibuja localmente, en modo estricto de solo lectura. Soporta `LINE`, `LWPOLYLINE`, `CIRCLE`, `ARC`, `POINT`, `TEXT` y `MTEXT`, con capas y colores básicos.
- DWG conserva su archivo y descarga, pero informa que necesita conversión. No se envía a un servicio externo ni se finge una previsualización.
- Imágenes PNG, JPEG y WebP continúan utilizando el visor existente.

## Seguridad, privacidad y coste

Los archivos privados siguen resolviéndose con el mecanismo vigente y enlaces de corta duración; la referencia almacenada no se sustituye por una URL firmada. La descarga para representar el archivo está limitada a 50 MB y se cancela si supera el límite. El DXF se procesa dentro del navegador y no sale del equipo.

PDF.js mantiene la versión 3.11.174 ya utilizada por la aplicación, cargada desde el CDN vigente. Los bytes del PDF se entregan a PDF.js como `ArrayBuffer` local y no se envían al CDN. Esta tarea no añade proveedor, retención ni coste: **0 EUR**. Queda como mejora independiente alojar PDF.js en Moderno.app para eliminar la disponibilidad externa del script.

La conversión DWG no se activa. Si se aprueba después, habrá que elegir proveedor o conversor aislado, revisar licencia, residencia, retención, borrado, cifrado y coste antes de subir un archivo privado.

## Límites reales

- DXF binario, entidades 3D, referencias externas, bloques complejos, sombreados, splines y tipografías CAD específicas pueden no representarse. El visor lo indica en vez de alterar el archivo.
- Máximo de 50 MB, 100.000 entidades y 1.500.000 pares DXF en la vista local.
- Las mediciones calibradas no se activan en esta fase. El panel reserva el lugar sin guardar ni calcular medidas falsas.
- Los SVG definitivos de la nueva barra aún no estaban adjuntos al entorno el 5 de noviembre de 2026. Los trazos actuales son los iconos provisionales ya presentes en el visor; deben sustituirse por los archivos del propietario antes de cerrar la revisión visual definitiva.

## Comprobación y reversión

- Unitarias: parser DXF, capas, formatos, índices, acciones, permisos, acceso privado y originales inmutables.
- Chromium sin backend: PDF en 1280, 1024, 844, 768 y 390 px; páginas, zoom, desplazamiento, gesto táctil, anotaciones, fotos, giro, undo/redo, exportación y cierre protegido.
- Chromium sin backend: visor integrado PDF y DXF, barra superior, paneles, capas y ausencia de herramientas de escritura en CAD.
- Capturas ficticias: `artifacts/issue-202/visor-pdf-202.png` y `artifacts/issue-202/visor-cad-dxf-202.png`.

Reversión: revertir el commit de esta rama. No hay datos, esquema ni archivos remotos que restaurar.
