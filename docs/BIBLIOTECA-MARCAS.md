# Biblioteca: Mi estudio y Marcas — v3.57.0

## Disponible ahora

Mi estudio es la Biblioteca existente (`datos_estudio`, bloque `compras`, expuesto en la app como `state.library`). Conserva sus búsquedas, carpetas, filtros, edición, captura de URL y selección para listas. Los datos pertenecen al estudio de la fila y siguen sujetos a los permisos actuales. No se migra ni se reescribe ningún producto antiguo. Catálogo continúa siendo servicios y partidas.

No hay maestros de marcas publicados verificados ni un servicio de fabricantes conectado. Por ello no se muestra una pestaña Marcas, ni contenido de demostración, ni un anuncio de próxima apertura. Este lanzamiento prepara el contrato; no instala un portal de fabricantes ni una nueva API de catálogos.

## Contrato de origen, visibilidad y derechos

`ModernoLibraryOrigin.metadata(product)` interpreta todo producto de la biblioteca como privado del estudio y sin derecho de publicación. No muta el registro. La ausencia de metadatos es compatible; ni una URL de tienda ni un campo `visibility: public` convierten el producto en un maestro publicado.

Los futuros maestros viven en un almacenamiento separado de `datos_estudio`. Respuesta de lectura prevista:

```
{ id, brandId, revision, status: "published",
  rights: { display: true, saveToStudy: true },
  product: { name, sku, url, unit, img, dims, material, color, cat } }
```

El servidor deberá autenticar al lector, comprobar sus permisos y devolver solo marcas/productos publicados con derechos vigentes. Los borradores, retirados y revisiones no autorizadas se excluyen en servidor. `published()` es defensa adicional de interfaz, nunca autorización suficiente. No confiar en campos enviados por un navegador para publicar ni para otorgar acceso.

La futura pestaña Marcas se habilitará únicamente tras una respuesta autorizada del servicio con al menos un producto real; un error o cero resultados no crea la pestaña. No se debe usar la lista privada de estudios como fuente del catálogo común.

## Copias independientes

`copyPublished(record, localId, custom)` prepara una copia privada y conserva `libraryOrigin: {kind: "brand", brandId, productId, revision}`. Solo admite los campos de producto previstos: descarta enlaces financieros, IDs de estudio y archivos internos del maestro. El precio de venta se deja sin confirmar salvo personalización explícita; las notas y el proveedor son propios del estudio. La copia no comparte objetos mutables con el maestro.

La acción futura de guardar deberá usar los permisos y el guardado versionado existentes del estudio. No está expuesta en esta versión porque no existe contenido de marcas. El servidor debe volver a validar derechos y revisión al guardarla.

Una nueva revisión del maestro jamás reescribe copias, listas, presupuestos ni facturas. La actualización futura requiere selección y confirmación de campos por el usuario; no existe sincronización automática en este lanzamiento. Los snapshots existentes de `ModernoSpec.fromProduct` siguen independientes.

## Validación y reversión

Pruebas con datos sintéticos: productos antiguos y metadatos falsamente públicos siguen privados; se rechazan borradores, retirados y permisos incompletos; derecho de consulta distinto del de guardar; copias con precio/notas/proveedor independientes; cambios del maestro no modifican snapshots del proyecto. Se mantiene la batería de permisos y captura existente.

No hay migración de base de datos ni escrituras de prueba en producción. Para revertir la interfaz basta revertir el commit de esta versión; no necesita restauración. La integración real de fabricantes y sus pruebas en Supabase se realizarán cuando se implemente el servicio, antes de habilitar Marcas. Esta preparación no acredita pruebas de una API de fabricantes que aún no existe.

## v3.57.1 — servicio instalado
Esta sección sustituye las limitaciones de servicio de v3.57.0 descritas arriba. Ya existen biblioteca_marcas y biblioteca_marca_productos, separadas de datos_estudio, con RLS y sin acceso directo anon/authenticated. Las RPC biblioteca_marcas_leer y biblioteca_marca_guardar comprueban app_rol del estudio, publicación y derechos. Las copias se añaden bajo bloqueo de la fila privada y avance de updated_at, con ID idempotente y referencia a revisión. No hay acceso de fabricantes ni interfaz de publicación.

La interfaz consulta el servicio al abrir Biblioteca. Muestra Marcas solo con respuesta autorizada no vacía; incluye búsqueda y guardado de una copia con precio/notas/proveedor propios. Respuestas de otra sesión o estudio se descartan. Guardado espera sincronización local y confirma la copia remota sin sobrescribir cambios pendientes.

Instalación validada en Supabase clon szbswxpkhidywaosdfcg: pruebas transaccionales revertidas, 47 bloques con huella idéntica antes/después. Recorrido UI real con catálogo sintético, formulario y guardado confirmado en el estudio ficticio; posteriormente se retiró el maestro sintético. Queda una copia sintética privada en ese estudio de pruebas. Ningún fixture se escribió en producción.

Producción cgqtylvaapwbuwqvpjtb: instalación aditiva correcta; 18 bloques conservados con huella idéntica antes/después y tablas nuevas vacías. Validación local: 331 tests y suite PostgreSQL scripts/library-brands-sql.mjs, incluyendo aislamiento, denegación de escritura directa, borradores/retirados invisibles, derechos de copia, idempotencia y snapshots intactos. SQL en sql/biblioteca-marcas.sql; rollback no destructivo en sql/biblioteca-marcas.rollback.sql. No hubo transformación de datos ni fue necesario restaurar una copia.

Pendiente fuera de este alcance: contratos y contenido real de marcas, proceso editorial de publicación, portal de fabricantes y actualización voluntaria entre revisiones. Ningún maestro se importa o publica automáticamente.

## v3.57.2 — pestaña siempre visible
Corrección explícita del usuario: ambas pestañas Mi estudio y Marcas quedan siempre visibles. Marcas muestra Próximamente mientras no hay contenido autorizado disponible. Esto sustituye la decisión anterior de ocultarla; no cambia permisos ni publica productos privados.

## v3.57.3
Retirada únicamente la fila independiente Pegar URL/Importar de Mi estudio. Buscador y Añadir producto conservados. El formulario Añadir mantiene URL de tienda e Importar producto (Product Clipper); Listas no cambia.
