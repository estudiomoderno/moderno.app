# Añadir producto: origen y portada — v3.65.75

Petición del propietario: al añadir un producto a una lista de compra, elegir Manualmente, Desde URL (IA) o Desde la biblioteca. Las imágenes importadas desde URL deben mostrarse como miniaturas para elegir la portada antes de guardar.

## Resultado

La tarjeta «Añadir producto» abre un selector con tres acciones. Desde URL se distingue mediante una insignia IA y un acento violeta suave. El selector no crea productos, agrupaciones ni archivos. No sustituye un editor que ya esté abierto.

- Manualmente abre itemModal, con sus campos, cálculos, etiqueta opcional, archivos, validaciones y guardado originales. Se retiran de esta ficha el botón de importar y la instrucción mezclada: el origen se elige en el paso anterior. Sigue siendo posible escribir el enlace del producto como dato de la ficha.
- Desde la biblioteca muestra búsqueda por nombre, proveedor, referencia o categoría; tarjetas con imagen, nombre y precio; estado vacío y regreso al selector. Elegir copia mediante ModernoSpec.fromProduct, con ID nuevo, libId y copia independiente de archivos/campos. Respeta la etiqueta seleccionada y solo crea una agrupación necesaria al añadir explícitamente. La biblioteca original permanece intacta.
- Desde URL abre directamente el importador existente con enlace, Obtener datos y revisión. No crea un formulario manual vacío debajo. En listas, obtener/consultar una captura preparada deja de llamar automáticamente a Guardar: el usuario elige portada y pulsa Añadir producto. El comportamiento de importación directa a Biblioteca se conserva.

Las imágenes de una captura se presentan como miniaturas de 112 px, seleccionables por radio nativo. La portada tiene borde y marca visibles; las alternativas indican Elegir portada. Teclado y foco se conservan. Se envía la ruta elegida mediante el campo existente p_revision.primaryImage de clipper_absorber. No se cambia el contrato ni se añaden campos de persistencia. Un fallo de guardado conserva la captura, la selección y el formulario para reintentar. Se mantiene la comprobación remota/local del producto y la recuperación idempotente anterior; después del guardado se abre su ficha existente.

## Alcance y conservación

Los accesos nuevos comprueban rol/visibilidad, carga de permisos, identidad y proyecto/estancia actuales. La biblioteca comprueba también que el índice siga apuntando al producto mostrado; una actualización concurrente no puede copiar otro producto por accidente. Texto de productos y búsquedas se escapan antes del HTML. Se conservan los permisos, límites, destinos, guardas de guardado y referencias privadas de imágenes del importador.

No hay cambios de backend, SQL, políticas, Auth, Storage, dependencias ni claves de proveedores. No se activa una API de IA nueva ni se realizan llamadas facturables durante las pruebas. La asistencia de clasificación opcional del importador sigue dependiendo de su configuración existente; la insignia no implica extracción universal ni invención de precios, variantes o medidas. Las galerías pueden estar incompletas, como antes. No se certifica en esta entrega una tienda concreta ni se modifican sus adaptadores.

## Comprobaciones

494 pruebas Node aprobadas, incluidos contrato de primaryImage e identidad, y guardas anteriores de importación, red, archivos y guardado. Chromium sobre el servidor oficial a 1440/1100/390 px, sin SDK productivo ni red externa:

- Tres orígenes, selector/edición cancelados sin cambios, creación manual explícita y protección del formulario abierto.
- Biblioteca vacía, búsqueda, nombres con marcado literal, copia independiente, registros originales intactos, índice obsoleto y cambio de estancia rechazados.
- Importador real con un cliente ficticio inyectado solo en su cierre léxico; el SDK de la aplicación sigue nulo. Captura/lectura, ausencia de absorción automática, cancelación previa, miniaturas, segunda portada, error/reintento conservando la selección y envío de la ruta elegida. La respuesta de confirmación y los datos del producto son ficticios y permanecen en memoria.
- Regresión de etiquetas y selector de listas: filtros, altas/edición/cancelación, referencias, archivos y borradores conservados. Regresión de las acciones de listas, exportaciones y navegación. Revisión visual del selector y las miniaturas en escritorio y móvil.

Las solicitudes externas y las escrituras HTTP se bloquean; no se capturan URL de tiendas reales ni se suben archivos a Storage. No se prueban cuentas ni datos reales. PHP y autorización se comprueban en Actions sin enviar correo.

## Publicación y recuperación

Publicación habitual tras CI, con versión/cachés actualizadas. La comprobación pública pasa de 34 a 36 recursos para incluir product-clipper.js y product-clipper.css. El PR registra la evidencia final de despliegue y los hashes antes de confirmar publicación.

Revertir el commit y desplegar recupera el acceso y comportamiento anteriores; no requiere restaurar datos ni eliminar capturas o imágenes. Los productos conservan el contrato existente. No forzar recargas ni descartar borradores abiertos.
