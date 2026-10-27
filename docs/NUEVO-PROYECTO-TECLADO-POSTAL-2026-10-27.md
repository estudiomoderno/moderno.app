# Nuevo proyecto: teclado y código postal — v3.65.129

La protección de teclado del diálogo miraba `event.target`, que fuera de Shadow DOM se convierte en el host. Por eso bloqueaba Backspace en los campos del Sheet. Ahora identifica el editor a través de `composedPath()`, incluidos Input, Textarea, Select y contenteditable. Conserva el bloqueo de Backspace fuera de los campos con un diálogo abierto y de Backspace/Delete fuera de campos durante el bloqueo de obra.

Se añade Código postal después de Provincia, tanto en el Sheet como en el fallback nativo, con autocompletado `postal-code`. Google aporta `postal_code` y, si existe, `postal_code_suffix`. El código se mantiene como texto para conservar ceros iniciales, se incluye en la dirección completa y se guarda en el campo ya permitido `cp`. Editarlo invalida la referencia seleccionada, como los demás campos de dirección. No se modifica Supabase.

Se retira «Empezar desde» y sus controles. Nuevo proyecto se crea en blanco. La acción explícita de usar una plantilla desde Plantillas sigue seleccionando esa plantilla y reiniciando sus tareas; se conserva y comprueba ese flujo.

Validación:

- 682 pruebas Node, incluida la protección de teclado en campos de Shadow DOM, campos nativos y fuera del editor, con y sin bloqueo de obra.
- Chromium aislado 1440/1100/390: Backspace, Delete y borrado de selección en los campos de texto; código postal de Google ficticio, creación y lectura del borrador, eliminación de controles, plantilla y fallback. Sin escrituras remotas.
- PostgreSQL 17 local sin red: 1428 comprobaciones, incluida persistencia de `cp="00123"` para un colaborador y relectura, con ROLLBACK. No se aplica el candidato de referencia en producción.
- La prueba real de Google previa al FTPS exige también código postal en la dirección pública consultada; su ejecución final se verifica en Actions, no se presupone desde las pruebas locales.

Recuperación: revertir el PR; las direcciones y códigos postales ya guardados permanecen en los campos existentes. No requiere restauración de BD ni cambios de permisos. Se recompilan los componentes y actualizan las URLs de caché compartidas.
