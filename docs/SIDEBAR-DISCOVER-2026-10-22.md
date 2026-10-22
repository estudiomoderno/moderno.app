# Discover y Soporte en el menú — v3.65.109

El propietario solicita añadir únicamente la sección inferior de su referencia: Discover con Plantillas, Tutoriales y Documentación, sin Comunidad, y Soporte al pie del lateral. Confirma `https://doc.moderno.app` como destino de Documentación.

Se conserva la navegación existente. La ruta de Plantillas se mueve de Herramientas a Discover y mantiene el generador, las plantillas y los documentos guardados y sus permisos. En escritorio, el adaptador incluye Discover después de Productos y servicios; Soporte está fuera del contenedor desplazable, debajo del control de contraer. El lateral original incorpora el mismo grupo y pie para móvil, tablet y recuperación del adaptador. Ambos conservan iconos, teclado, foco visible, tema y modo contraído.

Documentación es un enlace HTTPS normal que abre otra pestaña con `noopener noreferrer`. El registro de eventos internos se limita a `data-view` para que el enlace externo no cambie la ruta ni quede interceptado. No se modifica GitBook ni se configura su dominio. El destino se toma de la indicación del propietario; el lector web disponible no pudo verificar la disponibilidad del sitio, por lo que no se afirma una comprobación del contenido remoto.

Tutoriales y Soporte son entradas de navegación nuevas con rutas `/es/tutoriales` y `/es/soporte`. Por ahora muestran «Próximamente», como otras secciones aún sin contenido. No se inventa una videoteca, buzón ni sistema de tickets. No se modifican permisos de las áreas actuales ni existen escrituras o migraciones de datos para este cambio.

## Comprobaciones

- 653 pruebas Node correctas; contrato de rutas del menú actualizado sin duplicar rutas existentes.
- Chromium con servidor oficial aislado, datos ficticios y bloqueo de conexiones externas/escrituras de red a 1440×900, 1280×600, 1100×650, 1024×768 y 390×844.
- Orden y visibilidad, URL/target/rel de Documentación y ausencia de interceptor onclick, foco de teclado, rutas internas, contenido original de Plantillas, Soporte fijo mientras se desplaza el menú, lateral contraído y recuperación del lateral original. Los registros de negocio permanecen idénticos después de navegar.
- Los permisos existentes siguen ocultando Plantillas al colaborador; Tutoriales, Documentación y Soporte no exponen datos de negocio. La documentación externa no se carga en los ensayos aislados.
- Capturas de escritorio y modo contraído revisadas. CI añade sus comprobaciones existentes de PHP/SQL, sin publicar ni escribir datos productivos durante las pruebas.

Archivos: `app/index.html`, `app/desktop-shell.js`, `app/brand/desktop-shell.css`, `app/router.js`, prueba del contrato del menú y ensayo de navegador.

## Publicación y reversión

Publicar por el workflow habitual después de verificar CI. No afirmar publicación sin comprobar el despliegue y los recursos públicos. No requiere migración de base de datos. Reversión: revertir únicamente esta entrega de interfaz; la biblioteca de documentos y el resto de datos se conservan.
