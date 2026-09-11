# Preparación de copias de archivos

Estado (2026-09-09): prueba sintética de copia y recuperación y primera copia real de Storage completadas y verificadas. Programación diaria a las 04:23 en Europe/Madrid mediante GitHub Actions. El primer disparo programado aún está pendiente; las ejecuciones manuales ya funcionan.

Requiere Node.js 22+, rclone y dos conexiones mediante variables de entorno: origen S3 compatible y destino Google Drive privado. La cuenta de servicio de Google necesita acceso al destino autorizado y Drive API habilitada. Los secretos no pertenecen al repositorio.

El programa crea una carpeta nueva por ejecución, copia objetos, compara su contenido por descarga y comprueba que el inventario no cambió. Solo después escribe COMPLETE.json. Una ejecución incompleta no constituye una copia válida. No borra ni modifica el origen; tampoco elimina copias antiguas. Un inventario vacío produce error para evitar declarar éxito por una configuración incorrecta.

Ejecutar comprobaciones de lógica: `node --test scripts/backup-storage.test.mjs`.
Ejecutar copia con credenciales configuradas: `node scripts/backup-storage.mjs`.

Variables requeridas:

- BACKUP_BUCKET
- RCLONE_CONFIG_SOURCE_ENDPOINT
- RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID
- RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY
- RCLONE_CONFIG_DESTINATION_SERVICE_ACCOUNT_CREDENTIALS (JSON de cuenta de servicio)
- RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID
- RCLONE_CONFIG_DESTINATION_TEAM_DRIVE

Configurar región del origen si el proveedor la requiere mediante RCLONE_CONFIG_SOURCE_REGION.

Antes de activar: revisar los permisos de origen y destino; autorizar el procesador que ejecutará la copia; guardar credenciales en su almacén de secretos; comprobar límites de espacio y transferencia. Las claves S3 de Supabase eluden RLS y tienen acceso completo, aunque este programa solo lee el origen. No confundir intención de solo lectura con permisos restringidos.

Primera prueba: usar archivos sintéticos en un entorno aislado, ejecutar copia y descargar el resultado en un directorio temporal para comprobar apertura y contenido. Después validar la primera copia real antes de programar ejecuciones. Este programa no restaura la base de datos, políticas ni metadatos específicos de Supabase; esas protecciones requieren un procedimiento complementario.

La copia completa y su comprobación consumen transferencia; definir frecuencia y retención según el volumen medido. No activar eliminación automática de copias sin una política acordada. Los logs publicados solo deben mostrar estados generales.

Referencias: https://rclone.org/drive/ y https://supabase.com/docs/guides/storage/s3/authentication

Alternativa sin clave privada de Google: federación de identidad con GitHub y token OAuth temporal en RCLONE_CONFIG_DESTINATION_TOKEN (JSON rclone). En este modo no se necesita RCLONE_CONFIG_DESTINATION_SERVICE_ACCOUNT_CREDENTIALS. Restringir confianza al repositorio y workflow de copias en main; limitar la ejecución a la duración del token.

## Ejecución en GitHub

El workflow `backup-storage.yml` se ejecuta diariamente a las 04:23 en Europe/Madrid y también permite ejecuciones manuales en `main`, con exclusión mutua y un máximo de 50 minutos. El token de Google dura una hora. Cada ejecución crea una copia completa nueva. No se eliminan copias antiguas automáticamente; revisar periódicamente espacio y transferencia antes de acordar retención.

Configurar dos secretos JSON en Actions, nunca como archivos del repositorio:

- `BACKUP_GOOGLE_CONFIG`: `project_id`, `provider`, `service_account`, `folder_id`, `team_drive`.
- `BACKUP_SOURCE_CONFIG`: `bucket`, `endpoint`, `region`, `access_key_id`, `secret_access_key`.

El proveedor de Google debe comprobar los ID numéricos del propietario y repositorio, `ref == refs/heads/main` y el `workflow_ref` exacto. Normalizar `google.subject = 'repo:' + assertion.repository + ':ref:' + assertion.ref` y otorgar `roles/iam.workloadIdentityUser` sobre la cuenta de servicio únicamente al sujeto `repo:PROPIETARIO/REPOSITORIO:ref:refs/heads/main`. La condición de ID numéricos es obligatoria para que esta normalización sea segura. GitHub puede incluir ID numéricos en `sub`; no asumir que coincide con el formato antiguo. Habilitar Drive API y las API de IAM, STS y credenciales de cuenta de servicio. La cuenta necesita acceso de colaborador a la carpeta privada autorizada.

Ejecutar primero el modo `test-drive`: crea dos archivos sintéticos, los copia y verifica, los descarga a un directorio temporal y compara los bytes. Las carpetas `prueba-*` quedan en Drive como evidencia y no contienen datos reales. Después ejecutar `backup`. Una prueba sintética correcta no demuestra que el origen real esté configurado ni sustituye una primera copia completa.

