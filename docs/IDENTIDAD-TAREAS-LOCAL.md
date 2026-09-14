# Identidad de Tareas — revisión local

Estado posterior: publicación autorizada por el usuario mediante Cerebro. Ver `PUBLICACION-IDENTIDAD-v3.54.0.md`; las menciones anteriores de no publicar describen el alcance histórico, sustituido por esa autorización concreta. No incluye billing.

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

## Integración aprobada y comprobada

Imagen trasladó aprobación directa del usuario de la propuesta de 3196. Cerebro confirmó como destino esta misma rama y checkout, sin tocar main ni suscripciones. Base verificada: `85f6989`, seguida de `dab2b1b` y `3785642`. El diseño aprobado ya está integrado en `app/index.html` y `app/brand/tasks-identity.css`; la vista ficticia es solo un instrumento de revisión y no se inserta en el producto.

Se detectó que el filtro servidor de colaboradores descartaba el campo nuevo. `SQL/tareas-importancia.sql` prepara una actualización puntual de `app_colaborador_filtrar`: admite exclusivamente `important` booleano y conserva las restricciones existentes. Se actualiza también el SQL fuente `permisos-colaboradores.sql`. No se ha ejecutado la migración en Supabase; debe acompañar al futuro despliegue aprobado de esta funcionalidad. No publicar interfaz sin comprobar primero la compatibilidad del servidor.

Validación de integración: 37 pruebas JS correctas (formulario real saveTask, vistas, sincronización, fallos y conflictos) y 8 comprobaciones sobre PostgreSQL local PGlite con almacenamiento en disco. Se guardó true, se cerró y reabrió la base, se leyó como colaborador, se guardó false y se reabrió de nuevo. Los importes y documentos ocultos se conservaron exactamente. Se rechazaron valores de importancia no booleanos e intentos de introducir importes desde el perfil colaborador. Datos exclusivamente ficticios; no hubo conexiones ni escrituras en Supabase.

Reproducción:

```
node --test scripts/task-importance.test.mjs scripts/cloud-save.test.mjs scripts/workspace-views.test.mjs scripts/daily-work.test.mjs
node scripts/task-importance-sql.mjs /ruta/a/@electric-sql/pglite/dist/index.js
```

Límites: estas comprobaciones no acreditan un recorrido completo contra Supabase ni revisión móvil integral. Queda pendiente la nueva marca, porque los SVG contienen texto Acorn Bold y la fuente entregada es SemiBold600; no se han redibujado ni sustituido silenciosamente. La propuesta visual aprobada permanece intacta. No desplegar por esta entrega.

## Ajuste directo del usuario: botón circular del menú

El usuario precisó la forma: rectángulo negro redondeado y círculo crema que sobresale del borde derecho, con las dos flechas originales de `Downloads/Iconos Web/Logo Contraer Menu.svg` y `Logo Despeglar Menu.svg`. Aplicado sin usar el logo de la captura como referencia. La navegación tiene un contenedor interior desplazable para que el círculo exterior no se recorte ni impida acceder a los enlaces inferiores. Comprobados en navegador ambos estados: flecha izquierda al estar desplegado, derecha al estar contraído; conserva aria-expanded y movimiento reducido. La marca sigue como dependencia independiente.

## Nueva marca aplicada: dependencia tipográfica resuelta

El usuario adjuntó cinco fuentes y ordenó aplicar logotipo en menú abierto, isotipo en cerrado y Acorn en Mis tareas. Metadatos: acorn-3 Bold700, acorn-4 ExtraLight200, acorn-6 Medium500, acorn-7 Regular400, acorn-8 SemiBold600. Bold700 resuelve la dependencia de texto de los SVG; ya no está pendiente esa discrepancia.

Originales exactos conservados en `app/brand/Logotipo.svg` e `Isotipo.svg`, fuentes en `app/brand/acorn/`. Se insertan los SVG originales en el documento para que su texto use Acorn Bold cargada por CSS, sin redibujar ni sustituir su tipografía. Se invierten los colores para verlos claros sobre el menú negro. Menú abierto: logotipo; cerrado: isotipo. Títulos de main/modal: Acorn SemiBold600; cuerpo y formularios conservan fuente anterior. Comprobados visualmente ambos estados y estilo calculado Acorn600 del título. Solo revisión local, sin publicación.

## Selector de estudio superior

Por instrucción directa se sitúa el selector debajo del logotipo/isotipo y antes de Inicio, con separación discontinua. Se retira la tarjeta inferior. Menú con espacios visibles del usuario, Ajustes, Invitar al equipo (solo administrador), Notificaciones y Cerrar sesión, conectados a las acciones existentes. Al contraer queda el avatar del estudio y el desplegable sale al lado sin recortarse. Escape cierra el desplegable. La vista ficticia muestra Estudio de ejemplo y no ejecuta invitaciones ni cierres de sesión reales; estas acciones abren un aviso de demostración.

Ajuste posterior: el botón circular se ancla al separador discontinuo (centro vertical sobre la línea), tanto abierto como contraído. Comprobado que queda por debajo del isotipo sin taparlo.


## Tarjetas superpuestas (revisión local posterior a v3.54.0)

Board muestra tarjetas solapadas con expansión animada que desplaza las siguientes. Ratón: al señalar; pantalla táctil y teclado: botón del título. Solo una abierta por columna; Escape cierra. Los detalles conservan vencimiento, proyecto, tipo, importe y asignación; Abrir tarea mantiene el editor existente. Se respeta movimiento reducido. Sin cambios de datos ni SQL. Publicación autorizada por el usuario como v3.54.1. Validación: 318 pruebas correctas y expansión comprobada en navegador con datos ficticios. Vista local en puerto 3196.


## v3.54.2 — Tipos y fechas en Mis tareas

Iconos originales adjuntados por el usuario para Diseño, Desarrollo, Reunión, Entrega, Revisión y Contabilidad, con círculos pastel. Contador de tareas abiertas independiente del vencimiento y según alcance personal/equipo. Board agrupa por fecha de vencimiento, incluye Hoy y Sin fecha; arrastrar conserva el cambio de estado existente, sin cambiar vencimientos. Lista transparente, controles sin cambios de tamaño, foco neutro y fundido respetando movimiento reducido. Comprobadas posiciones idénticas de barra, buscador y filtros al cambiar de vista en navegador. Sin cambios SQL ni migraciones.


## v3.54.3 — Tablero continuo

Corrección solicitada: una sola cabecera por estado con su total completo. Tarjetas apiladas sin grupos por fecha. Fecha de hoy superpuesta discretamente con línea discontinua, sin interceptar clics ni modificar la colocación de tarjetas. Sustituye la agrupación por vencimiento de v3.54.2.


## v3.54.4
Se elimina la referencia de fecha. Abrir tarea adopta botón negro redondeado. Participantes con iniciales circulares; adjuntos debajo del título al desplegar, con apertura mediante el resolvedor privado existente y sin alterar archivos.


## v3.54.5 — Estados en móvil
Board móvil (hasta 700 px): botones Pendientes, En progreso y En revisión con recuentos; muestra solo el estado seleccionado, conserva la selección por identidad durante la sesión y ofrece estado vacío. Escritorio conserva las tres columnas. No cambia datos, fechas ni permisos.


## v3.54.6 — Listado de presupuestos móvil
Tabla convertida visualmente a fichas etiquetadas hasta 700 px, acciones con ajuste de línea, filtros en rejilla y resúmenes verticales. Escritorio y formato de impresión conservados. Sin cambios en cálculos, estados ni guardado.
