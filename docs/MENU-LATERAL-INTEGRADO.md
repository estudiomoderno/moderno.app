# Menú lateral integrado — v3.65.74

El propietario solicita el 20/10/2026 evolucionar el menú lateral para que la aplicación tenga aspecto de programa, usando Rayon como referencia visual. La entrega se limita a la navegación de escritorio y al espacio que comparte con la cabecera y los proyectos. No copia recursos, contenidos ni funciones de Rayon.

## Presentación

El lateral sustituye la cápsula flotante por una columna recta a toda la altura de la ventana: fondo blanco, borde divisorio fino, sin sombra y selección gris. Conserva el símbolo oficial y las fuentes de la app. En modo abierto mide 224 px y muestra iconos y nombres; plegado mide 64 px y conserva todos los accesos por icono, con título y nombre accesible. El control de plegado queda abajo, integrado en la columna.

El ancho, el margen del contenido y el comienzo de pestañas/rutas se animan durante 240 ms. El menú plegado sigue navegable por teclado; no se oculta ni se marca inert. Se mantiene el estado compacto al pasar por la navegación de tablet y volver al escritorio, sin persistencia nueva. El movimiento reducido desactiva las transiciones.

Se conserva un único acceso Finanzas y sus secciones superiores. Productos y servicios mantiene sus acciones en un desplegable ajustado a la ventana, también con la barra plegada. El desplegable usa posición fija para no quedar recortado por el área desplazable del lateral; sigue el botón al desplazar el menú. Los controles reducen su altura en ventanas bajas y el área puede desplazarse si hace falta.

Las pestañas de proyectos y las rutas comparten el mismo margen horizontal que el contenido (248 px abierto, 88 px compacto), respetando el espacio del perfil. El dock del proyecto se centra en el espacio de trabajo disponible. Las cuatro métricas conservan una fila a partir de 1100 px, permitiendo tarjetas de al menos 180 px para acomodar el lateral abierto. Perfil, notificaciones, menús de ajustes, formularios y componentes ReUI mantienen sus funciones y medidas.

## Seguridad y comprobaciones

Solo se modifican presentación y estado transitorio de la navegación. Los botones siguen llamando a sus handlers originales, con canView, restricciones por rol y protección de borradores. No hay cambios de registros, guardado, permisos de servidor, autenticación, Storage, esquemas, APIs o dependencias. Móvil/tablet por debajo de 1100 px e impresión conservan su navegación anterior.

Verificado con 492 pruebas Node y Chromium aislado, sin datos reales ni escrituras remotas:

- Navegación: 1440/1280/1100/1024/390 px, ventanas de 500/400 px de alto, rutas y secciones, logo inerte, roles, teclado/foco, Productos abierto/compacto, conservación de borradores y nodos originales, animación con anchos intermedios, inversión y movimiento reducido.
- Aplicación completa con servidor oficial, SDK nulo y red externa bloqueada a 1440/1100/390 px: pantallas originales, Finanzas, ajustes, perfil, notificaciones, métricas, calculadoras y recuperación.
- Pestañas con registros ficticios a 1440/1100/390 px: posiciones respecto al lateral/perfil, márgenes al plegar/desplegar, alternancia, búsqueda, secciones y estado de calculadoras, cierre seguro, borradores, permisos e identidad.
- Inspección visual de escritorio abierto/compacto y claro/oscuro. No se certifican dispositivos físicos; PHP y 24 comprobaciones de autorización sin enviar correo se ejecutan en Actions.

## Publicación y recuperación

Publicación mediante PR, CI y deploy-app.yml. Se actualizan versión/cachés y se comprueban los mismos 34 recursos públicos mediante SHA-256. El PR registra los enlaces y el resultado final antes de confirmar publicación.

Revertir el commit y desplegar recupera la cápsula de la versión anterior, sin restaurar datos. ModernoDesktopShell.setEnabled(false) sigue devolviendo los nodos originales a la navegación anterior; la recuperación limpia las clases de escritorio y modo compacto. No se fuerzan recargas ni se descartan borradores de sesiones abiertas.
