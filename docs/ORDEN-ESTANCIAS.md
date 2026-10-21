# Orden manual de estancias — v3.65.92

Las tarjetas de las listas de compra incorporan el mismo tirador circular de puntos de los productos, de 32 px. Arrastrar con ratón o dedo muestra una copia flotante y el hueco de destino; Escape y cancelación del puntero no aplican cambios. También se puede enfocar el tirador y usar las flechas del teclado. El clic normal de la tarjeta sigue abriendo la estancia.

Se reordena el array de estancias ya existente y el render conserva el guardado normal. Cada grupo se mueve dentro de sus huecos: Estancias, Pavimentos y Otras listas permanecen separados. No se crean IDs ni campos de orden, ni se preparan o renumeran identificadores históricos. Se conservan las instancias de las estancias, sus productos, archivos y referencias por rid/src. El botón Añadir sigue al final.

Se mantienen los permisos: control para propietario/administrador con acceso al proyecto; la acción también comprueba permiso, sesión, proyecto, pestaña y ausencia de editor abierto. Captura el array original y rechaza un gesto si sus posiciones o instancias han cambiado durante el arrastre. No modifica RPC, esquema, sincronización, copias ni permisos del servidor.

Validación: 552 pruebas Node correctas, con conservación exacta de contenidos y referencias, grupos intercalados, movimientos de teclado, límites, sesiones/roles/editor y arrastre obsoleto. La fusión existente conserva el orden serializado. Chromium aislado a 1440 y 390 px comprueba arrastre real con ratón, Escape, teclado, gesto táctil móvil, restauración del orden desde la copia local, tarjeta Añadir al final y ausencia del control para colaborador. Capturas revisadas. SDK real desactivado, red externa bloqueada y cero escrituras reales. PHP se comprueba en CI.

Publicación pendiente de CI, integración y verificación de 41 recursos públicos, incluidos project-ui.js, brand/project-ui.css e index.html. Reversión: revertir el commit de interfaz y publicar por el workflow normal. El orden guardado continúa siendo un array compatible con versiones anteriores; no restaurar ni borrar datos para revertir la interfaz.
