# Encargo #49: integración progresiva de la interfaz

Estado del 17/10/2026: primer lote preparado, **sin activación ni publicación**. [Encargo](https://github.com/estudiomoderno/moderno.app/issues/49). Rama `interfaz/encargo-49`, base `2c56262b124a45d7d4a6d1961b64134e48485228`. Código de app anterior: `fb36f9db0a8113ee26f1d4e1b324611eb6c90650`, v3.65.32. El PR #46 de asignación de usuarios sigue separado; este lote no instala su SQL ni sus permisos.

## Recuperación: puerta de publicación cerrada

| Comprobación | Evidencia disponible | Límite pendiente |
| --- | --- | --- |
| Copia externa de archivos | Run [39012159548](https://github.com/estudiomoderno/moderno.app/actions/runs/39012159548), correcto. Tras autorización de lectura se recuperaron únicamente COMPLETE y el manifiesto: verificación del 17/10 a las 07:07:46 UTC, 259 objetos, 59.651.801 bytes, rutas únicas/seguras y recuento coherente. El inventario de todos los archivos del destino privado coincide en ruta y tamaño: cero ausentes, distintos o adicionales. La huella agregada del manifiesto coincide con los metadatos actuales de Storage, cuyo único bucket es privado. | La comparación de bytes la acredita el workflow de hoy, que ejecutó `rclone check --download`; no se han vuelto a descargar documentos de clientes. El procedimiento de recuperación está documentado y fue ensayado históricamente en entorno aislado; no se ha realizado una nueva restauración. |
| Vigilancia de copias | Run [39040664083](https://github.com/estudiomoderno/moderno.app/actions/runs/39040664083), correcto. | No acredita una copia de BD. |
| Base de datos | Proyecto correcto identificado, ACTIVE_HEALTHY, PostgreSQL 17.6.1.166. Procedimiento histórico de recuperación documentado en RECUPERACION-SERVICIO y BACKUP-SETUP. | No hay acceso conectado a la lista actual de backups/PITR: no se conoce último punto recuperable, estado, retención o integridad. Salud del proyecto no prueba respaldo. |
| Destino autorizado de Drive | Unidad «03 Moderno App» identificada; carpeta existente de copias vacía. El propietario autorizó expresamente consultar solo metadatos/manifiestos en «Moderno.App Data Base» y «app.moderno.app». Se localizó la copia de Storage vigente en la primera; no se ha localizado respaldo de BD en los destinos inspeccionados. | El nombre de una unidad no demuestra que contenga una copia de base de datos. No se han explorado otras unidades, movido copias ni modificado accesos. |

No se ha exportado BD ni contenido privado, descargado documentos de clientes, restaurado producción ni usado datos reales como pruebas. Solo se han materializado los dos manifiestos privados fuera del repositorio y consultado metadatos de archivos, buckets e inventarios. Los nombres, rutas privadas e identificadores no se incorporan al informe público. Las herramientas actuales de Supabase no exponen backups de Management API y no hay navegador conectado disponible para verificar su panel. La referencia oficial distingue copia de BD y objetos Storage: https://supabase.com/docs/guides/platform/backups.

Para abrir la puerta falta el respaldo vigente de BD: acceso de lectura al estado de backups de Supabase o evidencia de su panel Database → Backups con proyecto, fecha, estado completado y retención/ventana de recuperación. La autorización de Drive ya se ha ejercido y no hace falta repetirla. El manifiesto/cobertura actual de archivos queda comprobado con el alcance anterior. Si es necesario un nuevo ensayo, acordar destino aislado y coste antes de restaurar cualquier copia; no usar el CRM productivo para ensayos. No pedir una autorización genérica para omitir esta protección.

## Mapa de navegación real y primer lote

El prototipo `experimento/taller-nueva-app-codex`, `prototipos/nueva-app/`, se ha leído como referencia de distribución. No se fusionan sus archivos, datos, fuentes duplicadas, logo alternativo ni app.js experimental.

| Navegación nueva | Acciones existentes conservadas |
| --- | --- |
| Inicio, Proyectos, Tareas, Calendario | `home`, `proyectos`, `workspace`, `calendario` |
| Oficina | Contactos `agenda`, `mail`, `conversaciones` |
| Empresa | `informes`, `contabilidad`, `presupuestos`, `facturas`, `prevision` |
| Recursos | Servicios `biblioteca`, Productos `catalogo` |
| Herramientas | Documentos `plantillas`, `automatizaciones`, `utilidades`, `integraciones`, `plugins` |
| Perfil arriba a la derecha | Perfil real, Ajustes mediante SettingsUI.open y las integraciones existentes según permisos |
| Segunda fila de contexto | Mismos nodos de selector de estudio/espacios, tema y notificaciones |
| Herramientas inferiores de proyecto | Las siete pestañas reales: Proyecto, Tareas, Listas, Obra, Documentos, Finanzas, Cliente. Mismos IDs, handlers y panel. No se inventa una pestaña Planos aparte. |

`desktop-shell.js` añade presentación sobre los botones de origen; los clics se delegan a esos botones y por tanto pasan por go(), protección de borradores, filtros y permisos actuales. La visibilidad usa canView(); el servidor sigue siendo la autoridad. Los logos, selector, avatar y topbar son los mismos nodos del DOM, con marcadores para restituir exactamente su posición. No se escribe almacenamiento local ni remoto.

`brand/desktop-shell.css` usa los tokens actuales y las fuentes instaladas. Se conserva el SVG del logotipo real «moderno» de .sb-head y su variante compacta «m», incluidas proporciones y dimensiones de 170/30 px; no se usa el icono distinto del prototipo. El contraste se adapta a claro/oscuro con las variantes actuales. Los SVG internos no se modifican.

Primera entrega limitada a escritorios de 1100 px o más. Ajustes, edición de presentaciones, portales, gestoría, accesos externos y tamaños menores conservan su UI vigente. No se ocultan módulos: las herramientas originales siguen accesibles en los grupos correspondientes. Las pantallas internas no se reconstruyen; su adaptación fina corresponde a siguientes PR por área.

## Datos y contratos intocables

- No modificar SQL, Auth, RLS, RPC, Storage, Edge Functions ni mailer.
- Conservar `CLOUD_BLOCKS`, app_leer_bloques/app_guardar_lote, versiones de sincronización, fusiones, claves locales, sesiones y confirmación de guardado.
- Conservar proyectos, tareas, clientes, listas/productos, presupuestos, facturas, archivos, notas e historial; ninguna renumeración, migración ni importación de datos del prototipo.
- Conservar IDs/rutas de navegación y archivos, permisos y handlers de edición, exportación, descargas y visor de Planos.
- El único cambio en index.html es cargar los dos recursos nuevos. No cambia MODERNO_VER mientras este candidato no se publica.

## Verificaciones y límites

- Batería Node: 439 pruebas (437 existentes y dos de inactividad/fallo seguro del lote).
- Chromium sin red, SDK ni credenciales: 1440/1280/1100 px; 1024/390 px mantienen interfaz anterior. Marcado real de navegación, logos, CSS, iconos, projectTabsHtml, handlers go()/projTab() y lógica canView()/myAccessLevel() reales; vistas con contenido ficticio y sesión/perfiles simulados. No equivale a un ensayo de inicio de sesión o guardado HTTP.
- Aplicación completa mediante el servidor oficial aislado (`desktop-shell-full-app.test.py`): 1440/1100/390 px, conexión y clave ficticias sustituidas en memoria, almacenamiento local separado, SDK desactivado y red externa bloqueada. Se ejecutan todos los renderizadores de navegación originales y las siete pestañas del proyecto, con registros ficticios y colecciones intactas tras un recorrido de calentamiento de normalizaciones existentes. En escritorio los accesos se pulsan con ratón, incluidos sus desplegables. SettingsUI real conserva su borrador al cancelar la salida y solo lo descarta tras pulsar expresamente; el perfil original permanece intacto. La vuelta a la interfaz anterior conserva los nodos. No se prueban autenticación ni RPC/guardado de Supabase.
- Todas las rutas originales accesibles, siete pestañas, selección/teclado, Escape, comprimir/expandir, opciones según perfil simulado, borrador conservado ante navegación cancelada y todas las colecciones ficticias intactas.
- Inactividad por defecto, retorno explícito, mismos nodos y SVG antes/después. Se comprueba fallo seguro: error de presentación vuelve a UI anterior sin romper el render original.
- Revisión visual de escritorio claro y oscuro con identidad actual. No se reutilizan capturas privadas.
- CI [39050506038](https://github.com/estudiomoderno/moderno.app/actions/runs/39050506038) correcto en el candidato con regresión de tamaño: JavaScript, sintaxis PHP y autorización de invitaciones sin enviar correos. PHP no está instalado en este executor; la validación PHP se ejecutó en Actions.
- No realizadas: verificación del backup actual de BD, nuevo ensayo de restauración, integración HTTP con Supabase y sus usuarios ficticios, prueba autenticada productiva ni publicación. El ensayo HTTP local anterior valida la interfaz completa, sin sustituir esas verificaciones de backend. Esas limitaciones impiden presentar el encargo como terminado.

## Activación y reversión

`ENABLED=false` mantiene la interfaz anterior, aun cargando el candidato. El PR queda en borrador. No fusionarlo mientras la recuperación siga sin comprobarse.

Tras superar la puerta de recuperación y las pruebas de integración pendientes: activar la constante en un commit revisable, asignar versión/cache correspondiente, repetir pruebas y revisar diff/CI. Publicar por deploy-app.yml, recursos primero y entrada después. El verificador incluye desktop-shell.js y brand/desktop-shell.css (11 recursos totales). Comprobar Actions y hashes públicos antes de anunciar publicación. No forzar recargas sobre pestañas con borradores.

Retorno inmediato de la pestaña: `ModernoDesktopShell.setEnabled(false)` restituye los nodos y elimina el contenedor nuevo; no recarga ni escribe datos. Retorno permanente: desactivar la constante y publicar por el mismo workflow, o revertir exclusivamente este lote, manteniendo cualquier trabajo posterior. La base estable conserva `app/` íntegro en `fb36f9d`; no restaurar BD por un problema visual. Mantener recursos viejos y nuevos durante la validación para evitar pestañas/cachés incoherentes.

El encargo #49 queda abierto: la etapa 0 está bloqueada por evidencia de recuperación; etapa 1 es candidato; etapas 2–3 siguen pendientes. No certificar conservación de datos mediante recuentos aislados ni afirmar despliegue por el mero hecho de crear un PR.
