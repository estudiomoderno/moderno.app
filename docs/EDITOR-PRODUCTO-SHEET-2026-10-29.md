# Editor de productos en Sheet — v3.65.138

El editor de las listas de compra pasa del modal centrado a un panel lateral derecho de 480 px, a altura completa y de ancho disponible en móvil. Sigue el estilo de crear/editar proyecto: esquinas rectas en el panel, Inter, campos compactos, botones de radio 8 px y Guardar azul. La cabecera incorpora un cierre explícito; el pie y la cabecera permanecen visibles y solo se desplaza el cuerpo. Se conserva Añadir a mi biblioteca.

## Alcance

Solo presentación y un botón de cierre que llama al mismo closeModal de Cancelar. Se reutilizan itemModal, sus controles/identificadores, borrador, cálculos, archivos, imagen, comparación con biblioteca y acciones del producto. Añadir producto manual comparte el mismo formulario y recibe el mismo panel. No hay dependencias nuevas, cambios de guardado, permisos, contratos, SQL o configuración.

Los selectores del panel se aplican únicamente mientras modalBox contiene shopping-product-editor; otros diálogos recuperan automáticamente su presentación. El foco y la restauración del foco utilizan ModernoDialog; Escape y clic exterior siguen sin descartar borradores. La entrada lateral respeta prefers-reduced-motion.

## Comprobaciones

- 700 pruebas Node aprobadas.
- Chromium aislado con servidor oficial, credenciales ficticias, SDK nulo y bloqueo de peticiones externas/escrituras: 1440×900, 1100×768, 390×844 y 320×568.
- Una columna, alineación derecha con el área del overlay (excluye el espacio de la barra de desplazamiento), altura completa, sin desbordamiento horizontal y pie visible al desplazarse.
- Recorrido de foco contenido entre cierre y Guardar; selector de imagen mediante teclado; cierre y Cancelar sin alterar registros; recuperación del tamaño del siguiente diálogo.
- Comparación con biblioteca en borrador, cálculo bidireccional de margen, cantidades y guardado ficticio conservando ID, campos personalizados, vínculo a biblioteca, notas, imagen y adjuntos.
- Recorridos de tres orígenes de producto a 1440, 1100 y 390 px: manual, biblioteca y revisión de enlace sin guardado automático.
- Revisión visual de capturas de escritorio y móvil. No se prueban cuentas, archivos, tiendas ni escrituras reales.

## Entrega y reversión

Publicación mediante PR y workflow existente de app.moderno.app; verificar CI, despliegue, hashes de recursos públicos y monitor antes de anunciarla. El PR contiene la evidencia final. Revertir este commit recupera la presentación centrada sin restaurar datos ni documentos. No cerrar sesiones ni forzar recargas sobre borradores abiertos.
