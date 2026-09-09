# Acceso, roles y correo — 9 de septiembre de 2026

Preparación de v3.30, sin despliegue. Esta revisión transforma pendientes generales en hallazgos concretos. No certifica el sistema de roles.

## Roles: reglas presentes y comportamiento

| Rol anunciado | Regla que muestra el código | Resultado observado |
| --- | --- | --- |
| Administrador | Acceso total | Navegación permite finanzas y administración. |
| Colaborador | Proyectos, tareas y listas; sin Finanzas ni márgenes | La navegación oculta Contabilidad/Facturas, pero el servidor acepta lectura y escritura financiera como miembro. |
| Gestoría (solo lectura) | Contabilidad, facturas y exportación; sin edición | Se clasifica como miembro y la navegación deniega Contabilidad. No existe tratamiento específico en la RPC. |
| Contratista (obra) | Solo obra compartida | El texto lo promete; el rol no tiene una rama específica en myAccessLevel. No confundirlo con el portal anónimo filtrado ya probado. |

La tabla de membresías distingue admin/miembro; invEnviar convierte todos los roles distintos de Administrador en miembro. El rótulo local Administrador puede cambiar myAccessLevel a owner aunque la membresía sea miembro. La matriz account.roles[].caps se representa y edita en pantalla, pero no autoriza la RPC de guardado.

## Ensayo de servidor, solo clon

Dentro de BEGIN/ROLLBACK se usó una identidad existente cuyo correo termina en @example.invalid, un estudio exclusivamente ficticio y contenido financiero sintético. Se cambió temporalmente su membresía a miembro, se ejecutó SET LOCAL ROLE authenticated y se establecieron sus claims de usuario. La lectura de facturas y guardar_bloque_versionado devolvieron respectivamente true y true. El ensayo no se ejecutó como postgres para acreditar permisos del usuario.

Una consulta posterior confirmó rol original restaurado=true y sin marcas de prueba=true. No quedó escritura del ensayo ni se tocó producción. Es evidencia de un defecto del candidato, no un resultado satisfactorio de autorización financiera.

No basta con ocultar más botones ni denegar solamente el bloque facturas: proyectos contiene listas y datos económicos, config contiene usuarios/permisos, y el historial y los archivos también requieren revisar acceso. Corregirlo exige coordinar las lecturas filtradas, escrituras por campos, autoridad de roles y tratamiento de datos ya descargados. No ampliar accesos de Gestoría simplemente para que pase una prueba ni presentar aislamiento entre estudios como permisos por rol.

## Correo y entrada

- Las pruebas previas de entrada ficticia y anclaje a membresía siguen vigentes. Los cambios de impresión no modifican sbEnter, mailFnSend ni la resolución de membresía.
- El cliente llama a /api/enviar-invitacion.php. No hay fuente PHP correspondiente en el repositorio ni en los archivos encontrados en el workspace. No incluir un reemplazo improvisado en el despliegue.
- Petición HEAD al servicio productivo: HTTP 405 y application/json, sin destinatario, cuerpo ni envío. Esto acredita respuesta del endpoint, no entrega de correo ni seguridad de su implementación.
- Dos pruebas locales con transporte simulado verifican payload y rechazo de respuestas fallidas/no JSON.
- Después, el usuario autorizó expresamente una invitación de prueba a su dirección personal. Se realizó un único POST al servicio, con contenido identificado como prueba técnica: HTTP 200 y respuesta {"ok":true,"version":"v1.4","via":"smtp","smtp":"ok"}. No se ejecutaron operaciones de alta de usuarios, membresías ni permisos. La dirección personal se omite del repositorio público.
- El usuario confirmó que recibió el correo y después pudo registrarse/entrar con su cuenta nueva. Vio bienvenida/estudio vacío: la prueba SMTP no creó una invitación de membresía y no acredita unión al estudio habitual. No se ejecutó ninguna importación ni se le añadió al estudio.
- El servicio existente queda acreditado para envío y recepción de este mensaje; su fuente PHP sigue fuera del repositorio. Esta entrega no lo modifica. Recuperar su fuente/configuración no secreta será necesario antes de modificar ese backend o reproducirlo en aislamiento; no confundir esa deuda de recuperación con falta de recepción del correo ya comprobada.

## Estado del piloto

El usuario confirma pausa del equipo y que todos guardaron, sin formularios pendientes ni errores. No se ha confirmado el cierre de todas las sesiones antiguas ni se ha ordenado recargar. La pausa no resuelve los hallazgos técnicos anteriores. No ejecutar el corte todavía.

Suite: 87 pruebas. Las pruebas rotuladas documented gap demuestran defectos existentes; pasar esas pruebas no significa que esos permisos sean correctos.

## Correcciones en curso tras autorizar completar la entrega

- Se retira la elevación de navegación por el rótulo local Administrador: solo la membresía admin concede ese nivel. La prueba antes descriptiva del defecto ahora exige que el rótulo local no eleve al miembro.
- guardar-bloque-versionado.sql exige membresía admin para escribir config, donde viven roles/usuarios/capacidades. Ensayo SQL en clon, dentro de transacción revertida: miembro_config_rechazada=true y admin_config_permitida=true. Se usó SET LOCAL ROLE authenticated con identidad ficticia. El cambio de función se revirtió al terminar; la corrección está preparada en el archivo, no instalada ni publicada.
- Estas correcciones evitan elevación de privilegios por configuración; no cierran aún la lectura financiera, los campos internos de proyectos/listas, historial y archivos.
- Decisión requerida y preguntada al usuario: el rol Gestoría (solo lectura) tiene una promesa de no edición, pero su matriz editable permite activar capacidades de escritura. Se recomienda mantener ese rol siempre de lectura y usar otro rol para una gestoría con edición. No implementar una precedencia contradictoria sin resolver esa decisión.
- El equipo había sido autorizado a retomar el trabajo. La confirmación anterior de pausa/guardado no permite asumir una nueva ventana de publicación ni el cierre actual de sesiones.
