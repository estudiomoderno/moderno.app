# Portal del cliente · v3.62.0

Miniweb con Inicio, Avances, Tareas, Selecciones, Documentos, Facturas y Mensajes. Portada con nombre del proyecto, indicadores del seguimiento, accesos directos y bienvenida. Navegación lateral en escritorio y horizontal en móvil; cambio de contenido suave y respeto a movimiento reducido.

Se conserva la proyección y permisos existentes del portal. Tareas muestra los puntos realizados y pendientes del seguimiento de obra compartido (obraF.items); no lee ni publica las tareas internas del CRM. Si se oculta seguimiento de obra, tampoco se muestran sus tareas o calendario. No hay cambios SQL ni ampliación del acceso público.

Validación: 375 pruebas correctas, pruebas específicas de exclusión de tareas internas, respeto de seguimiento oculto y escape de texto. Revisión en navegador con vPortalCli y portalCalHtml reales y datos ficticios, a tamaño escritorio y390px. Navegación Tareas/Mensajes/Inicio y conservación del mensaje sin enviar comprobadas. No se enviaron mensajes ni se modificaron datos de clientes.
