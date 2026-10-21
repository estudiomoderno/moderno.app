# Duplicar lista desde ajustes — v3.65.95

## Reproducción y alcance

El menú Duplicar lista seguía usando un clon JSON con `Date.now()` para la estancia y conservaba los IDs de secciones/productos y respuestas del cliente. Dos acciones en el mismo milisegundo podían compartir ID de estancia. Tampoco conservaba/enviaba inmediatamente: dependía de los 500 ms de persistencia y los 900 ms de envío habituales. Las pruebas del handler real del menú reproducen ambos defectos antes del cambio.

Esto no demuestra qué sucedió en la sesión real: el usuario responde «Necesita revisión o no me fijé». Confirma que puede descargar la copia anterior más reciente; su contenido todavía no ha sido revisado. No afirmar que las listas desaparecidas estén recuperadas ni que se hayan borrado en servidor.

## Corrección

La acción usa `roomCloneData`, ya empleado al copiar entre proyectos: IDs numéricos compatibles y únicos para estancias, UUID nuevos de secciones/productos, copias profundas de archivos/datos y respuestas de cliente no heredadas. No prepara ni renumera el original ni sus referencias. La acción comprueba acceso, proyecto actual y ambigüedad de identificadores antes de mutar.

Después de añadir, llama inmediatamente a la persistencia local y al envío existentes, sin esperar el debounce. La pantalla sigue operable durante la subida; el aviso dice Guardando y el indicador conserva su estado real. No se alteran RPC, formato, fusión, permisos, almacenamiento remoto ni manejo de errores.

Se mantiene una guarda en memoria de las copias creadas en la sesión. Antes de recargar/cerrar, el navegador avisa si siguen existiendo localmente y no aparecen en la versión confirmada. Se retira esa condición al confirmarse, eliminarse la copia o cambiar de sesión. La advertencia depende del comportamiento de beforeunload y la activación del navegador; no garantiza proteger cierres forzados del sistema. Las copias pendientes locales siguen conservándose para revisión antes de cargar la nube; no se reimportan automáticamente.

## Validación y recuperación

557 pruebas Node correctas. Chromium aislado a 1440/390 px: botón real del menú, varias copias mientras el primer RPC está retenido, copia local inmediata, aviso de recarga pendiente, confirmación y relectura del servidor simulado con ambas listas; datos/archivos y vínculos originales intactos. RPC rechazado mantiene pendiente, descarga JSON y copia anterior con los duplicados. SDK real desactivado, cliente en memoria, red externa bloqueada y cero escrituras reales. PHP se comprueba en CI.

Recuperar listas antiguas exige revisar el JSON descargado o las copias disponibles, identificar las listas y preparar una incorporación selectiva. No importar una copia completa ni sobrescribir la nube sin revisión y autorización concretas. El archivo del usuario no forma parte del repositorio.

Publicación pendiente de CI, integración y verificación de 41 recursos públicos, incluida index.html. Revertir el commit de código para retirar el comportamiento; no restaurar/borrar registros para revertir. Las copias nuevas conservan el formato compatible actual.