Validación completada: acceso temporal, copia sintética, descarga y comparación de recuperación; copia real con inventario estable y comparación del contenido por descarga, manifiesto y COMPLETE.json presentes en el destino privado. Los detalles operativos y nombres de archivos se conservan fuera de este repositorio público.

## Comprobar el resultado y recuperar archivos

1. Revisar el workflow en Actions. Un fallo o una ejecución cancelada no constituyen una copia válida. Las carpetas de pruebas se distinguen por el prefijo `prueba-`.
2. En el destino privado, elegir una carpeta fechada que contenga `COMPLETE.json`, `manifest.json` y `objects`. La marca completa se escribe al terminar las comprobaciones.
3. Para recuperar, descargar `objects` a una carpeta local nueva o a un entorno aislado. Con el remoto privado configurado: `rclone copy destination:ID_DE_COPIA/objects ./recuperacion-ID_DE_COPIA --immutable`. No apuntar este comando a producción.
4. Comparar inventario, tamaños y contenido recuperado; abrir los documentos necesarios. Antes de volver a subir a Supabase, decidir el punto de recuperación de la base de datos y conservar rutas, referencias y permisos. No sobrescribir producción sin un procedimiento de recuperación revisado.

Este sistema respalda el bucket configurado. Los nuevos buckets requieren ampliar explícitamente el alcance. No exporta la base de datos, RLS, usuarios ni todo el metadato específico de Supabase. Se han recuperado por separado base de datos y contenidos en un proyecto aislado y comparado los archivos byte a byte. Sigue pendiente completar los flujos del CRM y las integraciones no incluidas en el clon; consultar VALIDACION-PROTECCION.md.

## Continuidad de la programación

GitHub puede retrasar ejecuciones y desactiva los workflows programados de repositorios públicos tras 60 días sin actividad. Revisar la fecha de la última copia completa y los fallos de Actions; una programación configurada no garantiza por sí sola una copia diaria exitosa. La supervisión externa de copias ausentes sigue pendiente. [Referencia de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).


## Recuperación a partir de v3.35

La copia externa de Storage no contiene pedidos ni aprobaciones. Para recuperar el estudio completo se necesita además una copia de base de datos posterior a la instalación de v3.35, incluyendo public.app_operaciones, public.app_operacion_eventos, sus funciones, permisos y el disparador de invalidación. No basta con recuperar datos_estudio.

Estado actualizado: ensayo aislado terminado con el alcance y límites descritos en el cierre del 11 de septiembre, al final de este documento. Las 20 pruebas SQL de la entrega comprueban el funcionamiento del módulo y son distintas del ensayo de recuperación.

En el ensayo:
1. Anotar fecha y alcance de la copia de base de datos y de Storage; pueden corresponder a momentos distintos.
2. Comprobar ambas tablas, RLS y funciones del módulo, y comparar registros con el inventario del mismo punto de copia. Un recuento aislado no demuestra integridad.
3. Verificar con identidades ficticias que un administrador puede consultar el historial y que un visitante no accede a información interna.
4. Comprobar una aprobación invalidada y un pedido con recepciones: deben mantener sus revisiones, cantidades e historial tras restaurar.
5. Recuperar los archivos por separado, conservando rutas y comprobando contenido. No ejecutar operaciones de prueba ni sobrescribir producción.
6. Guardar el resultado del ensayo sin datos privados ni credenciales en el repositorio público.

### Ensayo iniciado — 11 septiembre 2026

Se ha localizado una copia de base de datos completada el 11/09/2026 a las 00:31:45 UTC, posterior al commit de v3.35. Se ha solicitado su restauración en un proyecto nuevo de la misma organización y región, sin restaurar sobre producción. El formulario indicó 0 USD adicionales de cómputo y disco. El destino está identificado en el panel privado como recuperación aislada v335 del 11 de septiembre.

La creación ha sido aceptada; la comprobación de contenido todavía está pendiente mientras arranca el proyecto. Ejecutar primero scripts/sql/recuperacion-operaciones-inventario.sql, de solo lectura, antes de instalar o modificar el módulo. La presencia de la estructura no acredita por sí sola la recuperación de registros ni archivos.

### Comprobación de la base restaurada — 11 septiembre 2026

El entorno aislado ya admite consultas. Antes de instalar o modificar el módulo se comprobó: ambas tablas presentes, las seis funciones esperadas presentes, RLS activo en ambas tablas y un disparador de invalidación habilitado. Se recuperaron 18 bloques de datos. El rol anon no tiene SELECT directo sobre operaciones y authenticated no tiene INSERT directo.

La copia contiene cero operaciones y cero eventos: no permite certificar conservación de un historial poblado. Esta comprobación acredita estructura y restricciones inspeccionadas, no sustituye pruebas funcionales completas de permisos ni una comparación de contenido con un manifiesto del punto de copia. Los archivos de Storage no se han recuperado en este nuevo entorno. Ambos límites permanecen pendientes; no declarar recuperación integral validada.

### Ensayo complementario de historial y archivos — 11 septiembre 2026

