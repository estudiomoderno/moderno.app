# Corrección de Proyectos: ficha de gestión fiel a referencia · #191

**Fecha:** 4 de noviembre de 2026. El propietario rechaza el resultado visual de la tarjeta «Compacta» del PR #190: aparecían fichas demasiado pequeñas de dos columnas internas, monograma beige a la izquierda y casi ninguna jerarquía. Aporta una captura de referencia de fichas grandes, con icono de carpeta superior, estado destacado y filas de información, más una segunda captura del resultado actual. Solicita que se parezcan de verdad.

## Nueva composición elegida

- El selector **Compacta / Visual / Lista** se conserva; **Compacta** sigue seleccionada al entrar.
- **Compacta** pasa a parecerse a las fichas de la referencia, no a minitarjetas: 2 columnas cuando la zona de proyectos permita una ficha ancha, 3 solo en pantallas ultrapanorámicas; 1 columna en tablet/móvil estrecho. Altura objetivo 316 px, fondo claro, borde fino, radio 19 px.
- Primera fila: **icono de carpeta de línea** a la izquierda y **estado verdadero** del proyecto (por ejemplo, «En progreso») a la derecha, con punto de color. No traducir ni sustituir estados por «Active» ficticios.
- Nombre Acorn grande (hasta 2 líneas), cliente con icono de persona. Metadatos: código PR y, solo si existe, **fecha válida de la próxima tarea fechada** del proyecto. No inventar una fecha de fin del proyecto, duración, prioridad, descripción ni responsable.
- Separador y pie: cuando existen tareas, progreso circular, porcentaje y número `completadas/total`; aviso original integrado. Sin tareas: no mostrar barra/progreso ficticios ni repetir «Sin tareas» en toda la pantalla.
- Las vistas **Visual** y **Lista** mantienen las portadas autorizadas, fallback y navegación de #187/#189; el cambio de estructura extra está oculto en esas vistas.
- Mantener buscador, archivados, tareas, números de proyecto, permisos, pestañas, nuevo proyecto y acceso con teclado. **No tocar Supabase, Auth, Storage ni registros reales.**

## Validación y publicación
- Fixtures sintéticos, sin tráfico externo ni escrituras; comprobación responsive desde 320 hasta 1920 px, foco de teclado, nombres largos, avisos, portadas seguras, tres vistas, 0/1/27/80 proyectos.
- Suite Node completa, CI de PR y Playwright. Confirmar que a ancho de escritorio habitual se muestren **2 tarjetas por fila** y que la primera tarjeta tenga estructura, texto y altura próximos a la captura de referencia.
- Si pasan, publicación ordinaria previamente autorizada para presentación UI; verificar Actions e integridad del HTML/CSS desde producción antes de anunciar. En caso de fallo, no fusionar.
- Reversión: revert del PR sin restaurar/migrar datos.

**Seguimiento:** [issue #191](https://github.com/estudiomoderno/moderno.app/issues/191), antecedente [PR #190](https://github.com/estudiomoderno/moderno.app/pull/190).
