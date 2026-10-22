# Exportación conjunta de listas e IVA — v3.65.113

El propietario solicita las mismas opciones de diseño de una estancia al exportar todas las listas, un resumen inicial y un desglose de IVA. Confirma un único porcentaje por exportación.

## Comportamiento

El diálogo compartido permite lista o cuadrícula, A4 vertical u horizontal y PDF/impresión o CSV para Excel/Sheets. La exportación conjunta permite elegir todas las listas, grupos de estancias/pavimentos/otras listas o listas concretas y siempre empieza con su resumen. Cada estancia continúa en una sección propia con el diseño elegido. La exportación individual abre el mismo diálogo sin selector de listas ni resumen conjunto.

Se indica expresamente si los precios aportados incluyen IVA o si hay que añadirlo. El porcentaje es editable, con 21 % inicial. Cada estancia y el resumen muestran base imponible, cuota de IVA y total. En el PDF los importes de los productos siguen siendo los aportados y la cabecera aclara si incluyen IVA. El CSV añade columnas de precio unitario, importe aportado, base, tipo, cuota y total.

Los cálculos redondean cada importe de línea a céntimos con razones decimales exactas, extraen o añaden el IVA según la opción y suman esas mismas líneas en estancias y resumen. Base más IVA coincide con el total, también con cantidades fraccionarias. Los precios originales no se modifican ni se graba un impuesto en los productos. El porcentaje no es una inferencia de la tienda.

El total anterior del proyecto podía incluir listas no seleccionadas, y los totales de estancia podían incluir productos ocultos o alternativas omitidas. El modelo compartido ahora aplica los mismos filtros a detalle, resumen, PDF y CSV. Los productos ocultos quedan fuera; las alternativas siguen la casilla correspondiente. Los precios desconocidos y cantidades inválidas bloquean una exportación con precios para no generar un total engañoso; se puede completar el dato o exportar sin precios.

Los ajustes de proveedor, dimensiones, color, material, categoría, SKU, entrega, código, enlaces, notas para el cliente, logo, fecha, totales y alternativas se conservan en el diálogo. Ocultar precios elimina importes, etiquetas de IVA y columnas fiscales. Los costes, márgenes y notas internas no forman parte del modelo exportado. Se escapan nombres y notas en HTML y celdas CSV; los enlaces solo aceptan HTTP/HTTPS y las celdas textuales de hoja de cálculo neutralizan fórmulas.

## Implementación

`app/shopping-export.js` contiene el modelo, formatos y diálogo compartidos. Los accesos de estancia, exportación general e impresión usan este controlador; se mantienen aliases anteriores. La preparación asíncrona del PDF conserva la orientación hasta terminar, en lugar de retirarla tras 800 ms. La cuadrícula impresa evita que las reglas responsive de la app conviertan cuatro columnas horizontales en dos. El diálogo respeta desplazamiento y foco al cambiar opciones y restablece la posición al abrir o cambiar de paso.

Sin nuevas dependencias, migraciones, cambios de permisos ni escrituras de datos operativos. El nuevo recurso se añade a la verificación de publicación: 51 recursos públicos.

## Verificación y límites

- 668 pruebas Node, incluidos cálculos con IVA incluido/no incluido, 0/4/5,5/10/21 %, fracciones, redondeos decimales, filtros, totales seleccionados, importes desconocidos, contenido privado, CSV y duración de orientación durante la preparación asíncrona.
- Chromium con servidor oficial aislado, datos ficticios y red externa/escrituras remotas bloqueadas, 1440 y 390 px: diálogo compartido, selección, ajustes, IVA, PDF, cuadrícula horizontal, descarga CSV, estancia individual y exportación sin precios. Los proyectos permanecen idénticos.
- PDF real generado con Chromium y leído con pypdf: tres páginas para resumen y dos estancias, resumen en primera página, orientación horizontal y cifras consistentes. Inspección visual de documento y diálogo móvil.
- Regresión de aplicación completa a 1440, 1100 y 390 px: rutas, paneles, ajustes y persistencia local sin escrituras remotas.
- No se instala un generador XLSX: la opción sigue siendo CSV, indicado en el diálogo. El diseño de cuadrícula es una presentación de PDF; la hoja conserva detalle tabular.
- No se generan ni se descargan exportaciones de datos productivos durante estas pruebas.

## Publicación y reversión

Publicar solo después de CI y comprobar el despliegue y los 51 recursos servidos. Revertir el commit restaura el exportador anterior; no restaurar ni migrar la base de datos. Las preferencias de exportación no alteran precios ni listas.
