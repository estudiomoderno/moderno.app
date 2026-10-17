# Encargo #49: integración progresiva de la interfaz

Estado del 17/10/2026: navegación v3.65.33 publicada y verificada tras comprobar la cobertura de recuperación. [Encargo](https://github.com/estudiomoderno/moderno.app/issues/49), [PR #50](https://github.com/estudiomoderno/moderno.app/pull/50), commit integrado `f497b1faf966dac93e792f9077f8d103efa38312`. Rama `interfaz/encargo-49`, base `2c56262b124a45d7d4a6d1961b64134e48485228`. Código de app anterior: `fb36f9db0a8113ee26f1d4e1b324611eb6c90650`, v3.65.32. El PR #46 de asignación de usuarios sigue separado; este lote no instala su SQL ni sus permisos.

## Recuperación: cobertura comprobada antes de activar

| Comprobación | Evidencia disponible | Límite pendiente |
| --- | --- | --- |
| Copia externa de archivos | Run [39012159548](https://github.com/estudiomoderno/moderno.app/actions/runs/39012159548), correcto. Tras autorización de lectura se recuperaron únicamente COMPLETE y el manifiesto: verificación del 17/10 a las 07:07:46 UTC, 259 objetos, 59.651.801 bytes, rutas únicas/seguras y recuento coherente. El inventario de todos los archivos del destino privado coincide en ruta y tamaño: cero ausentes, distintos o adicionales. La huella agregada del manifiesto coincide con los metadatos actuales de Storage, cuyo único bucket es privado. | La comparación de bytes la acredita el workflow de hoy, que ejecutó `rclone check --download`; no se han vuelto a descargar documentos de clientes. El procedimiento de recuperación está documentado y fue ensayado históricamente en entorno aislado; no se ha realizado una nueva restauración. |
| Vigilancia de copias | Run [39040664083](https://github.com/estudiomoderno/moderno.app/actions/runs/39040664083), correcto. | No acredita una copia de BD. |
| Base de datos | El propietario aportó captura de Scheduled backups con copia PHYSICAL del 17/10/2026 a las 00:41:14 UTC, disponible para Restore, y copias de los días 13–16. Confirmó expresamente que corresponde a Moderno App de producción. Acceso al respaldo disponible en el panel del propietario. Procedimiento de recuperación física probado históricamente y documentado en RECUPERACION-SERVICIO y BACKUP-SETUP. | La lista se verifica mediante evidencia y confirmación del propietario, no mediante consulta directa de Management API. No se ha ejecutado una nueva restauración ni se certifica el contenido de cada registro del respaldo de hoy. |
| Destino autorizado de Drive | Unidad «03 Moderno App» identificada; carpeta existente de copias vacía. El propietario autorizó expresamente consultar solo metadatos/manifiestos en «Moderno.App Data Base» y «app.moderno.app». Se localizó la copia de Storage vigente en la primera; no se ha localizado respaldo de BD en los destinos inspeccionados. | El nombre de una unidad no demuestra que contenga una copia de base de datos. No se han explorado otras unidades, movido copias ni modificado accesos. |

No se ha exportado BD ni contenido privado, descargado documentos de clientes, restaurado producción ni usado datos reales como pruebas. Solo se han materializado los dos manifiestos privados fuera del repositorio y consultado metadatos de archivos, buckets e inventarios. Los nombres, rutas privadas e identificadores no se incorporan al informe público. Las herramientas actuales de Supabase no exponen backups de Management API y no hay navegador conectado disponible para verificar su panel. La referencia oficial distingue copia de BD y objetos Storage: https://supabase.com/docs/guides/platform/backups.

La evidencia del panel y la confirmación del proyecto resuelven el bloqueo de lectura de backups. La copia de BD es anterior a la de Storage; se registran ambos puntos por separado. La publicación conserva íntegros los contratos de datos y no requiere restaurar ninguno de ellos. Si se necesitase una recuperación de datos por otra incidencia, elegir un punto coherente según el procedimiento histórico y conservar referencias/rutas; no restaurar producción como reversión de UI. La autorización de Drive ya se ha ejercido y no hace falta repetirla. Si es necesario un nuevo ensayo, acordar destino aislado y coste antes de restaurar cualquier copia.

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
- Los cambios en index.html se limitan a cargar los dos recursos nuevos y la versión/cache v3.65.33. No cambian sus funciones de datos o navegación.

## Verificaciones y límites

- Batería Node: 439 pruebas (437 existentes y dos de inactividad/fallo seguro del lote).
- Chromium sin red, SDK ni credenciales: 1440/1280/1100 px; 1024/390 px mantienen interfaz anterior. Marcado real de navegación, logos, CSS, iconos, projectTabsHtml, handlers go()/projTab() y lógica canView()/myAccessLevel() reales; vistas con contenido ficticio y sesión/perfiles simulados. No equivale a un ensayo de inicio de sesión o guardado HTTP.
- Aplicación completa mediante el servidor oficial aislado (`desktop-shell-full-app.test.py`): 1440/1100/390 px, conexión y clave ficticias sustituidas en memoria, almacenamiento local separado, SDK desactivado y red externa bloqueada. Se ejecutan todos los renderizadores de navegación originales y las siete pestañas del proyecto, con registros ficticios y colecciones intactas tras un recorrido de calentamiento de normalizaciones existentes. En escritorio los accesos se pulsan con ratón, incluidos sus desplegables. SettingsUI real conserva su borrador al cancelar la salida y solo lo descarta tras pulsar expresamente; el perfil original permanece intacto. La vuelta a la interfaz anterior conserva los nodos. No se prueban autenticación ni RPC/guardado de Supabase.
- Todas las rutas originales accesibles, siete pestañas, selección/teclado, Escape, comprimir/expandir, opciones según perfil simulado, borrador conservado ante navegación cancelada y todas las colecciones ficticias intactas.
- Inactividad durante carga, activación de escritorio tras recuperar acceso, retorno explícito, mismos nodos y SVG antes/después. Se comprueba fallo seguro: error de presentación vuelve a UI anterior sin romper el render original.
- Revisión visual de escritorio claro y oscuro con identidad actual. No se reutilizan capturas privadas.
- CI [39050506038](https://github.com/estudiomoderno/moderno.app/actions/runs/39050506038) correcto en el candidato con regresión de tamaño: JavaScript, sintaxis PHP y autorización de invitaciones sin enviar correos. PHP no está instalado en este executor; la validación PHP se ejecutó en Actions.
- No realizadas: nuevo ensayo de restauración, integración HTTP con Supabase y sus usuarios ficticios ni prueba autenticada productiva. El ensayo HTTP local valida la interfaz completa, sin certificar esos servicios de backend, cuyo código y permisos no cambian. La disponibilidad del backup actual de BD queda acreditada por la captura y confirmación del propietario, con los límites indicados. La publicación debe comprobarse por separado.

## Activación y reversión

`ENABLED=true` activa la interfaz de escritorio en el candidato tras resolver la puerta de recuperación. Se puede desactivar de inmediato con setEnabled(false), sin recarga ni escritura de datos.

Repetir las pruebas pertinentes del candidato activo y revisar diff/CI. Publicar por deploy-app.yml, recursos primero y entrada después. El verificador incluye desktop-shell.js y brand/desktop-shell.css (11 recursos totales). Comprobar Actions y hashes públicos antes de anunciar publicación. No forzar recargas sobre pestañas con borradores.

Retorno inmediato de la pestaña: `ModernoDesktopShell.setEnabled(false)` restituye los nodos y elimina el contenedor nuevo; no recarga ni escribe datos. Retorno permanente: desactivar la constante y publicar por el mismo workflow, o revertir exclusivamente este lote, manteniendo cualquier trabajo posterior. La base estable conserva `app/` íntegro en `fb36f9d`; no restaurar BD por un problema visual. Mantener recursos viejos y nuevos durante la validación para evitar pestañas/cachés incoherentes.

Publicación del primer lote: CI del candidato activo [39052548648](https://github.com/estudiomoderno/moderno.app/actions/runs/39052548648), correcto; despliegue [39052771739](https://github.com/estudiomoderno/moderno.app/actions/runs/39052771739), segundo intento correcto. El primer intento falló por timeout FTPS al guardar el estado de un servicio sin cambios, antes de subir recursos o entrada de la app. El segundo superó las 439 pruebas Node, PHP y las 24 comprobaciones de autorización sin correo, subió recursos y después HTML, y verificó SHA-256 de los 11 recursos públicos sin iniciar sesión. No se ha realizado un recorrido autenticado con datos reales.

El encargo #49 queda abierto: etapa 0 comprobada con los límites descritos; etapa 1 publicada/verificada y etapa 2 en lotes separados, empezando por el resumen del proyecto. No certificar conservación de datos mediante recuentos aislados ni afirmar despliegue por el mero hecho de crear un PR.
