# Cursores de compañeros en proyectos — v3.65.100

## Objetivo y comportamiento

Mostrar un puntero con nombre y color del compañero cuando ambos coincidan en el mismo estudio, proyecto y pantalla. Las listas distinguen estancia y vista de tarjetas/filas. El visor distingue archivo, página y giro. Obra distingue la vista de planeación. Los movimientos se anclan al elemento del contenido, al producto o al papel del plano, en vez de copiar píxeles de otra pantalla.

El cursor desaparece al abandonar el contexto, perder presencia, ocultar la pestaña, abrir un formulario o quedar inactivo cinco segundos. No intercepta clics ni modifica documentos. Sirve como indicación de presencia; no reserva productos ni bloquea ediciones simultáneas.

## Implementación

- `app/header-presence.js`: evento Broadcast `project-cursor` sobre el canal privado existente `equipo:<estudio>`. Sin conexiones adicionales, tablas, RPC de guardado ni HTTP de respaldo. Solo envía cuando el websocket está unido y la presencia confirmada. Recepción limitada a sesiones/usuarios presentes; ignora otras pestañas del propio usuario.
- `app/project-cursors.js` y `.css`: normalización de coordenadas, identificación del destino, límites del protocolo, máximo 12,5 movimientos/s, nombres mediante `textContent`, color estable, limpieza y movimiento reducido. Los productos antiguos sin ID usan una huella estable; destinos ambiguos se descartan.
- `app/index.html`: contexto y permiso de equipo; atributos de producto; versión y recursos.
- `app/project-documents.js` y `app/plan-editor.js`: huella opaca del archivo y contexto de página/giro. No se transmiten URL, nombre de archivo, contenido documental ni valores de formularios.
- `scripts/verify-app-publication*`: comprobación de los dos nuevos recursos, 46 recursos en total.

Las políticas vigentes de `SQL/presencia-equipo.sql` ya autorizan presencia y Broadcast privados para administradores y colaboradores. Se inspeccionaron sus permisos mediante consulta de metadatos. Este cambio no modifica políticas, roles, esquemas ni datos productivos. Los portales de cliente/obra quedan fuera de esta función.

## Verificación

- Node: 641 pruebas, incluidas membresía y sesión, canal privado único, desconexión, no respaldo HTTP, límites del protocolo y huellas sin texto de productos.
- Chromium aislado con servidor oficial y todas las peticiones externas bloqueadas: dos identidades ficticias, transporte entre pestañas simulado, pantallas/estancias diferentes, Obra, vista de 1440/900/390 px, formulario privado, visor nativo, archivo/página y salida del compañero. Se comprueba que no cambian los registros ni se hacen escrituras de red.
- Regresión del visor PDF con documentos ficticios en 1280/390/844/768/1024 px: anotaciones, zoom, deshacer, giros, exportación, original intacto y cierre protegido.
- El flujo de CI comprueba JavaScript, SQL aislado e invitaciones PHP; el despliegue verifica los 46 recursos públicos.

## Límites y reversión

No se probaron escrituras ni movimientos con cuentas reales de clientes. El transporte de dos usuarios se ensaya con adaptador aislado; el servicio productivo conserva su autorización existente. Ante una diferencia de contenido, un destino fuera de pantalla o un producto ambiguo, se oculta el puntero para evitar señalar otro elemento. La huella del contexto no concede permisos de acceso.

Revertir el PR de esta entrega y redesplegar el commit anterior elimina la función; no requiere restaurar datos ni revertir SQL. Revisión: https://github.com/estudiomoderno/moderno.app/compare/main...mejora/cursores-proyecto.
