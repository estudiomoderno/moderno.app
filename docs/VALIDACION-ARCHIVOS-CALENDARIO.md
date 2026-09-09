# Archivos y suscripción ICS — candidato sin publicar

9 de septiembre de 2026. Rama `taller-operativa-20260909`.

## Cambios preparados

- La suscripción ICS comprueba la pertenencia y el rol en cada consulta. Una baja o un cambio a Gestoría revoca nuevas consultas. Esto no elimina eventos descargados anteriormente por otro programa. Google Calendar como integración sigue aplazado.
- Los adjuntos compartidos tienen un registro privado. Un colaborador no obtiene acceso a archivos ajenos pegando su ruta en una tarea.
- Los documentos contables mantienen su clasificación privada aunque se retire su referencia. No se borran ni se mueven archivos.
- Las rutas de Storage admiten espacios y Unicode codificados; rechazan orígenes externos y codificaciones inválidas.

## Evidencia

`node --test scripts/*.test.mjs`: 118 pruebas correctas. Node 24 se usa para las pruebas del manejador TypeScript.

`node scripts/build-role-probe.mjs ensayo.sql` genera una única transacción con ROLLBACK; no ejecuta SQL. Ejecutada únicamente en el clon de recuperación, con identidad ficticia: 29 comprobaciones correctas, ningún fallo. Incluye lectura filtrada, conservación de importes, rutas privadas, prohibición de editar el registro de acceso, persistencia de privacidad y revocación ICS. La protección nativa de Supabase también impide DELETE SQL directo; esto no sustituye probar la API de Storage.

## Pendiente antes de publicar

1. Validar subidas, descargas y PDFs desde sesiones reales de prueba para cada rol. Las pruebas SQL solo usan metadatos ficticios transitorios, no bytes de archivos.
2. Validar en interfaz la edición de listas mixtas. La combinación SQL ya conserva los documentos ocultos y permite altas, cambios, ordenación y retirada de los adjuntos visibles. Rechaza suplantaciones por nombre o identificador; las filas visibles con costes privados siguen sin poder eliminarse.
3. Revisar el inventario del clon para detectar adjuntos de trabajo que compartan referencias con documentos contables. La clasificación actual es conservadora.
4. Reinstalación comprobada en el ensayo SQL: no concede acceso a rutas ajenas pegadas posteriormente.
5. Preparar publicación ordenada y comprobar copia reciente y guardados del equipo antes del cambio.

Orden de dependencias del candidato: `permisos-roles.sql`, `permisos-colaboradores.sql`, `permisos-calendario.sql`, `permisos-archivos.sql`. El manejador `calendario-ics` depende de la nueva RPC: no publicarlo solo. Estos candidatos no están instalados permanentemente en el clon ni en producción.

## Avance: conservación de documentos ocultos

Ensayo ampliado: 38 comprobaciones SQL correctas, incluyendo guardado por la RPC autenticada con un documento contable oculto entre los adjuntos, conservación exacta de su contenido y reinstalación de permisos. Las 118 pruebas locales siguen pasando.

Decisión de orden: las filas ocultas se intercalan intactas en los huecos de la lista anterior; los adjuntos visibles siguen el orden solicitado y las altas restantes se añaden al final. Los documentos ocultos sin nombre o identificador también se conservan. La operación termina en ROLLBACK y no toca los bytes de Storage.
