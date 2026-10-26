# Cantidades visibles en productos de compra — 26/10/2026

El propietario solicita ver las unidades de cada producto en la lista de compra. Las tarjetas muestran ahora la cantidad existente a la izquierda del total: «90 uds», «1 ud» o «12,5 m²». También se muestra en la vista de filas. Una cantidad ausente indica «Cantidad por confirmar»; cero se conserva como «0 uds». No se asignan cantidades nuevas ni se alteran los importes.

Archivos: `app/index.html` (cantidad en la última línea de la tarjeta, versión v3.65.118), `app/shopping-cards.css` (disposición flexible sin añadir una fila a la cuadrícula) y `scripts/shopping-quantity-browser.test.py`. No cambian datos, guardado, permisos, exportación ni dependencias.

Validación: 669 pruebas Node superadas. Chromium a 1440, 1100 y 390 px con productos ficticios: cantidad múltiple, singular, superficie decimal, cero, cantidad desconocida, precio desconocido y unidad por defecto. Comprobadas tarjetas y filas, textos y totales existentes, geometría y registros intactos. Capturas de escritorio y móvil revisadas. Servidor oficial aislado con conexiones externas y escrituras bloqueadas. No se prueban sesiones ni escrituras productivas.

Riesgo limitado a la presentación. Reversión: revertir el commit y publicar mediante el workflow habitual. PR y verificación de publicación quedan registrados en GitHub.
