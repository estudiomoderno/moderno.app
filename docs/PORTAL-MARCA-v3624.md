# Marca del portal · v3.62.4

Regla comercial: logotipo de estudio solo con derecho efectivo de personalización (suscripción de pago válida o excepción interna existente). Sin derecho, sin logo o ante error de imagen, se muestra Moderno vigente. Esta regla no concede acceso al portal a Free ni altera la vigencia de enlaces.

Contrato público: portal_cliente_lee devuelve capabilities.customBranding, booleano estricto. Se calcula en public.portal_custom_branding(uuid), no desde email, plan ni configuración de navegador. Cuando false, se elimina marca.logo del payload. No se exponen registros de suscripción ni razones de exención. La firma de imágenes ya utiliza el payload filtrado del portal.

Situación verificada en producción el 21/09/2026: existe billing_exemptions y billing_is_exempt; no hay tablas de suscripciones ni función de derechos live. Por ello el cálculo vigente reconoce solamente la excepción interna, y devuelve false en los demás casos. Al activar facturación live es obligatorio ampliar portal_custom_branding con los derechos efectivos de suscripción; nunca utilizar las tablas billing_test ni considerar un checkout como pago. No afirmar que la contratación live está operativa.

SQL/portal-branding.sql aplicado después de ensayo con rollback. Verificados estudio sin derecho, conservación de exenciones y rechazo de token inválido. El contrato conserva permisos del RPC; la función auxiliar no se expone a anon/authenticated. 381 pruebas locales correctas; logotipo Moderno revisado visualmente. Cerebro coordina la regla con Panelcontrol, Web e Imagen.
