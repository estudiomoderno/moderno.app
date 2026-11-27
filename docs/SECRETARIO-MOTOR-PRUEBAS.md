# Pruebas del Secretario de Moderno.app

La revisión parte de `61a0c09`. El diagnóstico se reprodujo antes del planificador. La ruta general de facturas perdía «recibidas y pagadas» al pedir un proveedor. La ruta de importes comprobaba el nombre completo y podía volver a preguntar por un cliente que ya se había identificado por su nombre abreviado. El estado persistido ahora distingue la operación, los filtros y la aclaración pendiente.

Los ejemplos y las verificaciones de este documento usan exclusivamente datos ficticios. Las conversaciones del servidor pasan por el manejador HTTP real con RPC simuladas. Chromium ejecuta la interfaz y el OCR local. Las propuestas que dependen del modelo se comprueban con planes simulados. La evaluación del proveedor real y el acceso a la interfaz alojada siguen pendientes de evidencia.

## Resultados reproducibles

| Pregunta | Respuesta obtenida | Documentos o acción |
| --- | --- | --- |
| «que facturas quedan por que me pagen» | Tienes 3 facturas pendientes de cobro por 2.300 €. De ellas, 2 están vencidas. | `F-DEMO-001`, `F-DEMO-002`, `F-DEMO-003`. |
| «Solo las de este año» | De las emitidas en 2026, tienes 2 facturas pendientes por 1.500 €. Una está vencida. | `F-DEMO-001`, `F-DEMO-002`. |
| «¿Por qué aparece vencida?» con una factura enfocada | Está vencida porque su vencimiento es el 12/11/2026 y sigue pendiente de cobro. | `F-DEMO-001`. Mantiene el conjunto anterior para seguir consultando. |
| «Qué facturas he pagado de un proveedor» | ¿De qué proveedor? | La conversación conserva facturas recibidas y estado pagado. |
| «Qué he facturado con el cliente Amador» | Amador Estudio Demo. Hay 1200,00 € de facturación registrada. | Fuente vinculada a `F-AMADOR-001`. |
| Seleccionar `CL-GEM-B` tras una consulta con dos clientes homónimos | Una factura pendiente por 450 €. | Solo `F-GEM-002`, del cliente seleccionado. |
| «Ábrela» después de filtrar a una factura | Localiza `F-DEMO-001`. | Acción de lectura de `F-DEMO-001` con versión comprobada. |

Las fechas de las conversaciones nuevas se fijan en la prueba. En ejecución normal se calculan según la zona horaria de la sesión. Los importes de las tablas son resultados de las reglas existentes con las filas de prueba y pueden reproducirse con los comandos siguientes.

## Criterios de aceptación

«Cumple» en esta tabla indica evidencia con datos ficticios para el criterio indicado. La entrega completa requiere además la comprobación conectada, el modelo real y CI de la revisión enlazada al PR.

