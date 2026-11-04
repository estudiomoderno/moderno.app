# Proyectos — Vista Compacta predeterminada, Visual y Lista · #189 · v3.65.147

El 4 de noviembre de 2026 el propietario revisó el resultado de la cuadrícula «Estudio minimalista» (#187 / PR #188) y aprobó sustituir **la vista principal** de Proyectos por **tarjetas compactas**. Se mantiene la vista visual anterior como opción y se incorpora una vista de lista con los mismos datos.

## Resultado

- **Compacta** es la vista inicial de cada sesión: fichas bajas y horizontales, miniatura 56×56 (imagen real de portada previamente elegida o monograma neutro), nombre Acorn, cliente solo cuando existe, PR, barra/porcentaje de tareas solo si existen, avisos originales funcionales. Cuatro columnas desde un contenedor de 1100 px; cinco desde 1450 px; menos según el ancho disponible. No añade estados ni otro tipo de dato.
- **Visual** conserva el diseño de portadas 16:10 aprobado en #187; mantiene validación de origen y tipo de imagen, carga lazy, fallback editorial sin fotos inventadas.
- **Lista** reorganiza **el mismo HTML** de tarjeta en filas con nombre, cliente, código PR, progreso y avisos. Sin duplicar permisos, navegación o cálculos.
- **Selector de vistas** accesible mediante tres botones con `aria-pressed`; situado en la barra de Proyectos y preservado al buscar o filtrar, con preferencia temporal en memoria. **No** crea propiedades en proyectos, localStorage, Supabase ni nuevos campos.
- Se mantienen menú, barra superior, pestañas de proyectos, apertura original `projectOpen`, búsqueda, archivados, creación, roles, notificaciones, documentos, datos y sesiones.
- Cambios exclusivamente en `app/index.html` (selector, estilo de vista, incremento de versión), `app/brand/project-ui.css` (CSS acotado al índice), pruebas y documentación.

## Seguridad y límites

- No seleccionar adjuntos arbitrariamente ni cargar URL externa no autorizada: se reutiliza la portada existente del portal que ya exige elección expresa en #187.
- No tocar base de datos, RLS, Storage, Auth, DNS, Stripe, pagos, facturas, proyectos o tareas reales.
- No refactorizar las tarjetas de otras pantallas ni el contenedor Windows.
- Cambios de presentación reversibles mediante revert del PR, sin restauración de registros.

## Comprobación y publicación

- `node --test scripts/*.test.mjs` y nuevo `scripts/projects-display-modes.test.mjs`.
- Extensión de `scripts/projects-minimal-browser.test.py`: 0/1/27/80 proyectos ficticios, modos, portadas seguras, responsive/zoom, permisos, nombre largo, navegación, búsqueda y archivados, sin tráfico externo ni escrituras HTTP.
- CI de PR y revisión del diff antes de integrar.
- Publicación a `https://app.moderno.app` expresamente autorizada por el propietario **solo después** de checks verdes; confirmar Actions de despliegue, hashes públicos y estado final antes de anunciar éxito. Si no está comprobado, marcar pendiente.

Encargo: [#189](https://github.com/estudiomoderno/moderno.app/issues/189).
