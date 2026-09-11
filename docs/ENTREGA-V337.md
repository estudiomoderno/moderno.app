# v3.37 — Fichas, presupuestos e instalación

Estado: funciones instaladas y verificadas en producción; publicación de interfaz pendiente de confirmar.

## Recorrido

Desde el proyecto, «Generar presupuesto» copia una línea por ficha visible, agrupada por estancia. Desde el editor se pueden seleccionar fichas del proyecto. Ambas entradas conservan identidad del estudio, proyecto y producto, cantidades y una copia de sus características y precio. Cambiar la ficha después no recalcula el documento. Las líneas históricas no se migran. No se permiten asociaciones con otro proyecto mientras se mantienen estas líneas.

El administrador ve en compras los presupuestos que contienen referencias a la misma ficha. Es una consulta de documentos existentes, no una versión sellada del presupuesto dentro del pedido. Aceptar un presupuesto no aprueba automáticamente productos ni confirma compras; la revisión aprobada del producto sigue siendo independiente.

Las solicitudes admiten cantidades parciales. Confirmar un pedido suma lo ya confirmado para el mismo producto en todas las solicitudes y rechaza sobrepasar su cantidad actual aprobada. Una devolución conserva la cantidad reservada del pedido para poder recibir reposiciones. Los pedidos anteriores no se recalculan.

Se registran cantidades instaladas y retiradas, con explicación e historial. No se instala más de lo recibido disponible ni se devuelve material todavía instalado. Estos movimientos no registran pagos ni alteran importes. El resumen de Compras utiliza el registro de pedidos y separa unidades distintas; las etiquetas manuales de fichas se identifican como seguimiento manual.

## Validación

- 213 pruebas Node correctas. Incluyen copias de documentos independientes, identidad del proyecto, importes inválidos, pérdida de red y reintento con el mismo identificador, y respuestas atrasadas del resumen.
- 26 comprobaciones SQL correctas en el clon recuperado, terminadas con ROLLBACK: cantidades acumuladas, pedidos parciales, recepciones, versiones, idempotencia, instalación, retirada, devolución y conservación del pago. Se prueban permisos reales de colaborador, Gestoría, cliente y contratista y proyecciones sin costes ni datos de compras.
- Recorrido de interfaz con cuenta y estudio ficticios: estancia, producto, Board, aprobación manual identificada como tal, presupuesto aceptado de 242 EUR, solicitud parcial, oferta y pedido de 72,60 EUR, recepción e instalación de una unidad. Dos sesiones intentaron recibir la misma unidad: la segunda fue rechazada por versión antigua.
- Visualización de compras y pedido a 390 px sin desbordamiento horizontal observado. No equivale a probar todos los dispositivos.
- La prueba de ausencia de red de esta entrega es automatizada; no se ha interrumpido una sesión del equipo real. Las comprobaciones anteriores de archivos privados y recuperación de 121 archivos están documentadas en las entregas previas, no se presentan como una nueva restauración.
- Tras cambiar el producto de 100 EUR/Roble a 150 EUR/Metal y guardarlo, el presupuesto conservó 100 EUR/Roble y total 242 EUR; el pedido conservó 72,60 EUR y la instalación. La aprobación anterior se mostró como ficha modificada.
- Reinstalación del paquete en el clon: datos, pedidos, historial e inventario de archivos conservados.
- Las siete huellas de funciones de producción comparadas coinciden con la base del clon previa a los cambios.

## Instalación y reversión

Ejecutar `node scripts/build-purchase-finance-release.mjs <destino.sql>` para generar la instalación transaccional de ambas funciones. Verifica antes/después el contenido de datos, pedidos e historial y el inventario de archivos; no es una nueva copia binaria de los archivos. El bloqueo tiene límite de cinco segundos. No ejecutar `scripts/sql/recorrido-base.sql` ni el ensayo generado en producción.

Publicar recursos antes de index.html mediante el flujo existente de GitHub Actions. No forzar recargas. Para retirar la interfaz nueva, conservar las funciones y registros nuevos: restaurar una base antigua destruiría movimientos posteriores. La versión anterior puede seguir leyendo registros; no eliminar los campos de instalación ni sus eventos.

## Servidor instalado

11 de septiembre de 2026: el paquete terminó en producción con datos_intactos, pedidos_intactos, historial_intacto y archivos_intactos en true. No se ejecutaron registros de ensayo en producción. La entrada directa «Generar presupuesto» se verificó después con el candidato local: proyecto asociado, precio nuevo 150 EUR, acabado Metal y total 363 EUR; el anterior conserva 242 EUR.

## Pendientes ajenos a esta entrega

El endpoint de correo de invitaciones sigue pendiente de validar sesión e invitación existente. El SMTP operativo no soluciona esa autorización. Google Calendar continúa aplazado. Sin cambios en Web, Panelcontrol, pagos bancarios ni envíos a proveedores.
