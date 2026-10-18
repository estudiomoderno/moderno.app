# Menú de ajustes de proyecto — v3.65.49

Petición del propietario: aplicar su último patrón Button/DropdownMenu al menú situado junto al proyecto abierto, en español. Este patrón de tres puntos verticales sustituye la propuesta inicial de botón ghost con engranaje. Rama `interfaz/ajustes-proyecto-reui`, sobre `20ac0e6` (#72).

Se reutilizan Button y DropdownMenu originales de ReUI ya incluidos: botón outline/icon de 32 px, icono de 16 px, contenido w-48 alineado al final, fuente Inter, etiqueta Acciones y acción destructiva separada. El contenido usa los estilos y medidas originales, aislados con Shadow DOM. No hay dependencias nuevas, fuentes externas ni cambios generales de tipografía.

El menú conserva Editar datos, Personalizar proyecto, Portal del cliente, Duplicar proyecto y Eliminar proyecto. Cada acción delega en su botón nativo original; se mantienen sus confirmaciones y handlers. Los ejemplos de mover, favoritos, compartir, copiar enlace y atajos de teclado no se incorporan como funciones ficticias. El botón se identifica como Ajustes del proyecto para lectores de pantalla y al pasar el ratón.

Las pestañas de escritorio trasladan el contenedor del control y conservan los nodos originales. En móvil el menú permanece en la ficha. La instancia se limpia al retirar la vista; ante un fallo del componente o su CSS reaparecen las opciones nativas. El menú original se conserva también si no carga la compilación. No se modifica Supabase, datos, permisos, autenticación, almacenamiento, archivos ni lógica de negocio.

Validación: pruebas Node; Chromium con el servidor oficial aislado en 1440/1100/390 px, identidades y proyectos ficticios y red remota bloqueada. Se comprueban acciones/etiquetas, medidas y fuente, teclado, Escape y retorno de foco, personalización sin guardar, edición/portal, conservación de registros y borradores, navegación entre proyectos y recuperación de la interfaz nativa. La app completa se revisa además en los mismos anchos. PHP se valida en Actions sin enviar correo. No se prueba con cuentas reales ni dispositivos físicos; las operaciones de eliminar/duplicar no se ejecutan en producción.

Publicación por el workflow habitual y comparación SHA-256 de 26 recursos públicos, añadiendo project-options.js y su CSS al verificador existente. El PR registra los resultados finales y la versión efectivamente publicada. Revertir este commit y desplegar recupera #72 sin restaurar datos. No se fuerzan recargas de sesiones abiertas.

## Ajuste posterior — v3.65.50

El propietario pide alinear el botón del proyecto con notificaciones y perfil y retirar «Información del proyecto». Se corrige el centro vertical de la fila de pestañas: el botón quedaba 5 px más abajo. Se conserva la medida original de 32 px y no se cambia el componente ReUI, su fuente ni su menú. La barra comparte la altura y posición del contenedor de acciones de la cabecera; el envoltorio del control usa flex para evitar diferencias de línea base.

Se elimina el icono/desplegable de información y sus estilos. La cabecera original permanece en un contenedor oculto y recuperable, sin borrar título, cliente, etiquetas ni datos. Desactivar las pestañas sigue devolviendo los nodos a la ficha; móvil conserva su cabecera. Las acciones de ajustes permanecen disponibles. Archivos: project-workspace.js, sus estilos, header-actions.css, project-options.css e index.html para versión/caché.

Las comprobaciones de Chromium contrastan la posición superior de ajustes, campana y perfil con una tolerancia inferior a 1 px, su altura original y la ausencia del icono retirado. Se repasan los menús, pestañas, borradores y reversión con datos ficticios a 1440/1100/390 px, además de las pruebas Node/PHP habituales. Resultados efectivos y publicación en el PR. Sin pruebas con datos reales ni dispositivos físicos; sin cambios de datos, permisos o almacenamiento. Revertir esta entrega y desplegar recupera #73, sin restaurar datos.
