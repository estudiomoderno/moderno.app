# Proyectos: ficha de gestión fiel a la referencia

**Fecha:** 4 de noviembre de 2026. Tras ver el resultado de dos columnas y el selector Compacta / Visual / Lista, el propietario solicita una única vista y un mínimo de cuatro fichas por fila en escritorio normal. La referencia visual fija la composición: carpeta arriba a la izquierda, estado real arriba a la derecha y progreso circular con porcentaje y tareas en el pie.

## Composición final

- Una única cuadrícula. Se retiran el selector y su estado efímero; no queda ninguna opción Compacta, Visual o Lista.
- Cuatro columnas cuando la zona de proyectos mide al menos 700 px, tres entre 560 y 699, dos entre 420 y 559 y una en móvil estrecho. La decisión se basa en el contenedor para responder también al ancho de WebView y al menú lateral.
- Ficha blanca con borde fino, radio 18 px y altura compacta de 252 px. Carpeta de línea y estado verdadero del proyecto en la primera fila.
- Nombre Acorn hasta dos líneas, cliente si existe, código PR y próxima tarea únicamente si hay una fecha válida real.
- Si existen tareas: anillo dinámico mediante `conic-gradient`, porcentaje y completadas/total, calculados por `ModernoProjectInsights.metrics`. Si no hay tareas, se omite el bloque; no se inventa progreso.
- Los avisos existentes conservan su interacción independiente y la tarjeta completa sigue abriendo el proyecto con las guardas y navegación actuales.

No se añaden descripción, prioridad, duración, responsable, fechas ni estados ficticios. Las portadas persistidas no se borran ni se modifican, pero dejan de mostrarse en esta pantalla al desaparecer la vista Visual. No hay cambios en proyectos, tareas, Supabase, Auth, Storage, RLS, compras, PDFs, Windows o prototipo.

## Validación

- 701 pruebas Node correctas.
- Chromium aislado a 1920, 1440, 1200, 1000, 768, 390 y 320 px con 0/1/27/80 proyectos, nombres largos, estados, tareas con progreso 0/50/67/100 %, búsquedas y archivados, teclado, roles y zoom 125/200 %.
- Cuatro columnas verificadas a 1920, 1440 y 1200 px; responsive sin desbordamiento en los demás anchos.
- Regresión de la pantalla a 1440/1100/390: búsqueda, creación, avisos, archivos, navegación, archivados y registros ficticios sin cambios.
- Servidor oficial con datos ficticios; conexiones externas y escrituras HTTP bloqueadas. Capturas de escritorio y móvil revisadas.

La publicación usa el workflow habitual: pruebas PHP en CI, recursos antes del HTML y verificación pública por hash. Revertir el commit recupera la presentación anterior sin restaurar ni migrar datos.

**Antecedentes:** [issue #191](https://github.com/estudiomoderno/moderno.app/issues/191), [PR #190](https://github.com/estudiomoderno/moderno.app/pull/190) y [PR #192](https://github.com/estudiomoderno/moderno.app/pull/192).
