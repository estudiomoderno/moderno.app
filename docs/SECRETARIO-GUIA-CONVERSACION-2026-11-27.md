# Comprobación de la guía de conversación del Secretario

Se aplicó la guía fechada el 27 de noviembre de 2026 a los recorridos de Finanzas en escritorio. Las pruebas usan documentos inventados y el reloj de Madrid fijado al 27 de noviembre de 2026. La función recibe las mismas estructuras que usa la aplicación y consulta copias en memoria de los bloques autorizados.

## Conversaciones comprobadas

| Pregunta o continuación | Resultado comprobado | Fuentes y acción |
| --- | --- | --- |
| «¿Qué me falta por cobrar?» → «Solo las de este año» → «Y de esas, las vencidas» → «Ábrela» → «¿Por qué pone 1.200 si me debe 800?» | 3 por 1.900 € → 2 por 1.400 € → 1 por 800 €. El detalle distingue 1.200 € de factura, 400 € de cobros y 800 € de saldo. | F-DEMO-01, 02 y 03 → 01 y 02 → 01. Se abre F-DEMO-01 en lectura al pedirlo. |
| «¿Qué facturas están sin pagar?» → «Las que tengo que pagar yo» → «Solo la de Lumen» → «Págalas» | Pregunta por la dirección del pago. Devuelve dos por 800 € y luego una por 300 €. Explica el límite al pedir el pago. | G-DEMO-01 y 02 → G-DEMO-01. Sin orden de pago. |
| «Haz un presupuesto para Ana, de Patio Demo, con cuatro visitas de obra» → «A 90 € cada una, antes de impuestos» → «¿Ya está guardado?» → revisión del borrador guardado | Pregunta por el precio. Prepara 4 × 90 € (360 €). Pide guardar en el editor. Al corregir a tres visitas en el borrador de prueba, prepara 3 × 90 € (270 €). | Ana, Patio Demo y la partida verificada. La propuesta usa el editor existente. |
| «Dime qué factura mandé a Alfonso Cerropuerta» → consulta del PDF → petición del adjunto enviado | Localiza F-DEMO-05 y explica que el estado «enviada» carece de confirmación de correo. El PDF adjunto está ausente en la prueba. | F-DEMO-05. Ofrece la versión actual o el recorrido de PDF del editor cuando corresponde. |
| «¿Cuánto llevamos gastado en Patio Demo este año?» → «Mejor los de Alba Demo» → «Y ahora la facturación» | 300 € en Patio → 500 € en Alba → Alba sin facturación registrada. El año 2026 se conserva. | G-DEMO-01 → G-DEMO-02 → sin facturas emitidas en ese ámbito. |

Las pruebas específicas añaden paráfrasis, cambios de dirección, cobros parciales, retenciones, divisas, homónimos, referencias duplicadas, fechas ausentes, paginación, permisos y cambios de versión concurrentes. Los 100 ejemplos de la guía son el catálogo de referencia. La matriz anterior refleja las cinco conversaciones completas reproducidas, junto con pruebas específicas de sus recorridos.

## Decisiones y límites

- «Abre Ventas» y «Abre Facturas» llevan a la sección de Ventas. Buscar o ver documentos devuelve tarjetas en el chat. Abrir un documento o una pantalla solicitada conserva la conversación en el lateral y permite volver.
- Las búsquedas de documentos muestran primero los más recientes, con 12 tarjetas por página y la fecha de emisión o registro visible cuando existe. El vencimiento calculado se identifica como tal. «Pronto» requiere confirmar el intervalo cuando no se indica.
- La vista actual de un documento se puede abrir desde su tarjeta. Si existe un PDF adjunto autorizado, se usa ese archivo. La exportación se hace en el editor con su opción existente. El estado «enviada» no acredita la entrega ni permite recuperar el adjunto exacto de un correo.
- Los pagos parciales a proveedores sin movimientos verificables quedan por revisar y se excluyen del saldo confirmado. El chat prepara propuestas para el editor nativo. La edición de un borrador guardado se limita a cantidades o precios de partidas identificadas, con comprobación de versión y de cambios sin guardar.

## Evidencia y reversión

- `scripts/secretario-guia.test.mjs` recorre A–E por el manejador de la función con RPC ficticios. Las búsquedas, los saldos y los filtros destacados se comprueban con consultas deterministas. Los turnos de planificación de borradores usan planes simulados y comprueban la evidencia de cada valor y el resultado del servidor.
- `scripts/secretario-browser.test.py` usa Chromium y respuestas de servidor interceptadas para verificar el flujo visual, las tarjetas, la apertura y el regreso a la misma conversación. Las capturas sintéticas se adjuntan a la comprobación de GitHub Actions.
- La evaluación del modelo real queda pendiente porque el acceso disponible no permite verificar el saldo y los controles de gasto vigentes. Las pruebas no envían solicitudes a OpenAI.
- Para revertir, desplegar el paquete de la función del commit anterior y revertir la publicación web. El cambio usa los bloques, permisos y editores vigentes y no exige revertir datos ni migraciones.
