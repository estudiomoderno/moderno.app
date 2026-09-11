# Cierre secuencial del CRM — v3.39 a v3.45

Encargo autorizado el 11/09/2026 por el usuario a través de Cerebro. Responsable único: Taller Moderno.App. Contexto estratégico privado consultado; no se publica. Este documento contiene únicamente alcance de implementación y evidencia técnica.

## Base reconciliada

main y checkout: 1934a686c98af662846bba41dfb98528d6051dc6. Interfaz servida v3.38 idéntica al archivo local normalizando finales de línea. Actions 34609210903 completado con éxito. No hay otro Taller modificando el CRM en el inventario de tareas. El plan privado local continúa sin seguimiento de Git. Mantener rama taller-operativa-20260909 y checkout aislado moderno-validacion.

## Criterios y dependencias

| Versión | Criterios de aceptación | Dependencia / comprobación | Estado |
|---|---|---|---|
| 3.39 | Pedido conserva copia fija del presupuesto seleccionado, su referencia y revisión; cambios posteriores no reescriben esa copia. No adjudicar presupuestos ambiguos automáticamente. Revisar incidencias del piloto documentadas. Invitación completa solo con destinatario y alta autorizados expresamente. | Reutilizar operaciones/eventos v3.37 y autorización v3.38. Validar servidor, aislamiento, concurrencia y conservación. | Publicada; ensayo externo de invitación pendiente |
| 3.40 | IDs existentes preservados; referencias legacy resueltas sin adivinar; duplicados diagnosticados sin renombrado/fusión automática; maestro y especificación diferenciados. | Auditar prepare/resolve y consumidores; fixtures de mover, reordenar, duplicar y referencia ambigua. No migración global. | Publicada |
| 3.41 | Seleccionar acabado/variante/unidad y artículo a medida; origen identificable; actualización de maestro explícita y revisable sin tocar documentos anteriores. Estados de selección, aprobación y compra claramente separados. | 3.40, campos existentes y guardado protegido; demostrar dos especificaciones independientes del mismo maestro. | Publicada |
| 3.42 | Board por estancia con pocas plantillas útiles, revisión conservada y proyecciones por audiencia que no filtren costes. Recursos privados fallidos se declaran. | 3.40–3.41, reutilizar editor/render/export existentes; ensayar permisos, imágenes, historial y exportación. | En curso |
| 3.43 | Aprobación corresponde a revisión exacta; alternativas identificadas; cambio relevante invalida aprobación; cantidades de presupuesto trazables; documentos emitidos intactos. | 3.39–3.42; pruebas de cambios, duplicados, cantidades, versiones antiguas y roles. | Pendiente |
| 3.44 | Comparar ofertas y registrar pedido parcial/plazo/incidencia/instalación; relación económica consistente sin duplicar contabilidad ni transferir dinero. | Reutilizar operaciones v3.35–3.37 y 3.39. Pruebas de parciales, incidencias, devoluciones, pagos separados y dos sesiones. | Pendiente |
| 3.45 | Recorrido integral, roles, móvil, accesibilidad, rendimiento con fixtures representativos, recuperación/reversión y ayuda. Separar evidencia real, simulada y pendiente. | Todas las anteriores; muestra propuesta 10 estancias/100 especificaciones más nombres largos, imágenes fallidas, sesión concurrente. | Pendiente |

## Puertas de publicación

Cada entrega incluye pruebas pertinentes, notas y reversión, commit identificado, Actions correcto y recursos servidos verificados. Recursos antes de HTML. No forzar recargas ni asumir cierre del piloto. Mantener compatibilidad con v3.38 y versiones anteriores; si un cambio exige transición incompatible, retener su publicación hasta coordinación real y avanzar en lo independiente.

Antes de esquema/guardado/archivos: utilizar clon recuperado, comprobar conservación de datos y archivos y ensayar cambio y reversión. No restaurar una base antigua sobre escrituras nuevas. Las copias diarias no sustituyen evidencia de recuperación. No escribir fixtures en producción.

El éxito de correo local y la autenticación SMTP previa no acreditan entrega en buzón real. No se ha identificado aún autorización específica para crear una membresía productiva de prueba y enviarle una invitación. Revisar autorizaciones; si no existe, registrar ese ensayo externo como pendiente sin bloquear trabajo independiente.

## Registro de evidencia

- Inicio: v3.38 reconciliada como se indica arriba; 215 pruebas Node, 24 PHP y 10 de correo aislado son evidencia de la entrega anterior, no de las nuevas.
- Registro detallado de cada versión: crear ENTREGA-V339.md a ENTREGA-V345.md y actualizar esta tabla tras verificar cada publicación.
- Fuera de alcance: catálogo público, CAD, nuevas integraciones/IA/idiomas, marketplace, Web y Panelcontrol. Sin automatizaciones ni tareas nuevas.

- 3.39 publicada: cef9685 / Actions 34612671632; 219 Node y 18 SQL, UI y reinstalación conservadoras. Ver ENTREGA-V339.md. Inicio de 3.40: prepare todavía reasigna IDs repetidos; sustituir reparación implícita por diagnóstico y bloqueo seguro de operación ambigua, sin fusión ni renumeración masiva.
