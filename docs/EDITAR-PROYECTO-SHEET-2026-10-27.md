# Editar proyecto con Sheet — v3.65.132

El editor de datos usa las mismas primitivas originales ReUI Sheet, Field, Input y Button y las mismas reglas de ancho, espaciado, tipografía y pie que Nuevo proyecto. Se eliminan el título visible «Editar datos del proyecto» y el subtítulo «Nombre, estado, cliente y etiquetas». El diálogo mantiene un nombre accesible oculto. PR se muestra como dato de solo lectura; se conservan nombre, estado, cliente y etiquetas.

Cliente queda como un campo con sugerencias al escribir, sin los botones permanentes «Sin cliente», el nombre repetido ni «Crear cliente nuevo». Se mantiene la validación de contactos existentes, se permite vaciar la selección y se preserva un contacto histórico que ya no esté en la agenda. El texto de búsqueda no puede asignar un cliente inexistente.

La dirección guardada se muestra completa y editable en un campo de varias líneas, incluidos portal/piso y código postal. No se intenta separar automáticamente una cadena antigua en componentes que no están guardados por separado. Al cambiar solo la dirección se programa persistencia expresamente y se invalida cualquier referencia de ubicación anterior. Los metadatos existentes de ciudad, país y código postal se conservan; no se adivinan a partir del texto libre.

El controlador conserva el guardado de `saveCustomize`, el borrador `cz` y su validación de clientes. No agrega una propiedad `tags: []` cuando el proyecto no trae etiquetas y no se han editado, evitando introducir un campo no autorizado en el flujo de un colaborador. No modifica permisos de servidor ni aplica migraciones. La edición de aspecto conserva su flujo actual.

El fallback nativo usa los mismos estilos de creación y preserva todos los valores si falla el CSS del componente. Cancelar y cerrar descartan el borrador; cambios de sesión/estudio o pérdida de permisos impiden guardar. El cierre sigue disponible para descartar una sesión caducada. El proyecto conserva identificadores, código, habitaciones, tareas, archivos, color y el resto de sus datos.

Validación:

- Node: 684 pruebas. Nuevas comprobaciones de edición de dirección aislada, persistencia, referencia obsoleta, etiquetas ausentes, validación y preservación de datos.
- Chromium 1440/1100/390: estilo comparado con Crear proyecto, dirección prellenada completa, cliente simplificado, teclado, guardar/cancelar, cliente desconocido e histórico, guardado de dirección aislado, recuperación nativa, colaborador y cambio de sesión. Sin escrituras remotas.
- Regresión de Crear proyecto y de ventanas/secciones del proyecto, incluida la protección de un borrador abierto frente a cambios de pestaña.
- PostgreSQL 17 local sin red: 1429 comprobaciones y ROLLBACK, incluida edición de dirección por delta como colaborador y relectura conservando el código postal. Contenedor retirado. No se aplica SQL productivo.
- La publicación se verifica mediante Actions, su comprobación de Google y los hashes públicos; no se anuncia a partir de una rama.

Recuperación: revertir el PR y sus recursos compilados. No requiere restaurar BD, cambiar permisos ni eliminar direcciones guardadas.
