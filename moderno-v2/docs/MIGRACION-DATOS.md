# Migración de datos a Moderno.app V2 — diseño inicial

Fecha: 28/11/2026. Estado: **plan e inventario inicial**, sin migrador implementado ni migración ejecutada.

## Objetivo y límites

Construir V2 desde cero y conservar la información útil de la app actual con su identidad, relaciones, archivos y trazabilidad. La migración real será posterior a la validación de la nueva app. Los contratos y ensayos sintéticos se diseñan durante su construcción.

Este inventario procede exclusivamente del código y documentación del repositorio, en el commit 61a0c09c044abbd576a6c485ca58d0db75831317. No se ha consultado Supabase, abierto registros reales ni verificado backups. Los SQL versionados no demuestran qué está aplicado en cada entorno. Mail, integraciones y otras tablas necesitan ampliar el inventario antes de declararlo completo.

## Diseño desde el primer día

- Separar modelos de V2, reglas del producto, interfaz y adaptadores de datos.
- Definir por entidad su origen, destino, conversión, clave y relaciones; registrar campos pendientes, archivados, eliminados y antiguos.
- Conservar los IDs existentes cuando sean compatibles. Si cambia el esquema, mantener una correspondencia explícita por estudio, entidad, identidad original y contexto de origen; preservar también el tipo del ID y tratar duplicados sin colisiones silenciosas.
- Registrar versión del migrador y de cada esquema, lote y resultado. Un segundo pase debe ser repetible sin duplicar registros ni operaciones. Distinguir crear, actualizar, conservar y rechazar.
- Proponer almacenamiento por entidades/versiones para V2, en lugar de trasladar sin evaluación todo el estado monolítico. Aún no se ha aprobado ni aplicado un esquema nuevo.
- Mantener los permisos en el servidor y el aislamiento por estudio. Ocultar controles en ReUI no es autorización.
- Ensayar con información ficticia desde el primer recorrido de proyectos. No esperar a completar todas las pantallas para probar el importador.
- Decidir posteriormente si el destino productivo mantiene el proyecto Supabase actual o usa otro. Ambos casos necesitan compatibilidad, pruebas y recuperación; una nueva UI no exige por sí sola mover físicamente todos los datos.

## Inventario inicial

| Grupo | Contrato observado en el repositorio | Qué debe conservarse o resolverse |
| --- | --- | --- |
| Estudios, usuarios y accesos | Estudios, identidad Auth, membresías, roles e invitaciones; autorización con app_rol | Pertenencia, identidades y permisos efectivos. Si cambia el proveedor/proyecto de Auth, definir una migración soportada y posible nuevo inicio de sesión; una ficha de usuario no equivale a una cuenta de acceso. |
| Bloques del estudio | datos_estudio y guardado versionado; bloques proyectos, compras, presupuestos, facturas, contactos, contratistas, fases, agenda y config | Campos, versiones, alcance por estudio y tratamiento explícito de datos históricos. Incluir tablas separadas, no solo bloques. |
| Proyectos y productos | Estancias, secciones, listas e items; id, libId y addedAt | Pertenencia, orden, estado y vínculo de origen. La biblioteca y la ficha añadida a un proyecto pueden conservar copias distintas. |
| Presentaciones y moodboards | Referencias src y referencias históricas por rid/rsi/rii | Resolver relaciones antes de reordenar estructuras. Emitir incidencias para IDs ausentes, duplicados y destinos ambiguos, sin adivinar ni renumerar globalmente. |
| Presupuestos y facturas | Referencias, numeración, projectId, líneas y snapshots de origen | Fechas, importes, impuestos, redondeos, saldos, estados y revisiones históricas. No recalcular documentos antiguos con el catálogo actual. |
| Aprobaciones, solicitudes y pedidos | app_operaciones, app_operacion_eventos y RPC específicos | Snapshots, versión aprobada, ofertas, pedidos, cantidades, estados, autoría e historial. No están íntegramente contenidos en proyectos. |
| Pagos, abonos y vínculos contables | Economía de pedidos y enlaces a documentos contables identificados | Distinguir pagos registrados, reintegros, abonos, devoluciones físicas y facturas. Importar un registro no ejecuta una transferencia ni debe disparar una. |
| Archivos y documentos | Referencias persistidas storage://archivos/<estudio>/...; enlaces firmados temporales | Metadatos, objetos, tamaños, permisos y huellas cuando proceda. Las URLs firmadas no son el identificador permanente del archivo. |
| Historial, conflictos y borradores | Mezcla de cambios, diario del proyecto y trabajo local pendiente | Autoría y trazabilidad. Definir qué se incorpora como estado vigente y qué se conserva como histórico; no reproducir automáticamente operaciones pendientes. |
| Mail e integraciones | Inventario específico pendiente | Cuentas, vínculos a proyectos, mensajes/adjuntos y proveedor deben verificarse. No copiar credenciales ni asumir que los mensajes residen en la base de la app. |

