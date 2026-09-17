# Proyectos: carpetas interactivas v3.58.0

Referencia aprobada: https://www.rareui.com/components/foldercomponent. Adaptación propia con CSS y details/summary nativos, sin React ni dependencias nuevas.

Nombre, cliente y estado siempre visibles. Tarjetas asoman al hover; clic/toque/Enter/Espacio abre las acciones; Escape cierra y devuelve el foco. Abrir proyecto usa la navegación existente. Editar, Duplicar, Archivar/Desarchivar y Eliminar llaman a las funciones actuales (incluida confirmación y papelera). Acciones de modificación visibles para admin/col; sin modificación de permisos de servidor. Lista, cronograma, filtros, fotos y datos se conservan. No hay migración.

El efecto respeta movimiento reducido. Colores crema, negro y amarillo suave, con variante oscura. La página Inicio conserva sus carpetas previas.

Validación: 336 pruebas automatizadas superadas. Revisión visual con seis proyectos ficticios a 1280 y 390 píxeles: abrir, editar, menú, duplicar (despacho simulado sin datos), Enter y Escape. Ajustado menú para quedar dentro del ancho de la tarjeta y móvil a una columna. Las operaciones de negocio mantienen las funciones existentes.

## v3.58.1
Nombre completo dentro de la solapa, con altura adaptable. Retirada la carga y visualización de fotos de carpeta; las fotos ya almacenadas se conservan y guardar la edición no las modifica.

## v3.58.2
La vista nueva ignoraba p.color: ahora usa folderColors(p) en sus variables de color, incluido contraste de texto. Icono plus.svg aportado por Javier. Apertura/cierre de altura y opacidad de 220/180 ms; cierre secuenciado de la anterior antes de abrir otra. Escape y movimiento reducido soportados.

Validación: 338 pruebas correctas, incluyendo saveCustomize + serialización/recarga simulada del color, apertura exclusiva y movimiento reducido. Comprobación de interacción en navegador a 1280 y 390 px. NO se ha verificado persistencia real en Supabase en esta iteración: el servidor del clon estaba apagado; se reinició, pero la revisión automática bloqueó consultar la página de claves aun con autorización de la clave anon. No se consultaron claves privilegiadas ni se modificaron datos de producción. La prueba de nube queda pendiente.

## v3.58.3 — Referencias Rare UI

- Adaptación de https://www.rareui.com/components/foldercomponent: silueta de solapa con pestaña izquierda, acabado translúcido y papeles animados. Se conservan nombre dentro, colores por proyecto, icono + y acciones actuales; no se muestran ni eliminan fotos antiguas.
- Adaptación de https://www.rareui.com/components/hooksidebar: trazo curvo discontinuo que sigue la selección y previsualiza foco/ratón. Negro con halo claro fino sobre el menú oscuro; iconos existentes intactos.
- Implementación nativa sin dependencias React. Ambos efectos respetan movimiento reducido. Cierre de carpeta mide altura final cerrada para evitar saltos.
- Verificación: 338 tests correctos; revisión visual local de carpetas y menú, una sola carpeta abierta y cierre con Escape. No se han realizado cambios en Supabase ni pruebas nuevas de persistencia real del clon.

## v3.58.4 — Trazo del menú
Guiones finos 5/4 px sin halo ni puntos redondos, opacidad 18 % (10 % al previsualizar). El origen se calcula en el centro del icono de la sección al cambiar el ancho. Revisión visual local y 338 tests correctos.

## v3.58.5 — Encabezados con degradado
Borde inferior difuminado compartido en encabezados fijos de proyectos, presencia, contabilidad y editor de documentos. Sigue el color de cada superficie y el modo oscuro; 28 px en escritorio y 20 px en móvil. No intercepta clics ni afecta impresión. Comprobación visual con desplazamiento y 338 tests correctos.

## v3.58.6 — Apertura compacta
Se elimina el margen adicional de apertura y se reduce el recorrido de los folios. Pulsar fuera cierra la carpeta; las acciones y el cambio a otra carpeta siguen funcionando. Verificación visual local, edición y cierre exterior, 338 tests correctos. Sin cambios de datos.

## v3.58.7 — Remate del menú
El ancho del trazo se calcula hasta el borde izquierdo real del botón; el recorte impide que invada su fondo. Mismo ajuste para selección y previsualización. Verificación visual y geométrica (fin del trazo igual al borde), 338 tests correctos.

## v3.58.8 — Menú comprimido y estudio
Se ocultan los trazos en navmini. El desplegable del estudio aparece hacia arriba con fundido de 220 ms, respetando movimiento reducido. 338 tests correctos.
