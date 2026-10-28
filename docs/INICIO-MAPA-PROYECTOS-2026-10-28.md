# Inicio con mapa de proyectos — v3.65.134

Por petición del propietario, Inicio incorpora un mapa gris con panel lateral, inspirado en la captura de ReUI proporcionada. Es una adaptación propia en la arquitectura actual; no se instala ni copia un bloque Pro ni se añaden dependencias. Usa Google Maps JavaScript y Places (New), ya configurados para la aplicación.

## Comportamiento

- Mapa inicial de proyectos activos, búsqueda por código/nombre/cliente/dirección y filtros Activos, Terminados, Todos, Archivados, Necesitan atención y Sin dirección. Vista alternativa de lista.
- Marcadores con código; agrupación por proximidad visual. Una agrupación permite elegir cualquiera de sus proyectos.
- Ficha con nombre, cliente, dirección, estado, porcentaje basado en las mismas tareas que las tarjetas de proyectos y botón Abrir proyecto.
- Resumen de activos, terminados, avisos y avance ponderado por tareas en proyectos activos. Un proyecto sin tareas no inventa un porcentaje de trabajo realizado.
- Zoom y encuadre de los proyectos filtrados. El encuadre automático termina al interactuar o seleccionar un proyecto.
- En móvil, el resumen abre un panel inferior. La atribución propia de Google permanece libre. No se solicita geolocalización del usuario.
- Las funciones previas de tareas, agenda, proyectos recientes y finanzas permanecen debajo en «Actividad del estudio», con los mismos permisos.

## Datos y permisos

`mountHomeMap` suministra únicamente proyectos no plantilla del estado autorizado, filtrados por los espacios visibles y la selección actual de marca. Revalida sesión, estudio, rol y acceso antes de consultas, respuestas y navegación. Cliente, contratista y gestoría no reciben esta pantalla. El colaborador conserva acceso al mapa de sus proyectos sin mostrar finanzas. Cerrar la ruta destruye mapa, overlays, eventos y observador.

No cambia contratos de guardado, BD, SQL, RLS ni Storage. No hay migración ni escrituras de prueba en producción. Las direcciones ya guardadas se consultan mediante `Place.searchByText`, con `id` y `location`, solo al mostrar la selección en el mapa. No se envían nombres de clientes, proyectos, tareas o importes al proveedor. Dirección 2 se omite de la consulta cuando se puede recuperar sin pérdida el formato de creación; el texto original permanece intacto.

Se realizan como máximo dos consultas de ubicación simultáneas por mapa. Se deduplican direcciones idénticas y los resultados/promesas se reutilizan únicamente en memoria, por identidad de sesión/estudio/rol/espacios, durante quince minutos. No se guardan coordenadas ni resultados de Google en el proyecto, almacenamiento local o registros. Cambiar una dirección cambia su consulta. La persistencia permanente de Place ID continúa deshabilitada y sin aplicar su SQL pendiente.

Ubicaciones aproximadas según la dirección, sin prometer precisión catastral. Direcciones ausentes, no encontradas y consultas fallidas se distinguen en la lista; los proyectos se pueden abrir igualmente. Se puede reintentar una consulta fallida. Si no carga Google, la lista sigue disponible y el botón Reintentar mapa recupera la vista conservando el filtro. Una pantalla sin proyectos o sin direcciones no necesita cargar Google.

## Verificación

- Node: 690 pruebas, incluidos filtros, búsqueda sin tildes, avance ponderado, consultas mínimas/transitorias y recursos publicados.
- Chromium con servidor oficial aislado, SDK simulado y registros ficticios en 1440/1100/390: motor de overlays, agrupaciones, abrir proyecto exacto, límites de concurrencia, caché/deduplicación, filtros/lista/búsqueda, dirección vacía/no encontrada/fallida, recuperación, cambio de dirección, colaborador, nueva creación, actividad previa y respuesta pendiente tras cambiar de sesión. No lecturas ni escrituras remotas.
- Regresión del editor de proyectos en los tres tamaños: campos, guardado/reapertura, autocompletado, fallback y sesión.
- La prueba real de Google del despliegue comprueba autocompletado y un mapa con marcador y ubicación de una dirección pública de Madrid, en un documento aislado, sin abrir la app ni conectar a Supabase. Una clave ausente no cuenta como prueba real.
- Publicación: CI de permisos/SQL y despliegue habitual; verificación de contenido de 56 recursos públicos, incluidos `home-map.js`, `home-map.css`, `places.js` e `index.html`.

Referencias de API contrastadas: ejemplos oficiales `googlemaps/js-samples/samples/place-text-search/index.ts` y `samples/overlay-simple/index.ts`. No se publica código ni clave del proveedor en el repositorio; el secreto de navegador existente se transforma en configuración pública restringida durante el despliegue.

Reversión: revertir este PR y sus recursos de entrada. No requiere restaurar BD ni direcciones. El Inicio anterior y su adaptador de autocompletado permanecen recuperables mediante Git.
