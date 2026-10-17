# Barra superior flotante — v3.65.35

Petición del propietario del 17/10/2026: superponer la navegación superior como el dock inferior, usar solo el símbolo de la barra antigua comprimida, quitar de la cabecera espacio de trabajo/modo oscuro y colocar notificaciones junto al perfil. Ajuste incremental de #49; el menú inferior mantiene sus módulos reales.

## Resultado y alcance

Cápsula superior fija con los tokens crema/beige/grafito y Acorn actuales. Perfil y notificaciones flotan a la derecha; desaparece la segunda fila y la franja a todo el ancho. El símbolo es el mismo nodo SVG `.logo-mini`; no se modifica su diseño ni se cambia `navmini`. Pulsarlo abre Inicio mediante el botón original. El logo ancho sigue disponible para revertir.

Accesos a Proyectos, Tareas, Calendario, Agenda y Mail. Finanzas reúne los módulos financieros existentes; Productos y servicios reúne ambos recursos. El menú adicional conserva conversaciones y herramientas. Se mantienen canView, IDs, handlers y protección de borradores. El selector original de estudio/espacios queda dentro del perfil; abrirlo conserva abierto el menú padre. La campana/contador y avatar son los mismos nodos. El SVG de notificaciones ya instalado se añade como decoración temporal y se retira al revertir.

El tema guardado no cambia. Ajustes y móvil conservan su UI vigente. Los cambios de app son `desktop-shell.js`, su CSS y versión/cache en index.html: la comparación estática confirma lógica idéntica al retirar únicamente el incremento v3.65.34 → v3.65.35 y dos versiones de recursos. Sin SQL, Supabase, permisos, guardados, archivos, copias, mailer o workflows nuevos.

## Comprobaciones y límites

456 pruebas Node aprobadas. Chromium aislado con datos ficticios y red externa bloqueada: navegación 1440/1280/1100/1024/390 px y app completa 1440/1100/390 px mediante servidor oficial, conexión ficticia y SDK desactivado. Todas las rutas/pestañas reales, teclado, permisos simulados, notificaciones/contador, menús anidados, borradores al cambiar tamaño o cancelar navegación y retorno a los mismos nodos. Colecciones ficticias intactas. Revisión visual clara/oscura, barra sin solapamientos y perfil sin desbordamiento.

Se eliminó la flecha que la hoja global de selectores añadía debajo del avatar; se comprueba que su contenido no exceda la altura. No se prueban autenticación ni guardado HTTP de Supabase ni se realizan guardados o recorridos autenticados productivos. PHP y hashes públicos se verifican por Actions antes de confirmar publicación.

## Publicación y retorno

Publicado en app.moderno.app como **v3.65.35** mediante el [PR #56](https://github.com/estudiomoderno/moderno.app/pull/56), commit `ec339e1cbe801aa79953d5091b86d6f7e3ca5009`, base `87dbdbb`. CI [39060067000](https://github.com/estudiomoderno/moderno.app/actions/runs/39060067000), correcto. Despliegue [39060116799, intento 2](https://github.com/estudiomoderno/moderno.app/actions/runs/39060116799/attempts/2), completado con success: 456 pruebas Node, PHP/autorización sin correo, recursos antes del HTML y SHA-256 de los 12 recursos públicos coincidentes con el commit. El primer intento falló al descargar las acciones de GitHub durante la preparación del ejecutor, antes de publicar recursos; se resolvió al reintentar sin cambios de código/configuración. No forzar recargas con borradores.

Retorno inmediato sin recarga: `ModernoDesktopShell.setEnabled(false)`. Restituye campana, atributos, decoraciones, avatar y selector a sus posiciones originales sin escribir datos. Retorno permanente: revertir este lote con su cache/versionado y publicar por el mismo workflow. La base anterior de app v3.65.34 permanece en `4bf3f96`; no restaurar BD por un cambio visual.
