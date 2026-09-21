# Portal de cliente · v3.62.2

Las compras muestran precio unitario, cantidad, subtotal, total por lista y resumen conjunto de listas visibles. Las imágenes y la portada se amplían en un diálogo con cierre por botón, Escape o fondo, restaurando el foco.

Los estados de tareas se agrupan en cajas. Obra comienza en el mes de la primera fase con fechas, señala el primer día y usa controles circulares y el formato «Septiembre 2026». Se corrige la conversión de fechas del calendario para usar el día local, sin desplazamiento UTC.

Inicio reduce el espacio del título y deja el saludo en una frase. La configuración del portal en el proyecto permite subir, cambiar o quitar una portada JPG, PNG o WEBP de hasta 12 MB. Se guarda como archivo compartido con docKind=portal-cover, usando los permisos y la firma de imágenes existentes. Cambiar o quitar la portada no borra el archivo anterior. No requiere migración SQL ni nuevos permisos.

Validación: 380 pruebas correctas, incluidas cantidades cero, totales sin listas ocultas, mes inicial, selección de portada y persistencia al subir/quitar. Revisión local en escritorio y móvil de 390 px; visor con imagen de muestra y cierre Escape comprobado. No se subieron imágenes ficticias a proyectos reales.
