# Abrir el estudio con una copia pendiente grande

## Problema

Al entrar, `cloudKeepPendingCopy` duplica la instantánea pendiente de localStorage antes de cargar los datos autorizados de la nube. Archivar las copias anteriores libera espacio, pero no resuelve una instantánea actual que cabe una vez y no dos. Se reproduce el bloqueo con una copia de 3,1 millones de caracteres y 53 copias ya archivadas bajo la cuota real de Chromium.

## Corrección preparada en v3.65.90

Se mantiene el camino existente. Si duplicar sigue fallando después de archivar copias anteriores, la instantánea se conserva directamente en el IndexedDB existente `moderno-pending-copies`. Solo tras verificar su contenido por lectura se registra un pequeño marcador en localStorage, se verifica ese marcador y se retira el indicador de copia pendiente. El original permanece intacto hasta el proceso normal de carga autorizado. No se importan copias antiguas ni se escriben datos de prueba en producción.

El marcador usa el formato existente, accesible desde Ver copias anteriores y su descarga. La clave incluye aleatoriedad por pestaña y conserva la fecha interpretable por el lector anterior. Se comprueba que el destino esté libre, que la sesión/intento no haya cambiado y que la instantánea pendiente siga siendo la misma después de las esperas.

Si fallan IndexedDB, lectura de verificación, registro del marcador o identidad, no se retira el indicador de pendiente ni se continúa la carga. No se garantiza resolver navegadores que bloqueen todo almacenamiento. No cambia localStorage principal, esquema IndexedDB, RPC, formato de datos, permisos ni Storage remoto.

## Pruebas

- Pruebas de dominio: archivo directo sin segunda copia grande; errores de escritura, lectura, marcador, identidad y cambios concurrentes; rechazo de destinos ocupados. Original, copias previas e indicador pendiente se conservan en los fallos.
- Chromium aislado a 1440 y 390 px: cuota real, 53 copias previas, apertura solo tras verificación, fallo de archivo, descarga del estado actual y reintento con archivo nativo recuperado. Se verifican las 54 copias y los datos pendientes. Cliente RPC exclusivamente en memoria, SDK real desactivado, red externa bloqueada y cero escrituras reales.
- Regresión de recuperación automática y descarga/reintento a 1440 y 390 px, con 53 copias. No se marca nube confirmada por recuperar solo almacenamiento local.
- Pruebas Node completas y PHP en CI. No se han inspeccionado los datos de la pestaña real; el usuario confirma descarga JSON y acceso correcto en incógnito.

## Publicación y reversión

Preparada para revisión y las guardas de respaldos del AGENTS.md. No declarar publicada antes de integrar y comprobar despliegue y recursos públicos. Revertir el commit de código si fuese necesario; los marcadores conservan formato compatible con la versión anterior. No borrar IndexedDB, copias ni caché para revertir. Tras publicar, conservar pestaña y JSON originales; comprobar acceso en una pestaña nueva del navegador normal.