Fuentes principales: [guardado delta](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/SQL/guardado-delta.sql), [membresías](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/SQL/aceptar-invitacion-estudio.sql), [fichas](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/app/specifications.js), [identificadores históricos](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/docs/ETIQUETAS-IDENTIFICADORES.md), [presupuestos](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/app/project-quotes.js), [operaciones y eventos](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/SQL/operaciones-producto.sql), [economía de pedidos](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/SQL/pedidos-economia.sql), [archivos privados](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/app/private-files.js) y [mezcla de cambios](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/app/sync-merge.js).

La [nota del guardado grande del 23 de noviembre](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/docs/GUARDADO-GRANDE-2026-11-23.md) recomienda evolucionar hacia proyectos y listas/partidas en filas versionadas independientes. Esa evolución necesita migración y pruebas propias; no se obtiene al instalar bloques visuales.

## Secuencia de trabajo

1. **Ahora:** completar inventario, contratos de V2 y mapa de correspondencias. Preparar datos ficticios con las estructuras y anomalías observadas.
2. **Durante la construcción:** implementar adaptadores/importador con vista previa de cambios; ensayar en Moderno Prueba verificado. Comparar origen sintético y destino automáticamente.
3. **Con V2 funcional:** completar los recorridos esenciales y el informe de diferencias. Preparar procedimientos de corte, respaldo y recuperación. Cualquier acceso a datos reales requerirá el alcance y autorización correspondientes.
4. **Antes de la transición productiva:** verificar por separado respaldo de base de datos y archivos, probar recuperación y preparar el resultado concreto que se solicita autorizar: alcance, destino, ventana, diferencias aceptadas y vuelta atrás.
5. **En el corte autorizado:** recoger los cambios posteriores al ensayo y controlar borradores pendientes. Definir una única aplicación escritora; valorar una pausa breve de escritura para la sincronización final según el volumen verificado.
6. **Después del corte:** verificar integridad y funcionamiento. Conservar una recuperación accesible durante el periodo acordado. Si V2 ya recibió cambios, volver a la app anterior exige reconciliarlos; revertir solo la interfaz no recupera datos.

No plantear doble escritura informal desde ambas aplicaciones. Si fuera necesaria una convivencia con escrituras, requiere protocolo de sincronización, control de versiones y pruebas específicas antes de activarla. No permitir que una importación dispare correos, cobros o automatizaciones reales.

## Criterios de aceptación del ensayo

- **Trazabilidad:** cada registro tiene origen y destino identificables; campos sin correspondencia y anomalías aparecen en un informe.
- **Repetibilidad:** ejecutar de nuevo el mismo lote no duplica registros, documentos, pagos ni archivos; un fallo parcial puede reanudarse de forma controlada.
- **Integridad:** recuentos por estudio/entidad, referencias y ausencia de huérfanos comprobados. Probar IDs numéricos y textuales, duplicados y referencias posicionales.
- **Fidelidad económica:** numeración, fechas, estados, cantidades, bases, impuestos, redondeos, totales y saldos contrastados; snapshots y revisiones aprobadas preservados.
- **Archivos:** objetos existentes, accesibles según permisos y consistentes con sus metadatos. La existencia de una fila no demuestra que el archivo esté recuperado.
- **Permisos:** pruebas de servidor entre estudios y roles, incluida la información económica que debe ocultarse en portales. Verificar cierre de sesión y cambio de identidad.
- **Concurrencia:** cambios durante la construcción y hasta el corte contemplados; versiones y conflictos tratados; borradores preservados o resueltos.
- **Recuperación:** restauración de BD y archivos ensayada, con estrategia que preserve las escrituras recibidas después del cambio de aplicación.

Referencia de protección existente: [PROTECCION-DATOS.md](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/docs/PROTECCION-DATOS.md).

## Decisiones pendientes

Esquema final de V2, destino productivo de Supabase, alcance de Mail/integraciones, tratamiento concreto de Auth y borradores, tiempo de corte y periodo de recuperación. El nuevo Taller deberá resolverlas con evidencia durante el desarrollo; no bloquean la preparación de la interfaz y los ensayos ficticios.

## Publicación durante el desarrollo

V2 debe poder publicarse con Google y un espacio de pruebas vacío mientras se construye. Seguir [PUBLICACION-V2-Y-GOOGLE.md](PUBLICACION-V2-Y-GOOGLE.md). Publicar una entrega no activa ninguna importación productiva. La migración se ejecutará únicamente con la orden expresa posterior del propietario, después del ensayo y las comprobaciones del corte. Conservar el acceso y los permisos existentes es un criterio de aceptación. Los ejemplos y cuentas de ensayo no se trasladarán automáticamente a producción.
