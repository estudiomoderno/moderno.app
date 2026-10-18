# Pestañas de proyectos — v3.65.42

Petición del propietario del 18/10/2026: retirar la cabecera grande que reduce el espacio de trabajo y permitir varios proyectos abiertos, tomando como referencia las pestañas de Rayon/Chrome. Rama `interfaz/pestanas-proyectos`, base `9cc8413` (#65). Evolución de escritorio de #49.

## Resultado

En escritorio (desde 1100 px), una fila de 38 px sustituye al título grande y las migas repetidas. Cada proyecto tiene una pestaña con número/nombre y cierre; el nombre completo sigue disponible al pasar el cursor. «+» abre un buscador de proyectos existentes por nombre, número o cliente, incluyendo archivados identificados como tales. El icono de cuadrícula vuelve al listado. Muchas pestañas se desplazan horizontalmente; no reducen el ancho del contenido.

El icono de información muestra el título, cliente y etiquetas originales. Las opciones de tres puntos conservan sus nodos, handlers y acciones: editar, personalizar, Portal del cliente, duplicar y eliminar. Cerrar una pestaña no ejecuta ninguna de esas acciones ni elimina el proyecto. Al cerrar la activa se selecciona la adyacente; al cerrar la última se vuelve a Proyectos.

Las pestañas recuerdan en memoria la sección, estancia y desplazamiento al alternar entre ellas. Las calculadoras de Utilidades conservan sus entradas por proyecto. Pulsar la pestaña ya activa no reconstruye el contenido. Flechas, Inicio/Fin y Suprimir permiten recorrer/cerrar pestañas con teclado; Escape cierra el buscador o la información. Se respeta movimiento reducido.

La navegación nueva rechaza cambiar mientras haya un modal/formulario, un visor nativo abierto o la bienvenida del cliente en edición. Los borradores de facturas/presupuestos y Ajustes mantienen además sus protecciones originales. No se descartan ediciones automáticamente.

## Alcance y conservación

`app/project-workspace.js` mantiene solo estado de navegación en memoria, fuera de `state` y de las colecciones persistentes. Reutiliza `go`, `projTab`, `byBrand` y permisos originales; no concede acceso a proyectos que no estén en la colección y el ámbito visibles. Se limpia al cambiar estudio, usuario, rol o filtro de espacio, durante carga y al perder acceso. Proyectos eliminados o fuera de ámbito salen de la barra. Solo sesiones internas reconocidas pueden activarla; portales y gestoría quedan excluidos.

No se duplican documentos, proyectos, tareas, compras, presupuestos ni historiales. No hay cambios de esquema, APIs, Supabase, Storage, guardado, permisos de servidor, copias o correo. Las pestañas no son nuevas ventanas del navegador ni editores simultáneos de planos; el visor conserva su ciclo y guardas actuales. Al recargar se inicia de nuevo la memoria de pestañas; no se guarda una lista compartida de proyectos abiertos.

CSS limitado a la fila y a la reserva de espacio de escritorio. Logotipo, cabecera superior, dock inferior, datos de las fichas y rutas existentes se conservan. Móvil/tablet mantiene su cabecera y navegación previas.

## Comprobaciones y límites

- 469 pruebas Node correctas, incluidos acceso por rol/sesión, ámbito de espacio, proyectos inexistentes/plantillas, formularios abiertos, navegación cancelada y reversión.
- Chromium con servidor oficial aislado a 1440/1100/390 px, backend desactivado, identidades y registros ficticios, solicitudes externas y escrituras HTTP bloqueadas.
- Alternancia entre proyectos, secciones, estancia y calculadoras; cierre activo/inactivo/último sin borrar registros; selector por cliente con acentos; teclado; nombres largos y texto no confiable; doce pestañas y desplazamiento; limpieza por cambio de sesión/espacio, proyecto eliminado y rol externo.
- Formularios de proyecto sin guardar, bienvenida y visor abiertos conservados al rechazar el cambio. Integridad de colecciones ficticias y misma instancia del contenido al pulsar la pestaña activa o cerrar otra.
- Restauración de cabecera/opciones originales por desactivación. En el fixture, el contenido comienza **173 px antes** que con la cabecera anterior. Inspección visual clara/oscura.
- Regresión de la aplicación completa: módulos, menús, Ajustes, permisos simulados y retorno a la interfaz anterior a 1440/1100/390 px. PHP se comprueba en Actions porque no está instalado localmente, sin enviar correo.

No se prueban cuentas ni escrituras reales, autenticación productiva o dispositivos físicos. El recuerdo de sección se aplica al cambio entre pestañas; el historial del navegador mantiene el enrutador existente.

## Publicación y reversión

CI previa y proceso habitual `deploy-app.yml`, recursos antes del HTML. La verificación SHA-256 se amplía a 16 recursos públicos, incluidos `project-workspace.js` y su CSS. Registrar en el PR el resultado final del despliegue antes de anunciar publicación.

Desactivación de presentación: `ModernoProjectWorkspace.setEnabled(false)` devuelve los nodos originales a su sitio, sin tocar registros. Si falla su presentación, se desactiva y restaura la navegación anterior. Reversión estable: revertir el commit y publicar por el mismo proceso. No restaurar BD, borrar archivos o limpiar almacenamiento local. No se fuerzan recargas de sesiones abiertas.

## Presentación ReUI solicitada — v3.65.52

El propietario sustituye el icono de cuadrícula por una casa que sigue abriendo Todos los proyectos, con el Button outline/icon original de notificaciones y HouseIcon de Lucide, sin contador. Las pestañas utilizan su patrón original Badge outline/gap-0.5 con Button ghost/icon size-3 y XIcon al final. Se mantienen Inter y tamaños originales: casa 32 px/icono 16 px, Badge 20 px/texto 12 px, cierre 12 px. El título selecciona el proyecto; cerrar solo retira la pestaña de la sesión. La selección tiene fondo neutro y los títulos largos se recortan con el nombre completo disponible al pasar el cursor.

La presentación se monta con la compilación aislada existente de ReUI, compartiendo recursos locales y conservando la instancia entre cambios de pestaña. El controlador original sigue siendo dueño de la lista en memoria, permisos/ámbito, navegación, recuerdos de sección/estancia/calculadora y protección de borradores. Teclado y foco atraviesan explícitamente el límite Shadow DOM; la primera carga espera su CSS antes de devolver el foco. Si falla la presentación se recupera la barra nativa, con casa y los mismos callbacks. Móvil conserva su navegación. No hay cambios de esquema, datos, autenticación, almacenamiento o dependencias.

Comprobaciones de esta entrega: Node, integridad de originales/compilación, Chromium aislado a 1440/1100/390 px; medidas originales, casa/listado/retorno, cerrar activa/inactiva/última sin borrar registros, teclado, buscador, doce pestañas/desplazamiento, ámbito de sesión, borradores y recuperación por fallo de CSS. Además, regresión de la app completa en los tres anchos, con datos ficticios, SDK desactivado y solicitudes remotas bloqueadas. PHP en Actions sin enviar correos. Sin cuentas reales ni dispositivos físicos. El PR registra resultados efectivos y publicación SHA-256 de 26 recursos públicos. Revertir la entrega y desplegar recupera #75 sin restaurar datos.