- Copias automáticas de Storage del 10 y 11: ejecuciones de GitHub Actions completadas correctamente. La copia del 11 contiene COMPLETE.json con 121 archivos y verificación a las 02:34:50.924 UTC.
- Inventarios del 9 y del 11 idénticos en rutas, tamaños y fechas. Los 121 archivos locales de la copia del 9 (15.626.494 bytes) coinciden por ruta, tamaño y MD5 con los eTag de la base recuperada del 11: cero ausentes, distintos o adicionales antes de las pruebas de subida. También se descargaron individualmente 30 archivos de la copia del 11 y se compararon byte a byte. No confundir esto con haber descargado o restaurado de nuevo los 121.
- Historial: respaldo lógico de tres operaciones y ocho eventos ficticios del clon de pruebas, importado a las tablas reales del nuevo clon dentro de una transacción descartada. Ambos conjuntos de filas resultaron idénticos por comparación JSON completa, incluidos estados, cantidades, versiones, actores y fechas. Confirmadas tablas vacías tras ROLLBACK. Es una prueba lógica complementaria; la copia física de producción no contenía esas operaciones.
- El panel de Storage renombra las subidas cuando conserva metadatos previos: produjo 13 copias adicionales con sufijo en el clon. Se detuvo esa vía porque no recupera las rutas originales. Los originales de producción no se han modificado.
- Pendiente: ejecutar recuperación controlada por API sobre el clon, releer los 121 contenidos, conservar propietarios y retirar únicamente las 13 copias del ensayo. Se ha solicitado autorización específica de la credencial privilegiada del nuevo clon; no reutilizar la autorización del clon anterior ni usar credenciales de producción.

Se añade `scripts/verify-recovery-files.mjs`: compara una carpeta de copia completa con una carpeta recuperada, ambas con subcarpeta objects; exige manifiesto y marca completa coherentes, comprueba todos los bytes y rechaza archivos extra y rutas no seguras. Uso: `node scripts/verify-recovery-files.mjs CARPETA_COPIA CARPETA_RECUPERADA`. Seis pruebas automatizadas verifican igualdad, alteración con igual tamaño, extras, marca incompleta, salida de ruta y duplicados. No conecta a Supabase ni modifica archivos.

### Cierre del ensayo aislado — 11 septiembre 2026

Los puntos pendientes de archivos de las anotaciones anteriores quedan resueltos. Con autorización específica se utilizó temporalmente la clave del nuevo clon en un comprobador local limitado a ese proyecto. Se recuperaron las 121 rutas originales mediante la API de Storage con upsert y se descargó cada objeto del clon: los 15.626.494 bytes coincidieron exactamente con la copia validada. La comprobación terminó a las 08:44:01 UTC. No se guardó la clave en archivos ni en GitHub; el proceso temporal quedó detenido.

Comprobación posterior por SQL: 121 objetos, 121 coincidencias de tamaño y MD5, cero objetos adicionales, 121 identificadores y propietarios originales conservados, bucket privado. Las 13 copias con sufijo creadas durante el ensayo se compararon con su original antes de retirarlas por la API. Se conservaron los 18 bloques de datos y quedaron cero operaciones y eventos ficticios tras la prueba transaccional. Una solicitud de descarga sin credenciales fue rechazada por falta de autorización.

Alcance acreditado: estructura de la base física posterior a v3.35, comparación completa de tres operaciones y ocho eventos ficticios mediante recuperación lógica, y recuperación efectiva de los 121 archivos. La base física tenía cero operaciones y eventos; este ensayo no acredita un historial poblado dentro de esa copia física. Producción no recibió escrituras durante este ensayo.

## Continuación: acceso, integraciones y vigilancia

El 11 de septiembre se verificaron 15 comprobaciones HTTP del servicio recuperado, incluyendo acceso con contraseña, guardado, archivos privados, portales y calendario. Ver RECUPERACION-SERVICIO.md para el alcance exacto y las dependencias pendientes de Google OAuth y del servicio PHP de correo.

La vigilancia horaria de copias fallidas o ausentes está configurada en Codex; ver MONITORIZACION-COPIAS.md. Depende de este ordenador y no sustituye una supervisión externa siempre encendida. El modo manual backup-service para respaldar api por FTPS al Drive empresarial está autorizado expresamente. El bloqueo inicial del certificado quedó resuelto usando el servidor oficial de DonDominio. Ejecución 34595566064 correcta: dos archivos de api copiados y verificados, con marcador COMPLETE. Ver RECUPERACION-SERVICIO.md; el modo de copia de api es manual.

Para repetir desde otro ordenador: seguir el inventario de solo lectura, descargar la copia privada completa, comprobar contenido contra el punto de base elegido y utilizar exclusivamente credenciales del destino aislado. Antes y después del upsert comparar identificadores, rutas, propietarios, privacidad e inventario. No usar la subida del panel como sustituto: puede renombrar objetos existentes. No retirar objetos salvo los creados expresamente por el propio ensayo y verificados como tales. Las huellas y evidencias con rutas privadas se mantienen fuera del repositorio público.
