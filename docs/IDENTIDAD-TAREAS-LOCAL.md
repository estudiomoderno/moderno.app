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
