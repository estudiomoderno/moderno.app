# Preparación de copias de archivos

Estado: programa preparado y workflow manual de comprobación. No hay copia real verificada ni programación automática todavía.

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

El workflow `backup-storage.yml` solo admite ejecuciones manuales en `main`, con exclusión mutua y un máximo de 50 minutos. El token de Google dura una hora. No se programa hasta validar la primera copia real y su volumen.

Configurar dos secretos JSON en Actions, nunca como archivos del repositorio:

- `BACKUP_GOOGLE_CONFIG`: `project_id`, `provider`, `service_account`, `folder_id`, `team_drive`.
- `BACKUP_SOURCE_CONFIG`: `bucket`, `endpoint`, `region`, `access_key_id`, `secret_access_key`.

El proveedor de Google debe comprobar los ID numéricos del propietario y repositorio, `ref == refs/heads/main` y el `workflow_ref` exacto. Normalizar `google.subject = 'repo:' + assertion.repository + ':ref:' + assertion.ref` y otorgar `roles/iam.workloadIdentityUser` sobre la cuenta de servicio únicamente al sujeto `repo:PROPIETARIO/REPOSITORIO:ref:refs/heads/main`. La condición de ID numéricos es obligatoria para que esta normalización sea segura. GitHub puede incluir ID numéricos en `sub`; no asumir que coincide con el formato antiguo. Habilitar Drive API y las API de IAM, STS y credenciales de cuenta de servicio. La cuenta necesita acceso de colaborador a la carpeta privada autorizada.

Ejecutar primero el modo `test-drive`: crea dos archivos sintéticos, los copia y verifica, los descarga a un directorio temporal y compara los bytes. Las carpetas `prueba-*` quedan en Drive como evidencia y no contienen datos reales. Después ejecutar `backup`. Una prueba sintética correcta no demuestra que el origen real esté configurado ni sustituye una primera copia completa.

