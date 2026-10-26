# Alineación del separador de Proyectos — 26/10/2026

El propietario solicita alinear el separador situado sobre las carpetas con el borde inferior del logotipo del menú lateral. Se ajusta únicamente el espacio superior de Proyectos en escritorio, utilizando los 55 px del borde del logotipo (12 px de margen superior + 44 px de bloque - 1 px de borde). La regla prevalece sobre los 80 px generales de las ventanas de proyecto. Móvil y las demás pantallas conservan su disposición.

Archivos: `app/brand/project-ui.css`, versión/cache de `app/index.html` (v3.65.122) y prueba Chromium de Proyectos.

Validación: 669 pruebas Node superadas. Chromium a 1440, 1100 y 390 px: medición del separador frente al borde real del logotipo con diferencia inferior a 1 px, espacio respecto a los controles superiores, cuadrícula, búsqueda, archivados, formulario y teclado conservados. Captura de escritorio revisada. Datos ficticios, conexiones externas y escrituras bloqueadas; registros intactos. No se prueban cuentas reales.

Riesgo acotado a espaciado en Proyectos de escritorio. Reversión: revertir este commit y desplegar por el flujo existente. PR y verificación de publicación se registran en GitHub.
