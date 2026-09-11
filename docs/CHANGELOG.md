# Changelog

## v3.37 — fichas, presupuestos e instalación

- Presupuestos desde fichas con identidad y copia de características, también desde el proyecto.
- Solicitudes parciales y límite acumulado de unidades confirmadas entre pedidos.
- Instalación y retirada por cantidades con historial; devolución limitada al material sin instalar.
- Resumen de pedidos separado de etiquetas manuales, sin sumar unidades distintas.
- Validación e instalación detalladas en ENTREGA-V337.md.

## v3.33 — rutas con idioma y transición

- Rutas limpias /es/ mediante History API, enlaces antiguos compatibles y rutas de detalle de estancias y presentaciones. Apache sirve enlaces directos sin capturar recursos ni API.
- Fundido de 180 ms al cambiar vista o pestaña del proyecto, sin retrasos ni repetición por guardados/sondeos; respeta movimiento reducido. Estado de carga accesible.
- Retorno de autenticación a la raíz existente y recuperación del destino en la misma pestaña. Formularios abiertos protegidos ante Atrás/Adelante. Solo español disponible.

## v3.32.6 — logo aprobado

- Logo moderno con .app pequeño, conservando composición y Berlin Sans FB Demi mediante trazados SVG. Grafito en claro, blanco en oscuro, variante azul disponible. Menú, cabecera móvil y acceso actualizados; m del menú plegado conservada.
- 142 pruebas correctas y revisión visual local. Sin cambios de datos ni logos de estudios.

## v3.32.5 — menú contraído

- El botón de expandir ocupa su propia fila bajo el logo y deja 14 px antes de Inicio. Ya no se superpone a la navegación; etiqueta y estado accesible reflejan plegado/expandido. 142 pruebas correctas y revisión visual local.

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

## v3.33.1 — Facturas y cobros
Filas y acciones alineadas, importes sin saltos, eliminación de Solo en Contabilidad y ventana de cobros espaciosa que respeta facturas antiguas marcadas cobradas. 155 pruebas. Detalles: FACTURAS-V3331.md.

## v3.33.2
Tema oscuro grafito y orden móvil logo, espacio de trabajo, menú, modo, usuario. Ver TEMA-V3332.md.

## v3.34 — Productos y Boards
Biblioteca y especificaciones independientes, Board derivado por estancia, referencias estables al editar como administrador, retirada de simulaciones de importación/conexiones y adjuntos con contenido. Alcance, compatibilidad y validación en ENTREGA-V334.md.
## v3.35 — 11 de septiembre de 2026

Aprobaciones por identidad y revisión, ofertas de proveedores, pedidos confirmados, recepciones parciales e historial en servidor. Nuevos documentos PDF de compra, separados de precios de venta; no envía correos ni registra pagos. Se retiran decisiones por nombre y se añaden identidades de sección. Validación: 182 pruebas locales y 20 comprobaciones SQL en el clon, más recorrido real de interfaz. Requiere el paquete SQL aditivo; ver ENTREGA-V335.md.
