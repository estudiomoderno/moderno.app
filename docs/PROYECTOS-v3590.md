# Proyectos · v3.59.0

## Comportamiento

- Al abrir un proyecto se muestran la próxima fecha de tarea pendiente, tareas pendientes, porcentaje de tareas terminadas y, para administradores, el importe pendiente de cobro registrado. Se reutiliza el cálculo contable existente; no se crean cobros ni se cambian estados.
- Atención: tareas vencidas, presupuestos pendientes sin factura asociada (solo administradores) y 14 días sin actividad registrada. La inactividad usa fecha de creación, conversación, comentarios de tareas y el nuevo historial. No equivale a comprobar toda la actividad: los registros antiguos sin fecha no generan este aviso.
- Filtros combinables por responsable de tareas, cliente, estado y atención. Se guardan en este navegador, separados por estudio, usuario y marca. En móvil se despliegan desde «Filtros» para no ocupar la pantalla.
- «Editar datos» modifica nombre, estado, cliente y etiquetas. «Personalizar carpeta» modifica únicamente el color. No se eliminan fotos antiguas ni archivos.
- Historial informativo de cambios desde esta versión: datos anteriores, color, alta/baja de tareas, título, estado, fecha y participantes. Incluye movimientos desde Mis tareas, importación de tareas y archivar/desarchivar. No es un registro de auditoría inmutable ni reconstruye autores anteriores. No registra cambios financieros ni modificaciones realizadas con versiones antiguas.

## Persistencia y permisos

Los eventos se añaden a `project.comments` usando `cid: project-change-UUID`, `who`, `ts` y `txt`, campos ya admitidos por la proyección de colaboradores. Se mantienen separados de la conversación `project.chat`. Las plantillas nuevas no copian el historial del proyecto original.

La unión de comentarios conserva eventos recibidos. La combinación de guardados admite altas simultáneas de este historial por su `cid`, incluida la primera creación del campo. Los cambios incompatibles siguen exigiendo resolución; no se sustituye silenciosamente un valor. El diario usa el nombre de la sesión y la hora del dispositivo, por lo que es informativo.

No hay migraciones SQL ni escrituras administrativas a Supabase. Los cambios de usuario siguen el guardado existente con sus permisos. El resumen no consulta importes ni presupuestos para colaboradores. Las pruebas usan datos ficticios locales; no se han alterado proyectos reales para probarlo.

## Verificación y publicación

Ejecutar desde la raíz: `node --test scripts/*.test.mjs`. La batería incluye cálculos, filtros, permisos del resumen, escape de textos, historial, combinación concurrente y absorción idempotente. Revisión local de filtros, edición e historial y de la distribución a 390 px y escritorio.

La publicación usa el workflow existente `deploy-app.yml`: recursos primero, HTML al final. Confirmar que el workflow del commit termina correctamente y que `https://app.moderno.app/` sirve `MODERNO_VER="v3.59.0"`.

Para retirar la interfaz, revertir el commit de esta versión y desplegar mediante el mismo workflow. No borrar eventos o archivos ni restaurar una base de datos para revertir una presentación. Conservar el tratamiento de unión del historial si hay usuarios que continúan usando la versión nueva.

## Ajuste v3.59.1

En las carpetas, el aviso de 14 días sin actividad aparece al señalar con el ratón, recibir foco de teclado o desplegar la carpeta (también en móvil). Los demás avisos y el resumen interior conservan su comportamiento.

## Ajuste v3.59.2

Se retiran de Proyectos los filtros de responsable, cliente, estado y atención a petición del usuario. El listado utiliza únicamente el buscador y la selección existente de activos/archivados. Las preferencias antiguas de filtros ya no se leen ni afectan a los resultados.
