# Presencia del equipo

Canal Supabase Realtime privado `equipo:<estudio UUID>`. Solo administradores y colaboradores del estudio pueden entrar; los portales de clientes, contratistas y gestoría no reciben presencia interna. Aplicar `SQL/presencia-equipo.sql` primero al clon y comprobar sus políticas antes de producción.

La barra permanece en la parte superior, con iniciales y nombre accesible. Se deduplican pestañas del mismo usuario. Una desconexión vacía los avatares y muestra reconexión. Las pestañas ocultas dejan de anunciar actividad.

Los cursores son mensajes efímeros limitados a unos 15 por segundo, sin almacenamiento. No se envían correos, texto, clics ni valores de formularios. El contexto visible se identifica con SHA-256 calculado localmente; únicamente pantallas iguales muestran movimientos. Se usa la posición dentro de un elemento de la pantalla, sin depender del desplazamiento de cada navegador. Se ocultan al desplazarse, cambiar de pantalla o después de 3,5 segundos sin movimiento. En móvil no se muestran cursores.

Archivos: `app/team-presence.js`, `app/team-presence.css`, integración en `app/index.html`. La sincronización de datos conserva su canal separado y su consulta periódica.

Pruebas: `node --test scripts/team-presence.test.mjs`; autorización PostgreSQL con `node scripts/team-presence-sql.mjs <ruta a pglite/dist/index.js>`. Antes de publicar hay que confirmar conexión real de dos identidades del clon, aislamiento de estudios y cierre de sesión.

## Verificación de v3.55.0 — 14/09/2026

324 pruebas de Node correctas y 24 combinaciones de rol/estudio verificadas en PostgreSQL para lectura y envío. En el clon szbswxpkhidywaosdfcg se comprobaron dos identidades reales ficticias: avatares recíprocos, recepción del cursor, denegación de acceso al segundo estudio y retirada del avatar tras desconectar. La app completa se revisó en escritorio y en un marco móvil de 390 px: barra a 58 px, justo debajo del menú, también después de desplazar 557 px.

El ensayo reproducible `scripts/presence-browser-test.mjs` usa exclusivamente ese clon y dos cuentas ficticias. Recibe la clave pública y contraseña de ensayo en un formulario local; las mantiene en memoria, sin registrarlas. No modifica documentos. El usuario adicional `presence-355@example.invalid` queda limitado al estudio ficticio Product Clipper A, para futuras pruebas. Nunca usar este ensayo con credenciales reales.

Las políticas se instalan antes que la interfaz. Para revertir la interfaz se publica una nueva revisión del código anterior; no se restauran bases de datos ni se borran documentos. Los avatares son identidad declarada por cada cliente del canal, no una prueba de autoría de cambios ni de permisos administrativos. Los permisos siempre se verifican en el servidor.

Revisión v3.55.1: el identificador de la pantalla excluye saludos personales y el reloj; dos compañeros con nombres distintos pueden coincidir en Proyectos. Se incluye el modo de vista para separar Board, Lista y cronología.

## v3.56.1
La barra se alinea a la derecha, sin separador inferior, y se oculta hasta 700 px (móvil). En tablet y escritorio muestra fotos circulares; conserva iniciales como alternativa si no hay foto o no carga. El nombre permanece en la ayuda accesible, sin texto junto al círculo. La foto de perfil se comparte por el mismo canal privado del equipo, con validación del formato y tamaño; no cambia los permisos ni guarda registros nuevos.

## v3.56.2
La lista incluye primero al usuario actual con foto o iniciales, también cuando está solo. Se elimina el mensaje Solo tú por ahora. Sus otras sesiones siguen excluidas para no duplicar su círculo ni mostrar su propio cursor.
