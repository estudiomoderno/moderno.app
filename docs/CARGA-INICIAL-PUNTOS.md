# Pantalla inicial de carga — v3.65.91

## Objetivo y diseño

Mientras se descargan los estilos y se comprueba el acceso, el navegador podía mostrar la estructura antigua del menú. Se añade una capa blanca de arranque con el spinner de ocho puntos suministrado por el propietario (Uiverse.io, abrahamcalsin): 2,8 rem, velocidad de 0,9 s, color #183153 y los mismos giros, desfases y pulso. CSS crítico y controlador están en la cabecera antes de los recursos externos; el indicador es el primer elemento del body.

Solo cambia la presentación inicial. No se modifican sesiones, roles, datos, guardado, copias ni servicios. El controlador recibe la finalización de la consulta de sesión existente y observa el estado de acceso después de los renders. Espera DOM/estilos, fuentes y dos frames antes de descubrir la interfaz. La capa no vuelve a aparecer en navegaciones posteriores. Respeta la espera existente de los portales.

La capa desaparece para mostrar un acceso correcto, el login ordinario o un error real. Si el arranque se bloquea, a los 20 s ofrece «Ver estado de la aplicación», sin recargar, borrar datos ni simular que el estudio está listo. Movimiento reducido muestra los puntos estáticos; estado anunciado en español y botón accesible por teclado.

## Validación y límites

- 549 pruebas Node correctas; PHP se comprueba en CI.
- Chromium aislado a 1440 y 390 px, retrasando el CSS del diseño actual: capa blanca visible, ocho puntos con parámetros originales y menú antiguo oculto. Se mantiene durante una comprobación de acceso pendiente y permite ver error/reintento al terminar. Login, movimiento reducido y salida de arranque bloqueado comprobados. Registros intactos y cero escrituras o conexiones externas reales.
- Capturas revisadas en el navegador de pruebas. No se han alterado registros ni examinado la sesión del usuario. Los recursos bloqueantes iniciales pueden mostrar blanco antes de que el parser llegue al body; no se elimina su bloqueo de descarga ni se reordena la arquitectura.

## Publicación y reversión

Publicación pendiente de CI, integración y verificación de los 41 recursos públicos actuales, incluida la entrada HTML. Revertir el commit de interfaz y publicar por el workflow normal. No borrar caché, copias ni datos para revertir.
