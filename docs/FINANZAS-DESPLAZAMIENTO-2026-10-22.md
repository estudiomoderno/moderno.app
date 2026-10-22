# Flechas al pulsar el menú de Finanzas — v3.65.110

El propietario observa pequeñas flechas al mantener pulsada una pestaña de Finanzas. El contenedor declaraba `overflow-x:auto` sin limitar el eje vertical: el navegador calcula `overflow-y:auto`, por lo que el pequeño desplazamiento visual del botón activo puede exponer una barra vertical nativa.

La corrección mantiene el desplazamiento horizontal y limita el vertical, oculta los controles nativos y reserva dos píxeles para el estado pulsado del componente. Se aplica tanto a `.finance-sections` dentro de Shadow DOM como al menú nativo de recuperación. No cambia los handlers, las rutas, los permisos ni los datos financieros.

Se modifica la fuente CSS propia y se recompilan los componentes con el lockfile y las dependencias existentes, sin instalar ni actualizar paquetes y sin modificar el código original de ReUI. Se incrementa la URL del CSS compartido y la del componente publicado para que el navegador no reutilice el estilo anterior. El build también regenera el bundle de calendario porque utiliza el mismo cargador; sus fuentes de calendario permanecen intactas. El manifiesto verifica las fuentes y los artefactos.

Verificación: 653 pruebas Node correctas; Chromium en la app aislada a 1440, 1100, 1024 y 390 px, pulsación mantenida con medición del contenedor sin desbordamiento vertical, desbordamiento horizontal real forzado, acceso por Tab a la última pestaña, navegación con Enter y registros ficticios intactos. También se comprueba el fallback bloqueando la descarga del componente. Sin conexiones externas ni escrituras de red. Captura revisada.

La publicación anterior del menú Discover (v3.65.109) terminó correctamente mediante la ejecución manual 39820526660 y verificó los 50 recursos públicos. Esta corrección es otra entrega y debe verificarse por separado antes de afirmarla publicada.

Reversión: revertir esta entrega de interfaz y sus artefactos compilados. No requiere SQL ni ninguna restauración o transformación de datos.
