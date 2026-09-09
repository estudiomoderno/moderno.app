# Rutas y transición v3.33

Entrega posterior al logo v3.32.6. Autorización directa del usuario: «si haz todo incluido el logo».

## Inventario

| Vista interna | Dirección española |
| --- | --- |
| home | /es/ |
| workspace | /es/workspace |
| biblioteca | /es/biblioteca |
| proyectos | /es/proyectos |
| agenda | /es/agenda |
| calendario | /es/calendario |
| contabilidad | /es/contabilidad |
| prevision | /es/prevision-cobros |
| facturas | /es/facturas |
| presupuestos | /es/presupuestos |
| catalogo | /es/catalogo |
| compras | /es/compras |
| informes | /es/informes |
| plantillas | /es/plantillas |
| utilidades | /es/utilidades |
| integraciones | /es/integraciones |
| admin | /es/administracion |
| ajustes | /es/ajustes |
| proyecto | /es/proyecto/:id |
| estancia | /es/proyecto/:id/estancia/:id |
| presedit | /es/proyecto/:id/presentacion/:id |

Los identificadores son numéricos. Los datos se resuelven con los permisos existentes; un identificador no otorga acceso. Antes, estancia y presentación compartían /proyecto/:id y no identificaban el detalle; ahora lo hacen. Un detalle inexistente vuelve al proyecto disponible. Un proyecto todavía no cargado mantiene el destino hasta cargar datos.

## Compatibilidad

- /#/proyectos, /proyectos y /index.html#/proyectos se interpretan y normalizan con replaceState inicial; las navegaciones nuevas usan pushState. Se conserva la consulta. Se comprueban atrás, adelante y recarga.
- Portales /cliente/:token y /obra/:token[/planos], incluidos sus hashes antiguos, mantienen su manejo y tokens. No se generan rutas con idioma para ellos. Las invitaciones actuales usan email/rol en Supabase y la URL raíz; sin cambio.
- Recursos absolutos, /api/, /auth/, /storage/ y /.well-known/ quedan fuera de la reescritura. Archivo o directorio existente conserva su respuesta. Recursos inexistentes con extensión no devuelven HTML de la app.
- OAuth y recuperación conservan el callback raíz ya utilizado. El destino interno se recuerda en sessionStorage, sin copiar credenciales; al iniciar sesión se recupera en la misma pestaña, preservando los parámetros del callback para el SDK. Los hashes y parámetros OAuth no se normalizan mientras estén presentes. Un correo abierto en otro navegador o pestaña sin ese almacenamiento vuelve a la raíz. No se ha ejecutado un nuevo login real contra producción en esta prueba.
- Los formularios abiertos bloquean la navegación del historial y conservan contenido. No se fuerza recarga ni se modifica el flujo de guardado.

## Idiomas

router.js separa locale, slug e identificador interno. Solo es está habilitado; este cambio no traduce toda la aplicación ni anuncia otros idiomas. Para ampliarlo hay que añadir catálogo, traducción y pruebas de todas las rutas.

## Presentación y carga

Fundido de opacidad 0,65 a 1 durante 180 ms, sin esperas ni ocultación inicial. Solo cambia con vista/detalle/pestaña de proyecto, no con el sondeo o guardado de la misma vista. Se omite con prefers-reduced-motion. La carga real de acceso utiliza aria-busy y conserva el mensaje de error y el botón Reintentar existentes; no se añaden indicadores simulados.

## Comprobaciones y reversión

151 pruebas automatizadas: inventario, normalización, detalles pendientes, exclusión de portales/endpoints y OAuth, historial, borrador protegido, callback/destino, fundido sin repetición y movimiento reducido; más la batería previa. UI local con datos ficticios: Proyectos a Calendario, atrás/adelante, recarga, hash antiguo a proyecto y formulario no guardado al pulsar Atrás. No se hacen escrituras de prueba en producción.

.htaccess se distribuye como recurso antes de HTML en el workflow habitual. Verificar tras publicar /es/proyectos, /es/calendario, /es/proyecto/501 (solo respuesta HTTP, identificador ficticio), /proyectos, recursos de marca/JS y endpoint inexistente de prueba con GET, que debe devolver 404 sin HTML de la app. La app sigue controlando la autorización al cargar datos.

Reversión: restaurar únicamente router, integración HTML y .htaccess desde b0f4be7, aumentar versión y desplegar. Conservar el logo y todos los datos. No restaurar la base de datos.

## Publicación verificada

9/9/2026, commit 8046ca16264c05b0da473064551f35350fb91761. Actions success: https://github.com/estudiomoderno/moderno.app/actions/runs/34390109486. Seis entradas HTTP (raíz, /proyectos, /es/proyectos, /es/calendario, proyecto y estancia ficticios) sirven 200 con HTML exacto. Ocho JS/CSS y cuatro SVG coinciden con el código probado. /api/__moderno_route_probe__ y /brand/__moderno_route_probe__.svg devuelven 404 sin HTML de la SPA. La sesión existente en navegador carga /es/proyectos, declara v3.33 y finaliza aria-busy=false. No se escribieron registros de prueba en producción.
