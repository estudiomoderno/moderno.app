# Selector de usuarios verificados para tareas

Candidato pendiente de autorización productiva. Rama `fix/asignacion-usuarios-20261013`.

El selector actual utiliza `state.users` (incluye ejemplos y nombres locales) y `state._invs` (invitaciones). Ninguna de estas fuentes demuestra que exista una cuenta con membresía activa. Se conserva ese contenido; no se borran contactos, usuarios locales, tareas ni asignaciones.

La lectura de metadatos productivos confirma que `app_equipo` es administrativa y que la política SELECT de `miembros` permite consultar solo la membresía propia. No se han leído nombres ni registros de clientes para esta investigación.

## Cambio preparado

`SQL/tareas-miembros.sql` añade únicamente `app_tareas_miembros(uuid)`, una consulta de lectura. Comprueba identidad autenticada y perfil efectivo administrador/colaborador del estudio solicitado. Devuelve id, correo, nombre para mostrar y perfil de cuentas de `auth.users` con fila en `miembros` de ese estudio. No devuelve invitaciones, cuentas sin membresía, otros estudios ni nombres locales sin cuenta. El nombre personalizado de una cuenta verificada se conserva para no romper las claves de asignación existentes.

La función necesita SECURITY DEFINER porque los clientes no tienen lectura de auth.users ni de todas las membresías. Usa search_path vacío, objetos cualificados, comprobación de auth.uid y de app_rol, y revoca ejecución a PUBLIC/anon. El permiso nuevo es solo EXECUTE para authenticated, sujeto a dichas comprobaciones. No cambia políticas RLS, tablas, credenciales, roles asignados o Storage.

`app/task-members.js` lee este directorio al abrir el modal. No guarda el directorio ni mezcla nombres locales como fallback. Una respuesta de otra sesión/estudio o de una apertura anterior se descarta. Los fallos ofrecen Reintentar. La actualización no vuelve a abrir el modal ni pierde los campos del borrador.

Asignaciones históricas se conservan y se etiquetan como anteriores si no aparecen en el directorio. Solo se retiran si el usuario pulsa expresamente; abrir/cerrar/consultar no modifica tareas. La aplicación mantiene el contrato de asignaciones por nombre; convertirlo a UUID no forma parte de este cambio.

## Verificación

- 441 pruebas Node aprobadas.
- PostgreSQL aislado con PGlite 0.3.14, usuarios y estudios ficticios y lógica existente de perfiles: administrador/colaborador pueden consultar su estudio; invitado, retirado, gestoría, anónimo y otro estudio quedan rechazados. Invitaciones/nombres fantasma/retirados no aparecen; configuración permanece intacta.
- Modal real de tareas en Chromium a 1280/390 px con RPC simulada y red bloqueada: opciones verificadas, borrador conservado, asignación múltiple, retirada explícita de histórico, rechazo de nombre fantasma y tarea original intacta.
- No se ha instalado la consulta en Supabase de producción ni publicado el candidato. La integración HTTP con Supabase no se presenta como ya verificada.

## Activación pendiente

Se requiere autorización concreta para instalar la nueva consulta y su permiso de ejecución en producción. Antes de activarla: comprobar las copias vigentes y el contrato actual de perfiles, revisar el PR y CI, instalar la consulta sin ejecutar ensayos ficticios en producción, verificar su definición/permisos con metadatos y publicar por el proceso habitual. El verificador comprobará también task-members.js (10 recursos).

La autorización solicitada no incluye borrar, actualizar o reasignar usuarios, contactos o tareas. Si aparece una dependencia que requiera cambios adicionales en permisos/datos, detener la activación y solicitar autorización específica.

Reversión: desplegar el código anterior; después eliminar solo la función nueva con `drop function public.app_tareas_miembros(uuid)`. No restaurar ni borrar datos.
