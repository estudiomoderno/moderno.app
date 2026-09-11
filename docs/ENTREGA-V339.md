# v3.39 — Presupuesto conservado en el pedido

Estado: publicada y verificada el 11/09/2026.

Compras → pedido → Importes, pagos y facturas → Conservar presupuesto del proyecto. El administrador elige una revisión persistida, añade motivo y guarda una copia íntegra del presupuesto en el pedido. Se conservan campos antiguos, líneas, cantidades y estado del documento. La interfaz de consulta muestra los campos comerciales pertinentes, escapando texto; el registro completo sigue limitado a administradores por RPC.

El servidor verifica estudio/proyecto/referencia única y la revisión leída. Un cambio del presupuesto o versión antigua del pedido obliga a actualizar. La copia y el evento se guardan atómicamente; repetir un intento incierto no crea otra copia. Cambiar o eliminar el documento original no reescribe la copia. Se pueden conservar revisiones posteriores explícitamente; no se sustituye el historial ni se aprueba automáticamente un presupuesto o pedido.

También se corrige el formulario de devolución para descontar material ya instalado, como ya exigía el servidor. «Volver a pedidos» actualiza los registros para no reutilizar una versión obsoleta.

## Evidencia

- 219 pruebas Node correctas en el candidato final.
- 18 comprobaciones SQL correctas en el clon, ROLLBACK: copia completa, campos legacy, idempotencia, pedido y presupuesto obsoletos, referencia duplicada, original eliminado, conservación de pago y denegación al colaborador, junto al recorrido base.
- El primer ensayo intentó actualizar directamente datos_estudio y fue rechazado por permisos. Se corrigió para usar guardar_bloque_versionado; no se concedieron permisos artificiales.
- Instalación del paquete en el clon conservó datos, pedidos, historial e inventario de archivos. Reinstalación repetida después de guardar una copia desde la interfaz: conservación correcta.

## Compatibilidad y reversión

Campo aditivo contenido.presupuestos en el registro existente. No migración ni edición masiva de documentos. Las RPC anteriores siguen operando sobre el JSON completo, conservando campos desconocidos. Retirar accesos de interfaz ante un fallo, mantener copia e historial; nunca restaurar registros antiguos sobre cambios nuevos. Generador de instalación existente build-purchase-finance-release.mjs, ensayo build-budget-snapshot-probe.mjs.

## Validación externa pendiente

No se ha identificado autorización específica para crear una membresía productiva de prueba y enviarle una invitación. La dirección indicada históricamente no acredita por sí sola esa autorización. Se mantiene evidencia de v3.38 (SMTP local y rechazos reales) sin afirmar recepción humana. Este ensayo externo no impide cerrar cambios independientes ni continuar 3.40–3.45. No se han recibido nuevas incidencias verificadas del piloto fuera de las documentadas; el ajuste de devolución procede de revisión técnica.

Interfaz aislada: seleccionado PS-0001 (242 EUR) para el pedido C1C1F851 (72,60 EUR), guardada copia con motivo y consultada tras recargar. Conserva Roble, 2 unidades a 100 EUR, estado Aceptado; el importe del pedido permanece separado. Inventario productivo previo: 122 objetos y una operación, función nueva ausente y contrato anterior sin copiar_presupuesto.

Servidor instalado el 11/09/2026: datos_intactos, pedidos_intactos, historial_intacto y archivos_intactos en true. No se ejecutaron fixtures en producción. Interfaz confirmada como se indica a continuación.

Publicación: commit cef9685382a415c25574fc3b40363409014e404a, Actions https://github.com/estudiomoderno/moderno.app/actions/runs/34612671632 correcto. index.html, product-operations.js y purchase-finance.js HTTP 200 y coincidencia con candidato normalizando finales de línea. No se forzaron recargas.
