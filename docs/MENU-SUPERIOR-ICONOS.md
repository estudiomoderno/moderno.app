# Cabecera compacta — v3.65.37

Petición del propietario del 18/10/2026. Rama `interfaz/menu-superior-iconos` sobre `22c57e8`; app anterior v3.65.36, publicada por #58 (`1ab49b7`). Continuación visual de #49, sin desarrollar los encargos independientes #59/#60.

## Resultado y alcance

Barra superior de escritorio solo con iconos y etiquetas al pasar el ratón o enfocar con teclado. Conserva SVG existentes, Acorn y colores oficiales. El símbolo compacto original no cambia el fondo al pasar el cursor, pulsar, enfocar o estar en Inicio; mantiene su acción original de navegación. Notificaciones y perfil permanecen en sus posiciones y con sus nodos originales.

Finanzas reemplaza los accesos de la cápsula por Facturas, Presupuestos, Contabilidad, Informes y Previsión de cobros, con flecha de regreso. No abre otra pantalla ni renderiza el formulario al cambiar exclusivamente de grupo. Escape desde la cabecera permite volver y devuelve el foco al acceso Finanzas. La navegación a pantallas sigue delegándose en los botones originales; los borradores conservan sus confirmaciones. Al entrar en un módulo financiero por otra vía aparece su grupo; al pulsar Volver se puede elegir otro módulo sin salir del formulario actual.

Se retira el control redundante de comprimir/expandir, porque la cabecera siempre presenta iconos. Productos y servicios y Más herramientas conservan sus desplegables con los módulos originales y nombres completos. Cada opción mantiene canView; un perfil sin módulos financieros no ve Finanzas. Si pierde acceso mientras ese grupo está abierto, vuelve al menú general. No cambian roles ni autorizaciones de servidor.

Cambios de app limitados a `desktop-shell.js`, `brand/desktop-shell.css` y versión/cache en `index.html`. Sin cambios de SQL, Supabase, guardado, almacenamiento, archivos, copias, workflows, logotipo o dock. Pantallas excluidas y móvil/tablet mantienen su navegación existente. No se fuerza recarga de sesiones.

## Comprobaciones y límites

- 457 pruebas Node correctas.
- Chromium aislado a 1440/1280/1100/1024/390 px; aplicación completa mediante el servidor oficial a 1440/1100/390 px, con identidad/conexión/registros ficticios, SDK desactivado y red externa bloqueada.
- Fondo del símbolo estable en hover e Inicio; nombres emergentes, ancho compacto y controles de 44 × 44 px. Finanzas, regreso, Escape/foco, todos los accesos originales pulsados desde sus grupos visibles y restricciones simuladas de propietario/miembro/colaborador.
- Cambiar únicamente de grupo conserva el mismo nodo y contenido del formulario, incluso con borrador. Elegir Facturas con cambios pendientes conserva la vista y ejecuta la confirmación original. Regresión de ajustes, perfil/notificaciones, resize, paneles del proyecto y colecciones ficticias intactas, sin escrituras remotas.
- Revisión visual clara/oscura y transición respetuosa con movimiento reducido. PHP y las 24 comprobaciones de autorización sin correo corresponden a Actions, al no estar PHP instalado aquí. No se prueban con datos reales autenticación, RPC ni guardado HTTP de Supabase.

## Publicación y reversión

Publicación autorizada mediante PR y `deploy-app.yml`, tras CI. Recursos antes de HTML y verificación SHA-256 de los 12 recursos públicos. Esta documentación describe el candidato; el resultado final de publicación y sus enlaces se registra en el PR antes de confirmarlo al propietario.

Retorno inmediato en la pestaña: `ModernoDesktopShell.setEnabled(false)` restaura los nodos originales sin recarga ni escritura. Retorno permanente: revertir solo este lote y sus versiones/cache por el mismo proceso, conservando cambios posteriores; app anterior en `1ab49b7`. No restaurar datos para deshacer esta presentación.
