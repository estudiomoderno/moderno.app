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
2. Resolver y probar la edición de listas que contienen documentos ocultos al colaborador: deben conservarse sin impedir editar adjuntos visibles.
3. Revisar el inventario del clon para detectar adjuntos de trabajo que compartan referencias con documentos contables. La clasificación actual es conservadora.
4. Probar reinstalación del registro sin conceder acceso a rutas pegadas posteriormente.
5. Preparar publicación ordenada y comprobar copia reciente y guardados del equipo antes del cambio.

Orden de dependencias del candidato: `permisos-roles.sql`, `permisos-colaboradores.sql`, `permisos-calendario.sql`, `permisos-archivos.sql`. El manejador `calendario-ics` depende de la nueva RPC: no publicarlo solo. Estos candidatos no están instalados permanentemente en el clon ni en producción.
