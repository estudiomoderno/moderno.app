# Catálogo v3.46

Plantilla es-ES-2026.09.11-1 revisada el 11 de septiembre de 2026. Consultar el registro privado de la operación para confirmar el estado de cada entorno: publicar código no sustituye por sí solo ningún catálogo existente.

## Contenido

Revisión de 8 libros, 1.251 filas y 1.124 partidas originales, cuyos precios estaban vacíos. Resultado: 1.068 partidas (57 fusiones conservando variantes, 11 exclusiones y 12 adiciones), 290 habituales y 778 extras.

976 precios son estimaciones editoriales netas en EUR; 92 partidas requieren medición. Las referencias contrastan órdenes de magnitud, no cotizaciones individuales. Los rangos son escenarios orientativos, no intervalos estadísticos. Coste desconocido permanece vacío. Servicios y partidas están en Catálogo; productos, en Biblioteca.

Originales, auditoría, workbook y copia del estudio permanecen privados, fuera de Git. Solo la plantilla inicial curada es pública.

## Conservación y permisos

Las líneas nuevas guardan descripción, capítulo, unidad y precio propios. Las antiguas siguen resolviendo referencias mediante registros archivados. Eliminar una partida la oculta del selector conservando esos registros.

Cambiar un precio ofrece «Solo este documento» y «Actualizar catálogo del estudio», sin preselección. Solo un administrador puede elegir la segunda. Se aplica al guardar realmente el documento mediante el lote versionado existente; cancelar no modifica el catálogo. Se rechazan precios desactualizados, unidades incompatibles, cambios de estudio y precios contradictorios del mismo ID. Nunca se vincula una actualización por nombre.

app_catalogo_inicial inicializa una sola vez los estudios registrados por el trigger después de instalar el esquema. Excluye estudios anteriores y catálogos personalizados. No vuelve a rellenar un catálogo borrado ni sustituye personalizaciones al actualizar.

app_catalogo_reemplazar requiere administrador, plantilla activa, revisión de config y UUID de operación. Conserva config previo en una tabla privada dentro de la misma transacción. Solo cambia los tres campos del catálogo, mantiene antiguos IDs archivados y rechaza colisiones. app_catalogo_restaurar restaura solo esos campos y exige que no haya ninguna revisión posterior de config. Si existen cambios posteriores, hay que conciliarlos; nunca forzar una versión antigua.

## Verificación

- 269 pruebas Node correctas: elección de precio, cancelación, roles, cambio de estudio y selección desactualizada incluidos.
- 24 comprobaciones PHP de autorización correctas, sin enviar correo.
- 19 comprobaciones SQL en recuperación sobre inicialización, permisos, concurrencia y recuperación; transacción revertida.
- Ensayo adicional con las 1.068 partidas: sustitución correcta, otros bloques intactos y restauración exacta; transacción revertida.
- Checksum PostgreSQL de items::text de la plantilla completa: cb33b6c3f5185e3d47fecec60e0449a1. Control de igualdad entre entornos, no firma de seguridad.
- Ensayo visual local ficticio: búsqueda por código y edición de precio reflejada, sin errores de consola.

## Continuar desde otro ordenador

1. Clonar el repositorio, consultar la puesta en marcha general y ejecutar `node --test scripts/*.test.mjs` con Node 24. No hay dependencias nuevas.
2. Generar SQL con `node scripts/build-catalog-editor-release.mjs <carpeta-privada>`. Ejecutar en orden 00-schema, 01-items a 06-items y finalmente 99-activate. Cada bloque es idempotente y rechaza contenido divergente; la plantilla permanece inactiva hasta completarse. Cada paso comprueba conservación de bloques de datos e inventario de archivos.
3. Ensayar primero en recuperación. scripts/sql/catalogo-integracion.sql necesita la cuenta ficticia del clon y debe envolverse en una transacción que termina con ROLLBACK. Nunca crear esa cuenta en producción para hacer pasar el ensayo.
4. Confirmar checksum y 1.068 partidas antes de publicar. GitHub ejecuta pruebas y publica recursos antes de index.html.
5. Sustituir un estudio existente es una operación separada: verificar pertenencia, exportar config privado, conservar revisión/hash, asignar UUID de operación y comprobar conservación de documentos, Biblioteca, otros estudios y archivos dentro de la transacción. Destino y comprobantes están en el dossier privado, nunca en Git.

Una versión futura de la plantilla no debe sobrescribir estudios inicializados. Correo y otras integraciones quedan fuera de esta modificación.

## Publicación confirmada

v3.46 publicada el 11 de septiembre de 2026, commit f9e0d003d2b6af069920042c33d8063fe0d8e9f0. GitHub Actions 34627932427 terminó correctamente. Verificados HTTP 200, versión y módulos servidos desde app.moderno.app.

Aplicada la sustitución únicamente al estudio autorizado: 1.068 partidas activas y 54 anteriores archivadas. La transacción confirmó conservación de todos los demás bloques, campos ajenos de config e inventario completo de archivos. Copia previa externa y copia atómica privadas verificadas. Comprobados inicio de sesión existente, búsqueda, apertura y cancelación de edición en la app publicada, sin modificar precios de producción ni errores de consola.
