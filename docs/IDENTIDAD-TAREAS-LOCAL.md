# Identidad de Tareas — revisión local

Rama `taller-tareas-identidad-local`, basada en la versión validada `85f6989`. No publicar automáticamente: la autorización de Imagen es para revisión local. Suscripciones y desarrollo general siguen pausados.

## Aplicado

- Menú negro, símbolo claro aprobado, flecha que invierte dirección al contraer, sin solaparse con el logo. Se respeta movimiento reducido.
- Board y Lista; Board al entrar desde otra sección o comenzar sesión de página. No se borra el calendario general ni sus datos.
- Selector activo negro y crema; iconos suministrados en iconos.zip.
- Mis tareas y contador de pendientes propias con vencimiento hoy. Solo número y palabra tarea/tareas en negrita.
- Búsqueda por título de tarea y datos del proyecto; se mantienen filtros personales/equipo.
- Fondo crema, tarjetas beige, importantes amarillas, cabeceras blancas. Importancia es un booleano adicional guardado desde el formulario existente; no modifica estados ni fechas.
- Único botón Nueva tarea en esta pantalla; se conserva Nuevo proyecto en su módulo.

## Revisar sin datos reales

Ejecutar `node scripts/identity-preview.mjs` desde esta carpeta. Abrir http://127.0.0.1:3196.

La vista usa las funciones y estilos actuales con datos ficticios y no carga Supabase. Permite Board/Lista, filtro y contraer menú. Al abrir una tarea se puede probar el color Importante en memoria; no guarda. Nueva tarea explica que el formulario completo pertenece a la app, no simula un guardado real. Arrastrar no cambia datos en esta vista previa.

Pruebas: `node --test scripts/workspace-views.test.mjs scripts/daily-work.test.mjs`. Revisión visual de Board/Lista y menú contraído en navegador. No equivale a una validación completa del CRM en móvil ni a un ensayo de persistencia en Supabase.

Pendiente de la revisión de Imagen: detalles internos definitivos de tarjetas. Antes de publicar, integrar la versión aprobada y comprobar formulario/guardado y móvil sobre un entorno de ensayo. Producción no se ha modificado.

## Referencia sustituida — aviso de Cerebro, 13 septiembre

El usuario ha aprobado nuevos originales: `Logotipo.svg`, `Isotipo.svg` y `acorn-8.ttf`. La propuesta local anterior todavía muestra el símbolo anterior; queda pendiente actualizarla cuando Imagen coordine la aplicación. Este aviso actualiza la referencia, no autoriza por sí solo nuevos cambios visuales ni publicación.

Origen estable: `C:/Users/soyja/Documents/Codex/2026-09-09/esta-tarea-se-llama-cerebro-es/outputs/identidad-vigente/`. Originales en `Downloads/Moderno App Fonts/Logotipo/` y `Downloads/Moderno App Fonts/Acom/`.

- Usar los SVG exactos, sin redibujar ni reconstruir con Berlin Sans.
- SVG inspeccionados: sin scripts, foreignObject, imágenes ni referencias externas. ViewBox de logotipo: `0 0 139.8378 25.858637`; isotipo: `0 0 28.244148 18.564325`.
- SHA256 logotipo: `0735cff9108680c42bc92626349f66f074651e1c8032a3c7336de235ee4beb0e`.
- SHA256 isotipo: `a4b7ee63f90836b768fcb136400266cbfe768f68c26174c6184db915888acf05`.
- Metadatos TTF inspeccionados: familia tipográfica **Acorn**, estilo **SemiBold**, peso **600**, nombre PostScript `Acorn-SemiBold`; familia heredada `Acorn SemiBold`, subfamilia heredada `Regular`. No interpretar ese Regular como peso 400.
- Fuente solo para títulos dentro de la app. Cuerpos y formularios conservan su tipografía. El campo de incrustación fsType vale 8; no acredita por sí mismo una licencia web. Comprobar condiciones al integrar, como indica el README de origen.

No se han modificado recursos visuales, funciones ni producción al recibir este aviso.
