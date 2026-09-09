# Changelog

## v3.32.4 — etiquetas de carpeta

- El recorte del título se limita al nombre; las etiquetas quedan fuera y la portada adapta su altura. Verificado con nombre de dos líneas, foto y etiqueta completa. 142 pruebas correctas y sintaxis comprobada. Sin cambios de datos.

## v3.32.3 — editor de proyecto

- Corrige el color de carpeta: se respeta la elección, con beige por defecto y texto contrastado.
- Editor coherente con la app, adaptable a móvil; botón Añadir fotos integrado y sin selector de emojis. Los valores antiguos de icono se conservan sin mostrarse en carpetas.
- Estado en borrador hasta Guardar cambios. 142 pruebas y comprobación visual de color guardado, carga desde el nuevo botón y ancho móvil sin desbordamiento.

## v3.32.2 — fotos en carpetas

- Hasta tres fotos opcionales desde Personalizar, previsualización, retirada y cancelación sin alterar los originales. Transición suave entre capas; respeta movimiento reducido y mantiene tonos neutros.
- Miniaturas JPEG de hasta 320 px y 48.000 caracteres por foto, dentro del proyecto y su sincronización existente. No se suben los originales ni se crean objetos públicos.
- 141 pruebas correctas, sintaxis y carga/guardado/cancelación comprobados localmente con imágenes ficticias.

## v3.32.1 — ajustes visuales

- Menú activo gris sin franja lateral; carpetas gris/beige suave también en oscuro.
- Selectores y listas con radio de 12 px. Los selectores cmb conservan el menú estilizado en navegadores compatibles con base-select; los demás mantienen el control nativo.
- 137 pruebas correctas, sintaxis y revisión visual local con datos ficticios. Sin cambios de datos ni permisos.

## v3.32 — apariencia B

- Superficies neutras, colores diferenciados de estado, iconos y menú originales. Tablero móvil sin columnas solapadas, controles estables y mejoras de contraste. Sin cambios de datos ni permisos. Validación y vuelta al aspecto anterior en ENTREGA-V332.md.

## v3.31 — flujos de trabajo

- Revocación real de acceso, guardado conjunto de operaciones, resolución explícita de conflictos, errores de conexión con reintento y exclusión de tareas terminadas en ICS. Procedimiento y pruebas en ENTREGA-V331.md.

## v3.30.2 — copias sin aviso automático

- Se elimina el aviso amarillo al entrar. Las copias se conservan y pueden consultarse desde el estado de sincronización → Ver copias anteriores.

## v3.30.1 — recuperación de espacio local

Publicada el 9/9/2026. HTML y módulos comparados con el código probado; recuperación del acceso y descarga de una copia archivada comprobadas en navegador.

- Si las copias pendientes llenan localStorage, se archivan en IndexedDB y se verifica cada contenido antes de sustituirlo por una referencia pequeña. Todas siguen disponibles para descargar; no se eliminan copias ni se aplican sobre la nube.
- La entrada de sesión espera a la comprobación de acceso antes de programar la escritura local.
- 127 pruebas automáticas correctas, incluidas fallas de almacenamiento y cambios simultáneos en copias.

## v3.30 — publicada el 9 sep 2026

- Workspace/Inicio: Mis tareas y Todas las tareas conservan tipografía y dimensiones al seleccionarse; cambia el fondo.
- Workspace: Lista y Calendario mensual junto al Tablero, con los mismos filtros y preferencia de vista por cuenta/dispositivo. Las tareas sin fecha siguen disponibles. Detalles y pruebas en WORKSPACE-VISTAS.md; Cronograma queda para después.

Versión pública identificada como v3.30. Las denominaciones anteriores v3.30-rc.1, v3.30-pruebas y v3.31-operativa-pruebas fueron ensayos, no entregas. Evidencias y procedimiento en ENTREGA-V330.md.

- Inicio y Mis tareas: prioridades por fecha, asignaciones compartidas, acceso directo a tareas y búsquedas con resultados vacíos claros.
- Estado visible de guardado, conservación y descarga de cambios pendientes y navegación móvil más compacta.
- Incluye el candidato previo de guardado versionado y acceso privado a archivos y portales. Requiere transición coordinada; no entregar únicamente el HTML.
- Preparación de impresión: firma y carga de imágenes antes de abrir el diálogo; cancelación con aviso si el documento queda incompleto. Preparación del paquete de obra comprobada con un plano ficticio privado en el clon.
- Gestoría: consulta financiera de solo lectura y descarga de PDF; colaboradores con lectura filtrada y conservación de datos privados al guardar. Google Calendar queda aplazado.

## v3.29 — 8 sep 2026
- Lectura real del PDF de gasto con pdf.js (total con IVA, % IVA, fecha, nº factura, proveedor).

## v3.28 — 8 sep 2026
- Barra de Contabilidad fija al hacer scroll (`.acc-sticky`).

## v3.27 — 8 sep 2026
- Casado de proveedor con la agenda al leer facturas de gasto (`matchSupplier`).

(Completar hacia atrás según los traspasos del Taller.)
