# v3.35 — Aprobaciones por revisión y pedidos

## Qué incorpora

- Compras → Gestionar pedidos, o estancia → Compras y aprobaciones. Acceso comercial exclusivo del administrador, comprobado también en servidor.
- Preparar aprobación de cada producto. La instantánea incluye identidad, estancia, cantidad, precio de venta y características. Se solicita sobre datos ya guardados.
- Respuesta por portal a una revisión concreta, o registro manual con explicación de cómo se recibió. Queda identificado el canal; un registro del equipo no se presenta como respuesta del cliente.
- Cualquier cambio relevante invalida la aprobación anterior sin borrar su historial. Volver al contenido anterior no la reactiva. Los nombres repetidos no se usan como identidad.
- Solicitud de oferta a un proveedor, varias ofertas recibidas, selección de una oferta y borrador de pedido. El pedido debe conservar la ficha aprobada antes de confirmarse.
- Recepciones parciales, límite de cantidades, historial de cada llegada y confirmación final. Idempotencia ante reintentos de red y control de versión ante dos personas.
- PDF de solicitud y pedido usando la impresión existente. Los importes del pedido son de compra, en euros y sin impuestos, separados de precios de venta. El equipo entrega el PDF al proveedor por su canal habitual: no se envían correos ni se realizan pagos automáticamente.
- Identidad de secciones al preparar referencias y al crear/copiar. Preparación compatible de artículos antiguos cuando el administrador utiliza las operaciones; no hay reescritura masiva al cargar.
- Respuestas históricas por nombre permanecen en el historial y ya no se reaplican a productos. Las decisiones nuevas del portal utilizan el servicio de revisiones.

## Persistencia y permisos

SQL/operaciones-producto.sql añade app_operaciones y app_operacion_eventos. RLS activo, sin acceso directo para anon/authenticated. Operaciones comerciales por RPC autenticada con rol admin. Portal por token activo, proyecto exacto, estancia en modo aprobación, producto único y revisión vigente. No se devuelven costes, proveedor ni notas internas al portal.

El disparador de datos_estudio solo invalida aprobaciones del nuevo registro ante cambios del proyecto. No modifica el JSON original ni los documentos contables. La operación, su versión y el evento se guardan en una transacción. El identificador de intento se reutiliza mientras se reintenta una respuesta incierta en la sesión; tras cerrar, consultar el historial antes de repetir una llegada manual.

Las tablas nuevas forman parte de las copias de base de datos; la copia externa de Storage sigue siendo independiente. Restaurar solo datos_estudio no constituye una restauración completa: incluir ambas tablas nuevas y sus funciones/disparador. No borrar el registro al revertir la interfaz.

## Arranque y publicación

No hay dependencias nuevas. El servidor local existente usa la URL y la clave pública del clon, nunca credenciales administrativas. Ejecutar `node --test scripts/*.test.mjs`.

1. Verificar los contratos app_rol, portal_campos, portal_estudio y portal_cliente_escribe del entorno destino contra el clon probado.
2. Generar paquete con `node scripts/build-product-ops-release.mjs ruta.sql`.
3. Aplicar primero el paquete SQL. Bloquea brevemente escrituras de datos_estudio, falla en 5 segundos si no puede obtener el bloqueo y compara el contenido completo de los bloques y el recuento de archivos antes/después. Cualquier diferencia detectada antes de COMMIT revierte la instalación. No ejecuta operaciones de prueba en producción.
4. Publicar recursos JS/CSS antes del HTML con el workflow habitual.
5. Verificar despliegue y contenido público. Mantener la protección de cambios sin guardar; no forzar recargas.

## Validación

182 pruebas locales correctas. Ensayo transaccional en el clon con 20 comprobaciones SQL y ROLLBACK: permisos, instantánea sin datos internos, productos homónimos, confirmación sin aprobación rechazada, recepción excesiva rechazada, parcial/completa, reintento idempotente, versión antigua, token inválido, cambios A→B→A y rechazo de decisiones antiguas por nombre.

Prueba de interfaz con cuenta y proyecto ficticios del clon: preparar aprobación, respuesta desde portal sin sesión de administrador, solicitud, oferta, borrador, confirmación, dos recepciones parciales y consulta de historial. Escritorio y marco de 390 px: modal de 366 px sin desbordamiento horizontal. PDFs: contenido probado con datos ficticios, escape y separación de precios; reutiliza el diálogo de impresión de la app.

## Reversión

Desactivar accesos al módulo si aparece una incidencia; conservar ambas tablas, los eventos y la invalidación de revisiones. No restaurar una base antigua encima de trabajo nuevo. La versión anterior no conoce estos registros: conservar el lector/RPC nuevo para recuperar su historial. No reactivar decisiones por nombre como atajo.

## Límites de esta versión

Es una gestión manual de aprobaciones y compras con registro en servidor. No incluye correo automático a proveedores, impuestos de pedidos, pagos, devoluciones, varias divisas ni integración automática con facturas; tampoco catálogo público o conectores CAD/BIM. Las integraciones futuras continúan fuera del alcance acordado. Los datos antiguos conservan su formato hasta una operación autorizada; referencias ambiguas se detienen y no se adivinan.

## Publicación verificada — 11 septiembre 2026

- Aplicación: aed3cb850a38d45cc877700a732661018881cf82.
- Despliegue: https://github.com/estudiomoderno/moderno.app/actions/runs/34537483465 — completado correctamente.
- Paquete SQL instalado en producción antes del HTML. Comprobación transaccional: bloques intactos, inventario de archivos intacto y RLS activo. No se copiaron registros ficticios a producción.
- Funciones base de permisos/portal idénticas entre clon y producción antes de instalar (comparación de sus cuerpos).
- Reinstalación del paquete en clon comprobada, con datos y archivos conservados.
- index.html, appearance-b.css, specifications.js y product-operations.js: HTTP 200 y contenido idéntico al candidato, normalizando finales de línea.
- Comprobación de rutas de producción sin datos reales: token inexistente devuelve lista vacía; visitante anónimo recibe rechazo de acceso a operaciones comerciales.
- Revisión visual en escritorio, modo oscuro y marco móvil de 390 px. El flujo completo de prueba utilizó exclusivamente el estudio ficticio del clon.

## Recuperación comprobada — 11 septiembre 2026

Ensayo aislado posterior a la publicación: estructura de la base restaurada, recuperación lógica idéntica de tres operaciones y ocho eventos ficticios con ROLLBACK, y 121 archivos recuperados y releídos byte a byte. Identificadores y propietarios conservados; bucket privado y cero archivos adicionales. No se modificó producción. Alcance y límites en BACKUP-SETUP.md: la copia física no contenía operaciones y este ensayo no valida todas las integraciones de un entorno nuevo.
