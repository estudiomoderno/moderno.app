# Inventario verificable de capacidades del Secretario

Fecha de revisión: 27 de noviembre de 2026. Base inspeccionada: `61a0c09`, más el candidato de trabajo actual. Este inventario describe código y pruebas; **no acredita por sí solo que una función esté publicada en producción**.

## Disponible y cubierto

| Capacidad | Evidencia y límite comprobado |
| --- | --- |
| Conversación única con contexto | Conserva historial acotado, pantalla, proyecto, documento y selecciones útiles durante la sesión. Cambiar de identidad o perder permisos cancela respuestas tardías. `core.mjs`, `conversation.mjs` y las pruebas de backend/navegador. |
| Consultas de cobro | Pendiente total o vencido, cobros parciales, periodo, cliente, proyecto, referencia, moneda y mayor deudor; excluye lo liquidado y señala datos dudosos. `receivables.mjs` y sus pruebas específicas. |
| Consultas de pago a proveedores | Distingue lo que debe el estudio de lo que deben sus clientes; filtra proveedor, proyecto, periodo y vencimiento. Consultar no registra ni ordena pagos. `payables.mjs`, `payment-direction.mjs` y sus pruebas. |
| Facturas, presupuestos y documentos | Busca, filtra y pagina resultados autorizados; abre una fuente exacta en lectura o su editor cuando se pide expresamente. Una tarjeta o estado «enviado» no demuestra la entrega de un correo ni la existencia de su PDF. `document-search.mjs`, `secretario-ui.js` y pruebas de documentos/Chromium. |
| Cifras financieras | Calcula en servidor presupuestado, aceptado, facturado, cobrado registrado, pendiente y costes desde el snapshot autorizado. Separa monedas y no confunde previsión con saldo bancario. `financeMetrics`/`summary` y pruebas de backend/guía. |
| Estado de proyecto | Resume tareas, plazos y documentos visibles sin ampliar permisos. `projectStatus` y pruebas de backend. |
| Propuestas de borrador | Prepara presupuesto o factura para el editor nativo; conserva partidas de origen y permite proponer cambios de cantidad/precio en un borrador identificado. El editor sigue calculando y guardando. `secretario-bridge.js`, `prepareDraft` y pruebas de continuidad. |
| Seguridad y fallo cerrado | Lectura con JWT del usuario y RLS, rol y versiones revalidados, candidatos acotados, cuotas en servidor, cancelación y límites de tamaño/tiempo. No acepta snapshots financieros del navegador ni herramientas abiertas. `handler.mjs`, `core.mjs` y pruebas de backend. |
| Escritorio y móvil web | El chat central, el lateral, la apertura y el regreso están cubiertos con datos ficticios en Chromium, incluidas anchuras de escritorio y móvil. Esto no sustituye una validación física en Safari/iOS o Android. |

## Conectado en la rama de pruebas

| Capacidad | Estado verificable |
| --- | --- |
| Menciones de entidades | El compositor busca clientes, proveedores, proyectos, facturas, presupuestos y archivos accesibles. El servidor comprueba el identificador y el ámbito. Las pruebas cubren corrección de texto, homónimos, eliminación y cambios de estudio. |
| Lectura de adjuntos | Chromium ejecuta lectura PDF y OCR local. El servidor recibe fragmentos con archivo, página y cobertura. La lectura de archivos existentes usa el acceso de la sesión. Falta comprobar esa descarga con sesión real en Moderno Prueba. |
| Dictado privado | El compositor pide reconocimiento local y deja el texto editable antes de enviarlo. Las pruebas de iniciar, detener, corregir, cancelar y recuperar fallos usan reconocimiento simulado. Chromium expone la API y detecta el idioma como descargable. Falta verificar audio real. |
| Interfaz accesible de la rama | **Bloqueada.** El servidor oficial responde por loopback con la clave pública de Moderno Prueba. El entorno cloud carece de portal HTTP y bloquea la conexión a la API de ese proyecto. La solicitud de acceso limitado terminó sin aplicar cambios. |

## Estado por módulo

| Módulo | Capacidad verificada | Pendiente de conexión o fuera de alcance |
| --- | --- | --- |
| Finanzas | Búsqueda, importes, fuentes y preparación para editores existentes con datos ficticios. | Registro automático, envío, emisión, pago e historial de copias enviadas. |
| Proyectos | Búsqueda autorizada, estado, tareas visibles y apertura de fuentes. | Cambios conversacionales de estado, equipo o planificación. |
| Agenda y calendario | La aplicación tiene pantallas propias. | Consultar y gestionar eventos desde el Secretario. |
| Tareas | Lectura del estado agregado y fuentes del proyecto autorizado. | Asignar, editar, mover o borrar tareas. |
| Compras | Listas nativas independientes del Secretario. | Búsqueda, actualización de precio o compra desde el chat. |
| Documentos | Fuentes financieras, archivos de proyecto y extracción temporal de PDF e imágenes. | Versiones enviadas, medición de planos y escritura en el expediente. |

## Pendiente o fuera de alcance

- Guardar, emitir, enviar, cobrar, pagar, borrar o cambiar estados financieros desde el chat.
- Crear o modificar tareas, compras, fases, controles o calendarios mediante conversación.
- Memoria persistente entre sesiones o dispositivos y aprendizaje automático compartido entre estudios.
- Medición de planos, ediciones de archivos y conversación de voz en tiempo real.
- Conexión bancaria, conciliación automática, previsiones avanzadas o reclamaciones automáticas.
- Activar feedback en producción: el módulo y su contrato existen, pero el flag, las RPC y la retención productiva continúan desactivados.
- Certificación de audio real y compatibilidad completa en Safari/iOS, navegadores Android o aplicaciones instalables.
- Evaluación live del modelo o de datos reales. Las comprobaciones de esta revisión usan dobles locales y datos ficticios.

## Comprobación de esta revisión

- Once suites focalizadas del Secretario pasaron en serie, incluidas backend, guía A–E, cobros, pagos, búsqueda de documentos, continuidad, frontend y dictado.
- El navegador real confirmó la superficie local de `SpeechRecognition` (`processLocally`, `available`, `install`) y el estado `downloadable` sin abrir el micrófono.
- Las pruebas no cambian secretos, no usan datos reales ni llaman a OpenAI o a la Edge de producción. El PR acredita la revisión desplegada en la función de pruebas.
