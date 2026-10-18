# Menú lateral a toda altura — v3.65.44

Petición del propietario del 18/10/2026: que la barra desplegada baje hasta el extremo de la pantalla, con una longitud uniforme por estética. Rama `interfaz/lateral-altura-completa`, base `8a4c270` (#67).

El menú abierto utiliza la altura de la ventana con los márgenes existentes y espacio para la flecha inferior (`100dvh - 48px`). Sus iconos permanecen arriba y la longitud deja de depender del número de accesos, también dentro de Finanzas. Cerrado mide 66 px y conserva solo el logotipo y la flecha. La propia cápsula anima su altura durante 240 ms, junto al plegado ya existente, respetando movimiento reducido.

Solo tres declaraciones CSS y versión/cache de la app. No se modifica JavaScript, navegación, pestañas, perfil, dock inferior, datos, guardado, permisos, Supabase, Storage o correo. Móvil/tablet e impresión conservan su comportamiento.

Comprobaciones: 469 pruebas Node correctas; Chromium aislado a 1440/1280/1100/1024/390 px, más ventanas de 500/400 px de alto. Se verifica altura ajustada a cada ventana, plegado/desplegado, inversión, teclado, roles, editor intacto y desplegables dentro de pantalla. App completa con servidor oficial a 1440/1100/390 px y revisión visual clara/oscura. Datos e identidades ficticios, sin escrituras remotas. PHP se comprueba en Actions, sin enviar correo, al no estar instalado localmente. No se prueban datos reales ni dispositivos físicos.

Publicación mediante PR con CI y proceso habitual, recursos antes del HTML y verificación SHA-256 de 16 recursos públicos. El resultado final queda en el PR. Revertir este commit recupera la longitud de #67 sin restaurar bases de datos ni borrar archivos. No se fuerzan recargas de pestañas abiertas.
