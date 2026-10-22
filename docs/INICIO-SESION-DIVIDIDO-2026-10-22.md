# Inicio de sesión dividido — v3.65.103

Objetivo aprobado: composición propia con imagen lateral y formulario, tomando como referencia la distribución descrita por el propietario. No se ha instalado ni copiado el bloque Pro de REUI, añadido React/shadcn ni utilizado una licencia premium.

## Implementación

- `app/index.html`: nuevo marcado del acceso con imagen, marca, formulario etiquetado y botones sociales existentes. Conserva IDs y manejadores de acceso, registro, recuperación y Google; Apple mantiene su ocultación actual cuando existe cliente real. No añade acceso por enlace mágico ni GitHub. Formulario con envío mediante Enter, tipos de campo y autocompletado de contraseñas.
- `app/studio-login.css`: estilos limitados a `#loginScreen`, dos columnas en escritorio y formulario solo hasta 800 px. Scroll propio para pantallas bajas/teclado, foco visible y contraste estable cuando la app tiene tema oscuro.
- `app/brand/login-interior.webp`: imagen original generada para esta entrega, 1086×1448, 176602 bytes, servida desde el mismo origen; sin descarga de imágenes externas ni dependencia de REUI.
- `scripts/studio-login-browser.test.py`: Chromium aislado con cliente de autenticación ficticio y todas las peticiones externas/escrituras de red bloqueadas. Prueba manejadores actuales, entrada por teclado, error, registro, recuperación, Google, ocultación de Apple, tema oscuro y ocultar/mostrar acceso.
- Verificador de publicación y su prueba: incorpora CSS e imagen; 48 recursos públicos en total.

## Evidencias

645 pruebas Node. Prueba de navegador a 1440×1000, 1024×768, 900×500, 800×900, 390×844 y 320×568; capturas de escritorio/móvil revisadas. PHP y regresión SQL se ejecutan en CI antes de integrar.

No se envían correos, crean cuentas o prueban contraseñas reales. No se cambia configuración de Supabase ni funciones de autenticación, sesiones, redirecciones o datos. No se ha comprobado físicamente en Safari/iOS/Android ni realizado un acceso OAuth real; esta es una entrega de presentación.

## Publicación y reversión

Publicar mediante PR de `mejora/inicio-sesion-dividido`, exigir CI y comprobar despliegue y hashes públicos. Revertir ese PR devuelve el marcado anterior y retira los recursos; no hay migraciones ni datos que restaurar.

Revisión: https://github.com/estudiomoderno/moderno.app/compare/f74f5507edf1df815e8ba8508efb881c8cb5c58a...mejora/inicio-sesion-dividido

## Ajuste visual v3.65.104

A petición del propietario, se retiran logotipo, textos y sombreado de la imagen; también el título y subtítulo del formulario. El único logotipo gráfico queda centrado sobre Correo electrónico. El panel conserva nombre accesible sin encabezado visible. Se actualiza la prueba de navegador existente para la composición final y se mantienen todos los manejadores de acceso. Reversión: revertir el PR de `mejora/acceso-sin-textos`.