| ID | Estado | Resultado esperado y evidencia |
| --- | --- | --- |
| CA-01 | Cumple | Recibidas pagadas y emitidas pendientes se resuelven por separado. Se pregunta por proveedor cuando es imprescindible. [Búsqueda](../scripts/secretario-document-search.test.mjs) y [cobros](../scripts/secretario-receivables-guide.test.mjs). |
| CA-02 | Cumple | Nombre abreviado, homónimos y nombre ausente producen resolución, opciones o aclaración respectivamente. [Entidades](../scripts/secretario-entities.test.mjs) y [conversación 1](../scripts/secretario-conversation-motor.test.mjs). |
| CA-03 | Cumple | Cinco conversaciones de entre cinco y siete turnos comprueban continuidad, corrección, filtros, selección, apertura y cancelación. [Conversaciones](../scripts/secretario-conversation-motor.test.mjs). |
| CA-04 | Cumple | Cliente, proveedor, proyecto, emisión o vencimiento, estado y moneda se conservan y se quitan individualmente. Si la fecha de pago no está registrada, se explica el límite. [Búsqueda](../scripts/secretario-document-search.test.mjs), [cobros](../scripts/secretario-receivables-guide.test.mjs) y [pagos](../scripts/secretario-payables.test.mjs). |
| CA-05 | Cumple | Saldo parcial, recuento, totales de todas las páginas, monedas y registros contradictorios se comprueban con evidencia exacta. [Cálculos](../scripts/secretario-receivables-guide.test.mjs) y [conversación 2](../scripts/secretario-conversation-motor.test.mjs). |
| CA-06 | Cumple | El ordinal se vincula al resultado visible. La versión actual, el PDF adjunto y el envío sin acreditar tienen respuestas distintas. [Conversación 3](../scripts/secretario-conversation-motor.test.mjs) y [Chromium](../scripts/secretario-browser.test.py). |
| CA-07 | Cumple | Texto, selección y referencia estable se contrastan con el catálogo autorizado. Se prueban teclado, puntero y retirada de la referencia. [Selector](../scripts/secretario-mentions.test.mjs), [entidades](../scripts/secretario-entities.test.mjs) y [Chromium](../scripts/secretario-browser.test.py). |
| CA-08 | Cumple | Extracción efectiva de un PDF con texto, uno escaneado y una imagen, con prueba de procedencia y página ausente. [OCR en Chromium](../scripts/secretario-attachments-browser.test.py) y [respuesta HTTP](../scripts/secretario-attachment-sources.test.mjs). |
| CA-09 | Bloqueado | Se ejercitan carga, selección mediante archivo privado ficticio, cancelación, reintento y eliminación de duplicados. Falta comprobar la descarga firmada de un archivo existente con sesión real en Moderno Prueba. [OCR y ciclo](../scripts/secretario-attachments-browser.test.py). |
| CA-10 | Bloqueado | El dictado usa el mismo compositor y permite revisar, detener, cancelar y recuperar errores. Se comprobó con reconocimiento simulado. Falta audio real con el idioma local disponible. [Ciclo de dictado](../scripts/secretario-dictation.test.mjs) y [Chromium](../scripts/secretario-browser.test.py). |
| CA-11 | Bloqueado | Se comprueban preparación y revisión en el editor existente, impuestos de la app, edición pendiente y avisos de guardado mediante planes simulados. Falta el recorrido con el modelo real. [Validación](../scripts/secretario-backend.test.mjs) y [editor](../scripts/secretario-browser.test.py). |
| CA-12 | Cumple | Resultados en el centro, documento abierto con chat lateral, vuelta a la misma conversación y continuidad del compositor. [Chromium](../scripts/secretario-browser.test.py). |
| CA-13 | Cumple | Los casos deterministas devuelven una conclusión breve con la cifra o las tarjetas pedidas, incluyendo reformulaciones. [Conversaciones](../scripts/secretario-conversation-motor.test.mjs). La redacción del modelo real se evalúa aparte. |
| CA-14 | Cumple | Fallo de lectura, sin resultados, cancelación, contexto cambiado, permisos y cuotas producen salidas diferentes. [Errores conversacionales](../scripts/secretario-conversation-motor.test.mjs), [HTTP](../scripts/secretario-backend.test.mjs) y [Chromium](../scripts/secretario-browser.test.py). |
| CA-15 | Bloqueado | Dos actores y dos estudios ficticios validan el contrato de adjuntos y el aislamiento del servidor con RPC simuladas. Falta comprobar la sesión conectada para todas las operaciones. [Aislamiento](../scripts/secretario-attachment-sources.test.mjs) y [RLS ficticia en CI](../scripts/build-secretary-runtime-checks.mjs). |
| CA-16 | No cumple | En Moderno Prueba se observó `daily_remaining = null`, 200 reservas mensuales por usuario y estudio y 200 globales, renovadas el día 1 a las 00:00 UTC. Las operaciones locales omiten la reserva y una repetición con la misma clave se bloquea dentro de la misma instancia. La idempotencia entre instancias y el límite diario de 100 siguen pendientes. [Pruebas de cuota](../scripts/secretario-backend.test.mjs). |
| CA-17 | Bloqueado | Se ejercita la interfaz a 1440 y 390 píxeles. Falta validar audio real en escritorio y móvil y la sesión conectada. [Chromium](../scripts/secretario-browser.test.py). |
| CA-18 | Cumple | Suite de regresión de cálculos, visor, permisos y protección de cambios de editor con datos ficticios. [Validación](../scripts/secretario-backend.test.mjs) y [Chromium](../scripts/secretario-browser.test.py). |
| CA-19 | Cumple | Inventario por módulo con alcance y evidencia. [Inventario](SECRETARIO-INVENTARIO-CAPACIDADES.md). |

## Reproducción

```sh
node --test scripts/*.test.mjs
python scripts/secretario-browser.test.py /tmp/secretario-capturas
python scripts/secretario-attachments-browser.test.py /ruta/pdfjs-dist-3.11.174/build
```

El flujo de Chromium requiere Playwright, y el de OCR también Pillow y el lector PDF fijado en CI. [Flujo reproducible](../.github/workflows/secretario-browser.yml).

La correspondencia con el documento funcional cubre los cien casos como catálogo de escenarios. Su cobertura directa, parcial y pendiente queda registrada en el [anexo](SECRETARIO-MOTOR-ANEXO.md).
