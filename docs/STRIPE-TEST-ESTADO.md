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
