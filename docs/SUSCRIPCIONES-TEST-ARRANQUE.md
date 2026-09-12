# Suscripciones en preparación — v3.54-test

Trabajo separado de producción en `taller-suscripciones-test-20260912`, carpeta de trabajo `C:/Chat Codex/moderno-suscripciones-test`. **No mezclar en main todavía.** La app publicada sigue en v3.53.1.

## Implementación

- `app/billing-intent.js`: conserva un slug validado durante 24 horas en sessionStorage, incluido el retorno de Auth. No conserva importes, destinos arbitrarios ni supuestos pagos. Logout lo elimina.
- `app/billing-ui.js` y Ajustes: Facturación/Órdenes, estudio actual, catálogo servido por el servidor, retorno cancelado/comprobando, portal y facturas reales o estado vacío. Los invitados sin administración no pueden contratar; el onboarding y los miembros existentes no cambian. No hay selector multiestudio ni alta automática de suscripción.
- `supabase/functions/billing`: handler test, autenticación mediante Auth.getUser, autorización administrativa por estudio en servidor, catálogo cerrado, Checkout con intento persistido e idempotencia, portal y consulta de facturas por cliente propio. Configuración deshabilitada por defecto. Rechaza clave live y proyecto de producción.
- `SQL/suscripciones-test.sql`: tablas privadas exclusivamente comerciales de prueba. Funciones accesibles solo por service_role; la función Edge aporta la identidad que ha verificado. Bloqueos por estudio, intento abierto único, leases temporales para consultar Stripe y confirmar eventos, registro idempotente y rechazo de respuestas con lease caducada. No modifica `app_rol`, miembros, documentos ni Storage.
- Webhook: firma HMAC sobre cuerpo original, antigüedad máxima 300 segundos, límite de tamaño, objetos test, cliente/estudio/intento previamente registrados. Consulta la suscripción actual después de adquirir el bloqueo; no aplica el payload antiguo. Una proyección elegible requiere suscripción activa, factura pagada y plan/cantidad concordantes; no concede pruebas gratuitas implícitas. Fallos/cancelaciones se propagan aunque se haya retirado el plan del catálogo.

La proyección `eligible` no se conecta a los permisos del CRM en esta fase: los pilotos mantienen su acceso. Políticas comerciales futuras requieren decisión y prueba propia.

## Comprobado realmente

12/09/2026: **341 pruebas JavaScript**, **20 comprobaciones PostgreSQL locales** de facturación y `deno check --cached-only supabase/functions/billing/index.ts` correctos. Las llamadas Stripe de los tests son simuladas, no pagos test reales.

En el clon `szbswxpkhidywaosdfcg` se ejecutó el SQL junto con `scripts/sql/billing-clone-probe.sql`, sustituyendo el COMMIT por la prueba y su ROLLBACK. Confirmó reutilización del intento, registro de cancelación ficticia, evento duplicado, denegación de llamada directa desde authenticated y hash idéntico de los bloques existentes. Todo se revirtió, incluidas tablas y funciones creadas por el ensayo. No se enviaron correos ni solicitudes Stripe.

Inspección del panel de funciones del clon: calendario-ics, portal-archivo y product-clipper; billing no está desplegada. El inventario de secretos indica **ningún secreto personalizado**, solo nombres de variables del sistema. No se leyeron valores de claves.

## Configuración necesaria para el ensayo completo

Configurar mediante secretos del **clon**, nunca por mensajes ni Git:

| Variable | Valor requerido |
|---|---|
| `BILLING_TEST_ENABLED` | `true` solo cuando el ensayo esté preparado; ausente deshabilita pagos |
| `STRIPE_TEST_SECRET_KEY` | Clave test del servidor (`sk_test_…`), no clave pública ni live |
| `STRIPE_TEST_WEBHOOK_SECRET` | Secreto de firma del endpoint test (`whsec_…`) |
| `BILLING_TEST_PLANS` | JSON de catálogo aprobado; `{}` no ofrece ningún plan |
| `BILLING_TEST_ORIGINS` | Orígenes exactos del navegador de ensayo, separados por coma |
| `BILLING_TEST_RETURN_ORIGIN` | Origen fijo de la app de ensayo, por ejemplo su localhost autorizado |

Cada entrada de catálogo tiene `name`, `priceId` test y `quantity` entera calculada/configurada en servidor. No hay precios, nombres comerciales, trial ni cantidades predeterminadas. Esta fase soporta un precio recurrente y cantidad fija configurada por oferta; **no implementa cálculo dinámico de asientos ni modelo mixto**. Adaptar cuando Cerebro confirme el modelo.

El endpoint de firma será `/functions/v1/billing/webhook` del clon. Desplegar la función con `verify_jwt=false` según `supabase/config.toml`: el handler valida JWT por sí mismo en operaciones del cliente, y firma Stripe en el webhook. Instalar antes el SQL test de forma persistente en el clon. Configurar portal **test**, precios **test** aprobados y eventos de suscripción/facturas/Checkout. No crear recursos live.

Probar entonces autenticación real, Checkout completo con datos ficticios, portal, facturas, pago pendiente/fallido, retorno cancelado, doble clic, reintento, cancelación y eventos fuera de orden. Hasta hacerlo, no describir la integración con Stripe como validada.

## Límites pendientes y continuidad

- Precios, modelo comercial, prueba gratuita, impuestos y condiciones pendientes de Cerebro. Sin implementación de cobros live, prorrateos ni gestión dinámica de asientos.
- Los intentos sin respuesta recuperable de más de 23 horas se bloquean para conciliación manual; no se crea una segunda sesión tras caducar la garantía de idempotencia de Stripe. Si Stripe confirma una sesión expirada, se cierra el intento y se permite empezar de nuevo explícitamente.
- Órdenes muestra hasta 50 facturas; si hay más, remite al portal. No hay paginación adicional aún.
- Una clave o configuración ausente no equivale a éxito. La interfaz informa de indisponibilidad; no inventa contratos ni facturas.
- Falta ensayo visual completo contra la función desplegada y Stripe test. El servidor, rutas e interfaz tienen pruebas locales; no confundirlas con ese ensayo completo.

Comandos: `node --test scripts/*.test.mjs`; `node scripts/billing-sql.mjs <ruta-a-@electric-sql/pglite/dist/index.js>`; `deno check supabase/functions/billing/index.ts`. El SQL del clon debe terminar en ROLLBACK en los ensayos documentados. Una futura publicación debe cambiar la versión test, validar la configuración comercial y pasar su propio control de despliegue.
