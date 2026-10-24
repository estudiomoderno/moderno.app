# Silueta de carpetas — 24/10/2026

El propietario solicita que las carpetas de la pantalla general de Proyectos dejen de verse demasiado rectangulares. Se aproxima la proporción visible a un cuadrado (ancho/alto 1,16 frente a 1,46), se redondean las esquinas y se suaviza el perfil superior. Se conservan gris, ausencia de apertura al pasar el ratón, nombre/número y avatar existentes.

Archivos: `app/index.html` (trazados SVG y versión v3.65.116) y `app/brand/project-ui.css` (ancho máximo del dibujo). Sin cambios de lógica, datos, permisos, dependencias ni carpetas del Inicio.

Validación: 669 pruebas Node superadas. Prueba Chromium existente de Proyectos con 27 proyectos ficticios a 1440, 1100 y 390 px: navegación por teclado, búsqueda, cambio de vista, archivo, título y nombres, ausencia de transformación y registros intactos. Revisión de capturas en escritorio y móvil. Servidor oficial aislado, conexiones externas y escrituras bloqueadas; no se prueban cuentas ni escrituras reales.

Riesgo acotado a la presentación. Reversión: revertir este commit y publicar por el workflow existente. PR y despliegue quedan vinculados en GitHub.
