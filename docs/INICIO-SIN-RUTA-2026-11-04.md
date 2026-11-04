# Inicio sin ruta redundante — v3.65.144

Se elimina la tarjeta de ruta «Inicio» de la propia pantalla Inicio. El componente no se monta en esa vista: no deja un hueco ni conserva la segunda fila reservada para rutas. El mapa comienza con el margen normal bajo la barra de pestañas.

Se conservan los accesos a Inicio del lateral, las pestañas y las rutas del resto de secciones, incluidas Finanzas. Solo presentación: sin cambios de datos, guardado, permisos o servicios.

Validación: 700 pruebas Node; Chromium aislado a 1440/1100/900/390 px, con comprobación explícita de ausencia de ruta y margen de Inicio en escritorio. Se verifica la navegación entre secciones y los recorridos de cabecera existentes; capturas revisadas. Registros ficticios, SDK nulo y bloqueo de solicitudes externas/escrituras HTTP. Se actualiza el ensayo de recuperación de rutas para usar Agenda, porque Inicio ya no crea ese componente.

Publicación mediante el PR, CI y despliegue existentes; verificar recursos públicos y disponibilidad antes del anuncio. Revertir el commit recupera la tarjeta anterior sin restaurar datos.
