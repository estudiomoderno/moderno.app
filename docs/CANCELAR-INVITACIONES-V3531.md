# Cancelar invitaciones — v3.53.1

En Ajustes → Equipo, cada invitación pendiente incluye **Cancelar invitación**. Se confirma el correo seleccionado y se vuelve a cargar el equipo tras la respuesta del servidor.

Solo un administrador del estudio puede cancelarla. La operación elimina únicamente la invitación de ese estudio. No borra cuentas, miembros, archivos, documentos, asignaciones ni el directorio histórico de tareas. No envía correos. Si ya se aceptó, informa de que no queda una invitación pendiente y conserva el acceso; retirar un miembro sigue siendo una acción distinta.

La aceptación bloquea la invitación y comparte el bloqueo del estudio con la cancelación. Si la cancelación termina primero, una aceptación que había leído la invitación anteriormente no puede crear la pertenencia. Crear un estudio nuevo conserva el alta de su primer administrador. Los nombres de roles nunca otorgan permisos.

## Instalación y comprobación

Aplicar `SQL/cancelar-invitacion.sql` después de `SQL/equipo-roles.sql`, primero en el clon y después en producción; publicar luego la interfaz. La migración crea/reemplaza funciones, no ejecuta cancelaciones ni transforma datos existentes. El código base de aceptación en `equipo-roles.sql` incorpora la misma protección.

Validación: 312 pruebas JS existentes, 4 nuevas pruebas del flujo de cancelación y 26 comprobaciones PostgreSQL aisladas. En el clon se ha creado una invitación ficticia, cancelado y repetido la cancelación dentro de una transacción revertida, sin enviar correo.

Para repetir las pruebas PostgreSQL: ejecutar `scripts/team-roles-sql.mjs` con Node y pasar como primer argumento la ruta a `@electric-sql/pglite/dist/index.js`. No necesita credenciales ni conecta con producción.

Publicada el 12/09/2026: commit `ac6101f5b6e22071e6510729a934e7ec31cd612c`, ejecución GitHub Actions `34715495754` correcta. Migración instalada con éxito en clon y producción. HTML y `team-settings.js` públicos devuelven HTTP 200 y coinciden con el candidato, normalizando finales de línea; HTML identifica v3.53.1. No se canceló ninguna invitación real durante las pruebas.
