# v3.32 — apariencia B

Publicada y verificada el 9 de septiembre de 2026. Commit `5f92f81`; [despliegue correcto](https://github.com/estudiomoderno/moderno.app/actions/runs/34380762368). Los ocho recursos públicos (HTML, CSS y seis módulos) coinciden con el candidato. La sesión autorizada carga Mis tareas, usa el fondo B y muestra guardado en nube. No se han forzado recargas del equipo.

## Decisión

El usuario elige la dirección B: superficies neutras, colores de estado más definidos, iconos originales y menú contraíble. Después de revisar la maqueta autoriza aplicarla y publicarla. Referencia cromática: estados con color y etiqueta, como en la [documentación de Monday](https://support.monday.com/hc/en-us/articles/360001269685-The-Status-Column); no se incorporan sus recursos ni dependencias.

## Implementación

- `app/appearance-b.css` aplica la presentación de pantalla sobre la app existente: fondos claros, selección azul, tarjetas neutras, estados gris/ámbar/violeta/verde con sus nombres y vencimientos etiquetados.
- Los iconos, rutas, menú contraíble, formularios y operaciones permanecen en el código original. El HTML añade únicamente el enlace al CSS, atributos visuales de estado/responsable y la versión.
- Mis tareas mantiene controles de tamaño estable y un subtítulo junto al encabezado. A anchos pequeños el tablero dispone las columnas verticalmente para evitar su solapamiento. Lista y Calendario conservan desplazamiento horizontal con una ayuda visible al inicio.
- Las carpetas y cabeceras conservan el color del proyecto en la parte superior y reducen la superficie coloreada. No se reescriben las preferencias guardadas.
- Se corrige el contraste de las selecciones y etiquetas de tareas en modo oscuro. Los estilos nuevos de pantalla excluyen portales; el archivo completo está dentro de `@media screen` para no modificar la impresión.
- No hay migración, actualización de funciones, permisos ni cambios de Storage. No se restauran copias ni se borran registros o archivos.

## Comprobaciones

137 pruebas existentes correctas y sintaxis de tres scripts inline comprobada. Revisión local sin conexión de datos, con dos proyectos y tareas inventados: Inicio, tablero, Lista, Calendario, Proyectos y detalle; tamaños 1440×1000 y 390×844. Menú original contraído/expandido, apertura y cancelación del formulario de tarea y selección legible en oscuro comprobados. En móvil el documento mide 390 px y las columnas ocupan 355 px sin solapamiento; los selectores de alcance tienen dimensiones iguales.

No constituye una auditoría completa de accesibilidad ni una prueba en todos los dispositivos. Las tablas largas siguen necesitando desplazamiento horizontal.

## Publicación

Publicar mediante el workflow habitual: pruebas, recursos (incluido CSS), después HTML. Verificar respuesta 200 y contenido exacto de `index.html` y `appearance-b.css`, además de la carga de una sesión. Las sesiones abiertas usan el mecanismo existente de actualización segura; no forzar su recarga.

## Volver al aspecto anterior

La base previa es `e3ecb77` (app v3.31). Para revertir únicamente este diseño, retirar el enlace a `appearance-b.css` de `app/index.html`, aumentar la versión a la siguiente revisión y publicar por el mismo workflow. Los atributos visuales adicionales son inertes sin esa hoja. Esto recupera los estilos previos sin tocar datos ni deshacer arreglos funcionales futuros. No usar una restauración de base de datos para un cambio de apariencia.


## Ajuste v3.32.1

Solicitado por el usuario: menú gris sin franja, carpetas gris/beige claro y desplegables redondeados. Solo CSS y versión; conserva los colores guardados en los proyectos, sin modificar registros. Radio de 12 px en controles y listas. Se corrige la anulación de base-select por cmb; en navegadores sin soporte el menú depende del sistema. Validado con proyectos ficticios, formulario de proyecto y autocompletado abiertos; 137 pruebas y sintaxis correctas. Publicación por el workflow habitual, sin forzar recargas.

Publicado el 9/9/2026: commit 01da24c, workflow [34384055800](https://github.com/estudiomoderno/moderno.app/actions/runs/34384055800) correcto. Los ocho recursos públicos responden 200 y coinciden exactamente con el código probado (normalizando finales de línea). Menú y carpetas también comprobados en modo oscuro local.


## Fotos opcionales v3.32.2

Desde Personalizar se eligen hasta tres JPG/PNG/WEBP, máximo 12 MB por original. La conversión se realiza en el navegador y guarda solo una miniatura JPEG de hasta 320 px y 48.000 caracteres. Campo opcional folderPhotos en el proyecto: usa permisos, sincronización y copias existentes, sin SQL ni objetos públicos. Quitar una miniatura no borra archivos. Cancelar descarta el borrador; una conversión que termina después de cerrar el formulario no modifica el proyecto. Guardar espera a la conversión.

141 pruebas correctas, incluida validación de fuentes/tamaño, conservación de adjuntos y cancelación asíncrona. Revisión local: tres imágenes, guardado, reapertura y retirada cancelada conserva las tres; miniaturas cargadas y textos sin solapamiento. Animación CSS 240 ms, desactivada con movimiento reducido y en dispositivos sin hover. Para revertir esta función, retirar controles y representación de folderPhotos, conservando el campo almacenado. No restaurar la base de datos.

Publicada v3.32.2 el 9/9/2026: commit ad54f90, [despliegue 34385634870](https://github.com/estudiomoderno/moderno.app/actions/runs/34385634870) correcto. Los ocho recursos públicos responden 200 y coinciden con la versión probada normalizando finales de línea.


## Editor v3.32.3

Petición del usuario: corregir elección de color, integrar botón de fotos, retirar emojis y unificar ventana de edición. La hoja de apariencia estaba sobreescribiendo el color elegido; ahora usa las variables de cada carpeta. El beige es predeterminado y los colores explícitos guardados vuelven a mostrarse. Se calcula texto claro/oscuro por luminancia. Editor de dos columnas y una en móvil, acciones de guardado visibles al desplazar. El estado del proyecto se aplica junto al resto al guardar, no al seleccionarlo. Los iconos antiguos permanecen en los datos, sin control ni representación en carpetas.

142 pruebas correctas; sintaxis validada. Revisión local ficticia: color salvia en vista previa y carpeta guardada, botón Añadir fotos abre selector y prepara miniatura, sin selector de emojis ni botón nativo visible. Móvil 390 px: ancho interior y contenido del modal 352 px, sin desbordamiento horizontal. Sin SQL, borrados ni cambios de permisos.

Publicada v3.32.3 el 9/9/2026, commit f6986db. Los ocho recursos públicos responden 200 y coinciden exactamente con el código validado normalizando finales de línea.


## Etiquetas v3.32.4

Corrección visual: el límite de líneas de fname incluía las etiquetas y las recortaba. Se separa folder-title de folder-tags y la portada con fotos adapta su altura. Verificado localmente con datos ficticios, título de dos líneas, una foto y etiqueta completa; 142 pruebas y sintaxis correctas. No modifica datos ni archivos.

Publicada v3.32.4 el 9/9/2026, commit d9afb8b. Ocho recursos públicos con respuesta 200 y coincidencia exacta con el código probado, normalizando finales de línea.


## Menú v3.32.5

Control plegado en flujo normal de la cabecera, en lugar de posición fija sobre Inicio. Revisión visual local y medidas DOM: debajo del logo y 14 px de separación con el primer enlace. 142 pruebas correctas. Solo disposición y etiqueta accesible; no cambia datos, iconos ni el comportamiento móvil.

Publicada v3.32.5 el 9/9/2026, commit 4d20b4e. Ocho recursos públicos con respuesta 200 y contenido exacto comprobado normalizando finales de línea.
