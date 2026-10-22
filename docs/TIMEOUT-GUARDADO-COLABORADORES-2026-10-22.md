# Timeout al guardar como colaborador — corrección de servidor

## Problema confirmado

La captura de v3.65.101 muestra `canceling statement due to statement timeout`. El rol autenticado tiene un límite de ocho segundos. Además de los rechazos de campos de la incidencia anterior, los registros de diagnóstico contenían cancelaciones dentro del combinador de datos del colaborador.

El combinador recorría las mismas listas completas para buscar cada identidad, revalidaba repetidamente los subárboles y reconstruía documentos grandes en pasos intermedios. Una prueba aislada con 1.500 productos y aproximadamente 6 MB reproduce la cancelación de la versión anterior al llegar a 8.015 ms. Se conserva la definición anterior para comparar resultados y excepciones.

## Corrección acotada

`SQL/optimizar-combinacion-colaboradores.sql` sustituye únicamente la implementación del combinador puro y añade dos ayudantes privados:

- El punto de entrada mantiene la validación completa de campos autorizados. Calcula una sola vez la proyección anterior y entrega los subárboles ya validados al ayudante interno.
- Las búsquedas usan índices temporales de identidad y posición. No guardan copias de productos en los índices. El hash nativo de JSONB solo acota la búsqueda: se sigue comprobando igualdad JSONB exacta, incluidos números de distinta escala, valores nulos e identidades complejas.
- Conserva comprobaciones de identidades ambiguas/reservadas, documentos ocultos, orden, restricciones de borrado, costes y márgenes privados. Los errores mantienen código y mensaje.
- Reconstruye objetos mediante agregación y listas mediante arrays intermedios. Evalúa el resultado recursivo por separado antes de incorporarlo a la lista.

No cambia filas de negocio, roles, RLS, RPC de guardado, límite de ocho segundos ni contrato público. Los ayudantes son invocadores puros y no ejecutables por `anon` ni `authenticated`. Los permisos del combinador existente se conservan. Una guarda de huella impide sustituir una definición anterior inesperada.

## Evidencia aislada

- **1.388 comprobaciones PostgreSQL:** incluyen los contratos de guardado y roles anteriores, 1.241 comparaciones de valores/excepciones frente a la versión anterior, nulos SQL, igualdad de IDs numéricos, ayudantes privados y guardado completo de 1.500 productos.
- **RPC real de colaborador con unos 6 MB:** aproximadamente **2.192 ms**, con `statement_timeout=8s`, seguido de relectura y comprobación de conservación/ocultación de costes y márgenes. Son medidas del contenedor de pruebas; no garantizan esa latencia en todos los equipos o cargas.
- **Chromium en 1440 y 390 px**, servidor oficial aislado, peticiones externas bloqueadas y base de datos exclusivamente ficticia: 1.500 productos, edición, petición pendiente antigua, nueva lista y producto, recarga y conservación de costes. Los RPC de prueba mantienen el límite de ocho segundos.
- Suite Node completa; el nuevo ensayo PostgreSQL queda añadido al flujo de CI.

## Publicación y reversión

Corrección solo de servidor: sigue siendo compatible con v3.65.101 y con las peticiones anteriores admitidas por la corrección de campos vacíos. No requiere recargar la pestaña que conserva cambios pendientes. No equivale a confirmar el guardado de esa pestaña: debe reintentar y esperar «Guardado en nube».

`SQL/rollback-optimizar-combinacion-colaboradores.sql` restaura la función anterior y elimina los ayudantes sin tocar registros. La reversión se ensaya comparando la huella de todos los bloques ficticios antes y después. Se conserva la definición anterior obtenida mediante metadatos; no se prueban escrituras con datos de clientes. La copia de Storage de 507 objetos fue verificada el 22/10 a las 07:53 UTC; no se afirma una nueva verificación de copia física de BD para este cambio de funciones puras.

Revisión: https://github.com/estudiomoderno/moderno.app/compare/main...fix/timeout-colaborador.
