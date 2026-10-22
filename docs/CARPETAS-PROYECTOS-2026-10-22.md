# Carpetas neutras en Proyectos — 22/10/2026

La pantalla general de Proyectos utiliza carpetas grises estáticas, con nombre y número debajo y avatar del cliente cuando existe. No hay apertura al pasar el ratón. La cabecera dinámica aparece más arriba, conservando el espacio reservado a los controles superiores en escritorio y móvil. La vista de lista también utiliza un marcador de carpeta gris.

Cambios: `app/index.html` (modo neutro explícito y versión v3.65.115), `app/brand/project-ui.css` (presentación acotada), prueba unitaria de folios y prueba Chromium de Proyectos. No cambian colores guardados, documentos, permisos ni presentación de las carpetas del Inicio.

Comprobaciones: suite Node; Chromium con 27 proyectos ficticios a 1440, 1100 y 390 px: título dinámico y posición, nombre bajo la carpeta, ausencia de transformación al pasar el ratón, navegación por teclado, búsqueda, lista/cuadrícula, archivo y conservación íntegra de los registros. Servidor oficial aislado, peticiones externas y escrituras bloqueadas. Revisión de capturas de escritorio y móvil.

Riesgo: cambio de presentación acotado, sin migraciones ni dependencias nuevas. Reversión: revertir el commit y publicar por el workflow habitual. No se prueban escrituras ni cuentas reales. El PR y la ejecución de despliegue se registran en GitHub.
