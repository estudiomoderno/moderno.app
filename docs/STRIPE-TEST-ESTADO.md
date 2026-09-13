# Estado de conexión Stripe test

13/09/2026: transferencia autorizada directamente por el usuario y completada desde la interfaz de Stripe sandbox a los secretos privados del clon Supabase `szbswxpkhidywaosdfcg`.

- Se guardó `STRIPE_TEST_SECRET_KEY`. Comprobación por presencia del nombre en la tabla de secretos tras guardar, sin consultar el valor guardado.
- La credencial no se incluye en este documento, en archivos del repositorio ni en salidas de herramientas. La variable temporal utilizada para rellenar el formulario se descartó.
- También se guardó `STRIPE_TEST_WEBHOOK_SECRET` para el destino `we_1UF9LLDMoeLRgGbPXiU2FVqx`, limitado a 14 eventos de suscripción, factura y Checkout. La firma nunca se incluye en archivos o salidas.
- Conexión real validada: Auth 200 y catálogo Stripe 200 desde billing desplegada en el clon. Una primera copia de clave incluía texto adyacente del panel y produjo 401; se sustituyó por el contenido exacto del botón y la consulta pasó. No confundir presencia del secreto con credencial válida.
- SQL base y cuotas instalados en una transacción. Hashes internos de `datos_estudio`, `miembros` y `storage.objects` idénticos antes/después; no se imprimieron contenidos. Políticas inicialmente desactivadas para todos.
- No se han activado cobros reales con esta operación.

Catálogo de sandbox existente, sin crear duplicados:

| Plan | Precio mensual | ID de precio test |
|---|---|---|
| Pro | 22 EUR, impuestos incluidos | `price_1UF8j2DMoeLRgGbPsHF12pYV` |
| Team | 38 EUR por usuario interno, impuestos incluidos | `price_1UF8kTDMoeLRgGbPiSg4vqDX` |

Las reglas pendientes de asientos y fiscalidad deben resolverse antes de habilitar la contratación correspondiente.

## Ensayo ejecutado el 13/09/2026

