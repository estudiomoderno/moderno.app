# Transición de cabecera e Inicio — v3.65.40

Petición del propietario del 18/10/2026. Rama `interfaz/transicion-cabecera-inicio`, base `a9f9cef` (#63), app anterior v3.65.39. Continuación visual de #49.

## Resultado y alcance

La cápsula negra se pliega/despliega con una transición CSS de anchura de 240 ms; iconos con desplazamiento de 10 px y desvanecimiento de 140/180 ms. La flecha acompaña el extremo de la cápsula. Se interpola el ancho de un contenedor que recorta únicamente la navegación durante el movimiento: al terminar quedan disponibles sus desplegables y nombres emergentes completos. Las pulsaciones sucesivas invierten la transición desde su posición actual. Un cierre de seguridad libera el recorte si no llega transitionend; los temporizadores se limpian al retirar la cabecera.

Con movimiento reducido el cambio es inmediato. Al reconstruir la barra en estado comprimido tras cambiar de tamaño no aparecen destellos ni se anima su restauración. Durante el cierre la navegación es inert y aria-hidden inmediatamente; CSS visibility la oculta al terminar el movimiento. No se puede enfocar una opción cerrada.

El símbolo es el mismo nodo/SVG original dentro de un contenedor sin acción, sin tabindex ni destino de navegación. Pulsarlo conserva la vista. Inicio aparece como primer icono de la navegación general, con su icono original, etiqueta emergente y botón delegado al handler original. Con borradores pendientes conserva la confirmación de salida. El grupo de Finanzas mantiene su flecha para volver al menú principal.

Sin cambios del tema, fuentes, logotipo, dock, herramientas del perfil, permisos, datos, guardado, Supabase, archivos, copias, mailer ni workflows. Cambios de app en desktop-shell.js, su CSS y tres sustituciones de versión/cache en index.html; su lógica permanece idéntica a main. Móvil/tablet y vistas excluidas conservan su UI. No se fuerza recarga.

## Comprobaciones y límites

457 pruebas Node correctas. Chromium aislado 1440/1280/1100/1024/390 px y app completa con servidor oficial 1440/1100/390 px; identidad, conexión y registros ficticios, SDK desactivado y red externa bloqueada. Se comprueban anchos intermedios reales de la transición en ambos sentidos, inversión con pulsación rápida, movimiento reducido sin animaciones activas y retorno al escritorio comprimido.

Logotipo inerte y fuera del tabulador; Inicio visible, con SVG real y navegación original. Inicio con borrador pendiente invoca la confirmación y mantiene formulario/vista; logo, plegado, grupo financiero y resize conservan el mismo nodo y contenido del borrador ficticio. Calculadora real conserva nodo/valores. Regresiones de teclado/foco, roles simulados, menús, ajustes, notificaciones, archivos e integridad de colecciones ficticias. Contraste claro/oscuro y revisión visual. Sin escrituras remotas.

PHP y autorización sin correo se comprueban en Actions; no se prueban autenticación ni RPC/guardado HTTP con datos reales. No se incorporan dependencias ni servicios nuevos.

## Publicación y retorno

CI del PR antes de integrar; deploy-app.yml publica recursos antes del HTML y verifica SHA-256 de los 12 recursos públicos. El resultado y enlaces se registran en el PR antes de confirmar publicación.

Retorno inmediato de cabecera: ModernoDesktopShell.setEnabled(false), que cancela el temporizador y restaura nodos sin recarga ni escrituras. Reversión permanente: revertir solo este lote/versionado por el proceso habitual, manteniendo cambios posteriores. Base estable v3.65.39 en `a9f9cef`; no restaurar datos por este cambio visual.
