# Validación de protección — 9 de septiembre de 2026

Candidato v3.30-pruebas en rama aislada. No publicado en GitHub ni desplegado en producción en esta validación.

## Comprobado en el clon

- Recuperación de base de datos, usuarios, membresías, historial y políticas. Los 121 archivos recuperados se compararon byte a byte con la copia. Storage del clon es privado.
- Pruebas SQL y HTTP con identidades ficticias: acceso propio, rechazo entre estudios y rechazo anónimo. La credencial administrativa solo preparó las pruebas; no acreditó los permisos de los usuarios.
- Guardado versionado: combinación de cambios independientes, rechazo de versiones antiguas, conflictos conservados y cambios durante la petición pendientes de guardar. Reversión de permisos ensayada dentro de una transacción descartada.
- 53 pruebas locales satisfactorias de copias, guardado, combinación, membresía, pendientes, visores privados, portales, actualización y servidor local aislado.
- Navegador: login ficticio, creación de proyecto, subida y apertura de archivo como miembro, cliente y obra. Exportación e importación confirmada de una copia ficticia verificadas también en la base de datos, sin persistir enlaces firmados.
- Portales filtrados en servidor y función portal-archivo desplegados solo en el clon. Archivos ocultos, tokens inválidos, portal desactivado y referencias ajenas rechazados. Descarga autorizada comparada; caducidad comprobada tras 65 segundos. RPC originales sin filtrar inaccesibles para clientes.
- calendario-ics recuperada del despliegue existente y probada en el clon con tres eventos ficticios: tokens inválidos y retirados rechazados.
- Realtime con conexiones reales: el miembro recibió cambios propios; la suscripción a otro estudio y la anónima no recibieron eventos durante la ventana observada.

## Pendiente antes de publicar

1. Coordinar todas las sesiones del piloto: guardar y conservar pendientes antes de cerrar voluntariamente clientes antiguos. No forzar recargas ni borrar caché.
2. Validar los flujos de acceso y correo que entren en esta entrega con una cuenta dedicada. Google Calendar queda fuera: el usuario confirma que nunca se conectó y decide posponerlo; recuperar sus fuentes o probar esa integración no bloquea esta actualización.
3. Completar la revisión funcional más amplia y de permisos por rol/campo. El aislamiento entre estudios no certifica todos los permisos financieros del CRM.
4. Coordinar SQL, funciones, cliente y privacidad de Storage según TRANSICION-PROTECCION.md. El bucket de producción sigue público; los resultados del clon no implican que producción ya tenga estas protecciones.

## Cambios candidatos

La RPC guardar-bloque-versionado comprueba membresía, bloquea la fila, exige versión y genera la fecha en servidor; PT409 evita reintentos internos incorrectos. El cliente mantiene conflictos y pendientes, valida la membresía y comprueba las copias antes de cargar la nube. Los visores firman las referencias existentes sin cambiarlas. El botón de actualización espera al guardado. El servidor local exige configuración aislada y separa su almacenamiento local.

## Copias programadas

La primera ejecución diaria se espera el 10 de septiembre a las 04:23 de Madrid; todavía no está acreditada por las pruebas manuales. Comprobar Actions y una carpeta con manifest.json y COMPLETE.json coherentes. No contar pruebas sintéticas como copias reales. No se ha creado un supervisor nuevo; canal, responsable y umbral siguen pendientes.

Las evidencias con datos, rutas operativas y credenciales permanecen fuera del repositorio público. Ninguna prueba equivale a garantizar ausencia absoluta de pérdida.
