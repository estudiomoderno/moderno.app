# Portal de cliente · v3.62.1

Se elimina la franja superior. El menú identifica el Portal de cliente y utiliza Obra y Listas de compra. Las tareas del proyecto se presentan en Pendientes, En progreso, En revisión y Listo, con nombre y fecha prevista, sin edición. Las listas compartidas muestran tarjetas de productos con imagen, cantidad y precio, manteniendo las acciones de comentario o aprobación configuradas.

La proyección SQL del portal cliente incorpora únicamente title, col y due de las tareas. No incorpora notas, archivos, responsables ni costes. Los productos compartidos añaden unidad e imagen. El firmador de archivos acepta imágenes de listas compartidas, conserva la comprobación del estudio y excluye listas ocultas; el portal de obra no obtiene estas imágenes.

La migración portal-tareas-tarjetas.sql y portal-archivo se aplicaron en producción. Antes del commit SQL se verificó con datos ficticios la exclusión de campos privados y listas ocultas. Comprobación real de lectura: nueve tareas del proyecto PR-37 y nueve en su portal.

Validación local: 376 pruebas correctas y diff sin errores. Revisión visual de tareas en escritorio y tarjetas de compra en escritorio y móvil de 390 px. Las imágenes de la revisión visual local eran marcadores, no fotografías reales; los permisos del firmador se verificaron mediante pruebas automatizadas.
