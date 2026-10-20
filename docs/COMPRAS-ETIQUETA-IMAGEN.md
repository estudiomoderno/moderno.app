# Etiqueta sobre la imagen del producto — v3.65.83

El propietario prefiere la etiqueta dentro de la imagen. En tarjetas se coloca en la esquina inferior izquierda, con fondo neutro y borde sutil para mantener la lectura sobre cualquier foto. Mantiene su función de filtrar al pulsarla. El botón de la etiqueta es hermano del botón de imagen dentro de un contenedor relativo: no se anidan botones y pulsar la etiqueta no abre el visor.

Desaparece la fila independiente de etiqueta. Se mantienen seis filas compartidas para foto, nombre/precio, detalles, cantidad/total, controles y pie, preservando la alineación de las tarjetas y los textos completos. Añadir producto y el marcador de arrastre usan los mismos seis tracks. La vista en filas conserva su etiqueta junto al nombre; el contenedor nuevo mantiene la posición de su imagen.

Cambio exclusivo de HTML/CSS; no altera registros, etiquetas, referencias, importes, imágenes, permisos ni contratos de guardado. Cacheado y versión actualizados.

Validación: 514 pruebas Node correctas; navegador aislado a 1680, 1440, 1100, 760 y 390 px comprueba etiqueta dentro del marco y alineada abajo, filtro correcto sin abrir el visor, ausencia de la fila antigua, alineación de precios/controles y datos intactos. Regresión de tarjetas/filas, filtros, búsqueda, orden y arrastre en cuatro tamaños. Sin red externa ni escrituras reales. PHP se verifica en CI. La publicación exige un workflow final correcto y 39 recursos públicos coincidentes.

Reversión: revertir el commit de interfaz y desplegar por el procedimiento habitual, conservando todos los datos y archivos.
