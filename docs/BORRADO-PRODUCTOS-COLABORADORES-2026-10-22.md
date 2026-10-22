# Borrado de productos por colaboradores — v3.65.108

## Alcance y autorización

El propietario solicita que la colaboradora pueda eliminar productos de las listas y que los colaboradores no puedan eliminar proyectos completos. Se comprueba de forma privada que la cuenta administradora y la colaboradora ya pertenecen al estudio principal y tienen los roles efectivos esperados. No se eliminan estudios, cuentas, proyectos ni membresías; no se transfieren datos del estudio alternativo. No se incorporan correos o identificadores reales a este repositorio público.

## Corrección

La UI bloqueaba el borrado en `shoppingProductDelete` y `delItem`; ambos pasan ahora por la confirmación y la operación existente que mantiene referencias locales. La cabecera oculta «Eliminar proyecto» al colaborador. `deleteProject` y `deleteProjectGo` rechazan al colaborador antes de cualquier mutación.

El escritor versionado antes impedía eliminar una fila con costes ocultos. El nuevo auxiliar privado prepara exclusivamente las eliminaciones de productos en `proyectos → rooms → sections → items`, identificados de forma única por ID o por nombre en datos antiguos sin ID. Conserva el resto del árbol anterior y lo entrega al combinador existente, que mantiene sus reglas de protección de costes, documentos y campos no autorizados. Rechaza identidades ambiguas. Los proyectos previos deben conservar su ID exactamente una vez, incluso si carecen de campos privados. La biblioteca (`compras`) no recibe esta excepción.

Se mantienen bloqueo de fila, versión base, atomicidad, roles y aislamiento entre estudios. El auxiliar usa `SECURITY INVOKER SET search_path=''`, sin ejecución pública, anónima o autenticada directa. Las cuentas autenticadas carecen de INSERT/UPDATE/DELETE directo en `datos_estudio` y de acceso al escritor base. No se modifican políticas, roles, tablas ni datos al instalar la función. Las restricciones financieras y de administración de usuarios siguen vigentes.

## Pruebas

- 653 pruebas Node correctas, incluidas eliminación de producto y ambas entradas de borrado de proyecto como colaborador.
- PostgreSQL 17 efímero: 1408 comprobaciones correctas. Incluyen regresión de equivalencia y seguridad, borrado con coste oculto mediante delta, lectura posterior, último producto mediante guardado completo, proyectos con/sin campos privados bloqueados, lote fallido, versión desactualizada, aislamiento, nombres antiguos únicos/ambiguos y administrador autorizado a borrar proyectos.
- Documento ficticio de aproximadamente 6 MB/1500 productos: eliminación con escritor nuevo en unos 1492 ms en el contenedor local, dentro del límite de 8 segundos. Es una medición aislada, no una garantía de tiempo productivo.
- Chromium a 1440 y 390 px: app real con cliente ficticio conectado únicamente a PostgreSQL local. Edición, alta de lista/producto, cancelar/confirmar borrado, guardado y recarga; costes privados conservados en productos restantes; llamadas de borrado de proyecto bloqueadas. Sin peticiones de escritura externas ni identidades reales.
- CI ejecuta además PHP e invitaciones. PHP no está instalado localmente; no se atribuye un resultado local.

## Activación y recuperación

CI debe pasar antes de aplicar `SQL/borrado-productos-colaborador.sql`; después se publica frontend por el proceso habitual y se verifican hashes públicos. La migración comprueba el hash esperado del escritor antes de reemplazarlo. Se han consultado catálogo, permisos, asesores y logs agregados, sin extraer documentos privados.

La evidencia de respaldo disponible se mantiene: Storage programado del 22-10 y supervisor correcto; la última copia física de BD mostrada directamente en la sesión es del 21-10. No se afirma una nueva restauración ni una copia física adicional. Esta instalación no transforma datos existentes.

Reversión: restaurar primero frontend anterior y después ejecutar `SQL/borrado-productos-colaborador-rollback.sql`. Reinstala el escritor anterior y elimina únicamente el auxiliar nuevo. No recupera productos que alguien haya eliminado legítimamente tras la publicación; para eso se revisa el historial del bloque sin sobrescribir otros cambios.

La regresión de tarjetas se ejecuta en 1440/1100/390 px, incluido borrado secuencial con confirmaciones de guardado demoradas. Su cliente ficticio se adapta a los hooks de versiones y lotes actuales; no realiza escrituras de red. El primer intento de ese script antiguo falló por usar una simulación de guardado anterior a los hooks actuales, no por un fallo del borrado en la app. Se corrigió el cliente de prueba y se repitió.
