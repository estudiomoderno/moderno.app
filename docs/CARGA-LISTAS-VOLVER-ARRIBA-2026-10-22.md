# Listas de compra: carga de imágenes y volver arriba

Entrega v3.65.102, 22 de octubre de 2026. Objetivo: sustituir el destello de imágenes rotas durante la carga y facilitar volver al encabezado de listas largas.

## Cambios

- `app/project-ui.js`: marco de imagen con puntos grises, imagen decodificada y marcador discreto si falla. Botón «Volver arriba» limitado a listas/estancias autenticadas, visible tras 320 px de desplazamiento. Usa el contenedor real `.main`, admite teclado y respeta movimiento reducido. Ajusta su posición a cambios de altura del indicador de guardado y se oculta en otras pantallas o con edición abierta.
- `app/shopping-cards.css`: animación CSS sin dependencias, estados aislados y botón oscuro translúcido de 44 px; móvil, foco, movimiento reducido e impresión. Referencias proporcionadas por el propietario: Uiverse alexruix y ArturCodeCraft, atribuidas en CSS.
- `app/index.html`: aplica el marco en mosaicos y fotografías de productos, enlaza los estados del decodificador existente y actualiza versión/recursos. Mantiene firma privada, concurrencia, caché, carga diferida y referencias originales.
- `scripts/shopping-loading-browser.test.py`: integración Chromium aislada, imágenes lentas/404/correctas, contenedor de scroll, teclado, movimiento reducido, cambio de ruta/modal y colisión con un indicador de guardado de varias líneas.

## Verificación

- 645 pruebas Node correctas.
- Chromium a 1440 y 390 px para carga y subida; capturas revisadas. Los registros ficticios permanecen iguales y se bloquean todas las escrituras de red.
- Regresión de imágenes privadas a 1440/390 px: firma compartida, concurrencia máxima de cuatro, carga diferida, impresión y aislamiento de identidad.
- Alineación de tarjetas y vista en filas a 1680/1440/1100/760/390 px.
- PHP: sintaxis y 24 casos de autorización de invitaciones en CI, sin enviar correos (PHP no está instalado en el entorno local).

No se han usado cuentas/datos reales ni probado escrituras contra producción. Las pruebas de navegador se realizan con el servidor oficial y origen Supabase ficticio bloqueado. No se ha validado físicamente Safari/iOS/Android. Este cambio visual no modifica guardado, sincronización, permisos ni base de datos.

## Reversión y revisión

Revertir el PR de la rama `mejora/carga-listas-subir` revierte los tres archivos de aplicación. No hay migraciones ni datos que restaurar. La publicación utiliza el workflow habitual y exige comprobar estado final y hashes públicos antes de anunciarla.

Revisión: https://github.com/estudiomoderno/moderno.app/compare/main...mejora/carga-listas-subir
