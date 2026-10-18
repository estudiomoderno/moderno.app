# Menú lateral y pestañas arriba — v3.65.43

El propietario aprueba el 18/10/2026 pasar el menú general al lateral izquierdo, subir las pestañas de proyectos a la primera fila y mantener perfil/notificaciones arriba a la derecha y el dock inferior. Rama `interfaz/menu-lateral-pestanas-arriba`, base `91f5cef` (#66). Evolución de escritorio de #49.

## Resultado y alcance

La misma cápsula oscura, logotipo oficial y controles pasan a una columna de 68 px a la izquierda. Los iconos conservan sus handlers, permisos y etiquetas al pasar el cursor, ahora hacia la derecha. Finanzas sigue reorganizando el mismo menú con su flecha para volver. Productos y servicios despliega a la derecha, ajustando su posición a la altura disponible; el menú de perfil conserva su sitio y puede desplazarse si la ventana es baja.

La flecha inferior pliega la columna hasta el logotipo. Se mantiene la transición de 240 ms, ahora de altura y desplazamiento vertical, con inversión al pulsar rápidamente, navegación cerrada inert/aria-hidden y respeto por movimiento reducido. Cambiar la altura de la ventana recalcula el tamaño sin reconstruir los formularios. Los controles se adaptan entre 28 y 44 px en ventanas de poca altura; conservan 44 px en las alturas habituales de escritorio.

Las pestañas se sitúan a 20 px del borde superior, en la misma fila del perfil y las notificaciones, reservando su espacio para que no se superpongan. El contenido de proyecto comienza a 80 px, frente a 146 px de la versión anterior. Se ajusta el margen derecho para mantener las cuatro métricas de Inicio en una fila desde 1100 px. Dock inferior, buscador/cierre de pestañas, datos desplegables, rutas y protección de ediciones se conservan.

Cambios de presentación en `app/brand/desktop-shell.css`, `app/brand/project-workspace.css`, medición/posición del menú en `app/desktop-shell.js` y versión/cache en `app/index.html`. No cambian el controlador de pestañas, las colecciones, guardado, APIs, Supabase, Storage, permisos de servidor, archivos, copias ni correo. Móvil/tablet por debajo de 1100 px e impresión mantienen su navegación previa.

## Comprobaciones y límites

- 469 pruebas Node correctas. Autorización y sintaxis PHP se comprueban en Actions, sin enviar correo; PHP no está instalado en este entorno local.
- Chromium aislado a 1440/1280/1100/1024/390 px: rutas y secciones originales, filtrado por rol, teclado/foco, logo inerte, Inicio, Finanzas y perfil; plegado/desplegado con alturas intermedias reales, inversión durante la transición, movimiento reducido y conservación del editor al cambiar de tamaño.
- Ventanas de 500/400 px de alto: controles y flecha dentro de la ventana; desplegable de productos a la derecha, ajustado verticalmente, y menú del perfil sin salir de la pantalla.
- Aplicación completa con servidor oficial aislado a 1440/1100/390 px: módulos, Ajustes y borradores, opciones originales, métricas de proyecto en una fila, retorno a la navegación anterior. Sin escrituras remotas.
- Pestañas con proyectos ficticios: posiciones sin solaparse con barra/perfil, alternancia, estancia, calculadoras, doce pestañas, buscador, cierre sin borrar, ediciones abiertas, nombres largos/no confiables y cambios de sesión/ámbito. Inspección visual clara/oscura.

No se utilizan datos reales ni autenticación productiva. No se afirma prueba en dispositivos físicos. La disposición nueva es exclusiva de escritorio; la memoria de pestañas mantiene los límites de la entrega #66.

## Publicación y reversión

CI previa y `deploy-app.yml` con recursos antes del HTML y SHA-256 de los 16 recursos públicos, incluidos los dos CSS y el JS de navegación modificados. El PR registra los enlaces y el estado final antes de confirmar publicación.

Revertir este commit y publicar por el mismo proceso recupera el menú horizontal y las pestañas de #66. No requiere restaurar base de datos ni borrar archivos o almacenamiento local. `ModernoDesktopShell.setEnabled(false)` conserva el retorno a la interfaz anterior; no se fuerzan recargas de sesiones abiertas.
