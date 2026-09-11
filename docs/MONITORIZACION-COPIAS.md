# Supervisión de las copias

Activada el 11 de septiembre de 2026 en Codex: «Vigilar copias Moderno.App», identificador `vigilar-copias-moderno-app`. Revisión cada hora y aviso en la tarea cuando aparece una incidencia o se recupera. No envía correos ni modifica datos.

El supervisor es independiente del workflow de copia de GitHub. Solo cuenta ejecuciones programadas correctas de `backup-storage.yml` en main; las pruebas manuales no sustituyen la copia diaria. Avisa por fallo/cancelación, más de 30 horas sin éxito o ejecución pendiente durante más de una hora. Un error de acceso a GitHub significa estado desconocido, no pérdida demostrada de archivos. La automatización permanece silenciosa si no hay cambios.

Comprobación manual desde cualquier ordenador con Node 22+: `node scripts/check-backup-health.mjs`. Salidas: 0 correcto; 1 incidencia; 2 no se pudo consultar. No requiere credenciales. Pruebas: `node --test scripts/check-backup-health.test.mjs`.

El éxito acredita que el workflow terminó sus comprobaciones y escribió COMPLETE.json; el supervisor no descarga de nuevo cada archivo. Ante una alerta, revisar Actions y el destino privado antes de reintentar. Nunca restaurar automáticamente sobre producción.

Es una automatización local de Codex: necesita que su entorno pueda ejecutar las revisiones y tenga conexión. No es un servicio externo con disponibilidad garantizada; si este ordenador o Codex están apagados, no se garantiza el aviso puntual. Para trasladarla, recrear la supervisión en Codex y desactivar la anterior para evitar duplicados. Los umbrales y el comprobador quedan aquí documentados.
