# Decisiones de TALLER

## 2026-11-05 — Herramientas del proyecto fijas arriba y lateral contraído al abrir

El propietario marca en rojo la franja horizontal inmediatamente debajo de las pestañas globales de un proyecto (captura de «Planos») y solicita **mover allí, arriba y fija, la barra de herramientas que estaba abajo**. También establece que **la barra del menú lateral de escritorio debe empezar contraída al cargar Moderno.app**, con expansión manual disponible como hasta ahora.

Se modifica únicamente la disposición UI en escritorio: dock real en franja superior bajo las pestañas globales, tooltips hacia abajo y espacio reservado al contenido para no tapar Planos u otras secciones; lateral de 64 px inicialmente sin borrar el estado elegido manualmente al navegar. Conservar controles e IDs, permisos, navegación, roles, pestañas globales, archivos y datos. Tablet/móvil no se modifican. **Cambio reversible de UI, autorizado a publicar tras pruebas y verificación** conforme a AGENTS.md; nada de migraciones ni escrituras de datos reales.

[Encargo #194](https://github.com/estudiomoderno/moderno.app/issues/194) · [Diseño y comprobaciones](DOCK-PROYECTO-ARRIBA-2026-11-05.md).


## 2026-11-04 — Corrección de Compacta según captura real de referencia

El propietario compara **dos imágenes**, la versión Compacta publicada en #190 (minitarjetas de 114 px con monograma pequeño) y una **referencia de fichas amplias de gestión** con icono de carpeta, estado en cápsula, nombre destacado, filas informativas, divisor y progreso. Declara inequívocamente que la implementación **no se parece a la referencia**. Se corrige la anterior interpretación: «Compacta» es el nombre del modo, **no** la instrucción de limitar cada tarjeta a una franja diminuta.

Se implementan fichas mayores y anchas —**2 por fila en escritorio habitual**, una en ventanas estrechas, tres si hay ancho suficiente— con icono de carpeta, etiqueta con estado real, nombre Acorn, cliente, PR, fecha de siguiente tarea solo si existe, y pie con avance/contador real y avisos. No se inventan prioridades, duraciones, fechas, descripciones ni fotografías de responsables que no figuren en el modelo. Se conservan los modos **Visual** y **Lista** y toda la navegación, datos y permisos existentes.

La corrección es exclusivamente visual, sin cambios de Supabase/Auth/Storage ni registros productivos; está documentada en [PROYECTOS-FICHAS-REFERENCIA](PROYECTOS-FICHAS-REFERENCIA-2026-11-04.md), issue [#191](https://github.com/estudiomoderno/moderno.app/issues/191) y PR [#192](https://github.com/estudiomoderno/moderno.app/pull/192). **Publicada y verificada** en `https://app.moderno.app` como `v3.65.148`: [CI general](https://github.com/estudiomoderno/moderno.app/actions/runs/41891585142), [prueba visual](https://github.com/estudiomoderno/moderno.app/actions/runs/41891585021), [despliegue con comprobación de recursos públicos](https://github.com/estudiomoderno/moderno.app/actions/runs/41892192801). Reversión mediante revert del PR sin alterar datos.


## 2026-11-04 — Vista Compacta como predeterminada; Visual y Lista alternativas

Tras revisar en producción las portadas geométricas grandes de la opción «Estudio minimalista» (#187 / PR #188), el propietario elige **«1 — Tarjetas compactas»** y responde **«sí»** a la propuesta de **implementarla y publicarla**.

La pantalla general de Proyectos pasa a usar por defecto **fichas horizontales bajas con miniatura discreta, nombre y cliente predominantes, código PR, progreso real únicamente con tareas y avisos existentes**. El usuario puede alternar entre **Compacta, Visual (portada grande anterior) y Lista** mediante botones accesibles. La preferencia de vista es temporal y no se guarda en registros. Se conservan la marca, Acorn, menús, acciones, búsquedas, filtro de archivados, navegación, permisos e información real. La imagen solo puede ser una portada legítima ya seleccionada; si no existe, pequeño monograma editorial. Diseño responsive, sin imágenes inventadas.

La orden **autoriza la publicación ordinaria en `https://app.moderno.app` tras CI, revisión y verificación del despliegue**, exclusivamente para cambios visuales reversibles. No autoriza escrituras de prueba en producción, nuevos campos, modificación de permisos, RLS, Storage, Auth ni cambios en datos reales o aplicaciones Windows.

[Encargo y criterios #189](https://github.com/estudiomoderno/moderno.app/issues/189) · [Especificación](PROYECTOS-VISTAS-COMPACTA-2026-11-04.md). Registrar la decisión en GitHub no inicia el chat Codex Cloud por sí solo.


## 2026-11-04 — Rediseño de Proyectos «Estudio minimalista» y publicación aprobada

El propietario revisa la pantalla general **Proyectos** y elige expresamente la **Opción 1 «Estudio minimalista»**: cuadrícula de 4 fichas visuales en escritorio ancho, imagen real de portada solo cuando exista soporte y permisos actuales, fallback editorial neutro elegante en ausencia de imagen, nombre destacado, cliente, código PR, avisos reales y progreso de tareas solo si hay tareas. Mantener la identidad corporativa vigente, logo exacto, Acorn, menú lateral, pestañas, cabecera, buscador, creación y selector de vistas. Cambiar la densidad actual de cinco tarjetas altas y vacías por fichas de proporción más horizontal y jerarquía visual de software profesional de arquitectura/interiorismo. Conservación integral de navegación, permisos y datos existentes.

**Orden expresa: «manda al taller el encargo y que publique»**. Queda autorizada la implementación por el **Taller principal Codex Moderno.app** y la **publicación directa en `https://app.moderno.app`** tras pruebas automáticas/visuales, revisión del PR, despliegue por procedimiento existente y verificación de la web servida. No se requiere validación manual del propietario en un segundo entorno para un cambio de presentación acotado. Mantener `desktop/windows/` y el Taller experimental separados.

**Límites:** no inventar imágenes de cliente a partir de stock, no cargar por defecto imágenes privadas arbitrarias, no crear datos ni modificar Supabase/Storage/RLS/Auth ni proyectos productivos. Si actualmente no existe portada segura, publicar el rediseño con fallback sin crear persistencia; elección de portada a tratar por separado cuando proceda con autorización específica. La aprobación no autoriza migraciones ni cambios de permisos.

[Encargo técnico y comprobaciones #187](https://github.com/estudiomoderno/moderno.app/issues/187) · Marco general [#49](https://github.com/estudiomoderno/moderno.app/issues/49). Registrar issue **no** implica iniciar el chat Codex Cloud ni publicar producción.


## 2026-10-20 — Taller Windows independiente y programa espejo con WebView2

El propietario **autoriza comenzar** la versión de escritorio para Windows y confirma que desea una **ventana que refleje exclusivamente `https://app.moderno.app/`**, con **acceso obligatorio a internet**, sin aplicación duplicada, sin mover datos de producción y con novedades visuales/funcionales del sitio disponibles al **abrir o recargar** sin reinstalar el programa. No forzar recarga de sesiones activas con borradores. Los cambios en la propia carcasa ejecutable sí requerirán actualizarla.

Se aprueba un nuevo chat especializado de Codex Cloud con el nombre exacto **«Taller Windows Moderno.app»**, **subtaller del producto**. Esta decisión **actualiza la distribución previa que asignaba todas las plataformas al Taller principal**: la **web** sigue a cargo de «Taller Codex Moderno.app» y el **contenedor Windows** se trabaja en `experimento/windows-espejo`, limitado a `desktop/windows/**` y `.github/workflows/windows-beta.yml`. Todo comparte el mismo repositorio e issues, pero **las ramas no se fusionan ni despliegan** automáticamente. No modificar `app/`, Supabase, Auth, DNS, Stripe ni los datos reales desde el Taller Windows.

La opción técnica inicial es **.NET 10 WinForms + Microsoft WebView2 Evergreen**, con compilación Windows por Actions, ZIP de prueba y posteriores verificaciones en Windows 10/11. Se requiere inspeccionar sesiones, navegación, persistencia, reconexión y actualización de la web. **Google OAuth puede rechazar WebView2 como navegador incrustado**; antes de distribuir el programa a usuarios hay que validar SSO o diseñar navegador externo/retorno seguro sin forzar cambios productivos. Un ZIP beta sin firmar **no equivale a instalador comercial**: firma, icono y empaquetado se decidirán tras pruebas. Ningún consumo API de pago ni migración está autorizado.

**Trabajo y controles: [#109 — Taller Windows Moderno.app](https://github.com/estudiomoderno/moderno.app/issues/109)**. La creación del issue/rama o el workflow **no crea un chat en Codex Cloud**.


## 2026-10-19 — Cabecera de Estancias y acciones con el código proporcionado

El propietario solicita retirar la descripción, Importar desde hoja y la compresión de grupos de listas, y sustituir los accesos de cabecera por Crear / Exportar / Imprimir con su diseño Uiverse.io de 50 × 50 px. Exportar reúne PDF y hoja de cálculo; desaparecen sus botones inferiores. Generar presupuesto adopta el segundo diseño con el icono de papel actual. Se conservan manejadores, guardas y datos. Detalles, pruebas y recuperación: [ESTANCIAS-ACCIONES](ESTANCIAS-ACCIONES.md).

## 2026-10-18 — Franja uniforme y Autocomplete después del «+»

El propietario solicita alinear la franja de proyectos y abrir un buscador con transición de izquierda a derecha después del «+», usando su Autocomplete original. Se unifica la altura a 32 px, manteniendo las fuentes y tamaños de texto. Se buscan proyectos existentes con los permisos y guardas actuales; no se crean registros ni se cambia el modelo de datos. Detalles y reversión en [PESTANAS-PROYECTOS.md](PESTANAS-PROYECTOS.md).

## 2026-10-18 — Casa para Todos los proyectos y pestañas Badge originales

El propietario pide reemplazar los cuadrados por una casa con el Button usado para notificaciones, y aplicar a cada pestaña su patrón Badge outline con cierre XIcon. Se utilizan los componentes originales y sus medidas, conservando navegación, permisos y guardas de borradores. Cerrar una pestaña no elimina proyectos. Detalles y reversión en [PESTANAS-PROYECTOS.md](PESTANAS-PROYECTOS.md).

## 2026-10-18 — El perfil deja de ofrecer Cambiar estudio

El propietario decide que no necesita cambiar de estudio y pide retirar esa opción del menú junto a su foto. Se elimina el acceso y su puente de navegación, conservando los demás ajustes y la identidad/datos/permisos existentes. No se interpreta como autorización para fusionar estudios o migrar el modelo de datos. Detalles y reversión en [PERFIL-REUI-ORIGINAL.md](PERFIL-REUI-ORIGINAL.md).

## 2026-10-18 — Alineación de ajustes y retirada de información de proyecto

El propietario solicita alinear el menú de proyecto con la campana/perfil y retirar el icono Información del proyecto. Se unifica el centro vertical de los controles manteniendo tamaños y tipografía originales. La cabecera se conserva oculta para la reversión, sin borrar datos; móvil conserva su ficha. Detalles en [AJUSTES-PROYECTO-REUI.md](AJUSTES-PROYECTO-REUI.md).

## 2026-10-18 — Menú original ReUI para ajustes de proyecto

El propietario sustituye su propuesta inicial de botón ghost por un patrón de tres puntos verticales y DropdownMenu original. Se aplica en español, conservando las cinco acciones existentes, fuente y medidas del código. No se incorporan operaciones ni atajos de demostración. Alcance y reversión en [AJUSTES-PROYECTO-REUI.md](AJUSTES-PROYECTO-REUI.md).

## 2026-10-18 — Notificaciones con el componente original de ReUI

El propietario proporciona el patrón Button/BellIcon/Badge. Se usa el Badge original público de ReUI, conservando fuente, tamaños y clases, dentro del aislamiento visual ya incorporado al perfil. El contador se alimenta de los avisos pendientes existentes y la apertura reutiliza su manejador actual. Sin cambios en datos, permisos, almacenamiento ni dependencias de la aplicación. Comprobaciones y reversión en [NOTIFICACIONES-REUI-ORIGINAL.md](NOTIFICACIONES-REUI-ORIGINAL.md).

## 2026-10-18 — Longitud uniforme del menú lateral desplegado

El propietario pide que el menú desplegado se extienda hasta abajo por estética. La cápsula ocupa la altura disponible de la ventana, con los iconos arriba y la flecha inferior dentro de pantalla; al cerrar mantiene el logotipo compacto y la transición. Ajuste exclusivo de CSS, sin datos ni lógica nueva. Detalles: [MENU-LATERAL-ALTURA-COMPLETA](MENU-LATERAL-ALTURA-COMPLETA.md).

## 2026-10-18 — Menú general lateral y pestañas de proyectos en la primera fila

El propietario aprueba la propuesta de colocar la cápsula del menú general en vertical a la izquierda y las pestañas de proyectos arriba del todo, manteniendo el perfil/notificaciones arriba a la derecha y el dock inferior. Se conservan identidad, plegado animado, rutas, permisos, buscador de proyectos y protección de ediciones. Esta decisión sustituye la disposición horizontal anterior. Pruebas y retorno: [MENU-LATERAL-PESTANAS-ARRIBA](MENU-LATERAL-PESTANAS-ARRIBA.md).

## 2026-10-18 — Pestañas de proyectos y retirada de la cabecera grande en escritorio

El propietario pide más área útil y poder alternar entre proyectos abiertos como en Rayon/Chrome. Se sustituye la cabecera grande por pestañas compactas con nombre, cierre y «+» para buscar otro proyecto existente. Cliente y etiquetas quedan en información desplegable, con las opciones originales accesibles. Cada pestaña recuerda su sección durante la sesión; cerrarla no elimina datos. Sin cambios de backend o guardado, con protección de ediciones y reversión: [PESTANAS-PROYECTOS](PESTANAS-PROYECTOS.md).

## 2026-10-18 — Informe de Contabilidad con desglose y presentación detallada

El propietario aclara que quiere mejorar el informe PDF de movimientos, conservando el selector de fechas e Ingresos/Gastos/Ambos. Se añade resumen y detalle de referencias, cliente/proveedor, proyecto, impuestos, retenciones y cobros cuando consten, usando solo registros ya cargados. Los datos históricos ausentes no se completan por suposición; se conservan importes, originales y permisos. Pruebas y reversión: [CONTABILIDAD-PDF-DETALLADO](CONTABILIDAD-PDF-DETALLADO.md).

## 2026-10-18 — Transición de la cabecera e Inicio separado del logotipo

El propietario solicita movimiento al plegar/desplegar y que el símbolo oficial deje de navegar. La cápsula interpola su anchura y los iconos se desplazan/desvanecen, respetando movimiento reducido. El logotipo pasa a ser una marca no interactiva; Inicio es ahora el primer icono del menú superior y utiliza su handler original. Se conservan el fondo oscuro, flecha, Finanzas, herramientas del perfil y dock. Detalles y retorno en [TRANSICION-CABECERA-INICIO](TRANSICION-CABECERA-INICIO.md).

## 2026-10-18 — Cabecera horizontal oscura y plegado hasta el símbolo

El propietario recupera la identidad del menú lateral anterior: fondo negro, formas redondeadas y flecha circular clara con borde oscuro, ahora aplicados a la cabecera horizontal. La flecha comprime todos los accesos de la cápsula, dejando únicamente el símbolo compacto oficial y el control para desplegar. Al abrir reaparecen los iconos y se conserva el grupo de navegación. Esta petición sustituye la retirada del control de plegado de v3.65.37. El perfil y las notificaciones permanecen independientes. Alcance y reversión: [CABECERA-OSCURA-PLEGABLE](CABECERA-OSCURA-PLEGABLE.md).

## 2026-10-18 — Herramientas en el perfil y Conversaciones en el proyecto

El propietario retira Documentos del menú superior, mueve Conversaciones al dock de cada proyecto junto a AI y reúne Automatizaciones, Plugins e Integraciones en el menú del icono del usuario. Desaparece el grupo superior Más herramientas. Se conservan las rutas y los documentos existentes; Documentos del proyecto mantiene todos sus archivos. Conversaciones reutiliza su estado preparatorio «Próximamente», sin implementar chat ni guardado. Se mantienen los permisos actuales de cada apartado. Esta petición amplía el dock con un décimo acceso para los perfiles que ya tenían permitido Conversaciones. Detalles: [REUBICACION-HERRAMIENTAS](REUBICACION-HERRAMIENTAS.md).

## 2026-10-18 — Cabecera compacta por iconos y navegación interna de Finanzas

El propietario pide que el símbolo oficial mantenga el fondo fijo, incluso al pasar el cursor, y que la barra superior muestre únicamente iconos con nombres emergentes. Pulsar Finanzas reorganiza la misma cápsula con Facturas, Presupuestos, Contabilidad, Informes y Previsión de cobros, más una flecha para volver. Cambiar ese grupo no cambia la vista ni descarta formularios; navegar a un módulo sigue usando sus handlers y permisos originales. Se mantiene la identidad, el dock y el alcance de datos existente. Detalles y reversión en [MENU-SUPERIOR-ICONOS](MENU-SUPERIOR-ICONOS.md).

## 2026-10-18 — Decisiones y aprobaciones integradas en Inicio de proyecto

El propietario **aprueba desarrollar** un módulo de **Decisiones y aprobaciones** como parte del **Inicio de cada proyecto**. **No se añade ningún icono al dock**; la barra actual se mantiene con sus nueve accesos y marca, fuentes y colores corporativos. La función debe vincular elecciones de materiales, mobiliario, planos y presupuestos a la **revisión exacta** del elemento, con responsable, fecha, respuesta e historial; mostrar decisiones pendientes y aprobadas. Vincular con Compras, Tareas, Documentos, Economía y Obra **sin duplicar archivos ni entidades** ni ejecutar pedidos o pagos automáticamente.

Implementación a cargo de **Taller Codex Moderno.app**, en etapas pequeñas: (1) UI/recorrido de presentación y demostración con datos inventados, sin persistencia real; (2) aprobación interna persistente y auditada, con RLS y modelo de revisiones **solo tras validación y nueva autorización específica de operaciones sensibles productivas**; (3) vínculos comprobados con tareas/compras/planos/presupuestos; (4) opción de aprobación por cliente solo con identidad/alcance/evidencia verificables y autorización separada. Los permisos, copias de BD/Storage, pruebas aisladas y rollback sin restaurar datos son condiciones imprescindibles. No modificar el logotipo actual ni implementar IA (que sigue aplazada). **Encargo principal: [#60](https://github.com/estudiomoderno/moderno.app/issues/60).**


## 2026-10-18 — IA de proyectos reservada para algún plan de pago; desarrollo aplazado

La pestaña **AI** del proyecto se ha definido como futuro asistente de **gestión del estudio** (consultar estado y pendientes, proponer tareas y compras revisables, redactar documentos y comunicaciones). **No** será un generador de renders o diseño alternativo a Rayon. Estará incluida en **algún plan de pago de Moderno.app**, todavía sin elegir cuál ni fijar cuotas o precio. El modelo/proveedor y presupuesto de consumo API también quedan por decidir.

**Por orden expresa del propietario, la IA queda en pausa: no implementarla, conectar APIs, contratar servicios, cobrar, activar con clientes o enviar datos reales hasta una futura solicitud explícita.** El foco actual es **terminar el diseño** de Moderno.app. Conservar la pestaña AI existente sin funcionalidad ni gasto. Los requisitos de permisos, confirmación humana antes de escribir, privacidad, coste, fases y seguridad quedan recogidos en [encargo #59](https://github.com/estudiomoderno/moderno.app/issues/59).


## 2026-10-18 — Dock de proyecto por grupos, Planos, AI y Utilidades

El propietario solicita expresamente nueve accesos inferiores solo con iconos y nombres al pasar el ratón: Inicio | Planos / Obra | Tareas / Compras | Economía / Documentos | AI | Utilidades. La cápsula y los separadores siguen su esquema, con identidad oficial. Esta decisión actualiza la restricción histórica que situaba Planos exclusivamente dentro de Documentos: ahora es un acceso del proyecto que filtra los PDF e imágenes existentes; Documentos sigue mostrando todos los archivos. No se crean ni migran entidades. Utilidades se traslada del menú general al proyecto, reutilizando las calculadoras y sus permisos; AI queda vacío hasta concretar su contenido, sin servicios nuevos. El Portal del cliente se conserva en las opciones del proyecto. Pruebas, límites y reversión: [DOCK-PROYECTOS](DOCK-PROYECTOS.md).

## 2026-10-17 — Cabecera flotante y símbolo compacto en escritorio

El propietario solicita una cápsula superior superpuesta como el dock inferior, sin la fila de espacio de trabajo ni el control de tema y con notificaciones junto al perfil. Se usa exclusivamente el símbolo compacto original del menú antiguo comprimido, conservando su SVG, Acorn y paleta; esta indicación actualiza la presentación ancha del primer lote de #49, sin introducir otro logotipo. Los selectores reales de estudio/espacios siguen accesibles dentro del perfil y todos los módulos actuales se mantienen. Alcance, pruebas y reversión en [BARRA-SUPERIOR-FLOTANTE](BARRA-SUPERIOR-FLOTANTE.md).

## 2026-10-17 — Segundo taller: «Taller Nueva app Codex», sin conexión a Supabase

El propietario aprueba un segundo taller llamado exactamente **«Taller Nueva app Codex»**, separado del **Taller Codex Moderno.app**. Su misión es probar una nueva navegación de escritorio inspirada en herramientas de diseño, usando **exclusivamente datos ficticios** y **sin ninguna conexión a Supabase** (ni producción ni pruebas), tampoco otros sistemas reales ni credenciales. Trabajo exclusivo en la rama `experimento/taller-nueva-app-codex` y el directorio `prototipos/nueva-app/`, sin modificar `app/`, tocar producción ni fusionar el prototipo a `main`.

Cuando la interfaz resulte convincente y técnicamente verificable, se estudiará **más adelante** un plan de traslado a la app real; no hay permiso actual para migrar ni sustituir nada. El Taller actual sigue construyendo y manteniendo la app productiva. [Instrucciones completas](TALLER-NUEVA-APP-CODEX.md) · [Encargo #47](https://github.com/estudiomoderno/moderno.app/issues/47).

## 2026-10-11 — Taller entrega en app.moderno.app; pruebas técnicas invisibles para el propietario

El propietario aclara: cuando encargue cambios al 🔧 Taller Codex quiere **verlos funcionando directamente en `app.moderno.app`**, sin gestionar él una aplicación de pruebas. Se prioriza un circuito autónomo: **rama → controles automatizados → PR revisado → despliegue a la app real y comprobación**, siempre que sea un cambio ordinario acotado y seguro.

**No se elimina la obligación de probar antes de publicar.** El entorno aislado es una herramienta interna, no el producto que el propietario deba usar. Las nuevas funciones con guardado, archivos privados, permisos o migraciones —incluyendo «Documentos → Planos interactivos», fases #24–#26— requieren pruebas con datos ficticios, aislamiento entre estudios y autorización específica antes de aplicar cambios sensibles a producción. Si no se dispone del entorno `moderno-pruebas`, resolver el bloqueo #3 y no experimentar con la base real. Evitar pedir aprobaciones reiteradas para cambios visuales ordinarios una vez verificados; informar solo de resultados confirmados.

## 2026-10-11 — Encargo integral: Documentos y Planos interactivos (3 fases)

**El propietario aprueba la implementación de las tres fases de «Planos interactivos» dentro de «Documentos» en la pantalla de cada proyecto**, con ejecución a cargo de 🔧 **Taller Codex Moderno.app**. La sección existente de «Espacio de trabajo»/«Archivos y notas» evoluciona a «Documentos», sin perder archivos o notas previos. Mantener «Tareas» y «Listas de compra» al mismo nivel del proyecto; **«Planos» no se añade al menú principal**, sino que vive dentro de «Documentos». Organización prevista: **Planos, Archivos, Referencias y Revisiones**. Verificar el estado de la interfaz real porque el propietario está reorganizándola manualmente.

Las entregas aprobadas y sus criterios son:
1. [**Fase 1 — Planos, visor y anotaciones**](https://github.com/estudiomoderno/moderno.app/issues/24): PDF/imágenes, dibujar y escribir, zoom/páginas, guardado recuperable de anotaciones sin modificar el original y exportación.
2. [**Fase 2 — Conexión con tareas y listas de compra**](https://github.com/estudiomoderno/moderno.app/issues/25): convertir anotaciones en elementos de trabajo con vínculos navegables, permisos y trazabilidad.
3. [**Fase 3 — Lápiz, revisiones y colaboración**](https://github.com/estudiomoderno/moderno.app/issues/26): interacción táctil y stylus compatible, versiones, aprobaciones y trabajo colaborativo con reglas claras de sincronización.

**Encargo general:** [#23](https://github.com/estudiomoderno/moderno.app/issues/23). El Taller desarrollará **por fases con PR y pruebas independientes**, sin reescribir la app ni contratar dependencias de pago. Antes de escrituras integradas, resolver/validar [Supabase de pruebas #3](https://github.com/estudiomoderno/moderno.app/issues/3); no probar con clientes reales. Diseño, migraciones, permisos, RLS y Storage nuevos requieren tests de aislamiento entre estudios y autorización específica **antes de operaciones productivas sensibles**. El usuario ha aprobado el objetivo de las tres fases, no manipular la base productiva. Crear issues y documentos **no inicia una sesión Codex Cloud automáticamente**, ni equivale a haber implementado o publicado nada.

## 2026-10-11 — Google Drive exclusivo para Moderno.app

El propietario establece **«Unidades compartidas» → «03 Moderno App»** como la **única unidad compartida de Google Drive autorizada** para todo trabajo referente a Moderno.app. Las demás unidades compartidas quedan **fuera del alcance**; no buscar ni trabajar en ellas para el proyecto sin autorización específica. Se ha comprobado en la conexión Google Drive que la unidad existe, es accesible y contiene carpetas internas organizadas por áreas. Los nuevos materiales y documentación se organizarán dentro de esta unidad.

Esto **no** cambia los servicios canónicos de código (GitHub), documentación pública (GitBook) ni datos operativos (Supabase). **No migrar, eliminar ni cambiar ubicaciones de copias automatizadas existentes** sin una revisión de seguridad y permiso concreto. No subir credenciales ni información sensible a repositorios públicos. Referencia de coordinación: [COORDINACION-CEREBRO-CODEX.md](COORDINACION-CEREBRO-CODEX.md).


## 2026-10-11 — Moderno.app Premium: evolución visual, no reconstrucción

El propietario aprueba convertir `app.moderno.app` en una aplicación de **acabado visual premium**, elegante, moderna y consistente **sin perder ni rehacer lo que ya funciona**. El orden prioritario es **perfeccionar escritorio web (tipografías, botones, iconos, tarjetas, efectos y transiciones)** y **después** la experiencia visual móvil/tablet. No se autoriza una reescritura, cambios de permisos, datos o lógica de negocio por motivos estéticos. El Taller empezará por auditar los estilos existentes y preparar una propuesta de sistema visual más un piloto pequeño y reversible; solo se aplicarán cambios con pruebas verificadas. Referencia: [DIRECCION-VISUAL-PREMIUM.md](DIRECCION-VISUAL-PREMIUM.md).


## 2026-10-10 — Prioridad: terminar la app y ofrecerla en web y dispositivos

El propietario establece como **prioridad principal terminar Moderno.app** y preparar su disponibilidad en **navegador web**, **descargas para Windows y Mac**, **iPhone**, **iPad** y **teléfonos/tabletas Android**. Estas son plataformas **objetivo**, no versiones cuya existencia se haya comprobado. 🔧 Taller Moderno.app en Codex Cloud sigue siendo exclusivo de la aplicación, incluidas sus variantes multiplataforma; el escaparate `www.moderno.app` y otras webs independientes se desarrollarán en chats separados.

Coordinar Cerebro, Taller, Control, Negocio, Academia e Integraciones mediante GitHub; la existencia de un documento compartido no sincroniza automáticamente las conversaciones ni inicia Codex. Antes de decidir PWA, contenedores o apps nativas, auditar estado actual, compatibilidad, restricciones y plan de pruebas sin datos reales. **Decisión operativa y responsabilidades completas: [PRIORIDAD-APP-MULTIPLATAFORMA.md](PRIORIDAD-APP-MULTIPLATAFORMA.md).** No se autoriza una reescritura o publicación en tiendas por esta declaración.


## 2026-09-09 — Pausa confirmada y hallazgos previos a v3.30

El usuario confirma que el equipo está en pausa y había guardado sin formularios pendientes ni errores. No se interpreta como cierre de todas las sesiones antiguas. La revisión identifica permisos financieros insuficientes en el candidato y límites precisos de validación del correo; véase ACCESO-CORREO-VALIDACION.md. No publicar ni cambiar permisos productivos basándose solo en la pausa o en que pasen pruebas que reproducen defectos.

## 2026-09-09 — Entorno y continuidad

- TALLER es la tarea principal. Explicar en español sencillo y resumir estado y pendientes antes de desarrollar funcionalidades, según petición del usuario.
- Mantener la aplicación actual durante la preparación; servidor Node sin dependencias y con rutas limpias.
- Actualizar README, estado y decisiones al cerrar trabajos importantes.
- Distinguir hechos comprobados de información histórica. El traspaso no sustituye al código ni a la configuración real.
- La sesión local usa Supabase real. Preparar un entorno de pruebas antes de ensayos que escriban datos.
- Revisar publicación antes de subir app/ a main: existe flujo automático FTPS.

## Criterios históricos del traspaso, a confirmar al trabajar en cada área

- Separar previsión de cobros de contabilidad real.
- Facturas inmutables y numeración preservada.
- No mostrar costes internos ni márgenes en documentos y portales de clientes; portal de obra sin precios.
- Español activo; revisar diccionario existente para textos nuevos.
- React/TypeScript y permisos por fila son una dirección futura, no una reescritura autorizada ahora.

Estas referencias no verifican la implementación técnica ni fiscal.

## 2026-09-09 — Sincronización autorizada

El usuario autoriza subir automáticamente a GitHub los cambios revisados al terminar cada trabajo. Usar la rama taller mediante Git local autenticado (scripts/git-codex.ps1 en este entorno). La autorización de publicación se amplía en la decisión siguiente.

## 2026-09-09 — Publicación y protección de usuarios reales

El usuario autoriza que TALLER desarrolle, compruebe y publique las modificaciones terminadas de la aplicación para todos los usuarios. Hay usuarios activos con datos y archivos reales que deben conservarse.

- Trabajar en taller, comprobar el cambio y llevar a main la entrega validada. No publicar cada edición intermedia. No hace falta volver a pedir autorización para publicaciones ordinarias dentro de este alcance.
- Verificar el resultado de GitHub Actions y la versión servida en producción antes de afirmar que se ha publicado. El flujo FTPS existe; su ejecución efectiva todavía no se ha verificado desde TALLER.
- Conservar la versión anterior y un procedimiento de reversión del código. Revertir HTML no restaura datos ni archivos.
- Mantener compatibilidad con datos existentes y sesiones que todavía ejecuten la versión anterior. No forzar una recarga que pueda descartar trabajo sin guardar. Los usuarios recibirán la versión al abrir o recargar la app; no prometer actualización inmediata de todas las pestañas abiertas.
- No borrar, reinicializar ni sustituir datos reales por datos de prueba. Probar escrituras con datos de prueba aislados.
- Antes de cambios que afecten al esquema, guardado, migraciones o archivos: comprobar respaldo recuperable de base de datos y de archivos de Storage por separado, ensayar recuperación y migración en un entorno de pruebas y definir reversión. Si no es posible verificarlo, detener esa publicación y explicar el bloqueo.
- Pendiente prioritario: comprobar con acceso real a Supabase los respaldos, la recuperación de archivos y la disponibilidad de un entorno de pruebas. No dar por existente una protección todavía no verificada.

## 2026-09-09 — Copias externas de archivos

- Destino: carpeta privada de la unidad compartida de la empresa en Google Workspace. Configuración y credenciales solo en secretos de Actions, nunca en este repositorio público.
- Google usa identidad temporal de GitHub, restringida al repositorio, main y workflow de copias. No se debilita la política que prohíbe claves permanentes de cuentas de servicio.
- El usuario autorizó expresamente la clave S3 de acceso completo y su almacenamiento en GitHub; el programa solo lee Storage.
- Prueba sintética de recuperación y primera copia real verificadas. Copias completas diarias a las 04:23 de Madrid, sin eliminación automática de anteriores.
- Sigue pendiente la recuperación integral de base de datos y archivos en entorno aislado, y la supervisión externa de copias ausentes. Consultar BACKUP-SETUP.md antes de cambios que afecten a datos.

## 2026-09-09 — Taller Moderno.App y futura comercialización

- Nombre de la tarea principal: Taller Moderno.App.
- app.moderno.app seguirá siendo el CRM; www.moderno.app será el escaparate y la entrada a las suscripciones.
- Conservar el estudio piloto, sus miembros, identificadores y archivos al introducir planes comerciales.
- La revisión inicial y las propuestas se recogen en PLAN-PRODUCTO.md. Los precios, límites y condiciones comerciales todavía no están decididos.

## 2026-09-09 — Validación aislada de protección

- El usuario autorizó expresamente restaurar la copia de base de datos en un proyecto separado y usar su clave administrativa temporalmente en memoria para preparar pruebas y recuperar archivos. No guardar esa clave en GitHub ni en archivos.
- Taller Moderno.App es el único responsable de estos cambios. El candidato se desarrolla en una rama y carpeta aisladas; Web y Panelcontrol no editan el CRM.
- Se verificaron recuperación de base de datos y contenidos, permisos con identidades ficticias y guardado concurrente. Resultados, límites y transición pendientes en VALIDACION-PROTECCION.md.
- No se modifica producción ni se activa una automatización de supervisión. La publicación requiere completar los flujos pendientes y coordinar las sesiones del equipo piloto.

## 2026-09-09 — Visores privados y continuidad

- Candidato local: portales filtrados en servidor, enlaces firmados de 60 segundos y actualización que espera al guardado. Mantener referencias de archivos; nunca guardar los enlaces temporales.
- Desarrollo local conectado exclusivamente a pruebas, con almacenamiento local separado. Las claves administrativas no pertenecen a .env del cliente.
- ICS, Realtime, visores e importación ficticia ensayados en el clon. La validación del correo incluido en la entrega y la coordinación de sesiones siguen pendientes; no publicar el candidato incompleto.
- Procedimiento de transición y suspensión en TRANSICION-PROTECCION.md. Producción no se ha modificado en esta validación.

## 2026-09-09 — Google Calendar aplazado

- El usuario confirma que Google Calendar nunca llegó a conectarse y decide hacerlo más adelante. Queda fuera de la actualización de protección; no exigir sus fuentes ni una cuenta para probar Calendar como condición para publicarla.
- Esta decisión no aplaza la validación del inicio de sesión, el correo incluido en la entrega ni la coordinación de sesiones del piloto. La función calendario-ics recuperada es un flujo distinto de la integración pendiente con Google Calendar.

## 2026-09-09 — Primera tanda de operativa aprobada

- El usuario aprueba prioridades/fechas, apertura directa de tareas, estado fiel de guardado, búsquedas claras, nombres en español y encabezado móvil compacto.
- Rama taller-operativa-20260909 sobre d28c710, que conserva las protecciones previas. La entrega operativa se registra aparte; no publicar incidentalmente sus antecesores todavía pendientes de transición.
- Sin integraciones, planes, cobros, nueva gestión de visibilidad de archivos ni formulario breve de tareas. Alcance, pruebas y bloqueo de publicación en OPERATIVA-DIARIA.md.

## 2026-09-09 — Gestoría de solo lectura

- Confirmado por el usuario: Gestoría puede consultar Finanzas/Contabilidad y descargar sus PDF; no puede modificar los datos.
- La autorización se comprueba en el servidor. Ocultar botones no basta. El candidato incorpora consulta separada, bloqueo de escritura y acceso limitado a los PDF contables.
- Los PDF originales adjuntos se ofrecen por separado del resumen imprimible, que no sustituye al documento original.
- Los cambios de permisos siguen en desarrollo y no están publicados. La lectura filtrada y el guardado de colaboradores deben quedar integrados y verificados antes de entregar el conjunto.


## Cierre de recorrido 3.39–3.45 (11/09/2026)

Biblioteca, ficha, lámina, presupuesto y pedido conservan copias independientes. Actualizar biblioteca es selectivo y explícito; no se reescriben documentos anteriores. Los IDs ambiguos se diagnostican sin renumerarlos. Las revisiones de lámina se anexan y su historial es administrativo; preparar una salida para cliente/diseño/obra no concede accesos.

Una aprobación pertenece a una revisión exacta y no revive por volver a un valor anterior. Comparar ofertas exige iguales fichas/revisiones/cantidades/unidades. Fecha, incidencia, recepción, instalación, factura y pago son registros separados. Registrar un pago no mueve dinero.

Las entregas se publican tras validación y comprobación de recursos. La invitación hasta un buzón real y alta productiva necesita destinatario/alta concretos; no se certifica con pruebas locales. Mantener las limitaciones y evidencias en ENTREGA-V345.md y el estado en ESTADO-TALLER.md.

## 2026-10-18 — Casa permanente y rutas superiores

El propietario solicita mantener la casa de Todos los proyectos incluso sin pestañas abiertas. El resto de páginas generales usa su patrón original ReUI Card/Breadcrumb, en español, alineado por centro con los controles superiores. Mantener fuente, tamaños y separación de origen, navegación y guardas actuales, sin cambios de datos ni permisos. Alcance, pruebas y recuperación: [RUTA-SUPERIOR-REUI](RUTA-SUPERIOR-REUI.md).

## 2026-10-18 — Calendario original ReUI

El propietario proporciona la composición EventCalendar y solicita retirar el saludo «Tu calendario». Se utiliza el motor original, con español y medidas Nova, sobre tareas/citas/fases ya cargadas y formularios existentes, sin eventos ni personas de demostración. Se conservan permisos, ámbitos, registros, guardado y servicios; el arrastre de fases mantiene fechas locales. Detalles, pruebas y recuperación: [CALENDARIO-REUI](CALENDARIO-REUI.md).

## 2026-10-19 — Finanzas sin submenú lateral

El propietario solicita un único acceso Finanzas y, a la altura de la ruta, Resumen / Facturas / Presupuestos / Contabilidad / Previsión. Se conservan las cinco pantallas, cálculos y contratos actuales; Informes se presenta como Resumen. Enlaces y visibilidad sujetos al enrutador, permisos y protección de borradores existentes. Móvil mantiene los cinco accesos en una barra desplazable. Alcance y recuperación: [FINANZAS-NAVEGACION](FINANZAS-NAVEGACION.md).

## 2026-10-20 — Menú lateral integrado

El propietario solicita una estética de programa, tomando Rayon como referencia. El lateral de escritorio pasa de cápsula oscura flotante a columna blanca integrada: iconos y nombres en abierto, iconos navegables al plegar y selección gris discreta. Se conservan símbolo oficial, navegación, roles, datos y borradores. Pestañas y rutas ajustan su margen al ancho del menú; móvil conserva su presentación. Alcance, comprobaciones y recuperación: [MENU-LATERAL-INTEGRADO](MENU-LATERAL-INTEGRADO.md).

## 2026-10-20 — Importación de productos sin cuotas por ahora

Por petición expresa del propietario se eliminan los límites de 15 intentos/hora y 100 intentos/día. La captura queda sin cuotas horarias o diarias por ahora; se mantienen permisos, privacidad y protecciones técnicas. Cuando se ocupan las tres capturas simultáneas recientes del estudio, la interfaz espera y continúa automáticamente sin duplicar solicitudes. Detalles y reversión: [CAPTURAS-SIN-CUOTAS](CAPTURAS-SIN-CUOTAS.md).

## 2026-10-22 — Secciones independientes dentro del proyecto
El propietario solicita separar Planos de Documentos y añadir junto a Obra un Diario de obra (fecha, notas y fotos, confirmado expresamente) y un acceso independiente al calendario que estaba dentro de Obra. Esta decisión actualiza la organización anterior de Planos como subsección de Documentos; no autoriza migrar o eliminar archivos existentes. Implementación y pruebas: [PROYECTO-SECCIONES-2026-10-22.md](PROYECTO-SECCIONES-2026-10-22.md).
