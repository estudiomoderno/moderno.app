# Revisión de escala del guardado — 23/11/2026

## Veredicto

El incidente no fue una colisión de 69 usuarios. Las 69 entradas eran copias locales históricas conservadas; el fallo real fueron dos guardados remotos cancelados. El candidato de esta entrega añade defensas para el uso actual, pero no se considera publicado por este documento y **no acredita todavía 1.000 usuarios activos escribiendo**.

## Evidencia medida

- Dos deltas fallidos de 4.734.025 bytes; p95 del diagnóstico: 12.009 ms.
- Bloque `proyectos`: aproximadamente 9,5 MB.
- Binarios Base64 dentro de `proyectos`: 5.893.002 bytes en nueve imágenes; otra imagen histórica estaba en `folderPhotos`.
- `datos_estudio_hist`: aproximadamente 1,88 GB, el 98 % del tamaño de la base medido durante la investigación.
- RPC delta histórica: media aproximada de 4,17 s y máximo observado de 25,15 s, con reconstrucción del JSON completo.
- Producción usa compute Micro: dos CPU ARM compartidas, 1 GB de RAM y 60 conexiones directas máximas.

Si 1.000 usuarios guardaran una vez cada cinco minutos serían unas 3,33 solicitudes por segundo. Con la latencia histórica media equivaldrían a unas 14 operaciones concurrentes y un volumen de temporales muy elevado. Un guardado por minuto superaría por sí solo las 60 conexiones. Además, las escrituras del mismo estudio se serializan para proteger la consistencia.

## Defensa inmediata

1. `array_sync` evita reenviar colas completas al insertar, borrar o reordenar listas con IDs.
2. Los archivos nuevos se guardan en Storage mediante una cola durable; nunca se degradan a Base64 dentro del JSON sincronizado.
3. Las Data URL históricas se migran gradualmente a referencias estables.
4. El candidato de `app_guardar_lote_v2` está diseñado para hacer reintentos idempotentes y evitar escrituras no-op.
5. El candidato de limpieza del historial saca esa tarea del camino crítico del usuario y separa su activación, con lotes e índice acotados.

## Estado de validación al 24/11/2026

- Producción no ha recibido este candidato ni sus migraciones.
- En `moderno-pruebas` se verificaron sobre PostgreSQL 17 `array_sync`, la preparación del libro privado de recibos y la RPC de confirmación.
- El conector agotó repetidamente su tiempo de ejecución al reemplazar el cuerpo final largo de `app_guardar_lote_v2`; ese cuerpo **no quedó instalado ni compilado** en el entorno aislado y conserva su versión anterior.
- La migración base del historial y su activación programada tampoco se instalaron. `pg_cron` sigue siendo un **NO-GO**.
- Las pruebas locales y de navegador del candidato son necesarias, pero no sustituyen la compilación del writer final en PostgreSQL 17 ni la prueba de carga representativa.

## Puerta para 1.000 usuarios

No se levanta el bloqueo hasta completar y medir:

- persistencia por filas de proyecto/lista en vez de un único documento `proyectos`;
- historial por entidad, sin instantáneas completas del bloque;
- inventario y retención de objetos Storage ya sin referencias activas ni históricas, con cuota y alertas antes de cualquier borrado;
- compatibilidad de clientes antiguos y todos los consumidores de lectura;
- prueba de carga v2 con 1.000 identidades ficticias, pérdida de acuse, replay, `array_sync`, no-op, contención y documentos grandes;
- SLO de p95, tasa de error, conexiones, locks, WAL, temporales, Realtime y recuperación;
- canary, rollback y backup verificados antes de cualquier activación productiva.

El arnés está en `scripts/load/` y rechaza referencias o dominios productivos. Pasar el arnés en una región/compute distintos tampoco certifica producción: el entorno de carga debe ser representativo.
> El despliegue de `app/**` queda bloqueado hasta que la variable de repositorio
> `PROD_SAVE_SCHEMA_VERSION` valga exactamente
> `guardado-v2-array-sync-confirm-ttl30d-20261123`. Solo debe fijarse después de aplicar y
> verificar en producción `guardado-delta-array-sync.sql` y
> `guardado-idempotente-v2.sql`, incluida la confirmación de recibos y su
> retención de 24 horas una vez confirmados y 30 días mientras sigan sin confirmar;
> evita publicar el cliente antes que su contrato
> de servidor. Si se revierte cualquiera de esos contratos, hay que retirar o
> cambiar primero la variable: el gate no consulta la base y no debe quedar
> autorizando despliegues de un cliente incompatible tras un rollback.

La reversión sigue el orden inverso: retirar la variable, volver a publicar el
cliente anterior y comprobar que ya no crea operaciones v2; solo entonces se
ejecuta `guardado-idempotente-v2.rollback.sql` y, después,
`guardado-delta-array-sync.rollback.sql`. Quitar la variable por sí solo no
degrada un cliente que ya esté servido.
