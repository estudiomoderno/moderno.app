# Nuevo proyecto en Sheet lateral — 27/10/2026

El propietario solicita un Sheet a la derecha con PR automático, nombre, cliente, dirección (calle, número, ciudad, provincia, país) y tipo de proyecto. Confirma las opciones Interiorismo, Reforma integral, Reforma parcial, Obra nueva, Decoración, Paisajismo y Otro.

Se incorporan Sheet, Field e Input públicos originales de ReUI del mismo commit fijado en `SOURCE.json`, con adaptación declarada del contenedor de portales al Shadow DOM existente. No hay dependencias nuevas ni bloque Pro. Panel con encabezado/cierre, cuerpo desplazable y pie fijo: Crear proyecto azul y Cancelar. El código PR es de solo lectura y se vuelve a calcular al crear, saltando códigos ya presentes en la serie local. Se conserva la selección de serie cuando corresponde. El nombre es obligatorio; las plantillas siguen disponibles en «Empezar desde», incluido el acceso previo desde Plantillas.

El borrador se mantiene en memoria, limitado a la sesión. Crear un cliente y volver al proyecto conserva los campos, incluida la vuelta al cancelar el alta del cliente. El cierre exterior/Escape conserva el formulario, como en los diálogos existentes. La edición se cancela con los controles explícitos. Si el componente o su CSS falla, se recupera un panel nativo con los valores escritos.

## Datos y guardado

Se conserva el creador de proyectos y su contrato de guardado. La dirección completa, incluidos número y provincia, se guarda como texto en `addr`; ciudad y país se conservan además en `city` y `country`. El tipo utiliza `type`. Estos cuatro campos ya están admitidos por el filtro de colaboradores: se comprobó su presencia mediante una consulta de definición de función de solo lectura y se ensayó la escritura y lectura en PostgreSQL desechable. No se añaden columnas, migraciones, políticas, miembros ni permisos. El número no se consume al fallar validación o faltar una plantilla.

## Autocompletado

Los campos de dirección incluyen los atributos estándar de autocompletado del navegador, con edición manual siempre disponible. No existe una integración configurada con Google Places y no se añade una clave, cuenta ni gasto. La búsqueda predictiva de calles de Google queda pendiente de configurar ese servicio; no se presenta el autocompletado del navegador como Google Places. Referencia técnica: https://developers.google.com/maps/documentation/javascript/place-autocomplete-data

## Comprobaciones

- 675 pruebas Node superadas: formato completo de dirección, numeración, metadatos, validación, compilación y origen de los componentes, publicación y regresiones.
- PostgreSQL 17 aislado, sin red ni usuarios reales: 1424 comprobaciones del contrato, incluidas siete nuevas de dirección/tipo mediante escritura completa, lectura posterior y guardado delta como colaborador; finanzas privadas siguen ocultas. Contenedor eliminado al terminar. Incorporado al generador de comprobaciones que ya ejecuta CI.
- Chromium con servidor oficial aislado a 1440, 1100 y 390 px: Sheet, anchura útil/scroll, campos, PR no editable, colisión local de numeración, creación y metadatos, conservación del borrador al crear cliente, Escape, acceso desde plantilla con tareas reiniciadas y creación como colaborador mediante recuperación nativa. Capturas revisadas.
- Regresión de Proyectos y aplicación completa en las tres anchuras: navegación, avisos, ajustes, guardas de borradores, persistencia local aislada y recuperación de componentes. Escrituras y destinos externos bloqueados; no se crean proyectos, clientes ni direcciones en producción.

## Publicación y reversión

Versión v3.65.125. Cambios: nuevo módulo `app/new-project.js`, conexión en `app/index.html`, estilo del panel nativo, componente y primitives ReUI, bundles/CSS/manifiesto recompilados, pruebas y verificador público. El verificador pasa de 51 a 52 recursos e incluye el nuevo módulo. Las versiones de caché de perfil, calendario y CSS se actualizan conjuntamente.

Riesgos: montaje de un diálogo original junto al fallback y serialización de metadatos; verificados en los recorridos indicados. Google Places no está activado y no se han probado otros motores de navegador. Reversión: revertir el commit y publicar por el workflow habitual; conservar los metadatos ya guardados, sin restaurar ni borrar proyectos. PR y verificación de publicación quedan registrados en GitHub.
