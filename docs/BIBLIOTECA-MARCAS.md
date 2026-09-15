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
