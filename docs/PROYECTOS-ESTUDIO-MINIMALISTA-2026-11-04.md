# Proyectos — Estudio minimalista · #187 · v3.65.146

La pantalla general sustituye las tarjetas verticales con flecha circular por fichas con portada horizontal 16:10, título Acorn de hasta dos líneas, cliente solo cuando existe y pie compacto con PR, avisos existentes y porcentaje/barra únicamente cuando hay tareas. Se conserva el cálculo de ModernoProjectInsights.metrics. El fondo geométrico crema/grafito e iniciales no representa una fotografía ni información nueva del proyecto.

La cuadrícula usa el ancho real del contenedor: cuatro columnas desde 1100 px, tres desde 800, dos desde 560 y una por debajo. Se mantienen el shell/identidad vigente, logo y su visibilidad actual, pestañas, perfil, búsqueda por proyecto/cliente, creación, archivo y acceso mediante projectOpen y sus guardas. No se restaura un selector de vistas: la página vigente ya era exclusivamente cuadrícula. No se cambia la presentación de otras secciones ni las carpetas utilizadas en ellas.

## Portadas y límites

El modelo ya permite elegir explícitamente una imagen `docKind=portal-cover` mediante ClientPortalSite. La ficha reutiliza esa selección y posición existentes, si cli no es false y el tipo es JPEG/PNG/WEBP. Se admiten imágenes incrustadas válidas o referencias Storage del estudio activo y orígenes conocidos; nunca la primera imagen de adjuntos, URLs externas de stock, imágenes de otros estudios ni SVG. Se reutilizan fileImageAttrs/fileLoadImage y el firmador/caché/identidad vigentes sin modificar su contrato, permisos o persistencia. Carga lazy, object-fit:cover y fallback ante fallo. No hay trazas de URLs privadas.

No se incorpora un selector de portada en esta pantalla ni se crean campos. Proyectos sin una portada explícita válida usan el fallback. Si se desea una selección independiente de la del portal, es un encargo posterior. No se ha consultado ni modificado ningún registro real, esquema, Storage, RLS, Auth, precios, compras, PDFs, Windows o prototipo.

## Validación

- 701 pruebas Node correctas, incluidas conservación de registros, progreso real, escape de etiquetas, selección explícita y rechazo de orígenes/tipos no admitidos.
- Nueva prueba Chromium aislada a 1920/1440/1200/1000/768/390/320 px: 0/1/27/80 proyectos, columnas 4/4/3/2/2/1/1, nombres largos, Acorn, sin cliente/tareas, portada válida, error, adjunto no elegido y URL externa nunca solicitada, búsqueda sin resultados/archivados, teclado Enter/Espacio y clic modificado, perfiles y zoom 125/200 %, sin desbordamiento.
- Regresión de proyectos a 1440/1100/390: creación, búsqueda, archivos, progreso 0/67/100 %, avisos accesibles independientes de la tarjeta, navegación y datos ficticios sin cambios.
- Regresión de cabecera a 1440/1100/900/390: navegación interna, pestañas/contexto, formularios con borrador y roles. La prueba espera también la anchura final de la animación del lateral, sin cambios del comportamiento de producción.
- Capturas de escritorio y móvil revisadas. Servidor oficial aislado, fixtures, conexiones externas y escrituras HTTP bloqueadas. No se realizaron pruebas con cuentas/archivos reales ni en WebView2 nativo; se verificaron sus anchos equivalentes en Chromium.
- git diff --check correcto. PHP no está instalado localmente; los controles PHP obligatorios se ejecutan en CI y en el workflow de despliegue antes de publicar.

## Publicación y reversión

PR vinculado a #187, revisión de alcance y checks antes de integrar. El workflow existente publica recursos antes del HTML y verifica por hash 58 recursos públicos, incluido el HTML y CSS modificados. Confirmar su resultado final y el monitor antes de anunciar la publicación; la configuración Google se inyecta exclusivamente por el procedimiento existente.

Riesgo principal: portadas no disponibles o no admitidas mostrarán el fondo neutro. La sesión y las URLs firmadas permanecen bajo el mecanismo actual. Revertir el commit recupera la presentación anterior sin restaurar ni migrar datos.
