# Proyectos solo en cuadrícula — 26/10/2026

El propietario solicita quitar las vistas de la página general de Proyectos, mostrar únicamente la cuadrícula y añadir una línea entre la navegación superior y las carpetas. Se eliminan el selector y las ramas de lista/cronograma de esta página. Las preferencias antiguas `list` o `timeline` ya no cambian su presentación. Se conserva el resto de funciones de proyectos.

Una regla fina separa la cabecera del contenido, integrada dentro de la cabecera para evitar que su fondo adhesivo tape la línea. Se ajusta únicamente el margen superior del contenido; se conservan los márgenes laterales de las carpetas. El buscador móvil, la búsqueda superior de escritorio, archivados y Nuevo proyecto mantienen sus manejadores.

Archivos: `app/index.html`, `app/brand/project-ui.css` y `scripts/project-folders-browser.test.py`. Versión v3.65.121. Sin cambios de datos, permisos, guardado ni dependencias. Las vistas de otras pantallas no cambian.

Validación: 669 pruebas Node superadas. Chromium a 1440, 1100 y 390 px con 27 proyectos ficticios: cuadrícula incluso con preferencias antiguas, ausencia de botones de vista y tabla, separador de 1 px entre barra y carpetas sin solapamiento, acciones de cabecera, formulario, búsqueda, archivados, teclado y registros intactos. Capturas de escritorio y móvil revisadas. Servidor oficial aislado, escrituras y peticiones externas bloqueadas. No se prueban cuentas reales.

Riesgo de presentación acotado a Proyectos. Reversión: revertir este commit y publicar por el workflow habitual. PR y verificación de despliegue quedan registrados en GitHub.
