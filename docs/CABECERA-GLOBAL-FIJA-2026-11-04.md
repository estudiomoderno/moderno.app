# Cabecera permanente de escritorio — v3.65.143

El propietario aprueba una barra de Inicio, pestañas de proyectos y + fija a todo el ancho, como referencia de aplicación de escritorio. Se reutilizan los componentes y controladores existentes. La fila superior ocupa 56 px y queda fija en las vistas internas del estudio, incluidas Finanzas, Agenda, Ajustes y el editor de láminas. El lateral empieza debajo; notificaciones, equipo y perfil se mantienen arriba a la derecha.

El logotipo del lateral se oculta en esta presentación de escritorio. Sus nodos originales se conservan para recuperar la interfaz anterior; no se altera el inicio de sesión. Las rutas de sección y los cinco accesos de Finanzas pasan a una segunda fila bajo las pestañas. Se elimina la separación anterior exclusiva de la cuadrícula de proyectos, reemplazada por la línea de la cabecera completa.

## Conservación

- Las pestañas permanecen abiertas al cambiar de sección. Se conserva el contexto ya implementado: subsección, lista, desplazamiento y calculadoras de cada proyecto. La casa conserva su acción existente de mostrar todos los proyectos y + abre el buscador de proyectos.
- Se mantiene la navegación nativa de Ajustes dentro del lateral de escritorio, moviendo su nodo original y restaurándolo cuando se desactiva la presentación. Sus acciones y protección de borradores siguen en SettingsUI.
- Los formularios abiertos impiden cambiar de pestaña. Los borradores de documentos y de Ajustes siguen pasando por las comprobaciones del enrutador original.
- Las pestañas se limitan al estudio, sesión, rol y ámbito ya autorizados; los portales externos y los roles excluidos no reciben estos controles. No se modifican permisos ni se añaden consultas o persistencia de navegación.
- El cambio corresponde a escritorio desde 1100 px, conforme a la dirección visual aprobada. Se conserva la navegación de tablet/móvil, además de impresión y entrada de sesión. No se añaden dependencias o compilaciones de componentes.

## Archivos y comprobaciones

Cambian project-workspace.js, desktop-shell.js y header-actions.js; los CSS de escritorio, pestañas, rutas y el ajuste anterior de project-ui.css; index.html actualiza versión/caché. Ensayos e informe completan la entrega.

- 700 pruebas Node aprobadas.
- Ensayo Chromium específico a 1440/1100 px: barra fija en las vistas internas autorizadas, sin superposición con rutas, menú bajo la cabecera, memoria de proyectos/listas, plegado sin mover las pestañas, borradores, recuperación con componente no disponible y limpieza por cambio de rol. También se verifica el editor de láminas. A 900/390 px se conserva la navegación previa sin desbordamiento.
- Recorrido existente de pestañas a 1440/1100/390 px: búsqueda, cierre, teclado, secciones, memoria de lista/calculadora, múltiples pestañas, identidad y ámbito.
- Recorrido completo de la app a 1440/1100/390 px: pantallas originales, Finanzas, paneles de proyecto, perfil, Ajustes real, borradores sin guardar, tema claro/oscuro y recuperación de presentación. Se actualizan únicamente las expectativas de geometría y visibilidad del logo que cambian con este encargo.
- Servidor oficial aislado, registros ficticios, SDK nulo y peticiones externas/escrituras HTTP bloqueadas. Los contactos de las nuevas pruebas ya incluyen su numeración normalizada para no atribuirla a la navegación. No se prueban cuentas o registros reales.
- Capturas de escritorio, Ajustes, Agenda, Finanzas y editor revisadas. CI, despliegue, hashes de 58 recursos públicos y monitor se verifican en el PR antes de anunciar publicación.

## Reversión

Revertir el commit y desplegar recupera la colocación anterior. No requiere restauración de datos, SQL ni cambios en servicios. Las banderas existentes de presentación permiten recuperación local de la interfaz nativa; no cerrar borradores para forzar actualizaciones.
