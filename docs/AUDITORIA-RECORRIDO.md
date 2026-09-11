# Cierre del recorrido del CRM

Actualización: publicada y verificada v3.37 y pruebas nuevas documentadas en ENTREGA-V337.md (213 pruebas Node y 26 SQL correctas). La matriz inferior describe los hallazgos iniciales, no el estado final.

Base: v3.36, aplicación ee6fb79; mantenimiento 699e9b2. Ensayos nuevos exclusivamente en el clon de recuperación. Este documento distingue evidencia previa de pruebas nuevas; no certifica la visión futura completa.

| Paso | Estado inicial | Evidencia y pendiente |
|---|---|---|
| Proyecto → estancia → ficha | Probado anteriormente | v3.34: identidad propia, edición y guardado; repetir dentro del recorrido nuevo. |
| Ficha → Board | Probado anteriormente | Proyección desde ficha, precio opcional y PDF; sin colección duplicada. |
| Ficha → aprobación | Probado anteriormente | v3.35: revisión exacta, respuesta del portal y cambio que invalida aprobación. |
| Ficha/aprobación → presupuesto | Incompleto | El editor ofrece catálogo y biblioteca; no hay selección de fichas del proyecto con referencia y snapshot. |
| Presupuesto → pedido | Incompleto | Documentos y pedidos existen pero no consta trazabilidad entre sus líneas. No imponer aceptación del presupuesto como nueva regla comercial. |
| Aprobación → oferta → pedido | Probado anteriormente | v3.35: contrato servidor y flujo de interfaz. Auditar cantidades acumuladas entre solicitudes distintas. |
| Pedido → recepción | Probado anteriormente | Parciales, idempotencia y versión. Repetir con dos sesiones en el recorrido. |
| Recepción → instalación | Incompleto | No hay comando de instalación por cantidades en el registro de pedidos; la etiqueta antigua no lo acredita. |
| Pedido → control económico | Probado anteriormente | v3.36: pagos, devoluciones, abonos, reintegros y vínculos de facturas, separados de contabilidad. |
| Permisos y archivos | Probado anteriormente | Ensayos de roles y 121 archivos recuperados; repetir proyecciones y adjuntos afectados por cambios. |
| Concurrencia, sin red, móvil | Probado anteriormente | Pruebas documentadas en entregas previas; falta combinación en el recorrido nuevo. |
| Recuperación y reversión | Probado con límites | Base/archivos/funciones y OAuth; no restaurar producción. Adaptar ensayo al nuevo registro si cambia. |
| Correo de invitaciones | Fallo identificado | Manejador privado no valida sesión ni invitación existente. La autenticación SMTP correcta no acredita autorización del solicitante. |
| CAD, marketplace, integraciones, web, pagos bancarios | Fuera de alcance | Google Calendar aplazado. No añadir permisos ni automatismos comerciales. |

Primera comprobación local: 202 pruebas Node correctas. No equivale a una prueba del circuito completo. La consulta inicial del clon confirma la cuenta ficticia de recuperación; aún no se han realizado nuevas escrituras de ensayo.

Ensayo nuevo `scripts/sql/recorrido-base.sql`, clon y ROLLBACK: respuesta de portal, total 145,20, recepción parcial, reintento sin duplicar, versión antigua rechazada y pago separado pasan. Falla el límite acumulado: dos solicitudes distintas permiten confirmar 2+2 unidades para una ficha de 2. No se conservaron registros del ensayo. El primer intento falló por la clave única de membresía (un estudio por usuario); se corrigió el montaje para mover solo la membresía ficticia dentro de la transacción revertida.

La lectura HTTP de index.html devuelve 200 y coincide con la base local de producción. Huellas del clon: app_operaciones_accion c7f90c3e10b3c44dd5b441e2b6dd24da; app_pedido_economia 51277289e2dca0c152b384b10f4babd8. Pendiente comparar contratos de producción antes de instalar cualquier cambio.
