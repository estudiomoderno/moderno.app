# v3.34 — Productos de proyecto y Boards

## Entrega

- Retirada de Integraciones del menú y de Administración. Rutas antiguas pasan por la comprobación de acceso y no ofrecen conexiones simuladas. Se mantiene el código de autenticación y los adaptadores existentes.
- Importación de URL abre una ficha para confirmar datos; ya no crea productos de muestra ni precios aleatorios. Sugerencias de nombre/categoría por reglas, sin afirmar extracción automática ni IA. No transmite el enlace a proxies para obtener fotos; la imagen se adjunta por el usuario.
- Precio de proyecto y maestro independientes. Editar cualquiera de ellos no modifica el otro ni documentos emitidos.
- Fichas nuevas de proyecto con identidad independiente y libId opcional. Las copias conservan características/recursos pero reciben identidad nueva y no heredan decisiones del cliente.
- Referencias de presentaciones y moodboards vinculadas a identidad al editar/reordenar como administrador. Los índices antiguos se mantienen para compatibilidad. Si una identidad desaparece o es ambigua, no se utiliza el artículo vecino como sustituto.
- Board automático por estancia, con precios de venta opcionales y salida PDF a través del diálogo de impresión existente. Su proyección excluye costes, márgenes, notas y archivos internos.
- Adjuntos de ficha almacenan el contenido usando fileUp y no solamente el nombre. Espera durante subida; callbacks de un editor cerrado no contaminan el siguiente. Se conservan adjuntos antiguos de solo nombre, identificados como tales.
- Coste cero y desconocido diferenciados; pérdidas visibles. Los formularios sin margen explícito abren en modo libre y no inventan costes.

## Uso

Proyecto → Listas de compra → estancia → Board de la estancia. Se genera desde los productos actuales; editar cantidad/acabado en la ficha y volver a abrir el Board actualiza la vista. La casilla Mostrar precios de venta solo afecta a esta vista y su PDF.

## Arquitectura y alcance

app/specifications.js es el dominio aislado: snapshots, duplicación, identidad, resolución de referencias, proyección del Board y cálculo. La biblioteca y las estancias existentes siguen siendo la fuente; no se crea otra colección editable ni tablas duplicadas.

Campos de persistencia existentes: id, libId y src. No se ejecuta ninguna migración SQL ni se amplían permisos. El Board es interno y su PDF se prepara localmente; no se añade publicación de Boards al portal. Aprobación por revisión, RFQ, pedidos formales, catálogo público y conectores permanecen en fases posteriores del plan.

No hay conversión masiva al arrancar. Se enlazan referencias al realizar una operación estructural como administrador. En proyecciones de colaborador no se reasignan identidades antiguas: el combinador SQL protege campos privados y no se debe cambiar su clave sin una migración de servidor probada. Por tanto, la migración universal y normalización relacional no forman parte de este despliegue.

IDs de nuevas especificaciones: UUID. Se mantienen IDs numéricos existentes. Las altas de biblioteca conservan formato numérico compatible con selectores actuales, con componente temporal/aleatorio y detección local de colisión. La identidad incluye el estudio/proyecto; no es todavía un identificador de catálogo público.

## Validación

Pruebas automatizadas en scripts/specifications.test.mjs más suite existente: referencias repetidas, reordenación, eliminación, JSON roundtrip, clientes antiguos que omiten ID, independencia de precios/adjuntos, roles filtrados, costes desconocidos y pérdidas, callbacks tardíos y proyección sin datos internos. Revisión visual local con datos ficticios: editar cantidad/acabado → Board, precios opcionales, móvil 390 px, formulario de importación sin importes inventados.

Ensayo local sin escritura: enviar una exportación JSON por stdin a `node scripts/audit-specifications.mjs`. Acepta projects/state.projects o array de proyectos. No sube datos ni imprime nombres/importes/archivos, solo recuentos, idempotencia y conservación de campos. No sustituye una restauración completa de base de datos.

## Compatibilidad y reversión

Clientes viejos pueden omitir una identidad al reemplazar una ficha: la nueva lectura no vincula silenciosamente otra. Es necesario actualizar antes de operaciones estructurales; no se fuerza recarga con cambios sin guardar. Los conflictos se conservan con las protecciones previas.

Ante incidencia, desactivar los accesos nuevos en una corrección manteniendo specifications.js y las referencias. Un rollback que ignore src no garantiza identidad después de reordenaciones; no restaurar automáticamente una base antigua ni borrar cambios nuevos. Conservar snapshots actuales para reconciliar. Esta entrega no modifica facturas emitidas, cobros ni permisos de Storage.

## Arranque

Mismo servidor y proceso de la versión anterior. Publicar specifications.js antes de index.html (el workflow ya sube recursos primero). No hay dependencias adicionales. La estrategia comercial completa se mantiene fuera de la publicación del repositorio público.

## Publicación verificada

- Fecha: 10 de septiembre de 2026.
- Commit de aplicación: d6194d86851e91b814c93b1a9cbaeadeb10359ae.
- GitHub Actions: https://github.com/estudiomoderno/moderno.app/actions/runs/34533228206 — completado correctamente.
- 174 pruebas automatizadas correctas; sintaxis de los tres bloques de script comprobada.
- index.html, appearance-b.css y specifications.js públicos: HTTP 200 y contenido idéntico al revisado, normalizando finales de línea.
- Ensayo de conversión con datos ficticios: conservación de campos e idempotencia correctas, cero escrituras externas. No se ha ejecutado conversión de datos reales ni ensayo nuevo de restauración completa en esta entrega.
- Alta manual visual con coste cero correcta. Los nuevos vínculos de presentaciones/moodboards requieren administrador para evitar reasignar identidades sobre datos filtrados de colaboradores.
- Siguiente tramo: compatibilidad de servidor para normalizar identidad histórica y secciones, seguida de prueba en copia aislada; aprobación por revisiones y compras formales continúan fuera de esta entrega.
