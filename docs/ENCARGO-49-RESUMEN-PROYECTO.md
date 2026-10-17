# Encargo #49: resumen del proyecto, segundo lote visual

Candidato v3.65.34 del [PR #51](https://github.com/estudiomoderno/moderno.app/pull/51), en rama `interfaz/49-resumen-proyecto`, actualizado sobre main tras integrar el [PR #50](https://github.com/estudiomoderno/moderno.app/pull/50). El primer lote v3.65.33 ya está publicado y verificado por el run [39052771739](https://github.com/estudiomoderno/moderno.app/actions/runs/39052771739), segundo intento correcto tras un timeout FTPS previo a subir recursos de la app. La cobertura de recuperación se acredita en [ENCARGO-49-INTERFAZ](ENCARGO-49-INTERFAZ.md). Este segundo lote espera CI y publicación propios.

## Resultado

Una hoja de estilos de escritorio adapta exclusivamente el resumen real del proyecto al espacio central de la nueva navegación: cabecera despejada, métricas en tarjetas alineadas, acciones compactas e historial accesible, avance de obra y resumen de compras con importes legibles en ambos temas. Conserva orden, textos, cifras, botones, datos y funciones actuales. No añade información ilustrativa ni importa código o datos del prototipo.

Las reglas requieren `body.desktop-shell` y al menos 1100 px. La interfaz previa, otras pestañas y móvil mantienen sus estilos actuales. No se cambian logotipos ni fuentes. La cifra de cobro sigue dependiendo del perfil administrativo; el CSS no concede permisos ni calcula cantidades.

## Archivos y alcance

- `app/brand/desktop-project-overview.css`: presentación limitada al resumen, con los tokens actuales. El total de compras usa la pareja de colores seleccionado/texto seleccionado para conservar contraste en modo oscuro.
- `app/index.html`: solo se añade el enlace de la nueva hoja con cache 36534 y se incrementa la versión a v3.65.34; no se cambia su lógica. Los recursos de navegación mantienen su versión 36533.
- Verificador de publicación y su prueba: incluyen la hoja nueva (12 recursos tras integrar ambos lotes).
- Ensayo de app completa: comprueba métricas conocidas, acciones Ver tareas/Ver finanzas, apertura y cierre del historial, colecciones intactas y contraste mínimo 4,5:1 del total en escritorio claro/oscuro.

Sin cambios en SQL, Supabase, Auth, permisos, Storage, sincronización, formatos de registros, identificadores ni rutas de archivos. Sin guardados o ensayos con datos reales.

## Comprobaciones

Comprobaciones finales repetidas sobre main `f497b1f`, con el candidato activo v3.65.34: 439 pruebas Node aprobadas; ensayo de navegación Chromium a 1440/1280/1100/1024/390 px. Aplicación completa mediante servidor oficial aislado, SDK desactivado y red externa bloqueada: 1440/1100/390 px, todas las rutas y pestañas reales, SettingsUI y sus borradores, acciones del resumen e historial. Colecciones ficticias intactas después del recorrido. Se espera a que terminen las transiciones de tema antes de revisar contraste y capturas. Revisión visual clara y oscura de escritorio.

La comprobación estática contra main confirma que, retirando únicamente el enlace CSS nuevo y el cambio de versión, index.html conserva exactamente su contenido previo. No acredita integración HTTP con Supabase, inicio de sesión ni restauración de respaldos. El PR se dirige ahora a main y debe superar CI antes de integrar; no se presenta como ya ejecutado ese CI.

## Reversión y publicación

Retirar el enlace a desktop-project-overview.css devuelve la presentación anterior del resumen sin recargar datos ni restaurar la BD. Desactivar el primer lote elimina también el efecto de esta hoja al retirar `desktop-shell`.

Primer lote y recuperación comprobados. Revisar el diff y CI del candidato actualizado, publicar por el workflow habitual y verificar la hoja servida y sus hashes junto al resto de recursos (12 en total). Mantener los recursos previos y no forzar recargas con borradores.
