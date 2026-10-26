# Tarjetas de proyectos con avance — 26/10/2026

El propietario aprueba sustituir las carpetas de la página general por tarjetas inspiradas en su referencia: avatar del cliente, flecha, nombre, código, cliente, estado, avisos y porcentaje de avance. Se utiliza el cálculo existente de `ModernoProjectInsights.metrics`: tareas en `listo` respecto al total, redondeado al porcentaje entero. Las tarjetas muestran también las tareas completadas y una barra; sin tareas se indica «Sin tareas», sin inventar un porcentaje.

Toda la tarjeta es un enlace accesible al proyecto. El clic normal conserva el manejador existente, las guardas y las ventanas de proyecto; los modificadores permiten la navegación nativa del enlace. Los avisos siguen abriéndose y cerrándose de manera independiente. Se reutilizan las iniciales del cliente y no se añaden fotos ni datos ficticios al producto. La tarjeta de Nuevo proyecto conserva el formulario habitual. Las carpetas del Inicio y los colores guardados no cambian.

Archivos: `app/index.html` (renderizador de tarjeta y mapas de Proyectos), `app/brand/project-ui.css` (diseño acotado), pruebas de folios, Chromium de Proyectos y prueba unitaria de tarjetas. Versión v3.65.123. Sin consultas adicionales, dependencias, migraciones, cambios de permisos o escrituras de datos.

Validación: 671 pruebas Node superadas. Chromium a 1440, 1100 y 390 px con 27 proyectos ficticios: 0 %, 67 %, 100 %, sin tareas, sin cliente, actualización al completar una tarea, avisos independientes, nombres largos, enlace por teclado, búsqueda, archivados, formulario y línea alineada con el logotipo. Datos intactos tras restaurar los cambios sintéticos de tareas; escrituras y destinos externos bloqueados. Capturas de escritorio y móvil revisadas. La prueba completa de aplicación pasa en las tres anchuras: rutas, paneles, ajustes, guardas de borradores, persistencia local aislada y recuperación de componentes.

Riesgo limitado a presentación y navegación de la página general. Reversión: revertir este commit y desplegar por el flujo habitual. No se crean proyectos ni se prueban cuentas productivas. PR y verificación de publicación quedan registrados en GitHub.
