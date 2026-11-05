# Barra de herramientas de proyecto fija arriba y lateral contraído de inicio

**Fecha:** 5 de noviembre de 2026. **Issue:** #194. Decisión solicitada por el propietario con captura de Planos y franja roja bajo la barra de pestañas globales.

## Alcance UI

- Dock de herramientas real de proyecto: mismo marcado de pestañas, IDs, acciones, permisos, iconos y roving focus, pero `position:fixed` por debajo de la cabecera global (aprox. 77 px desde el borde superior, tamaño compacto 46 px). Se elimina su anclaje al borde inferior solo en escritorio. Tooltip orientado hacia abajo para no solapar las pestañas globales.
- La ventana global de proyectos abierta arriba no se mueve (`#project-window-bar` permanece en `top:10px`). La página del proyecto reserva espacio vertical para que el título y los formularios no queden cubiertos por la barra fija.
- Escritorio: menú lateral icon-only **contraído al cargar** (64 px); expandible manualmente (224 px) con el mismo botón. La elección manual sobrevive a renders, navegación y reconstrucción del componente por cambios de ancho durante la misma sesión, sin guardar datos ni alterar roles.
- En tableta/móvil se preservan la barra de navegación existente, los botones y sus áreas táctiles; este ajuste fijo está acotado a `min-width:1100px`.

## Seguridad y reversión

Solo cambios de presentación (`app/brand/desktop-shell.css`, `app/desktop-shell.js`) y actualización de versión/caché de esos dos recursos (`app/index.html`). Sin nuevo dato, migraciones, Auth, Storage, RLS, Supabase, Stripe ni DNS. La reversión consiste en revertir PR y redeplegar sin restaurar registros.

## Calidad

Pruebas Node `node --test scripts/*.test.mjs` y Chromium aislado (sin peticiones externas ni escrituras) con `desktop-shell-browser.test.py`, `global-project-header-browser.test.py`, `desktop-shell-full-app.test.py`: escritorio, pantalla pequeña, scroll fijo, alto, foco, tooltips, lateral compacto, cambio manual y borradores. No publicar si fallan checks.

Encargo: https://github.com/estudiomoderno/moderno.app/issues/194
