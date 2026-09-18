# Generador de documentos · v3.60.0

En Plantillas y documentos, los administradores pueden generar documentos a partir de ocho bases: contrato de interiorismo, encargo de reforma, condiciones generales, acta de reunión, aprobación de materiales, orden de cambio, acta de entrega y documento en blanco.

## Uso

1. Elegir una base o un modelo guardado.
2. Seleccionar proyecto y contacto de la agenda. Los datos se copian al borrador; editarlos no modifica la agenda. Si hay dos contactos con el mismo nombre no se elige automáticamente un NIF.
3. Completar los campos y cláusulas. Se pueden añadir, reordenar y desmarcar apartados. Los marcadores se sustituyen en la vista previa y al exportar.
4. Guardar documento para continuar después o guardar como modelo reutilizable. Los modelos vacían los campos de cliente/proyecto; el texto escrito manualmente en las cláusulas se conserva y debe revisarse antes de reutilizarlo.
5. Revisar y usar Imprimir / Guardar PDF mediante el navegador. Guardar texto en proyecto añade una copia `.txt` legible y descargable, privada por defecto (`cli:false`). No es un PDF binario adjuntado automáticamente ni una firma electrónica.

Se conservan las plantillas antiguas y pueden abrirse en el generador. Se retira la carga simulada de Word/PDF del antiguo editor; no se implementa importación automática de esos formatos.

## Datos y límites

- Los documentos/modelos se guardan en `state.docs` dentro del bloque config existente, con id UUID y `generator`. No hay SQL ni nuevos permisos. El rol colaborador no recibe acceso al generador.
- Último borrador local: clave separada por estudio y usuario; recuperación manual. La identidad se comprueba antes de escribir, adjuntar o imprimir.
- Al editar un documento guardado, se comprueba que la versión cargada siga siendo la actual antes de sustituirla. Los conflictos de sincronización siguen el mecanismo existente.
- Guardar en un proyecto añade una copia, sin reemplazar archivos. Abrir avisos o crear documentos no cambia estados contables.
- La exportación final requiere título, cliente, estudio y contenido, y bloquea campos entre corchetes o marcadores sin resolver. No valida jurídicamente el contrato.
- Las bases contractuales son estructuras para completar, no condiciones legales universales. Referencia contextual: [Código Civil, artículo 1255, BOE](https://www.boe.es/eli/es/rd/1889/07/24/%281%29/con). Las condiciones deben revisarse según el encargo y la jurisdicción antes de firmarlas.

## Avisos

El número de la campana se calcula a partir de las mismas filas del desplegable. Cada presupuesto pendiente tiene su fila. La inactividad se identifica explícitamente como recordatorio y cuenta como un aviso, no como una tarea pendiente.

## Validación y puesta en marcha

Servir `app/` con el servidor local habitual. Ejecutar `node --test scripts/*.test.mjs`. Se prueban sustitución/escape, campos pendientes, permisos, cambio de estudio, datos de contactos duplicados, modelos sin identidad del cliente, conflictos de edición y copias privadas sin sobrescritura.

Prueba visual con datos ficticios: selección de proyecto/cliente, edición de un acta, sustitución de marcadores, guardado y copia al proyecto, vista a 390 px. La impresión usa la función existente `printAs`; la prueba local no escribe documentos reales en Supabase ni demuestra una firma electrónica o una subida binaria de PDF.

Despliegue habitual con `deploy-app.yml`, recursos antes que HTML. Reversión de interfaz por commit; conservar los datos nuevos en docs, no borrar ni restaurar bases para retirar la interfaz.

## Presentación v3.60.1

El generador y los documentos guardados se presentan como tarjetas de papel con pliegue, tonos suaves, aparición escalonada y elevación al señalar. En móvil se muestran en dos columnas. Se retiran de esta pantalla las secciones Plantillas de proyecto y Fases de obra sin borrar sus datos ni las funciones de uso desde proyectos/obra.

## Organización v3.60.2

«Guardar como plantilla» añade la plantilla a «Mis plantillas», debajo del generador y los documentos guardados, junto a las plantillas anteriores. Tras guardarla se cierra el editor y se muestra esa sección. Los documentos concretos permanecen en «Mis documentos». No se migran ni eliminan datos.
