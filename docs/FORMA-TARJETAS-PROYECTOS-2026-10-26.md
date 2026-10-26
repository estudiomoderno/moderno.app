# Silueta de las tarjetas de Proyectos — 26/10/2026

El propietario aclara que quiere la forma de la referencia: cuerpo redondeado con un recorte cóncavo en la esquina superior derecha, dejando la flecha dentro de un círculo separado. Se aplica la silueta al fondo de la tarjeta mediante una máscara CSS, conservando sus contenidos, progreso y navegación. La máscara no recorta avisos ni controles; el círculo sigue dentro de la superficie pulsable de la tarjeta.

Archivos: `app/brand/project-ui.css`, versión/cache de `app/index.html` (v3.65.124) y prueba Chromium de Proyectos. No se añaden imágenes, dependencias ni cambios de datos. Si el navegador no admite la máscara, conserva la tarjeta redondeada anterior.

Validación: 671 pruebas Node superadas. Chromium a 1440, 1100 y 390 px: máscara aplicada, círculo de 34 px en la esquina, clic sobre la flecha y apertura por teclado, avances y actualización de tareas, avisos, búsqueda, archivados, formulario y alineación de la cabecera. Capturas revisadas en escritorio y móvil. Registros ficticios intactos; peticiones externas y escrituras bloqueadas. No se prueban cuentas reales ni otros motores de navegador.

Riesgo de presentación acotado a las tarjetas de Proyectos. Reversión: revertir este commit y desplegar por el flujo habitual. PR y verificación de publicación quedan registrados en GitHub.
