# Ajustes de lista y orden de ficha — v3.65.141

## Comportamiento solicitado

- La ficha de producto presenta Producto, Precios y cantidades, Características, Archivos y Acciones. Las tres últimas secciones siguen cerradas al abrir; sus controles permanecen montados.
- Los desplegables de la ficha animan su altura durante 200 ms al abrir y cerrar. Permiten teclado, cancelan animaciones anteriores ante pulsaciones rápidas y respetan movimiento reducido.
- La lista individual reutiliza el mismo menú de ajustes del proyecto que su pantalla general. El sistema de pestañas de escritorio mueve ese control a la cabecera; móvil lo conserva junto al contenido. No se duplican acciones ni cambian permisos.
- Se elimina el recuento de listas del título, de las cabeceras de grupos y del resumen del presupuesto; el número de productos se mantiene.
- Ajustes de la lista pasa a un Sheet derecho de 480 px/altura completa, adaptable a móvil. Nombre e icono se editan en borrador hasta Guardar. Se retiran del panel Margen general, Compartir y Exportar PDF/hoja. Las funciones y valores históricos no se eliminan de los registros.
- Exportar a otro proyecto, Importar de otro proyecto y Duplicar son botones al final del cuerpo. Un cambio pendiente de nombre/icono exige Guardar antes de iniciar esas acciones, para conservar el borrador. Se reutilizan los flujos existentes.
- Una línea separa el pie, con advertencia, Eliminar y Guardar azul. Eliminar utiliza la confirmación existente; Cancelar devuelve el nombre/icono que estaban pendientes. El cierre explícito descarta el borrador sin modificar la lista.

## Conservación y límites

Mismos objetos, identificadores, productos, precios, archivos, valores históricos y contratos. El nuevo guardado cambia exclusivamente nombre/icono, con persistSoon explícito. Contexto validado por sesión, estudio, rol, ámbito, proyecto/lista únicos y sus referencias; un cambio concurrente de nombre/icono bloquea guardar desde la ficha antigua. La confirmación iniciada en el Sheet vuelve a comprobar ese contexto antes de borrar.

No hay SQL, cambios de backend, Auth, Storage ni nuevas autorizaciones. Los ensayos utilizan datos ficticios y bloquean conexiones externas/escrituras HTTP; no se prueban datos reales.

## Validación

- 700 pruebas Node aprobadas.
- Chromium, servidor oficial aislado, 1440×900, 1100×768, 390×844 y 320×568: orden de producto, animaciones en ambos sentidos, pulsación rápida, teclado, movimiento reducido, Sheet, edición/guardado/cancelación, iconos, sesión/metadatos obsoletos, recuperación de borrador al cancelar borrado, confirmación y acceso al menú del proyecto.
- Pruebas existentes de editor de producto en cuatro tamaños: campos, margen, adjuntos y comparación con biblioteca conservados.
- Resumen de listas en tres tamaños: sin recuento, ajustes, exportación CSV/PDF, impresión, presupuesto protegido y creación/borrado de lista. Se actualizan selectores históricos al exportador vigente.
- Duplicación a 1440/390: identidades independientes, preservación local inmediata, solicitudes diferidas, confirmación de servidor ficticio y recuperación tras fallo. Su adaptador de prueba contempla los ayudantes actuales del escritor; no se modifica el escritor de la app.
- Capturas de escritorio y móvil revisadas. CI, despliegue, 58 hashes públicos y monitor se verifican en el PR antes de anunciar la publicación.

## Reversión

Revertir el commit y desplegar recupera la presentación previa. No restaurar registros ni cerrar borradores abiertos para forzar recargas. La eliminación confirmada es una acción del usuario; el cambio de interfaz no ejecuta borrados por sí mismo.
