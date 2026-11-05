# Revisión de la barra de proyecto — #196

Rama: `taller/196-project-toolbar`. Base: `88d2443`. Sin integración ni despliegue.

La navegación usa los 16 SVG originales, en cuatro grupos y en el orden de #196. Los archivos coinciden byte por byte con el ZIP proporcionado (SHA256 `97ae3a18f6dfdec0cdd7d48576e106699050a65dbd188c8de36067797eaa4da3`); se revisaron viewBox y ausencia de scripts, recursos externos y manejadores SVG. Barra blanca inferior centrada en el área útil, selección, etiquetas, teclado y disposición en dos filas para pantallas pequeñas. Se reserva espacio de desplazamiento y se recoloca el indicador de sincronización. Los diálogos ocultan la barra; no se modifican herramientas del editor de Planos.

El menú lateral empieza contraído, con expansión manual. Inicio del proyecto se conserva en Opciones del proyecto. Presentaciones reutiliza `pres`; Ajustes abre el editor existente. Se conservan los filtros de permisos de Finanzas, Utilidades y Conversaciones.

## Limitación de alcance

La base actual no implementa Estudio de Diseño ni Mediciones. Sus SVG se muestran con `aria-disabled=true` y etiqueta «No disponible todavía»; no se inventan rutas ni funciones. #196 no se considera completamente cerrada hasta resolver estos dos destinos. AI y Conversaciones conservan sus funciones preparatorias actuales. No se ha desarrollado ninguna función de negocio nueva.

## Verificación

- `node --test scripts/*.test.mjs`: 702 correctas.
- `scripts/project-dock-browser.test.py`: 1366×900, 1440×900, 1920×1080, 834×900, 390×844 y 320×740. Comprueba los 16 iconos, orden, tres separadores, navegación de las secciones disponibles, teclado, expansión lateral, permisos, Ajustes y diálogo real de Planos.
- `scripts/desktop-shell-browser.test.py`: cinco tamaños; rutas, borradores, permisos y reversión visual conservados.
- Navegador Chromium 134 con Playwright 1.51, servidor oficial aislado, SDK bloqueado y registros ficticios. Ninguna petición de escritura externa. No se prueban autenticación ni persistencia remotas.
- Capturas revisadas en escritorio y móvil. `git diff --check` sin errores.

Archivos funcionales: `app/project-ui.js`, `app/index.html`, `app/brand/desktop-shell.css`, nuevo `app/brand/project-dock.css` y `app/brand/project-icons/`. Pruebas actualizadas para la navegación nueva.

Reversión: descartar esta rama antes de integrar, o revertir su commit si se integra en el futuro. Sin migraciones, cambios de datos, DNS ni pagos.

## Ajuste visual solicitado: dos filas por grupo

Los cuatro grupos se muestran siempre como cuadrículas de 2×2, siguiendo el esquema aportado: Tareas/Compras sobre AI/Conversaciones; Planos/Obra sobre Diario/Calendario; Estudio/Presentaciones sobre Mediciones/Utilidades; Finanzas/Portal sobre Documentos/Ajustes. Todos los SVG se presentan con el mismo gris mediante CSS, sin modificar los archivos originales. Barra de 86 px de alto, más compacta, con tres separadores verticales. Selección diferenciada por fondo; los módulos no disponibles conservan su estado accesible y su aviso.

Validación de este ajuste: 19 pruebas unitarias pertinentes y seis resoluciones en navegador, incluyendo comprobación geométrica de filas y columnas y color uniforme. Sin publicar ni integrar.

## Publicación autorizada y acabado fino

El usuario autoriza publicar tras pedir una barra más fina. Se reduce de 86 a 72 px de altura (botones de 30 px e iconos de 18 px), con radios, relleno y sombra más discretos. Se mantiene el orden 2×2 y el gris uniforme. Sin cambios de datos ni servicios. Validación: 702 pruebas unitarias y navegación aislada en seis resoluciones.
