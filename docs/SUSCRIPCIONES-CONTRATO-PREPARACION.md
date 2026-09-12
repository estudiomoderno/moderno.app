# Suscripciones: contrato de preparación con Web

Estado a 12/09/2026: inspección inicial y propuesta de interfaz entre talleres. **No implementado ni conectado a Stripe.** La v3.53.1 publica únicamente la cancelación de invitaciones. No activa cobros ni cambia los permisos del piloto.

## Arquitectura encontrada

El cliente usa Supabase Auth y `unirse_al_estudio()`. La pertenencia actual es una por usuario (`miembros.user_id` identifica al miembro); no existe un selector de múltiples estudios administrados. Los espacios internos/marcas no son estudios de Supabase. No prometer selección multiestudio sin una evolución explícita de ese modelo. Un invitado debe entrar en el estudio invitante por el flujo existente, sin crearle una suscripción.

El enrutador está en `app/router.js`; `/es/ajustes` existe, pero la sección de Ajustes es estado interno. `routeAuthRedirect()` conserva el destino en sessionStorage y vuelve a `/`; `routeAuthReturn()` recupera la ruta. La intención comercial requiere persistencia separada y validada para no perderla al autenticarse. El navegador nunca es fuente de precios, permisos o estado pagado.

Facturación y Órdenes de `app/settings-ui.js` son estados de disponibilidad. No hay código Stripe, tablas de suscripción ni función de facturación entre las funciones versionadas. No se han inspeccionado valores de secretos ni se ha validado una conexión a la cuenta Stripe.

## Contrato propuesto para Web

Reservar entrada `https://app.moderno.app/es/ajustes?section=facturacion&plan=<slug>`: no está activa aún. Web enviará exclusivamente un identificador opaco de plan; no enviará importe, moneda, número de usuarios, descuentos, duración de prueba ni un Price ID de Stripe como autoridad. No publicar botones de contratación operativa hasta que el backend esté validado.

El servidor ofrecerá un catálogo de planes aprobados. La sesión autenticada confirmará estudio y permiso administrador antes de iniciar Checkout. Si hay un estudio ya asociado, mostrarlo y pedir una acción de contratación deliberada. Si el usuario es invitado sin administración, explicar que el plan lo gestiona su administrador y permitir entrar al trabajo habitual.

El retorno de Stripe usará la sección Facturación con un indicador de retorno y un identificador de sesión. Esos parámetros solo mostrarán «comprobando», «pendiente» o «has vuelto sin completar el pago»; no conceden acceso. La API verificará que la sesión pertenece al estudio administrado.

## Contrato de servidor a implementar

- Catálogo configurado exclusivamente en servidor, inicialmente deshabilitado. Validar también modo test del precio, moneda, recurrencia, producto y cantidad calculada según modelo aprobado.
- Cliente Stripe por estudio y entorno. Control de administrador en cada operación; no buscar/vincular por dominio de correo. No aceptar customer/subscription IDs arbitrarios del navegador.
- Checkout idempotente por intento persistido, con un único intento abierto por estudio para evitar dobles suscripciones; reintentos tras respuesta incierta deben reutilizarlo. Datos de facturación recogidos en Checkout o formulario explícito, sin sobrescribir datos fiscales de facturas históricas.
- Webhook con firma sobre cuerpo original, tolerancia temporal y secreto del entorno; eventos y resultado persistidos atómicamente. Reintentos seguros. Procesar eventos duplicados y desordenados consultando el estado actual de Stripe bajo control de concurrencia; un evento antiguo nunca reactivará una suscripción cancelada.
- Portal de cliente creado en servidor para el cliente del estudio, con URL de retorno fija. Historial obtenido de facturas Stripe realmente asociadas a ese cliente, con estado vacío honesto.
- Proyección comercial separada de `app_rol`. La primera fase no aplica restricciones al piloto ni elimina archivos al cancelar o fallar el pago. Derechos nuevos solo tras confirmación del servidor; la URL success no cambia nada.
- Modo test cerrado: rechazar claves, eventos y objetos live. Sin correos reales, productos/precios live ni cobros reales en la preparación.

## Decisiones y requisitos pendientes

Cerebro está recogiendo modelo por estudio/usuario/mixto, planes/precios y prueba gratuita. También habrá que fijar impuestos, condiciones de cancelación, gracia ante impago y tratamiento explícito del piloto antes de activar restricciones o contratar. No se han elegido condiciones por defecto.

Para validar extremo a extremo: clave de API **test** disponible mediante secretos del servidor, secreto de webhook test, precios test aprobados y portal test configurado. No pegar secretos en documentos, mensajes o Git. Ensayos: admin/no-admin, aislamiento, invitación, retorno cancelado, pago pendiente/fallido, doble clic, reintento, eventos duplicados/desordenados y conservación del piloto.

## Referencias oficiales consultadas

- [Crear Checkout Session](https://docs.stripe.com/api/checkout/sessions/create): sesión de suscripción con precio configurado y recogida de dirección.
- [Crear sesión del portal](https://docs.stripe.com/api/customer_portal/sessions/create): vinculación al cliente desde servidor.
- [Webhooks](https://docs.stripe.com/webhooks): firma, reintentos y ausencia de garantía de orden.
- [Pruebas de Billing](https://docs.stripe.com/billing/testing): pruebas con suscripciones test; los eventos sintéticos del panel no sustituyen un circuito correlacionado completo.
