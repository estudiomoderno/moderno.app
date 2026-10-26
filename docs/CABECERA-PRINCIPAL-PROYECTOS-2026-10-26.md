# Cabecera principal de Proyectos — 26/10/2026

El propietario solicita retirar «Estos son tus… proyectos», situar la papelera junto a la campana con sus mismas medidas y añadir un botón «+ Nuevo proyecto» similar a la referencia azul. Se elimina el saludo visible y se conserva un título accesible de página. Las vistas quedan sobre las carpetas. En escritorio, Nuevo proyecto y la papelera se integran en la fila superior, con 32 px de altura y papelera de 32 × 32 px alineada con la campana. En móvil se conservan dentro de la página, con sus manejadores habituales.

La papelera continúa abriendo Proyectos archivados: no se cambia su significado ni se añade ninguna eliminación. El botón azul abre el formulario existente de creación. Las acciones de cabecera solo aparecen en la página general de Proyectos; se retiran al navegar, al desactivar la cabecera o en móvil, donde permanecen las acciones nativas. El ancho reservado por la barra de proyectos se ajusta mediante el medidor de cabecera existente.

Archivos: `app/index.html`, `app/header-actions.js`, `app/brand/project-ui.css`, prueba Chromium de Proyectos y prueba de orden de carga del componente. Esta última deja de depender de una versión de caché concreta, manteniendo la comprobación del orden de carga. Versión v3.65.120. Sin cambios de datos, contratos, permisos, dependencias ni bundles originales de ReUI.

Validación: 669 pruebas Node superadas. Chromium de Proyectos a 1440, 1100 y 390 px: saludo eliminado, medidas y alineación, ausencia de solapamiento con la barra superior, apertura del formulario, archivo/activos, vistas, búsqueda, navegación y registros intactos. Prueba completa de aplicación a las tres anchuras: rutas, paneles, ajustes, guardas de borradores, persistencia local aislada y recuperación de componentes. Capturas de escritorio y móvil revisadas; pruebas con datos ficticios y escrituras externas bloqueadas. No se crean proyectos ni se prueban cuentas reales.

Riesgo de presentación y montaje de acciones en una cabecera compartida, acotado por vista y tamaño. Reversión: revertir este commit y publicar por el flujo habitual. PR y verificación de despliegue quedan registrados en GitHub.
