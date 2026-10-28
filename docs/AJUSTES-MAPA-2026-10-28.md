# Ajustes del mapa de Inicio — v3.65.135

El propietario solicita zoom con la rueda, el botón Nuevo proyecto azul como en Proyectos y retirar los textos inferiores del mapa.

- Google Maps usa `gestureHandling: greedy` y `scrollwheel: true`: zoom con rueda sin Ctrl. La interacción sigue deteniendo el encuadre automático para respetar el zoom elegido.
- Nuevo proyecto usa el mismo azul `#0666ff` y hover `#0055dc` de la vista general.
- Se eliminan el contador de ubicaciones, la leyenda y toda su franja inferior. Reintentar ubicaciones queda al final del panel de proyectos, solo cuando hay consultas fallidas. Se conserva la atribución de Google.

No cambia consultas, direcciones, caché, permisos ni guardado. Verificación: 690 pruebas Node y Chromium en 1440/1100/390 con SDK y proyectos ficticios. La regresión comprueba la configuración de rueda, azul calculado, ausencia de textos/franja, marcadores, navegación, filtros, reintentos y sesiones, sin escrituras externas. El despliegue conserva la prueba real aislada de Google y los hashes de 56 recursos públicos.

Reversión: revertir este PR y sus versiones de recursos. Sin cambios de BD ni restauración de datos.
