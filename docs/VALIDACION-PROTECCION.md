# Validación de protección

Fecha: 2026-09-09. Candidato v3.30-pruebas, todavía sin publicar en producción.

## Evidencias completadas

- Restauración de una copia física de base de datos en un proyecto separado, autorizada expresamente por el usuario. Supabase confirmó su finalización y se comprobaron tablas, usuarios, membresías, historial y políticas mediante consultas de lectura.
- Descarga de una copia completa de archivos desde Drive a una carpeta privada. Inventario y tamaños coinciden con el manifiesto y la marca de finalización. Contenidos recuperados después en el Storage del proyecto aislado, configurado privado, y descargados de nuevo para comparar cada archivo byte a byte: comparación satisfactoria.
- Pruebas SQL con estudios y usuarios ficticios en el proyecto restaurado: lectura propia, rechazo de inserción cruzada, actualización cruzada sin filas afectadas, actualización propia con historial y restricción de operación administrativa para un miembro. Las pruebas usan el rol authenticated y la identidad de cada usuario; la transacción se revierte al finalizar.
- Pruebas reales HTTP con tres identidades ficticias: acceso solo al estudio propio, acceso anónimo denegado, subida propia, descarga por un compañero y rechazo de acceso/subida desde otro estudio. Las credenciales de administración se usaron para preparar el entorno, no para acreditar estos permisos.
- Pruebas del guardado con el código del cliente y transporte HTTP hacia el clon: ediciones independientes, dos lecturas de la misma versión con escrituras simultáneas y reintento, conflicto en un mismo campo, rechazo de escritura antigua y rechazo de RPC desde otro estudio/anónimo.
- Reversión de los permisos ensayada dentro de una transacción descartada; la protección quedó activa en el clon. No se revirtieron registros.
- 33 pruebas locales de copias, combinación de datos, guardado, elección de estudio y conservación de pendientes. Comprobación de sintaxis de los tres scripts inline y del archivo adicional.
- Aviso de copia pendiente probado en navegador con datos ficticios: descarga JSON y contenido comprobados. No equivale a una prueba completa de todos los flujos del CRM.
- CRM servido localmente con conexión limitada al clon: inicio de sesión real con identidad ficticia, creación de proyecto en blanco y subida de archivo ficticio. Se comprobó en la base de datos del clon la persistencia del proyecto y de la referencia al adjunto. El visor conserva una URL pública que falla con el bucket privado; esta incompatibilidad sigue pendiente. No se usaron registros del equipo piloto para estos ensayos.

## Cambios candidatos

- SQL/guardar-bloque-versionado.sql añade una RPC que comprueba membresía, bloquea la fila y exige la versión esperada. La fecha la genera el servidor. Responde PT409 ante conflictos, evitando los reintentos internos asociados a 40001. Retira INSERT/UPDATE/DELETE directos de clientes; conserva lectura/RLS e historial.
- El cliente combina cambios independientes sobre una base conocida. Los conflictos permanecen pendientes; no elige silenciosamente un ganador. Una importación confirmada conserva su comportamiento explícito de reemplazo, pero pasa por el control de versión del servidor.
- El guardado usa una copia inmutable de lo enviado y conserva los cambios hechos durante la petición. No marca como guardadas reducciones bloqueadas o errores.
- El estudio recordado debe tener una membresía comprobada; una respuesta vacía no acredita permiso.
- Antes de cargar la nube se verifica la copia de cambios pendientes. Si falla, se detiene la carga. El aviso permite descargar copias anteriores sin borrarlas ni subirlas automáticamente.

## Pendientes antes de publicar cambios de datos

1. Coordinar la transición de las sesiones antiguas. El cierre de escritura directa evita sobrescrituras, pero esas sesiones mostrarán errores y necesitarán actualizarse. Comprobar que cada miembro ha guardado; si no, conservar y descargar su copia pendiente antes de reconciliarla. Nunca forzar recarga ni borrar caché.
2. Completar la prueba del CRM entero conectado exclusivamente al entorno de pruebas, incluida recuperación/importación, apertura de adjuntos y portales. Los ensayos HTTP y del componente de copia pendiente no sustituyen todos estos flujos.
3. Revisar las configuraciones no incluidas en la restauración: Auth, enlaces de Storage, funciones externas y tiempo real. La recuperación verificada de base de datos y contenidos no acredita todavía la recuperación operativa de todas las integraciones.
4. Verificar compatibilidad de acceso privado a archivos y enlaces de clientes antes de trasladar cualquier cambio de Storage a producción. Este candidato no cambia Storage productivo.

## Publicación y reversión

Mantener el candidato en su rama aislada. No fusionarlo en main hasta resolver los puntos anteriores. Publicar HTML y sync-merge.js juntos; el cliente nuevo requiere la RPC. Coordinar SQL y entrega del cliente dentro de la transición acordada. Comprobar versión, guardado y archivos después de la entrega.

SQL/guardar-bloque-versionado.rollback.sql restaura los tres permisos anteriores observados y mantiene la RPC para sesiones nuevas. No borra datos ni historial, pero vuelve a permitir escrituras antiguas sin control: requiere una reversión coordinada, no una ejecución automática ante cualquier error. Revertir solo HTML mientras la protección está activa impide guardar a clientes antiguos. Conservar las copias y reconciliar cualquier pendiente.

Referencias: [restauración de Supabase](https://supabase.com/docs/guides/platform/clone-project), [errores HTTP de PostgREST](https://docs.postgrest.org/en/v14/references/errors.html).

## Detección de copias ausentes: propuesta, no activada

La programación se activó el 9 de septiembre; el primer disparo diario esperado es el día 10 a las 04:23 Europe/Madrid. Una prueba manual no acredita que el programador haya ejecutado su primer turno.

Hasta disponer de un control independiente, comprobar manualmente el historial de Actions y la última carpeta con COMPLETE.json y manifest.json coherentes. No contar carpetas prueba-* ni ejecuciones incompletas. Un éxito del modo test-drive no cuenta como copia real.

Propuesta: considerar atrasada una copia completa con más de 30 horas, avisar al responsable acordado y comprobar por separado el respaldo de base de datos. Distinguir fallo de ejecución, ausencia de ejecución y falta de marca de finalización. El supervisor debería funcionar fuera del mismo workflow, para detectar también que este no arranca. Umbral, canal y responsable pendientes de aprobación; no se crea aquí ninguna automatización nueva.

Las evidencias detalladas, rutas operativas y datos recuperados permanecen fuera del repositorio público.
