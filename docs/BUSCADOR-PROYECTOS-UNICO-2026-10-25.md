# Un único buscador en Proyectos — 25/10/2026

El propietario solicita retirar el buscador inferior, ya que el «+» junto al icono de inicio permite buscar y abrir proyectos. Se oculta el campo inferior únicamente cuando está montada la barra de proyectos de escritorio (desde 1100 px). Se conservan los botones de cuadrícula, lista, archivo y nuevo proyecto. En móvil y si la barra superior está desactivada permanece el buscador nativo: allí no existe el acceso superior.

Archivos: `app/index.html` (clase del campo y versión v3.65.117), `app/brand/project-ui.css` (regla acotada) y la prueba existente `scripts/project-folders-browser.test.py`. No cambia el componente superior, ni datos, permisos, guardado o dependencias.

Validación: 669 pruebas Node superadas; Chromium a 1440, 1100 y 390 px con 27 proyectos ficticios. Comprobado que el campo duplicado está oculto en escritorio, el «+» encuentra y abre el proyecto elegido, el buscador nativo reaparece al desactivar la barra y funciona en móvil. Conservadas navegación por teclado, cambio de vistas, archivo, cabecera y registros. Capturas de escritorio y móvil revisadas. Servidor oficial aislado, peticiones externas y escrituras bloqueadas. No se prueban sesiones ni escrituras productivas.

Riesgo visual acotado. Reversión: revertir este commit y desplegar por el workflow habitual. La trazabilidad de PR y despliegue queda en GitHub.
