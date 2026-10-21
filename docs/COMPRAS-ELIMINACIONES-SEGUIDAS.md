# Eliminaciones seguidas durante el guardado

## Objetivo y causa

Poder eliminar un producto y abrir/eliminar el siguiente mientras se guarda. El acuse de guardado reconstruía el bloque de proyectos aunque la fusión no aportase datos distintos. Eso invalidaba las referencias exactas que protegen al editor contra borrar otra ficha. Además, los cambios realizados durante una subida se trataban como un fallo y esperaban 15 segundos para el siguiente intento.

## Cambio preparado en v3.65.89

En `app/index.html`, aplicar el resultado de la fusión solo cuando difiera canónicamente del estado actual. Un acuse idéntico conserva las instancias del editor; cambios remotos efectivos siguen aplicándose y las guardas de identidad/posición permanecen activas. No se cambia la fusión, el formato, los RPC, permisos ni almacenamiento.

Tras un envío correcto, cambios posteriores se muestran como pendientes y vuelven a enviarse a los 900 ms. Los errores de red mantienen el reintento a los 15 segundos. No se permiten subidas superpuestas ni se marca todo guardado mientras quedan cambios. El tiempo de respuesta del servidor sigue dependiendo de la conexión.

## Validación

- Dos regresiones fallan antes de la corrección: referencias del editor invalidadas por un acuse idéntico; segunda eliminación durante un envío sustituida por una copia y reintento demorado.
- 542 pruebas Node correctas. Casos adicionales comprueban la aplicación de cambios remotos efectivos. Se conservan conflictos entre sesiones, atomicidad de lotes, permisos y errores con datos pendientes.
- Chromium aislado a 1440, 1100 y 390 px: eliminar, iniciar una subida retenida por una promesa, eliminar otro producto, abrir el tercero, recibir el acuse y eliminar el tercero sin reabrirlo. El segundo envío conserva exactamente el cuarto producto. SDK real desactivado, cliente de memoria y conexiones externas bloqueadas; cero escrituras reales.
- PHP pendiente de CI. No se han medido latencias de usuarios reales ni ejecutado integraciones productivas.

## Publicación y reversión

Corrección preparada para revisión; no anunciar publicada sin confirmar integración y despliegue. Cumplir la guarda de respaldos del AGENTS.md antes de integrar este cambio de guardado; no restaurar ni borrar datos para desbloquearla. Reversión: revertir el commit de código y volver a publicar los recursos, conservando todos los registros y copias existentes.
