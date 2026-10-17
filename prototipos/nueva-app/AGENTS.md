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

## Identidad visual obligatoria — revisión del propietario (17/10/2026)
- El propietario ha rechazado una primera versión con **logo M improvisado y colores inventados**. **No crear una marca nueva:** modernizar la navegación manteniendo la identidad gráfica real de Moderno.app.
- Logotipo oficial: copia local exacta en `assets/simbolo-grafito.svg` desde `app/brand/simbolo-grafito.svg`. Favicon oficial: `assets/favicon.svg`. No reconstruir la M con texto ni sustituir el icono corporativo.
- Colores aprobados de la app: `#f6f4eb` (fondo crema), `#f8f6ef` (superficie), `#e4dfce` (beige), `#181818` (acciones grafito), `#20201e` (texto), `#d8d2c2` (líneas). Implementados en `brand.css` (local); diseño original en `app/brand/app-identity.css` y `docs/IDENTIDAD-PAGINAS.md` como referencia **solo lectura**.
- No importar fuentes con licencias inciertas, ficheros CSS de producción, scripts de la app ni referencias remotas. Usar fallback tipográfico local por ahora.
- Cambiar **estructura de interfaz y experiencia**; conservar marca, tono visual y reconocimiento inmediato de Moderno.app. Mostrar una vista previa real al propietario para decidir ajustes; no afirmar fidelidad total sin comparación visual.

## Implementación
- Prototipo autocontenido y de solo frontend, preferiblemente HTML, CSS y JavaScript con datos ficticios estáticos, sin dependencias externas; usar solo servidores estáticos de previsualización dentro del entorno aislado de Codex.
- Construir por pequeños incrementos, mostrando resultado al propietario. No comenzar un rediseño integral ni implementar integraciones sin su dirección.
- Menú superior compacto con M y secciones globales; usuario a la derecha; menú inferior flotante por iconos, tooltip y selección activa; zona central libre. Partir de proyecto ficticio abierto, escritorio primero.
- Probar que las interacciones funcionan con mouse y teclado y que no existe ninguna petición externa. Documentar qué está simulado y qué se ha validado. 
