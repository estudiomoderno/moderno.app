# AGENTS.md — Taller Nueva app Codex (SOLO PROTOTIPO)

Este archivo tiene precedencia sobre las instrucciones genéricas cuando el trabajo afecte a `prototipos/nueva-app/`.

## Encargo
- Nombre del chat: **Taller Nueva app Codex**.
- Diseñar una interfaz experimental de escritorio de Moderno.app que recuerde a la ergonomía de herramientas profesionales de diseño, manteniendo libertad para iterar con el propietario.
- Fuente oficial: `docs/TALLER-NUEVA-APP-CODEX.md` y GitHub [#47](https://github.com/estudiomoderno/moderno.app/issues/47).
- **Usa únicamente esta carpeta y esta rama**: `prototipos/nueva-app/`, `experimento/taller-nueva-app-codex`.

## PROHIBICIONES ABSOLUTAS
- No Supabase **de ningún tipo**: ni producción, ni pruebas, ni SDK, ni Auth, ni Storage, ni SQL, ni Edge Functions; no URLs ni credenciales.
- No backend real, Stripe, correo, Google Drive, integraciones, APIs externas, webhooks, llamadas de red ni recursos/CDN externos.
- No datos reales: usar solo nombres, estudios, usuarios, proyectos y archivos inventados. No copiar backups ni registros de clientes.
- No importar ni ejecutar los archivos `app/` productivos, ni editar `app/`, `mailer/`, `SQL/`, `supabase/`, workflows, scripts de despliegue o configuraciones productivas.
- No fusionar en `main`, no subir a `app.moderno.app`, no publicar web de producción ni usar servidores o secretos productivos.
- Nunca asumir que la orden de publicar cambios seguros en la app real aplica a este taller. La futura migración exige nueva aprobación expresa.

## Identidad visual obligatoria — logotipo y Acorn (17/10/2026)

- **Conservar la marca Moderno.app**: el propietario ha señalado que los primeros bocetos no reproducían correctamente su imagotipo ni sus fuentes. No diseñar ni dibujar logotipos aproximados.
- Para la cabecera experimental, usar **`assets/icono-m-grafito.svg`**, copia exacta del **`app/brand/icono-m-grafito.svg`** oficial (solo lectura del origen); el favicon usa `assets/favicon.svg`. No sustituirlo por el símbolo geométrico `simbolo-grafito.svg`, ni por un carácter «M» de texto.
- **Acorn original**: usar los cinco archivos locales `assets/fonts/acorn-*.ttf` copiados mediante blobs idénticos de Git desde `app/brand/acorn/` de este mismo repositorio, con pesos y asignaciones del `app/brand/tasks-identity.css`. **No usar Georgia como sustituto si la fuente está presente**; mantener fallbacks para errores de carga.
- El HTML debe permitir `font-src 'self'` pero mantener `connect-src 'none'` y nunca apuntar a un CDN o dominio para cargar tipografías. No publicar ni enviar archivos de fuentes al propietario.
- La paleta se mantiene en `brand.css`: `#f6f4eb` (fondo), `#f8f6ef` (superficies), `#e4dfce` (beige), `#181818` (acciones), `#20201e` (texto), `#d8d2c2` (líneas).
- El diseño nuevo es **la disposición de las herramientas y la navegación**, no la identidad de marca. Antes de mostrar al propietario, comprobar visualmente logo, carga de fuentes, jerarquía tipográfica y los contrastes, sin conectar ni modificar la app real.

## Implementación
- Prototipo autocontenido y de solo frontend, preferiblemente HTML, CSS y JavaScript con datos ficticios estáticos, sin dependencias externas; usar solo servidores estáticos de previsualización dentro del entorno aislado de Codex.
- Construir por pequeños incrementos, mostrando resultado al propietario. No comenzar un rediseño integral ni implementar integraciones sin su dirección.
- Menú superior compacto con M y secciones globales; usuario a la derecha; menú inferior flotante por iconos, tooltip y selección activa; zona central libre. Partir de proyecto ficticio abierto, escritorio primero.
- Probar que las interacciones funcionan con mouse y teclado y que no existe ninguna petición externa. Documentar qué está simulado y qué se ha validado. 
