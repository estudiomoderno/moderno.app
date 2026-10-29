# Editar fase y confirmar borrado — v3.65.136

El propietario pide que el editor de fases de Proyectos → Tareas siga el estilo nuevo de botones y que eliminar requiera aceptación explícita. Se mantiene el diálogo centrado y sus campos Nombre, Color, Inicio y Fin. Se modernizan tipografía, controles de 8 px de radio, Cancelar con borde, Guardar azul y Eliminar fase con tratamiento destructivo.

El antiguo formulario ya llamaba a una confirmación genérica. Ahora la confirmación se presenta de forma específica como «Eliminar fase», con acciones compactas Cancelar y Eliminar fase en rojo. No se elimina al abrir el diálogo; el foco inicial queda en Cancelar. Cancelar devuelve al formulario con nombre, color y fechas sin guardar conservados. Las tareas no se eliminan.

`ModernoTaskPhaseEditor` usa los contratos actuales `phases`, `curPhase` y `persistSoon`. Conserva propiedades adicionales de la fase al editar; incorpora validación de fechas y nombre, colores accesibles con radio nativo y el color guardado aunque no esté en la paleta. Incluye el alta de fases en el mismo estilo. No usa un índice antiguo para borrar una fase distinta: sigue la referencia seleccionada y comprueba sesión, estudio, rol, espacio, proyecto y contenido de la fase antes de guardar o confirmar. Una modificación externa o pérdida de permisos cancela la operación. Si cambia el orden, mantiene la fase activa cuando esta no se elimina. Un formulario cerrado no puede guardar ni iniciar el borrado.

No modifica esquema, SQL, RLS, Storage ni permisos; no se ejecutan escrituras de desarrollo sobre registros reales. Continúa usando el diálogo accesible existente y su política de conservar borradores ante Escape/clic exterior. Los estilos se limitan a las clases del editor y confirmación de fase.

Comprobaciones:

- Node: 695 pruebas, incluidas cinco nuevas sobre guardado, metadatos/tareas, confirmación, borrador al cancelar, reordenación, fechas y sesión/fase modificadas.
- Chromium 1440/1100/390: apertura desde Tareas, campos/color/fechas, botones azules y compactos, diálogo destructivo explícito, cancelar conservando el borrador, guardar, eliminar solo la fase elegida manteniendo tareas/fase activa, creación, cancelación y confirmación caducada. Servidor oficial aislado, registros ficticios, solicitudes externas y escrituras remotas bloqueadas.
- Publicación mediante CI y Actions; verificación del contenido de 56 recursos públicos, incluidos `index.html`, `project-ui.js` y `brand/project-ui.css`. La comprobación de Google del despliegue permanece aislada de la app y Supabase.

Reversión: revertir este PR y sus versiones de recursos. No requiere restaurar BD ni eliminar o migrar datos existentes.
