# v3.36 — Importes, pagos, devoluciones y facturas de proveedor

## Comportamiento

Compras → Gestionar pedidos → Pedidos → Importes, pagos y facturas. El administrador revisa el impuesto de cada línea, transporte y retención; los tipos no se presuponen. El servidor calcula en decimal, redondeando bases e impuestos por línea a dos decimales. La moneda de esta entrega es EUR. Los precios de venta y los importes históricos originales permanecen intactos.

Antes de confirmar desde la nueva interfaz se revisa la economía del pedido. Los pedidos antiguos sin esa información conservan sus valores y requieren revisión explícita para registrar movimientos. Un importe ya confirmado no se reescribe. Los cambios y su explicación se incorporan al historial.

- Pagos parciales o completos de transferencias ya realizadas, con fecha y referencia. No hay conexión bancaria ni envío de dinero.
- Devoluciones físicas limitadas a unidades recibidas disponibles. Las reposiciones posteriores descuentan las unidades devueltas al calcular lo pendiente de recibir.
- Abonos aceptados por el proveedor, independientes de la devolución física. Si hay dinero pagado de más, se muestra el saldo a recuperar.
- Reintegros de dinero recibido, limitados al saldo a recuperar. No se registran automáticamente al devolver unidades.
- Anulación de registros erróneos de pagos, reintegros y abonos con motivo e historial conservados. No revierte transferencias reales.
- Vínculos con gastos/facturas de proveedor existentes del mismo proyecto o sin proyecto. Se guarda una referencia con los valores de ese momento; no se modifica la factura, su estado ni la contabilidad. Se puede retirar el vínculo sin borrar el documento.
- PDF del pedido con base, impuestos, transporte, retención y total. Los pedidos anteriores sin economía revisada siguen identificando su total sin impuestos.

## Persistencia y protección

`SQL/pedidos-economia.sql` añade una RPC de administrador y un cálculo interno de saldos sobre el registro de operaciones existente. Reutiliza bloqueo por estudio, versión e identificador de intento: una respuesta incierta se puede reintentar sin duplicar pagos. Cada cambio y su evento se guardan en la misma transacción. Colaboradores y visitantes no obtienen permisos financieros nuevos.

La instalación no migra ni recalcula registros históricos. `scripts/build-purchase-finance-release.mjs` genera el paquete transaccional con comprobación completa de datos, operaciones e historial antes/después, además del inventario de archivos. El bloqueo falla en cinco segundos si el servicio está ocupado. Los clientes anteriores siguen usando sus funciones; no se fuerzan recargas ni se restaura una base antigua sobre datos nuevos.

## Validación del candidato

202 pruebas Node correctas. 25 comprobaciones SQL en el clon dentro de una transacción descartada: impuesto desconocido frente a cero, total decimal, transporte/retención, pago parcial/completo, idempotencia, versión antigua, sobrepago, límites de devolución/reintegro, reposición, correcciones, factura duplicada, contabilidad intacta y permisos. La reinstalación del paquete conservó datos, pedidos, historial y archivos del clon.

Interfaz de ensayo: acceso con cuenta ficticia, revisión de 120 EUR de base y 25,20 EUR de impuestos, confirmación de 145,20 EUR, pago parcial de 50 EUR, saldo pendiente de 95,20 EUR y vínculo de factura. Recepción de dos unidades y devolución de una sin alterar el saldo; abono posterior de 72,60 EUR deja 22,60 EUR pendientes. Recarga de la interfaz final confirma persistencia y controles de anulación. Las pruebas no utilizan cuentas ni transacciones reales.

## Instalación del servidor

El 11 de septiembre se instaló el paquete en producción. Inventario previo: 18 bloques, 1 operación, 2 eventos y 121 objetos. La transacción terminó con datos_intactos, pedidos_intactos, historial_intacto y archivos_intactos en true. No se ejecutaron registros de ensayo en producción. El despliegue de la interfaz se confirma por separado.

## Publicación confirmada

Interfaz publicada el 11 de septiembre de 2026 con el commit ee6fb79641e29fb98c2c02953461aac18e94a7e9. GitHub Actions terminó correctamente: https://github.com/estudiomoderno/moderno.app/actions/runs/34585008205. Los cuatro archivos modificados de app (index.html, product-operations.js, purchase-finance.js y appearance-b.css) devolvieron HTTP 200 y coincidieron con el contenido local, normalizando solamente finales de línea.

El despliegue repitió las pruebas antes de subir recursos y publicó index.html al final. No se forzaron recargas de sesiones existentes. GitHub avisó de acciones antiguas ejecutadas en Node 24; el trabajo terminó correctamente. Mantener esta actualización de dependencias como mantenimiento separado.

## Límites

Los movimientos de compras y los estados contables siguen siendo registros separados: vincular una factura no la marca pagada ni genera asientos nuevos. No incluye múltiples divisas, envío automático a proveedores ni pagos bancarios. El importe del abono lo confirma el equipo a partir del documento del proveedor; no se deduce automáticamente de las unidades devueltas.

Ante una incidencia, retirar los accesos nuevos de interfaz conservando la RPC, sus datos y el historial; no borrar la economía ni los movimientos registrados. Para recuperación del servicio ver RECUPERACION-SERVICIO.md y BACKUP-SETUP.md.
