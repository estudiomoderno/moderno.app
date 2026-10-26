# Acceso directo a la web del producto — 26/10/2026

El propietario solicita abrir la web de un artículo desde su tarjeta, sin entrar en la ficha y copiar la dirección. Se incorpora un icono de enlace circular en la esquina inferior derecha de la imagen. Abre la URL existente en otra pestaña y solo aparece para direcciones HTTP/HTTPS válidas. En la vista de filas se conserva el enlace de texto que ya existía, sin duplicarlo.

Archivos: `app/project-ui.js` (variante compacta del generador de enlaces existente), `app/index.html` (acceso en las tarjetas y versión v3.65.119), `app/shopping-cards.css` (posición, foco y espacio de las etiquetas) y `scripts/shopping-product-link-browser.test.py`. Se mantienen edición, imagen, arrastre, cantidades, precios y datos. Sin migraciones ni dependencias nuevas.

Validación: 669 pruebas Node superadas. Chromium a 1440, 1100 y 390 px: apertura por ratón y teclado en otra pestaña sin acceso a opener; URL y parámetros conservados; posición inferior derecha y etiquetas sin solapamiento; ausencia de acceso para URLs vacías, incorrectas, JavaScript o data. Conservados edición, enlace de filas y registros. Capturas de escritorio y móvil revisadas. Servidor oficial aislado, destinos ficticios y escrituras/peticiones externas bloqueadas. No se prueban webs comerciales ni cuentas productivas.

Riesgo limitado a presentación y navegación externa solicitada. Reversión: revertir este commit y desplegar por el flujo habitual. PR y verificación de publicación quedan registrados en GitHub.
