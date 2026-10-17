# Encargo #49: resumen del proyecto, segundo lote visual

Candidato dependiente del [PR #50](https://github.com/estudiomoderno/moderno.app/pull/50), en rama `interfaz/49-resumen-proyecto`. No activado ni publicado. Su PR se dirige a la rama del primer lote para mantener el diff acotado. No integrar hasta verificar recuperación según [ENCARGO-49-INTERFAZ](ENCARGO-49-INTERFAZ.md) y publicar/verificar primero la navegación.

## Resultado

Una hoja de estilos de escritorio adapta exclusivamente el resumen real del proyecto al espacio central de la nueva navegación: cabecera despejada, métricas en tarjetas alineadas, acciones compactas e historial accesible, avance de obra y resumen de compras con importes legibles en ambos temas. Conserva orden, textos, cifras, botones, datos y funciones actuales. No añade información ilustrativa ni importa código o datos del prototipo.

Las reglas requieren `body.desktop-shell` y al menos 1100 px. La interfaz previa, otras pestañas y móvil mantienen sus estilos actuales. No se cambian logotipos ni fuentes. La cifra de cobro sigue dependiendo del perfil administrativo; el CSS no concede permisos ni calcula cantidades.

## Archivos y alcance

- `app/brand/desktop-project-overview.css`: presentación limitada al resumen, con los tokens actuales. El total de compras usa la pareja de colores seleccionado/texto seleccionado para conservar contraste en modo oscuro.
- `app/index.html`: solo se añade el enlace de la nueva hoja; no se cambia su lógica.
- Verificador de publicación y su prueba: incluyen la hoja nueva (12 recursos tras integrar ambos lotes).
- Ensayo de app completa: comprueba métricas conocidas, acciones Ver tareas/Ver finanzas, apertura y cierre del historial, colecciones intactas y contraste mínimo 4,5:1 del total en escritorio claro/oscuro.

Sin cambios en SQL, Supabase, Auth, permisos, Storage, sincronización, formatos de registros, identificadores ni rutas de archivos. Sin guardados o ensayos con datos reales.

## Comprobaciones

439 pruebas Node aprobadas. Chromium con la aplicación completa mediante servidor oficial aislado, SDK desactivado y red externa bloqueada: 1440/1100/390 px, todas las rutas y pestañas reales, SettingsUI y sus borradores, acciones del resumen e historial. Colecciones ficticias intactas después del recorrido. Se espera a que terminen las transiciones de tema antes de revisar contraste y capturas. Revisión visual clara y oscura de escritorio.

No acredita integración HTTP con Supabase, inicio de sesión ni restauración de respaldos. El workflow de PR solo se activa contra main; este PR apilado requerirá retarget y CI después de integrar el primer lote. No se presenta como ya ejecutado ese CI.

## Reversión y publicación

Retirar el enlace a desktop-project-overview.css devuelve la presentación anterior del resumen sin recargar datos ni restaurar la BD. Desactivar el primer lote elimina también el efecto de esta hoja al retirar `desktop-shell`.

Tras superar la puerta de recuperación, publicar/verificar primero #50, ajustar la base de este PR a main, revisar el diff y CI, ejecutar comprobaciones finales y publicar por el workflow habitual. Verificar la hoja servida y sus hashes junto al resto de recursos. Mantener los recursos previos y no forzar recargas con borradores.
