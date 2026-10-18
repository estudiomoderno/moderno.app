# Cabecera oscura plegable — v3.65.39

Petición del propietario del 18/10/2026. Rama `interfaz/cabecera-oscura-plegable` sobre `5056d3c` (#62), app anterior v3.65.38. Continuación visual de #49.

## Resultado

Se recupera la paleta del menú lateral anterior de `brand/tasks-identity.css`: negro `#111`, crema `#f6f4eb`, hover `#383832` y separadores `#44443d`. La cápsula horizontal tiene el símbolo original invertido en blanco y los accesos actuales; el fondo del símbolo sigue fijo. No se modifica el SVG ni las fuentes. Los desplegables, perfil y notificaciones conservan sus superficies y posición independientes.

Flecha circular clara de 32 px y borde oscuro de 3 px, superpuesta al extremo redondeado, con área de interacción de 44 × 44 px. Reutiliza los dos SVG originales de las flechas, con clases propias para no depender del antiguo estado `navmini`.

Al comprimir se oculta toda la navegación de la cápsula, incluidos accesos generales y Finanzas, dejando únicamente símbolo y flecha de despliegue. La navegación oculta usa `hidden` e `inert`; el botón conserva nombre accesible, `aria-controls` y `aria-expanded`. Ratón, Enter y Espacio permiten plegar/desplegar. Se cierran desplegables al plegar y el foco queda en el control disponible.

No se renderiza ni cambia la vista al plegar. Se mantiene el grupo financiero al reabrir, el formulario y sus valores. El estado se recuerda durante la sesión de ejecución y al cambiar de tamaño, sin guardar preferencias nuevas ni escribir datos. La carga inicial presenta la barra desplegada. Móvil/tablet y pantallas excluidas conservan su UI.

Solo cambian `desktop-shell.js`, su CSS y la versión/cache de dos recursos en index.html. La comparación estática confirma lógica de index.html idéntica a main después de retirar esos tres cambios. No hay cambios de datos, permisos, Supabase, guardado, archivos, copias, mailer ni workflows.

## Comprobaciones y límites

457 pruebas Node correctas. Chromium aislado 1440/1280/1100/1024/390 px y app completa con servidor oficial 1440/1100/390 px, con identidad/conexión/datos ficticios, SDK desactivado y red externa bloqueada. Plegado por ratón/Enter/Espacio, navegación oculta no enfocable, foco, grupo financiero conservado, perfil disponible y estado comprimido al salir/volver del tamaño de escritorio. Borrador ficticio y calculadora real conservan exactamente el mismo nodo y los valores introducidos.

Revisión visual desplegada/comprimida y clara/oscura. Contraste comprobado ≥ 4,5:1 para accesos seleccionados y sin seleccionar en ambos temas. Regresión de rutas originales, permisos simulados, menús anidados, ajustes/borradores, notificaciones, dock y colecciones ficticias intactas, sin escrituras remotas. PHP/autorización sin correo corresponde a Actions. No se ensaya autenticación ni guardado HTTP con datos reales.

## Publicación y retorno

CI del PR antes de integrar; `deploy-app.yml` publica recursos antes de HTML y verifica SHA-256 de los 12 recursos públicos. El PR registra el resultado y enlaces finales antes de confirmar entrega.

Retorno inmediato de la cabecera con `ModernoDesktopShell.setEnabled(false)`, sin recarga ni escritura. Reversión permanente: revertir solo este lote/cache por el proceso habitual, conservando cambios posteriores. Base estable v3.65.38 en `5056d3c`; no restaurar datos para revertir esta presentación.
