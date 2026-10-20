# Alineación de tarjetas de productos — v3.65.82

El propietario muestra tarjetas con nombres, detalles, etiquetas y precios que no quedan alineados. Se reprodujo con diez productos ficticios: en una misma fila, las etiquetas empezaban en posiciones distintas (entre 680 y 730 px) porque compartían párrafo con los metadatos de longitud variable.

Se separan descripción, etiqueta y cantidad/total en bloques propios. La cuadrícula compartida pasa de seis a siete filas por tarjeta: foto, nombre/precio, detalles, etiqueta, cantidad/total, controles y pie. Las tarjetas de una misma fila comparten las alturas necesarias, sin cortar nombres largos ni inventar texto para los datos ausentes. Precio y nombre usan la misma altura de línea; las etiquetas comienzan en su propia fila, sin margen añadido. Se conserva el orden, las imágenes, tipografías, tamaños y acciones nativas.

Cambio limitado a HTML/CSS de presentación; no modifica registros, precios, cantidades, etiquetas, adjuntos, referencias ni contratos. La vista en filas conserva su disposición propia. El marcador de arrastre y Añadir producto abarcan los mismos siete tracks en tarjetas.

Validación: reproducción anterior fallida por geometría de etiquetas; corrección verificada en navegador aislado a 1680, 1440, 1100, 760 y 390 px, con varias filas, nombres largos, metadatos y etiquetas ausentes, etiquetas largas, entrega, adjuntos y diferentes estados. Dentro de cada fila se comprueban posiciones de foto, título, precio, descripción, etiqueta, cantidad/total, controles y pie (tolerancia 1 px), nombres completos y edición del producto correcto. Registros ficticios intactos. Regresión de tarjetas/filas, filtros, búsqueda, orden y arrastre mediante el recorrido existente. Sin red externa ni escrituras reales.

514 pruebas Node correctas; PHP se verifica en CI, no está instalado localmente. Se añade shopping-cards.css al verificador de publicación: 39 recursos públicos.

Reversión: revertir el commit de interfaz y desplegar con el procedimiento habitual, sin restaurar datos ni archivos. Integrar tras CI del mismo HEAD correcto y verificar workflow final y recursos públicos antes de anunciar publicado.
