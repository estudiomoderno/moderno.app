# Presupuesto y controles de consumo de OpenAI API — Taller Moderno.app

Decisión de Cerebro: **10 de octubre de 2026**. Autorización del usuario: **máximo 20 EUR por mes** para la API de OpenAI empleada por el Taller de Moderno.app. Esto NO autoriza gastos superiores, pagos de infraestructura, uso de otras APIs ni operaciones con datos reales.

## Estado del piloto del Secretario — 22/11/2026

- **POLÍTICA APROBADA**: 20 EUR por mes natural continúa siendo el techo máximo autorizado; no autoriza recargas ni aumentos automáticos.
- **PROYECTO DEDICADO**: `Moderno.app - Taller`, separado del proyecto predeterminado.
- **CRÉDITOS PROMOCIONALES**: el proyecto dispone de créditos API vinculados a la suscripción. El saldo visible cambia con el uso y no se documenta como importe permanente.
- **SIN FACTURACIÓN DE PAGO**: no hay método de pago ni recarga automática configurados para la API. Al agotarse los créditos, las solicitudes deben detenerse con `429 credit_balance_exhausted`; no se añadirá una tarjeta para evitar ese corte.
- **CLAVE DE PRUEBAS**: creada con permiso restringido a Responses/Write y guardada solo como secreto del servidor de `moderno-pruebas`. Nunca se guarda en HTML, Git, capturas o chat.
- **PRUEBA CONECTADA**: una consulta ficticia de extremo a extremo terminó correctamente. No hubo reintentos automáticos ni datos productivos.

La pantalla actual no ofrece un límite monetario duro configurable para este saldo promocional. Para el piloto sin facturación de pago, el corte por saldo y los límites de la aplicación sustituyen temporalmente ese control: 20 consultas diarias por persona/estudio y 200 consultas mensuales globales para toda Moderno.app. La allowlist inicial admite solo al propietario. Estas cuotas miden solicitudes, no tokens ni euros.

## Controles obligatorios

1. Mantener el proyecto exclusivo y el modelo fijado por código; no aceptar un modelo arbitrario por variable de entorno.
2. Crear una clave productiva restringida a Responses/Write y guardarla únicamente como secreto de la Edge Function de producción. No reutilizar una clave personal amplia.
3. Mantener sin método de pago y sin recarga automática durante el piloto. Si en el futuro se activa facturación, detener primero el Secretario y configurar un límite duro y alertas antes de reactivarlo.
4. Reservar de forma atómica la cuota global antes de cada llamada. No reintentar automáticamente una respuesta fallida.
5. Revisar uso y saldo del proyecto. Suspender ante `429`, anomalía, ausencia de información fiable, cambio de alcance o compromiso de la clave.
6. Rotar o revocar las claves al terminar el piloto o ante cualquier incidente. Nunca elevar límites ni comprar créditos sin nueva autorización.

## Comportamiento y límites reales

- El corte por créditos depende del saldo registrado por OpenAI; la cuota propia reduce exposición pero no equivale a un precio máximo por solicitud.
- Los controles de OpenAI no cubren costes ajenos (GitHub, hosting, Supabase o Stripe) ni el uso de ChatGPT/Codex incluido en otra suscripción.
- Si se añade facturación de pago, vuelve a ser obligatorio el margen respecto al techo de 20 EUR para impuestos, cambio de divisa y retrasos de medición.

## Seguimiento
- [Issue #4 — Automatización Codex](https://github.com/estudiomoderno/moderno.app/issues/4).
- [Issue #3 — Entorno Supabase de pruebas](https://github.com/estudiomoderno/moderno.app/issues/3).
- [Coordinación Cerebro-Codex](COORDINACION-CEREBRO-CODEX.md).
- [OpenAI: créditos API para suscripciones elegibles](https://help.openai.com/en/articles/20001626-api-credits-benefit-for-eligible-chatgpt-subscriptions).
- [OpenAI: Spend limits](https://developers.openai.com/api/docs/guides/spend-limits).
- [OpenAI: codex-action](https://github.com/openai/codex-action).

**Aprobación adicional necesaria**: solo si el presupuesto de 20 EUR mensuales resulta insuficiente, para aumentar el importe autorizado. **No autoriza al agente a aumentar el límite por su cuenta.**