- Identidad y estudio ficticios ya existentes del clon. Preparado acceso de `clipper-ui-20260912@example.invalid`; no se modificaron cuentas reales. La contraseña del fixture no se guarda en este repositorio.
- Para este estudio únicamente se activó una política temporal Team: dos miembros internos, mínimo sintético de una plaza y periodo de cuota 13–15 septiembre UTC. Son **fixtures**, no decisiones comerciales ni ciclo mensual aprobado.
- Registro fiscal exclusivamente sandbox: España, nacional/pequeño comercio UE, sin importaciones, supuesto de ventas transfronterizas inferiores a 10.000 EUR. No se crearon registros live ni se acreditó situación fiscal del titular. Checkout utiliza `automatic_tax`, categoría SaaS comercial y precios inclusive.
- Checkout 200: dos plazas Team, 76 EUR total, IVA incluido 13,19 EUR mostrado en el formulario. Tarjeta sintética de Stripe, sin fondos reales. [Documentación oficial de pruebas](https://docs.stripe.com/testing).
- Webhook firmado recibido: cuenta del clon `active`, `eligible=true`. Factura consultada por el endpoint de historial: `paid`, 7600 céntimos EUR, PDF disponible. Portal de cliente abierto y muestra la factura.
- Cancelación desde portal: efectiva al final del periodo el 13/10/2026. Se detectó que Stripe usa `cancel_at` con `cancel_at_period_end=false`; corregido y probado. Repetida cancelación, API del clon confirma `cancelAtPeriodEnd=true` y mantiene derechos durante el periodo pagado.
- Evento `evt_1UF9hfDMoeLRgGbPHruAzGak` reenviado: respuesta 200 con `duplicate=true`. Los eventos concurrentes pueden recibir `sync_busy` 503 para reintento; nunca tratarlos como pago fallido.
- Baja inmediata posterior en Stripe test: webhook refleja `canceled`, `eligible=false` en el clon.
- Segundo Checkout con tarjeta oficial de rechazo: alerta visible de tarjeta rechazada, `eligible=false` sin derechos de pago. Repetir la solicitud devuelve exactamente la misma sesión Checkout, sin duplicar el intento.
- Cierre: cero políticas `enforced`, mínimo/plazas de fixture desactivados y `BILLING_TEST_TAX_REVIEWED=false`. Quedan las evidencias y siete eventos procesados; no se borran documentos. El segundo Checkout sigue siendo una sesión sandbox no pagada hasta su caducidad; no habilitarla como oferta pública.
- 348 pruebas JavaScript, 20 comprobaciones SQL base y 31 de cuotas en PGlite; comprobación Deno correcta.

## Aún no listo para producción

Faltan recorrido completo desde la interfaz de la app, renderizador PDF real y aplicación completa de derechos, gestión de altas/bajas/prorrateo de plazas, ciclo mensual y condiciones de almacenamiento/capturas. Falta ampliar ensayos de renovaciones, autenticación reforzada y cancelaciones en fechas distintas del fin de periodo. La cuenta sandbox muestra responsabilidad fiscal `stripe` en el evento: revisar modalidad comercial de Stripe antes de cualquier configuración live; no trasladarla automáticamente al negocio real.

No activar CTA ni precios live a partir de este ensayo. La autorización para cobros reales existe; las verificaciones y condiciones comerciales pendientes siguen siendo requisitos.

## Paquetes Free: ubicación de la oferta

Decisión posterior de Cerebro: no mostrar paquetes extra en precios públicos. Ofrecerlos dentro de la app al intentar autocompletar tras agotar las 25 capturas y cualquier saldo comprado, conservando el formulario. Solo Free; saldo e historial de compras anteriores siguen visibles. Caducidad, acumulación e impuestos están pendientes; esta decisión no habilita su compra real ni confirma condiciones nuevas.

## Vista previa de Facturación (13 septiembre, revisión posterior)
- `node scripts/billing-preview-server.mjs` sirve esta rama en http://127.0.0.1:3194/setup. Introducir únicamente la clave pública anon del clon. Nunca una clave Stripe ni service_role.
- Destino fijo: szbswxpkhidywaosdfcg. Acceder únicamente con el usuario ficticio del ensayo. No usar usuarios reales.
- Comprobado en navegador: inicio de sesión, ruta `/es/ajustes?section=facturacion&plan=team`, precio Pro 22 EUR, Team 38 EUR por usuario y total 76 EUR para los dos miembros ficticios, historial con factura pagada y enlace PDF.
- Revisada visualmente Facturación a 390×844; restaurado el tamaño del navegador después.
- Seis pruebas automatizadas de BillingUI pasan: incluye confirmación solo con eligible del servidor, separación de estudio y bloqueo de checkout no habilitado.
- Contratación permanece deshabilitada. Esta revisión NO completa un nuevo recorrido de Checkout desde la UI. Pendientes: habilitación controlada del ensayo, recorridos éxito/cancelación/rechazo y retorno sin sesión, demora de webhook y revisión completa móvil/ordenador.
- No cambios en producción ni en condiciones comerciales.

## Reglas Team confirmadas por Cerebro (13 septiembre)
Paga el administrador de una única suscripción. Solo miembros internos activos son facturables. Clientes, perfil servidor gestoría e invitaciones pendientes quedan excluidos. Gestoría conserva permisos restringidos, no obtiene permisos de colaborador por ser gratuita.

Aplicado en código de esta rama: cotización excluye gestoría según perfil real, sin confiar en etiqueta; las invitaciones pendientes no bloquean la cotización ni suman plazas. El guard de miembros impide aceptar internos sin plaza y mantiene la transacción/invitación intacta. No realiza cobros. Cambiar gestoría a colaborador también pasa por el guard.

Pruebas locales: 35 comprobaciones SQL y 6 BillingUI correctas. SQL nuevo aún no aplicado al clon ni a producción.

Pendiente de implementación integral: estado visible de ampliación, propuesta de importe exacto y pago explícito administrador antes de conceder acceso; baja con revocación inmediata y ajuste Stripe en siguiente renovación conservando historial y último administrador. No confundir contador activo con plazas pagadas vigentes. Mínimo Team y fórmula de prorrateo aún requieren decisión comercial; no se establecen valores por defecto. Pruebas de carreras, renovación y ampliación fallida siguen pendientes.

## Corrección comercial posterior: Team 1–4 y ventas desde 5
Sustituye las dudas anteriores sobre mínimo y altas: autoservicio Team desde 1 hasta 4 internos activos, 38 EUR/usuario/mes con impuestos incluidos. Desde 5 (también ampliación 4→5) propuesta de ventas; nunca Checkout automático ni descuento inventado. Altas a mitad de periodo con prorrateo hasta renovación e importe exacto con impuestos confirmado por administrador antes de pagar. Bajas conservan reducción en renovación.

Aplicado en esta revisión: SQL cotiza desde 1 sin mínimo configurable antiguo, bloquea autoservicio desde 5; backend impide crear Checkout con 5 o más tanto al cotizar como al validar intento persistido; interfaz no ofrece un total autoservicio para esos equipos e informa de que el receptor de ventas aún no está disponible, sin falso envío. 31 pruebas JS y 35 SQL pasan. No se ha desplegado todavía al clon.

Pendiente: receptor privado y formulario de ventas coordinado con Web, sin desarrollar Panelcontrol; ampliación con factura prorrateada y pago confirmado, estado pendiente de aceptación sin plaza, reducción programada al renovar e integración UI end-to-end. La aprobación comercial del prorrateo no equivale a implementación terminada.

## Ventas y nueva base por estudio (regla vigente)
Sustituye Team38 por todos: UNA base22 EUR por estudio +38 por cada interno adicional. Totales 1=22,2=60,3=98,4=136. Desde5 internos totales, ventas. Prorrateo de altas confirmado. No depende del número de administradores.

Estado real 2026-09-13: SQL/ventas-solicitudes-test.sql instalado en clon. Prueba real RPC guardó solicitud ficticia 66532183-8f63-4f72-983e-3be226aa4401 a las 10:50:34 UTC; reintento devolvió mismo ID/fecha y duplicate=true. Sin emails. 43 pruebas SQL y 32 JS pasan; Deno check pasó antes del último mapeo de errores.

Endpoint previsto: POST https://szbswxpkhidywaosdfcg.supabase.co/functions/v1/billing con sesión admin Bearer, action=sales-request, studyId validado servidor, requestId UUID, name1–120, company1–160, email<=254, internalUsers entero5–10000 (total con administrador), message opcional<=2000. Respuesta persistida id/status=received/createdAt/duplicate. Errores 400 invalid_sales_request,403 forbidden,409 sales_request_conflict,429 sales_rate_limited; indisponibilidad503. Sin lectura pública ni permisos a anon/authenticated; solo RPC service_role después de auth. Límite3/hora.

IMPORTANTE: despliegue de función NO confirmado. Panel regresó a confirmación tras Deploying updates sin error visible; API siguió devolviendo invalid_action. No anunciar endpoint disponible ni activar Web. SQL sí está operativo y comprobado. Formulario App preparado, ocultando envío hasta salesAvailable del backend. CORS4317 NO añadido; intención ventas/ruta final aún no entregada. Web acordó formulario final en App tras login, sin traspasar PII ni tokens por URL.

Nuevo cálculo mostrado en código; Team Checkout bloqueado localmente con team_pricing_pending hasta adaptar dos líneas base+extras, webhook y renovación. Clon anterior conserva taxReady=false. No migraciones de suscripciones live. Pendientes despliegue función, UI real del formulario, ampliación prorrateada, bajas renovación y recorrido completo Checkout con nueva fórmula.

## Revisión posterior: gratuidad permanente, despliegue reparado y base+extras
- Autorización directa usuario: su estudio interno de pruebas y equipo nunca pagarán. Identidad y única membresía verificadas en producción con lectura mínima. Se instaló billing-exemptions.sql y registró la exención PRIVADAMENTE por estudio, con referencia de autorización; RPC confirmó true. No se guardan UID/estudio/correo bootstrap en Git. No se tocaron usuarios, permisos, documentos ni Storage.
- Gratuidad comercial NO concede staff/global admin. Tabla RLS sin privilegios públicos; futuro billing debe consultar billing_is_exempt antes de cualquier cargo. Backend clon lo consulta y rechaza checkout/portal/select-free para exentos; pantalla muestra gratuidad permanente. La web app de producción todavía no usa este nuevo backend, no describirlo como despliegue completo de suscripciones live.
- Se corrigieron saltos CRCRLF que dejaban imports relativos en el bundle e impedían publicar. Función billing del clon actualizada con éxito: sales-request HTTP200 y duplicados reconocidos. SQL cuotas actualizado con comparación de hashes datos_estudio/miembros/storage.objects, conservación confirmada y políticas desactivadas.
- Checkout implementa una base Pro22 y extras Team38 por interno adicional; reutiliza prices existentes, no duplica productos. Marca billing_model=base_plus_extras; snapshot verifica exactamente1base y cantidad extras. Bloquea nuevo Checkout con suscripción existente y no reutiliza sesiones Team del modelo anterior. Tests1–4, extraincorrecto/base duplicada y no segunda suscripción pasan. No hay pago Stripe nuevo completado con esta fórmula todavía.
- Prueba UI real: solicitud ficticia ddb42fd2-d505-443c-b428-01b7ac5bd0fb recibida desde Facturación en clon. Se detectó/corrigió formulario anidado dentro Settings; envío ahora usa contenedor y validación de campos. No emails. Vista previa local3194/es/ajustes?section=facturacion&plan=team, formulario desplegable. Sesión ficticia, no demo pública. Web puede enlazar sin PII ni tokens en URL y sin POSTcross-origin.
- 40 pruebas JS enfocadas pasan,43SQL pasan,Deno check pasa. Revisión móvil realizada pero NO se acredita suite completa móvil/E2E.
- Pendiente: ampliaciones prorrateadas con aprobación previa e idempotencia, bajas inmediatas de acceso con reducción Stripe próxima renovación, rendererPDF real y restricciones finales de planes, revisión fiscal live y Checkout completo base+extras. No declarar finalizado ni publicar cobros reales. TaxReady=false y políticas false del clon se mantienen.
- Referencias de implementación para próximo paso: https://docs.stripe.com/billing/subscriptions/pending-updates y https://docs.stripe.com/api/invoices/create_preview. No confundir preview con cobro; conservar proration_date para confirmación, no conceder extras con pago pendiente.

La suite SQL se amplió después: 46 comprobaciones correctas, incluyendo exención permanente conservada al añadir un miembro y bloqueo de lectura pública de exenciones.

## Continuación: ampliación fallida y preparación de prorrateo
Se añade a la sincronización el estado previo pagado de la cuenta. Una factura de actualización abierta/anulada/incobrable no elimina plazas previamente pagadas si suscripción, cantidad y fin del periodo coinciden y el periodo no ha vencido. No concede plazas nuevas, no cubre facturas de renovación ni prolonga el periodo. Se conserva el requisito de estado activo. Prueba local de fallo, renovación impagada, cantidad distinta y periodo vencido correcta.

seat-change.mjs prepara preview de incremento 1–4 en la suscripción existente, modifica solo extras, conserva proration_date para posterior confirmación y exige impuestos calculados. Rechaza pago anterior pendiente, cliente distinto, cancelación/schedule/pending_update y precios no aprobados; 5+ devuelve ventas sin llamada Stripe. Este módulo NO está conectado aún a una acción HTTP ni cobra: faltan persistencia de propuesta, confirmación admin, ledger/idempotencia de ejecución, sincronización de nuevas cantidades y reducción programada. No presentarlo como ampliación disponible.

Verificaciones de esta continuación: 29 pruebas billing,4 pruebas preparación de ampliación y20 PostgreSQL pasan, Deno check correcto. SQL billing_test_claim actualizado puntualmente en clon con éxito. Backend de protección desplegado en clon; validar respuesta de salud antes de cerrar revisión. Ningún cargo ni cambio de plazas reales.

Salud posterior al despliegue comprobada: Auth200 y billing status200, cuenta ficticia cancelada/eligiblefalse conservada; planes siguen deshabilitados por configuración de ensayo.

## Reanudación y cotizaciones persistentes de ampliación

Cerebro trasladó instrucción directa de levantar todas las pausas. Se mantiene rama aislada y requisitos específicos de publicación. Diseño Tareas/menú aprobado integrado en otro checkout, sin mezclar index.html ni publicar. Nueva marca sigue pendiente Bold/SemiBold.

Se conecta `seat-preview` al handler de billing, con autenticación, autorización admin, exención, configuración fiscal y suscripción/cliente/estudio comprobados. Solo calcula en Stripe test y persiste una propuesta mediante `billing_test_seat_preview_save`. La respuesta no revela parámetros internos de actualización. No modifica la suscripción, no concede plazas y no cobra. Desde5 deriva a ventas antes de llamar Stripe.

`SQL/ampliaciones-test.sql` añade cotizaciones privadas con RLS, revalida administrador/exención y cuenta bajo bloqueo, impide reutilizar identificador con otro contenido y exige vigencia máxima de cinco minutos. Importe siempre generado por servidor. El cliente no puede reemplazar el importe. La repetición exacta de una propuesta devuelve el mismo registro; si una nueva consulta de Stripe produce otra cotización con el mismo ID se rechaza, sin realizar cargo.

Validación local: 44 pruebas JS billing/UI/preparación y13 PostgreSQL correctas. No cambios de readiness en producción. SQL y función nuevos todavía no desplegados al clon; la interfaz aún no ofrece esta acción. Faltan confirmación persistente del administrador, ejecución idempotente de ampliación, sincronización de cantidades pagadas, bajas diferidas, PDF y recorrido completo. No presentar como ampliación disponible ni activar CTA.

Referencias verificadas: https://docs.stripe.com/billing/subscriptions/pending-updates y https://docs.stripe.com/api/invoices/create_preview. Se conserva proration_date; preview no constituye pago. No instalar el nuevo handler sin su migración. El transportador de revisión incluye ahora seat-change.mjs y elimina imports relativos al generar su bundle.
