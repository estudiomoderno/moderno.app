# Ajustes y equipo v3.53

## Cambios

- Un único botón inferior «Guardar cambios», sin barra fija. Al salir con cambios reales: guardar, descartar o cancelar. Guardar y salir espera confirmación; un error conserva el formulario. La comparación fiscal normaliza números y series e ignora eventos de controles retirados del DOM.
- Un IBAN editable en Impuestos > Pagos por transferencia. `account.paymentIban` es el nuevo valor para documentos nuevos. Los campos anteriores `account.iban` y `emitter.iban` permanecen intactos; si difieren, se muestran las dos alternativas y se puede elegir o escribir una tercera. Guardar otros ajustes no escoge una cuenta en silencio.
- Cada documento nuevo guarda su `paymentIban`; editarlo conserva ese valor. Los documentos anteriores mantienen la ausencia del campo y su comportamiento de lectura anterior. Las proyecciones de portal y gestoría incluyen el nuevo dato. Un valor nulo de una proyección antigua mantiene el IBAN anterior; una cadena vacía explícita se conserva.
- Equipo consulta membresías verificadas, permite retirar miembros ordinarios con confirmación y ofrece roles persistentes con UUID, revisión y perfil de acceso. Se conservan la cuenta global, archivos, autoría y documentos. La protección de administradores es deliberadamente más estricta: esta pantalla no retira ni degrada ningún administrador, incluido el propio usuario.
- Los permisos disponibles son los perfiles efectivos actuales: colaborador, gestoría de solo lectura, contratista y cliente. Se pueden crear nombres propios y cambiar el perfil; no hay interruptores ficticios ni un editor de permisos arbitrarios por campo. Administrador sigue siendo un acceso especial protegido. El servidor controla los permisos mediante `app_rol_usuario`, que conserva el comportamiento legado cuando no hay UUID asignado.
- Las invitaciones guardan el UUID; un trigger lo copia durante la aceptación existente, antes de borrar la invitación. Renombrar o cambiar el perfil conserva las asignaciones. Un rol asignado a miembros o invitaciones no puede eliminarse. La invitación añade atómicamente la persona al directorio de tareas si no existía, sin reemplazar registros anteriores. El correo solo se envía al pulsar Invitar.
- Correo, rol e Invitar quedan separados en escritorio; se apilan en móvil. Las personas se muestran en bloques en pantallas estrechas.
- Flechas dobles del SVG del usuario en selectores, teléfonos, autocompletado, menús y desplegables. La flecha de volver usa exactamente `arrow-back-up.svg`. Las flechas de orden, navegación y variaciones económicas se mantienen.
- Web, Instagram y Facebook aceptan texto sin exigir URL. Se conservan literalmente y se escapan al mostrarlos; estos ajustes no generan enlaces ejecutables. Contacto guarda su propio `studioDetails.contactCountry`, independiente del país fiscal. Los espacios y «+ Añadir espacio de trabajo» tienen separación y ajuste móvil.

## Instalación y continuidad

1. Confirmar copia de archivos correcta. La comprobada el 12/09/2026 corresponde a Actions `34667956252`, terminada correctamente a las 02:35:31 UTC.
2. Aplicar `SQL/equipo-roles.sql` y `SQL/iban-documentos.sql` primero en el clon `szbswxpkhidywaosdfcg`.
3. Ejecutar `scripts/sql/team-roles-clone.sql` únicamente allí. Usa un usuario ficticio temporal y termina en ROLLBACK. No envía correos ni modifica archivos. Tiene una comprobación del estudio ficticio esperado.
4. Aplicar ambos SQL revisados en producción `cgqtylvaapwbuwqvpjtb`; no ejecutar el ensayo del clon en producción.
5. Publicar `app/` por el flujo existente: recursos antes que HTML. Los SQL no los ejecuta GitHub Actions.

Los scripts son aditivos respecto a los datos existentes. Las relaciones UUID impiden asignar un rol de otro estudio. El acceso directo a `app_roles` está revocado; su administración pasa por RPC con comprobación de administrador. El sistema actual tiene una sola membresía por cuenta; esta entrega no modifica esa restricción ni implanta múltiples estudios por cuenta.

Para volver a la interfaz anterior, publicar el código anterior sin borrar tablas ni columnas nuevas. Conservar los UUID y permisos activos: no volver automáticamente a la función de permisos legada ni eliminar roles asignados. Las funciones antiguas y los valores bancarios anteriores permanecen conservados; revisar cualquier reversión del servidor por separado.

## Verificación realizada antes de publicar

- 312 pruebas JavaScript; 24 comprobaciones PHP de autorización, sin correos enviados.
- 18 comprobaciones PostgreSQL aisladas con `scripts/team-roles-sql.mjs` y PGLite. Ejecución: `node scripts/team-roles-sql.mjs RUTA_A_PGLITE/dist/index.js`.
- Ensayo real en clon: aceptación mediante `unirse_al_estudio`, UUID conservado, perfil efectivo tras renombrar/cambiar, denegación de escritura y gestión de equipo a gestoría, denegación de acceso directo a roles, aislamiento entre estudios, protección de administrador, revocación y conservación de cuenta. ROLLBACK confirmado.
- En la app completa del clon: crear rol y verlo en el selector; guardar Impuestos y volver sin aviso de cambios; guardar y recargar texto con barra invertida, usuario de Instagram, texto libre de Facebook y país de contacto Portugal. Solo estudio y usuario ficticios.
- Gestoría y portal devuelven `paymentIban` en sus proyecciones, comprobado con JSON ficticio. Pruebas de guardado de documentos verifican que cambiar el valor predeterminado no modifica documentos anteriores.
- Revisión visual a 390 px en modo oscuro y medición en escritorio: controles de invitación de 44 px de alto, separados por 20 px; espacios de trabajo apilados sin solaparse. SVG de volver comprobado por sus trazados.

La publicación y su verificación HTTP se registrarán después de completarlas.
