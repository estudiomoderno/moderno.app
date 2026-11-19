# Rediseño integral de Finanzas — v3.67.53

Fecha: 19/11/2026. Alcance autorizado: interfaz web de `app.moderno.app`, sin migraciones ni cambios de registros.

## Arquitectura final

Finanzas conserva una sola entrada en el menú principal y organiza el trabajo en cinco secciones internas, en este orden: **Resumen, Ventas, Gastos, Presupuestos y Previsión**. La barra es navegación funcional de Finanzas. La cabecera de escritorio muestra aparte solo la pantalla actual, con su icono y al lado del botón de contraer, sin Home, jerarquías intermedias ni separadores.

El botón azul muestra **Nuevo presupuesto** en Resumen, Presupuestos y Previsión; en Ventas muestra **Nueva factura** y en Gastos **Nueva factura recibida**.

- **Resumen** separa actividad real y proyección: facturado, cobrado, pendiente de cobro, gastos, resultado, evolución mensual, presupuestos aceptados o pendientes, venta estimada, previsión por facturar y desglose trazable por proyecto. El selector permite año, últimos doce meses o histórico. IVA e IRPF no se muestran en esta pantalla, pero sus reglas y datos siguen intactos en documentos y Contabilidad.
- **Ventas** contiene las antiguas facturas emitidas y **Gastos** las antiguas facturas recibidas. Ambas usan la misma tabla compacta con Factura, Estado, Cliente, Proyecto e Importe con IVA, filtro avanzado, ordenación, total y paginación. Ventas conserva documentos, proyectos, cobros parciales, vencimientos y acciones. Gastos reutiliza los asientos de gasto y sus acciones de documento, edición y eliminación; no crea una fuente de datos paralela.
- **Presupuestos** conserva filtros, estados, revisiones, duplicado, eliminación, edición, vínculo con proyecto y conversión a factura.
- La información de **Contabilidad** se integra en Resumen y en los libros de Ventas/Gastos, manteniendo cálculos, estados, referencias, proyectos y documentos existentes.
- **Previsión** mantiene los planes de pago y vencimientos de proyectos. La interfaz indica expresamente que son importes previstos, no saldo bancario ni movimientos confirmados.

La composición es más densa y profesional, con tarjetas neutras, tablas compactas, estados vacíos, modo oscuro, reducción de movimiento y adaptación para escritorio, tableta y móvil. El centro queda preparado mediante una reserva CSS inactiva para un futuro panel derecho de IA; no existe panel, conexión ni automatización de IA en esta entrega.

## Conservación y seguridad

El rediseño usa las colecciones, cálculos, permisos, formularios y callbacks existentes. No cambia Supabase, Auth, Storage, RLS, esquemas, numeraciones, divisas, fiscalidad, documentos históricos, proyectos, clientes, proveedores ni archivos. Tampoco inventa saldo bancario, conciliación, pagos automáticos o datos de prueba en producción.

La investigación solicitada tomó como referencia los patrones de arquitectura habituales en Holded, Odoo, Xero, QuickBooks y Pennylane: resumen ejecutivo, libros de emitidas/recibidas, trazabilidad por proyecto, separación de realizado y previsto, filtros persistentes en la vista y progresión hacia detalle. No se copiaron identidad, textos ni componentes. La red del entorno de implementación rechazó con HTTP 403 el acceso directo a las páginas públicas, por lo que no se certifica una comparación visual en vivo de esas webs.

## Verificación

- 753 pruebas Node del repositorio, incluidas sintaxis, documentos, cobros, permisos, navegación, publicación y regresiones: todas correctas.
- Prueba Chromium aislada específica de Finanzas en 1440, 1100, 768 y 390 px, claro y oscuro: cinco secciones, cálculos, emitidas/recibidas, presupuestos, contabilidad, previsión y estados vacíos correctos.
- Prueba de navegación horizontal con teclado, pulsación prolongada y fallback en 1440, 1100, 1024 y 390 px.
- Red externa y peticiones de escritura bloqueadas durante las pruebas; comparación de registros ficticios antes y después sin cambios.
- Manifiesto de publicación ampliado para incluir `brand/finance-ui.css`.

La reversión es mediante revert del commit de interfaz y nuevo despliegue. Nunca se deben restaurar copias antiguas ni borrar datos para retirar este diseño.

