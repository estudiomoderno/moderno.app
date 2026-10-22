# Guardado de listas por colaboradores — v3.65.101

## Incidencia y causa

La ficha de producto añadía `cost: null` y `margin: null` al guardar como colaborador. La restricción del servidor rechaza esos campos privados aunque estén vacíos, por lo que fallaba toda la operación con «El cambio contiene campos no autorizados». La creación de productos y listas también incorpora `addedAt`, `kind`, `icon` y `created`, ausentes del filtro antiguo.

La captura corresponde a v3.65.99. El fallo se reproduce con esa forma de petición en PostgreSQL aislado antes de aplicar el candidato. No es un diagnóstico de falta de espacio.

## Corrección

- El editor oculta y desactiva coste profesional y margen para colaboradores. Sus guardados nuevos no incluyen esas dos propiedades.
- `app_colaborador_preparar_lista(jsonb)` admite compatibilidad únicamente retirando `cost` y `margin` si son **JSON null** dentro de objetos de producto que tienen nombre, precio y cantidad. Se aplica solo a bloques proyectos/compras y solo en la rama colaborador del escritor existente. Los administradores mantienen el comportamiento anterior, incluida la posibilidad de guardar valores nulos.
- Cualquier coste o margen no nulo, incluido cero, sigue siendo rechazado para colaboradores. Los campos privados existentes se conservan mediante el combinador vigente. No se cambian roles, RLS, acceso a bloques, identidades, conflictos ni atomicidad.
- El filtro admite tipo de lista (`estancia`, `pav`, `otra`), icono acotado y fechas de creación. El resto de campos desconocidos sigue bloqueado.
- El normalizador es invocador, puro y no ejecutable por usuarios públicos/autenticados. Los ACL del filtro y del escritor existentes se preservan.
- La migración comprueba las huellas de las dos definiciones anteriores para no sustituir un contrato cambiado. No escribe registros de negocio. `SQL/rollback-guardado-colaborador-listas.sql` restaura las definiciones anteriores y elimina el ayudante sin tocar datos.

## Pruebas

- 137 comprobaciones PostgreSQL con usuarios y registros ficticios: reproducción del fallo previo; guardado completo y delta; fechas y categoría de lista; ocultación y conservación de costes; rechazo de costes/márgenes no nulos; RPC privado; roles; aislamiento; versiones; atomicidad; deltas exactos.
- Chromium y app real con servidor local oficial, toda red externa bloqueada y RPC conectado exclusivamente al contenedor ficticio: escritorio 1440 px y móvil 390 px; edición de producto, petición pendiente antigua, creación de lista/pavimentos y producto, recarga y conservación; importes privados intactos y no legibles para el colaborador.
- Reversión SQL ensayada; la huella de todos los registros ficticios permanece idéntica antes/después.
- Suite Node completa y controles PHP/SQL de CI antes de integrar. El nuevo ensayo SQL queda incluido en el flujo de PR.

## Despliegue y conservación

Antes de publicar se inspeccionaron las definiciones y ACL reales mediante metadatos, sin leer fichas de clientes. La copia de Storage de 507 objetos terminó verificada el 22/10 a las 07:53 UTC. No se afirma haber verificado una nueva copia física de la base de datos en esta entrega: se conserva reversión exacta de funciones y no se migran registros de negocio.

La corrección del servidor también sirve para reintentar formularios antiguos con esos valores vacíos. No importa ni elimina copias pendientes y no confirma guardados de una pestaña ajena. Mantener la pestaña abierta, descargar sus cambios actuales y reintentar; solo «Guardado en nube» confirma el resultado de esa pestaña.

Revisión: https://github.com/estudiomoderno/moderno.app/compare/main...fix/guardado-colaborador.
