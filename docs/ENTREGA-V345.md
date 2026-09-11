# v3.45 — Cierre integrado del recorrido

Estado: publicada y verificada. Commit 0099668961d52989e59b4a19fd7ad125b71495a6; Actions 34617692074 completado correctamente. index.html, product-operations.js, dialog-access.js, workflow-help.js y appearance-b.css responden HTTP 200 y coinciden con el candidato normalizando finales de línea.

Se incorpora Guía del recorrido en Compras y aprobaciones: ficha independiente, lámina conservada, revisión aprobada, presupuesto, pedido parcial, entrega, instalación y economía por separado. Se actualiza el README para continuar desde un clon en otro ordenador y distinguir publicación de interfaz e instalación SQL.

Accesibilidad: nombre de diálogo, foco inicial dentro de la ventana, Tab/Shift+Tab contenidos y retorno al control anterior al cerrar. Escape no descarta un formulario. Campos de edición de producto con etiquetas asociadas; añadir foto y archivo son botones accesibles por teclado. Estilo visible del foco coherente con el tema.

## Evidencia del cierre

- 246 pruebas Node correctas. Incluyen guardado, concurrencia, roles/proyecciones, imágenes privadas fallidas, PDF interrumpido al cambiar identidad, snapshots y todas las entregas recientes. No se confunde un éxito simulado con una descarga física.
- 24 comprobaciones PHP de autorización correctas, sin enviar correo.
- 26 comprobaciones SQL integradas correctas en el clon, siempre ROLLBACK: parciales, instalación/retirada, permisos y proyecciones; 18 comprobaciones adicionales del presupuesto fijo con las funciones finales, también correctas.
- Fixture representativo: 10 estancias, 100 fichas, nombres largos y referencias de imagen no disponibles. Preparación, copia, recuperación JSON y combinación local en aproximadamente 10 ms en este equipo. No mide latencia de Supabase ni rendimiento móvil real.
- UI del clon: móvil simulado a 390 px, compras y guía revisadas visualmente; modo oscuro revisado. Teclado: Shift+Tab llega a Guardar, Tab vuelve al primer control y Cancelar devuelve el foco a Editar todo. No equivale a certificación WCAG ni ensayo de lector de pantalla.
- El servidor local se prueba incluyendo una ruta de proyecto y un recurso JavaScript, sustitución de backend, almacenamiento separado y rechazo de producción/clave administrativa.
- La instalación SQL de 3.44, última modificación del servidor, pasó conservación de datos, pedidos, historial e inventario tanto en clon como en producción. La 3.45 no modifica esquema, archivos ni datos productivos.

## Límites y pruebas externas pendientes

La prueba de invitación completa hasta recepción en buzón real y alta productiva queda pendiente de un destinatario/alta específicamente autorizados. El ensayo SMTP local y los controles de autorización no acreditan esa entrega. No se han enviado mensajes a terceros.

No se afirma prueba por usuarios piloto, teléfonos físicos, impresión/descarga física en sus equipos ni restauración de archivos nuevos posteriores a la copia ensayada. Las copias programadas están supervisadas, pero no justifican prometer que nunca pueda perderse información. El historial detallado de recuperación está en RECUPERACION-SERVICIO.md.

No hay sincronización global automática desde biblioteca, migración masiva de IDs ni nuevos permisos de cliente. Google Calendar permanece aplazado. No se ha trabajado en Web, Panelcontrol, catálogo público, CAD o nuevas integraciones.

## Reversión y continuidad

Revertir el código de interfaz a una entrega verificada conservando los datos y campos nuevos. No restaurar la base de datos sobre escrituras posteriores ni borrar almacenamiento local para resolver un conflicto. Las funciones de logística admiten reinstalar la versión previa sin borrar incidencias; se ensayó en 3.44. No forzar recargas de pestañas abiertas.

Consultar README.md, ESTADO-TALLER.md, DECISIONES.md y las entregas 3.39–3.45. El plan estratégico privado local no se incluye en Git.
