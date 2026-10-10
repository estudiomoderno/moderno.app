# Presupuesto y controles de consumo de OpenAI API — Taller Moderno.app

Decisión de Cerebro: **10 de octubre de 2026**. Autorización del usuario: **máximo 20 EUR por mes** para la API de OpenAI empleada por el Taller de Moderno.app. Esto NO autoriza gastos superiores, pagos de infraestructura, uso de otras APIs ni operaciones con datos reales.

## Estado (no confundir con activación)
- **POLÍTICA APROBADA**: 20 EUR por mes natural como techo total autorizado para este propósito.
- **CONTROL DE PLATAFORMA PENDIENTE**: no se ha creado ni verificado un proyecto de OpenAI API dedicado ni un límite duro en él.
- **EJECUCIÓN FACTURABLE DESACTIVADA**: no hay workflow que invoque `openai/codex-action`. NO habilitar llamadas solo por existir esta documentación.
- La integración de ChatGPT con OpenAI Platform permite iniciar el asistente de clave API pero no administrar aquí proyectos, límites, alertas ni secretos de GitHub. No crear la clave en el "Default project" ni guardar claves en GitHub hasta que exista un proyecto dedicado y límite comprobado.

## Controles obligatorios antes de activar un solo trabajo facturable
1. Crear un **proyecto API exclusivo «Moderno.app - Taller»** en OpenAI Platform. No utilizar el proyecto predeterminado compartido con otros usos.
2. Configurar en **ese proyecto** un **Monthly spend limit con «Enforce a hard limit» ACTIVADO**. Un simple spend alert no bloquea solicitudes.
3. **Respetar 20 EUR incluidos impuestos y efectos de cambio EUR/USD**, si aplican. Para prudencia, **destinar como objetivo inicial ~15 EUR equivalentes de consumo API sin impuestos**, dejando ~5 EUR para posible IVA, cambios de divisa, retrasos de registro y exceso temporal del mecanismo de corte. Calcular el límite de la plataforma en su moneda de facturación con una cotización verificada al configurarlo; **no fijar un importe USD deducido de memoria**.
4. Crear alertas del proyecto al **50 %, 75 % y 90 %** del límite configurado. Confirmar destinatarios y visibilidad del gasto.
5. **Verificar directamente en la plataforma** que el proyecto y el límite duro existen antes de añadir o habilitar credenciales en GitHub. Guardar solo evidencia de configuración sin capturas de datos sensibles.
6. Generar **clave API restringida al proyecto dedicado** y guardar únicamente en GitHub Actions Secrets, con permisos mínimos y sin revelarla en chat, logs, PR o archivos. La clave de la API no es la de ChatGPT.
7. Antes de habilitar GitHub Actions con Codex, **terminar el entorno aislado** `moderno-pruebas`: schema, RLS, funciones y cuentas ficticias. Ninguna variable o secreto productivo accesible al workflow.
8. Desencadenar la acción únicamente mediante la autorización explícita del titular para una tarea concreta y comprobable. Prohibido el disparo desde issues, comentarios o PR públicos no validados. **Sin reintentos automáticos**, **máximo una ejecución concurrente**, duración por tarea limitada a **15 minutos** y cancelación disponible.
9. Registrar por tarea horas, ejecución y coste observado del proyecto. Revisar antes y después del trabajo. **Suspender si falta información fiable de consumo, quedan menos recursos de los presupuestados, se supera una alerta, se alcanza el límite o cambia el alcance.** No afirmar un gasto exacto cuando la información aún no esté consolidada.
10. Desactivar/rotar la clave cuando termine el periodo de pruebas, ante anomalía de gasto o si deja de ser necesaria. **Nunca elevar límites ni recargar créditos automáticamente**.

## Comportamiento y límites reales
- Los límites *duros* de OpenAI pueden cortar llamadas al llegar al consumo **registrado**, normalmente con error HTTP 429. Su aplicación puede retrasarse, de modo que el gasto final podría exceder ligeramente el importe configurado. Por eso se adopta un margen respecto al presupuesto autorizado.
- El límite de gasto de OpenAI Platform **no** controla costes ajenos (GitHub, hosting, Supabase, Stripe) ni necesariamente impuestos; tampoco equivale al uso de Codex Cloud incluido en otra suscripción.
- Si un límite duro, el acceso de lectura a costes o la separación de proyectos no puede comprobarse, **no activar el workflow facturable** y consultar antes.
- El mes se determina por la facturación de la plataforma (mes natural UTC según configuración aplicable), no por el inicio de una conversación.

## Seguimiento
- [Issue #4 — Automatización Codex](https://github.com/estudiomoderno/moderno.app/issues/4).
- [Issue #3 — Entorno Supabase de pruebas](https://github.com/estudiomoderno/moderno.app/issues/3).
- [Coordinación Cerebro-Codex](COORDINACION-CEREBRO-CODEX.md).
- [OpenAI: Spend limits](https://developers.openai.com/api/docs/guides/spend-limits).
- [OpenAI: codex-action](https://github.com/openai/codex-action).

**Aprobación adicional necesaria**: solo si el presupuesto de 20 EUR mensuales resulta insuficiente, para aumentar el importe autorizado. **No autoriza al agente a aumentar el límite por su cuenta.**
