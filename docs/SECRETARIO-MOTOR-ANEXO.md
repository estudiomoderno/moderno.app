# Trazabilidad de los cien casos de Finanzas

27 de noviembre de 2026. Los identificadores corresponden al Anexo A del [Diseño funcional del Secretario de Moderno.app](https://chatgpt.com/space/page_a087aa79ca4c81a48dad635115833f12). Cada fila indica qué comportamiento comprobar y dónde encontrar la prueba o la parte pendiente.

**Directa** indica que hay una aserción específica del comportamiento en los scripts enlazados. **Parcial** indica que existe una aserción relacionada y queda una parte de la situación por probar. **Pendiente** indica que se requiere un ensayo específico. La columna describe cobertura y por sí sola no acredita el resultado de una ejecución. Las pruebas usan registros ficticios y dobles locales del servidor o del navegador. La evaluación con el modelo real y la comprobación conectada en un entorno aislado siguen pendientes. Este anexo corresponde al candidato de trabajo y no certifica un despliegue.

## Inicio y orientación

Las pruebas cubren la lista inicial, los permisos de navegación y la continuidad al regresar. Quedan por ensayar los textos de bienvenida y la revisión inicial de pendientes.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| IN-01 | Saludo breve y sin lectura económica. | Pendiente. Asertar saludo y ausencia de lecturas en el handler. |
| IN-02 | Capacidades habilitadas para el rol que pregunta. | Pendiente. Asertar respuesta y capacidades visibles con roles distintos. |
| IN-03 | Últimas facturas en el centro, sin fechas obligatorias. | Parcial. Orden y lista de emitidas sin acción automática. Falta combinar Gastos y dirección ambigua. [Conversaciones][motor] [Escritorio][browser] |
| IN-04 | Navegación a Presupuestos, continuidad y guarda de cambios. | Parcial. Navegación financiera autorizada y guarda del editor probadas por separado. [Servidor][backend] [Escritorio][browser] |
| IN-05 | Regreso al centro con la misma conversación y resultados. | Directa. Cierre nativo y regreso conservan el hilo. [Escritorio][browser] |
| IN-06 | Resumen de vencidas y borradores realmente consultados. | Pendiente. Ensayar la combinación y la indicación de datos incompletos. |

## Facturas y archivos

La búsqueda local comprueba nombres, referencias, estado, fechas, paginación y acciones exactas. La prueba del archivo adjunto y la del visor tienen recorridos parciales con respecto al PDF de una factura histórica.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| DOC-01 | Cliente resuelto por una relación comercial registrada. | Parcial. Alias y coincidencias autorizadas cubiertos. Falta el nombre comercial en esta frase con el recorrido completo. [Documentos][docs] [Entidades][entities] |
| DOC-02 | Aclaración entre contactos posibles con filtros previos. | Directa. Candidatos autorizados y conservación del ámbito al refinar. [Documentos][docs] |
| DOC-03 | Factura exacta y aclaración si se repite la referencia. | Directa. Referencia y ámbito de marca. [Documentos][docs] [Entidades][entities] |
| DOC-04 | Última por emisión y tratamiento cuidadoso de empates o fechas que faltan. | Parcial. Orden y empates cubiertos. Falta un ejemplo de «la última» con fecha desconocida. [Documentos][docs] |
| DOC-05 | Localizar la factura de Alfonso y dejar el envío sin certificar. | Directa. [Guía de conversaciones][guia] |
| DOC-06 | Advertir que el estado disponible no acredita el correo. | Parcial. Se prueba que el envío no se certifica. Falta verificar la mención condicional de «enviada» cuando el estado está registrado. [Documentos][docs] [Conversaciones][motor] |
| DOC-07 | Abrir el PDF autorizado de la factura y desplazar el chat al lateral. | Parcial. Lectura de fuente privada y apertura lateral comprobadas en recorridos separados. Falta unir adjunto vinculado a factura, visor y chat. [Fuentes de adjuntos][asrc] [Escritorio][browser] |
| DOC-08 | Si el PDF no existe, ofrecer la factura actual. | Directa. Comprueba el aviso, la fuente exacta y la acción sin apertura inmediata. [Conversaciones][motor] |
| DOC-09 | La copia accesible no acredita la revisión enviada. | Directa. [Conversaciones][motor] [Guía de conversaciones][guia] |
| DOC-10 | Abrir el segundo resultado visible verificado. | Directa. Dos formulaciones, referencia, acción de lectura y conservación de contexto. [Conversaciones][motor] |
| DOC-11 | Descarga real o indicación del recorrido nativo de PDF. | Pendiente. El aviso de PDF ausente no prueba una descarga. |
| DOC-12 | Cliente y año de emisión en la misma consulta. | Directa. [Documentos][docs] |
| DOC-13 | Estado cobrada conservado al filtrar y refinar. | Parcial. Estado y filtros probados. Falta combinar ese listado con estado de cobro contradictorio. [Documentos][docs] [Cobros][cobros] |
| DOC-14 | Ver las páginas con filtros, recuento total y orden estable. | Directa. Contrato de página y botón para ampliar resultados. [Documentos][docs] [Escritorio][browser] |

## Pendientes de cobro

Se comprueban dirección, filtros, saldos por factura, retenciones, divisas y registros dudosos. La prueba de contradicción al preguntar por una sola factura aún cubre solo parte de la experiencia.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| COB-01 | Listado y saldo correcto sin otros indicadores financieros. | Directa. [Cobros][cobros] [Guía de conversaciones][guia] |
| COB-02 | Entender «que facturas quedan por que me pagen». | Directa. Incluye consulta inicial y continuidad por aclaración. [Cobros][cobros] |
| COB-03 | Añadir año de emisión a pendientes. | Directa. [Cobros][cobros] [Guía de conversaciones][guia] |
| COB-04 | Solo vencidas, conservando filtros y origen de la fecha. | Directa. [Cobros de la guía][cobros-guia] [Conversaciones][motor] |
| COB-05 | Sustituir el estado por las que no han vencido. | Directa. [Cobros de la guía][cobros-guia] |
| COB-06 | Saldo del cliente con coincidencia comprobada. | Directa. [Cobros de la guía][cobros-guia] |
| COB-07 | Desglose de la factura actual con cobro parcial y retención. | Directa. [Cobros de la guía][cobros-guia] |
| COB-08 | Explicar la diferencia entre 1.200 € emitidos y 800 € pendientes. | Parcial. Desglose comprobado. Falta una acción específica de apertura del cobro registrado. [Guía de conversaciones][guia] [Cobros de la guía][cobros-guia] |
| COB-09 | Cobros por fecha de registro y sus fuentes. | Parcial. Métrica, fuente y fechas cubiertas. Falta una conversación que combine cobros sin fecha e ingresos emitidos en otro periodo. [Conversaciones][motor] [Servidor][backend] |
| COB-10 | Reconsultar el cliente ante una pregunta que presupone cero. | Directa. [Cobros de la guía][cobros-guia] |
| COB-11 | Mayor saldo por identidad y moneda, con empates. | Directa. [Cobros de la guía][cobros-guia] |
| COB-12 | Advertir que una factura marcada cobrada tiene datos contradictorios. | Parcial. Cálculo contradictorio y aviso cubiertos. Falta verificar la fuente de esa factura al pedir su estado. [Cobros][cobros] |
| COB-13 | Diferenciar saldo confirmado y registros que requieren revisión. | Directa. [Cobros de la guía][cobros-guia] |

## Pendientes de pago

El proveedor se contrasta con el catálogo o documento autorizado. El contrato mantiene el aviso por pagos parciales y las acciones de lectura.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| PAG-01 | Facturas recibidas pendientes verificadas, con saldo y exclusiones. | Directa. [Pagos][pagos] |
| PAG-02 | Cambiar de cobros a pagos sin conservar el cliente como proveedor. | Directa. [Pagos][pagos] [Guía de conversaciones][guia] |
| PAG-03 | Deuda de un proveedor y aclaración ante homónimos. | Directa. [Pagos de la guía][pagos-guia] |
| PAG-04 | Vencidas del proyecto. | Parcial. Filtros por proyecto y vencimiento probados. Falta comprobar en ese turno la indicación de registros sin fecha confirmable. [Pagos][pagos] |
| PAG-05 | Aclarar un intervalo concreto cuando se pide «pronto». | Directa. [Pagos de la guía][pagos-guia] |
| PAG-06 | Refinar a euros sin ampliar los demás filtros. | Directa. [Pagos de la guía][pagos-guia] |
| PAG-07 | Señalar el límite de cálculo de un pago parcial de proveedor. | Directa. [Pagos de la guía][pagos-guia] |
| PAG-08 | Estado verificado de la factura de proveedor actual. | Directa. [Pagos de la guía][pagos-guia] |
| PAG-09 | Gastos registrados por periodo con sus fuentes. | Parcial. Métrica y cambios de ámbito comprobados. Falta un ejemplo mensual que incluya gastos con distintos estados de pago. [Conversaciones][motor] [Guía de conversaciones][guia] |
| PAG-10 | No ordenar pagos ni cambiar el estado de la factura. | Directa. [Guía de conversaciones][guia] |

## Presupuestos

Se comprueban estados y vínculos almacenados. La revisión que vio el cliente requiere una fuente que vincule la aceptación con el archivo exacto.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| PRE-01 | Buscar presupuestos por cliente sin requerir proyecto. | Directa. [Servidor][backend] [Documentos][docs] |
| PRE-02 | Listar solo los pendientes de aceptar y conservar estado. | Directa. [Documentos][docs] |
| PRE-03 | Presupuestos aceptados por fecha de documento. | Parcial. Estado y fechas de documento cubiertos. Falta un turno explícito que contraste fecha de documento y fecha de aceptación. [Documentos][docs] |
| PRE-04 | Conservar estado rechazado en seguimiento o resultado vacío. | Parcial. Estado exacto incluido en los escenarios de búsqueda. Falta seguimiento que termine vacío con ese estado. [Documentos][docs] |
| PRE-05 | Sumar presupuestos aceptados por moneda con fuentes. | Directa. [Documentos][docs] [Servidor][backend] |
| PRE-06 | Confirmar estado de una referencia exacta. | Parcial. Estado y referencia exactos cubiertos por separado. Falta el turno de confirmación. [Documentos][docs] |
| PRE-07 | Localizar la factura solo mediante vínculo almacenado. | Directa. Con vínculo y sin vínculo. [Documentos][docs] |
| PRE-08 | Retomar un borrador guardado identificable o aclarar cuál. | Directa. [Servidor][backend] |
| PRE-09 | Distinguir versión actual y revisión aceptada. | Parcial. Cubierto el límite sin revisión acreditada. Pendiente la variante positiva con registro verificable. [Documentos][docs] |

## Preparación y revisión

Se validan propuestas con el contrato de los editores existentes. Los casos de impuestos incluidos y facturación parcial comprueban que se deriva al editor. Los cambios de composición requieren sus propias pruebas de alcance.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| BOR-01 | Conservar cliente y preguntar únicamente por las partidas que faltan. | Parcial. Se prueban identidad del cliente y aclaraciones de propuesta. Falta el caso de factura sin partidas con cliente ya resuelto. [Servidor][backend] |
| BOR-02 | Conservar proyecto y cuatro visitas, y pedir precio. | Directa. [Guía de conversaciones][guia] [Continuidad de borradores][drafts] |
| BOR-03 | Completar cuatro unidades a 90 € antes de impuestos. | Directa. [Guía de conversaciones][guia] [Continuidad de borradores][drafts] |
| BOR-04 | Usar tarifa de catálogo verificada, o aclarar variante o cantidad. | Directa. Identificación, variantes y aclaración de cantidad. [Servidor][backend] |
| BOR-05 | Derivar al editor el precio final con impuestos. | Directa. [Continuidad de borradores][drafts] |
| BOR-06 | Mantener 12,5 m² y precio unitario de 40 €. | Directa. [Continuidad de borradores][drafts] |
| BOR-07 | Retomar únicamente el borrador guardado que corresponde. | Directa. [Servidor][backend] |
| BOR-08 | Cambiar de cuatro a tres visitas en la línea exacta de un borrador guardado. | Directa. Se conservan las demás propiedades de la línea. [Guía de conversaciones][guia] [Continuidad de borradores][drafts] |
| BOR-09 | Cambiar precio unitario de la línea elegida y conservar cantidad. | Directa. [Continuidad de borradores][drafts] [Servidor][backend] |
| BOR-10 | Proteger cambios en memoria de un borrador abierto. | Directa. Guarda nativa, incluido el cierre desde el chat. [Interfaz][frontend] [Escritorio][browser] |
| BOR-11 | Ofrecer el editor para añadir o quitar partidas. | Parcial. Contrato restringido a cantidad y precio. Falta afirmar el aviso de ambas peticiones. [Interfaz][frontend] [Servidor][backend] |
| BOR-12 | Preparar la factura desde el presupuesto preservando datos y reglas. | Directa. [Servidor][backend] [Interfaz][frontend] |
| BOR-13 | Presupuesto ya facturado, sin segunda propuesta automática. | Parcial. Verificación del vínculo existente y fuente. Falta el turno «Vuelve a facturar» y comprobar ausencia de propuesta. [Documentos][docs] |
| BOR-14 | Derivar facturación del 30 % al editor. | Directa. [Continuidad de borradores][drafts] |

## Economía de estudio y proyecto

Se prueban las cifras que proceden de documentos y movimientos, sus ámbitos y sus monedas. La prueba de una consulta de beneficio no debe tratar costes sin verificar como cero.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| RES-01 | Resumen breve de cobrado, pendiente y costes registrados. | Directa. Ámbito, métricas exactas y fuentes. [Conversaciones][motor] |
| RES-02 | Cifra y fuentes de facturación del año. | Parcial. La métrica y el periodo se comprueban. Falta el aviso de factura sin movimiento vinculado en ese turno. [Conversaciones][motor] [Guía de conversaciones][guia] |
| RES-03 | Distinguir presupuestado y aceptado en un proyecto. | Parcial. Hay pruebas de métricas y cambio de ámbito por separado. Falta la combinación solicitada. [Servidor][backend] [Guía de conversaciones][guia] |
| RES-04 | Costes registrados del proyecto actual y sus fuentes. | Directa. [Guía de conversaciones][guia] [Conversaciones][motor] |
| RES-05 | Diferencia contable o explicación de los límites de la medida. | Pendiente. Probar coincidencia de ámbito y moneda antes de presentar la comparación. |
| RES-06 | Indicar carencias de costes según la evidencia disponible. | Pendiente. Probar por separado ausencia demostrada e integridad desconocida. |
| RES-07 | Saldo bancario no disponible, con alternativa de lectura contable. | Pendiente de una aserción específica del límite y de que no se dispara un cálculo bancario. |
| RES-08 | Un total por divisa en un seguimiento de resultados. | Directa. [Servidor][backend] [Conversaciones][motor] |
| RES-09 | Distinguir saldo actual de una reconstrucción histórica. | Pendiente de probar la respuesta de alcance y la ausencia de cifra histórica. |

## Previsión

Los datos de vencimiento tienen pruebas propias. La navegación a Previsión y los límites de las proyecciones requieren escenarios específicos.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| PRV-01 | Apertura expresa de Previsión con guardas nativas. | Parcial. Hay pruebas de navegación financiera y continuidad. Falta selector de Previsión en el recorrido. [Servidor][backend] [Escritorio][browser] |
| PRV-02 | Ofrecer Previsión sin convertirla en cobro confirmado. | Pendiente de ensayo específico. |
| PRV-03 | Filtrar por vencimiento y resolver dirección si hace falta. | Parcial. Fechas de vencimiento y desambiguación probadas por separado. [Cobros][cobros] [Pagos de la guía][pagos-guia] [Conversaciones][motor] |
| PRV-04 | Presupuestos aceptados sin proyección de saldo bancario. | Pendiente de ensayo específico. |
| PRV-05 | Señalar información insuficiente y ofrecer consulta de pendientes. | Pendiente de ensayo específico. |

## Seguimientos y aclaraciones

Hay pruebas de añadir, sustituir y eliminar filtros, cancelar, resolver una instrucción compuesta y validar las referencias antes de abrir.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| CON-01 | Añadir cliente manteniendo los otros filtros compatibles. | Directa. [Cobros de la guía][cobros-guia] |
| CON-02 | Cambiar de año, conservando lo demás y usando fecha de sesión. | Directa. [Cobros de la guía][cobros-guia] [Cobros][cobros] |
| CON-03 | Quitar solo cliente. | Directa. [Cobros de la guía][cobros-guia] |
| CON-04 | Limpiar filtros y conservar dirección y permisos. | Directa. [Cobros de la guía][cobros-guia] [Pagos de la guía][pagos-guia] |
| CON-05 | Añadir las que aún no vencen conservando el resto del ámbito. | Directa. [Cobros de la guía][cobros-guia] |
| CON-06 | Aclarar cliente o proyecto Casa Sol, con opciones concretas. | Directa. [Cobros][cobros] [Escritorio][browser] |
| CON-07 | Aclarar cobrar o pagar solo si falta la dirección. | Directa. [Conversaciones][motor] [Guía de conversaciones][guia] |
| CON-08 | Sustituir proyecto y conservar fecha, moneda o estado aplicables. | Directa. [Cobros de la guía][cobros-guia] [Guía de conversaciones][guia] |
| CON-09 | Cancelar sin escrituras ni respuesta tardía aplicable. | Directa. [Conversaciones][motor] [Escritorio][browser] |
| CON-10 | Mostrar el pendiente global y abrir únicamente una coincidencia inequívoca. | Directa. Incluye resultados ambiguos, filtros, opciones paginadas y datos dudosos. [Consulta y apertura][con10] |

## Ausencias, errores y límites

Las pruebas distinguen fallos de lectura, permisos, cambios concurrentes y cuotas simuladas. Quedan pendientes la cuota efectiva del entorno y varios casos completos de límite funcional.

| Caso | Comportamiento | Cobertura |
| --- | --- | --- |
| ERR-01 | Vacío limitado a los filtros consultados. | Parcial. Vacío y conservación de filtros cubiertos. Falta la continuación literal «¿No hay ninguna?» después del vacío. [Cobros][cobros] [Documentos][docs] |
| ERR-02 | Total verificable y aviso de registros excluidos. | Directa. [Cobros de la guía][cobros-guia] |
| ERR-03 | Error de lectura con reintento, sin tratarlo como un vacío. | Directa. Fallo y recuperación con fuentes al volver a consultar. [Conversaciones][motor] [Escritorio][browser] |
| ERR-04 | Distinguir lectura fallida, adjunto ausente y permisos perdidos. | Parcial. La lectura privada y el tratamiento de permisos están simulados. Falta el error del visor nativo de la factura. [Fuentes de adjuntos][asrc] [Navegador de adjuntos][abrowser] |
| ERR-05 | Motivo real de la cuota con navegación financiera disponible. | Parcial. Contrato 429, estados y mensajes probados localmente. Cuota activa de 100 consultas y renovación pendientes de comprobación conectada. [Servidor][backend] [Interfaz][frontend] |
| ERR-06 | Invalidar resultados y acciones con una versión caducada. | Directa. Permisos, revisión y reintento. [Servidor][backend] [Interfaz][frontend] [Cobros][cobros] |
| ERR-07 | Fallar por permisos sin revelar datos de otro estudio o proyecto. | Directa. [Servidor][backend] [Cobros][cobros] [Fuentes de adjuntos][asrc] |
| ERR-08 | Explicar el guardado y envío manual, con o sin propuesta. | Parcial. Propuesta y ausencia de guardado cubiertas. Falta el turno combinado «Guárdalo y envíaselo». [Guía de conversaciones][guia] [Escritorio][browser] |
| ERR-09 | Derivar cambios de estado y borrado al registro nativo. | Parcial. Acciones de escritura restringidas y pagos sin escritura. Falta probar cada petición de cobro y borrado. [Servidor][backend] [Guía de conversaciones][guia] |
| ERR-10 | Leer el plano cuando proceda y pedir medidas verificadas. | Parcial. Lectura, cobertura del archivo e instrucciones incrustadas comprobadas. Falta el turno de presupuesto y la respuesta por medidas ausentes. [Fuentes de adjuntos][asrc] [Navegador de adjuntos][abrowser] |

## Conversaciones completas y entradas de la ampliación

El Anexo B se reproduce en las cadenas A a E de [secretario-guia.test.mjs][guia]. Se cubren pendiente y apertura, corrección de dirección, propuesta y revisión de borrador, límites de envío y cambio de proyecto con periodo conservado. La cadena de envío prueba el límite sin adjunto. El caso con PDF sigue en DOC-07.

- Las cadenas nuevas comprueban direcciones, homónimos, fechas, referencias ordinales, cifras, cancelación y reintento. [Conversaciones][motor]
- Las menciones se verifican mediante selección, revisión de identidad y validación de la entidad en el servidor. [Selector][mentions] [Entidades][entities]
- La lectura de adjuntos usa archivos ficticios y comprueba texto, escaneos, estados y permisos simulados. [Contrato de adjuntos][attachments] [Fuentes de adjuntos][asrc] [Navegador de adjuntos][abrowser]
- El dictado se verifica con una interfaz de reconocimiento simulada, revisión del texto y envío manual. Queda pendiente el ensayo de audio real. [Dictado][voice] [Escritorio][browser]

## Comprobaciones locales del candidato

Los 16 archivos de pruebas Node enlazados en este anexo pasaron en una ejecución conjunta. La ejecución individual de `node scripts/secretario-conversation-motor.test.mjs` confirmó sus cinco conversaciones completas. Entre ellas, seleccionar el segundo cliente homónimo consulta únicamente `F-GEM-002`, por 450 € pendientes ficticios.

El guion de escritorio se ejecuta con `SECRETARIO_DESKTOP_ONLY=1 python3 scripts/secretario-browser.test.py` y sustituye el servidor financiero por respuestas ficticias. Para una prueba conectada y un enlace de vista previa hacen falta una conexión aislada verificada y un portal accesible. La evaluación con el modelo real también requiere verificar el presupuesto aplicable antes de llamar al proveedor. [Inventario y estado del entorno](SECRETARIO-INVENTARIO-CAPACIDADES.md)

[motor]: ../scripts/secretario-conversation-motor.test.mjs
[guia]: ../scripts/secretario-guia.test.mjs
[backend]: ../scripts/secretario-backend.test.mjs
[frontend]: ../scripts/secretario-frontend.test.mjs
[browser]: ../scripts/secretario-browser.test.py
[docs]: ../scripts/secretario-document-search.test.mjs
[entities]: ../scripts/secretario-entities.test.mjs
[cobros]: ../scripts/secretario-receivables.test.mjs
[cobros-guia]: ../scripts/secretario-receivables-guide.test.mjs
[pagos]: ../scripts/secretario-payables.test.mjs
[pagos-guia]: ../scripts/secretario-payable-guide.test.mjs
[drafts]: ../scripts/secretario-draft-continuity.test.mjs
[con10]: ../scripts/secretario-con10.test.mjs
[mentions]: ../scripts/secretario-mentions.test.mjs
[attachments]: ../scripts/secretario-attachments.test.mjs
[asrc]: ../scripts/secretario-attachment-sources.test.mjs
[abrowser]: ../scripts/secretario-attachments-browser.test.py
[voice]: ../scripts/secretario-dictation.test.mjs
