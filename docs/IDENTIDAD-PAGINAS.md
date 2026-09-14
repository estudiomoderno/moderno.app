# Identidad común de páginas — v3.56.0

La identidad aprobada de Tareas y Proyectos se extiende a las páginas internas mediante `app/brand/app-identity.css`, cargado después de los estilos específicos. El render marca `#view` con `data-page` para conservar las reglas propias de ambas vistas.

## Decisiones

- Fondo crema #f6f4eb con cuadrícula de 28 px muy tenue; superficies #f8f6ef y controles beige #e4dfce.
- Acción principal negra #181818; títulos y cifras principales con Acorn. No se sustituyen iconos ni logotipos.
- Botones redondeados, campos de 16 px de radio, tarjetas y ventanas de 22–26 px. Foco visible neutro, sin cambio azul del buscador.
- Estados de cobro conservan significado verde, rojo y amarillo suave; el modo oscuro usa superficies cálidas y texto crema.
- Controles táctiles de al menos 42–44 px, filtros adaptables y tablas con su desplazamiento interno existente.
- Portales y documentos imprimibles conservan su presentación. La hoja se limita a pantalla y no modifica plantillas PDF, permisos, importes ni datos.

## Verificación

324 pruebas automáticas correctas. Revisión local contra el clon aislado: Facturas, Biblioteca, Calendario, Contactos, Contabilidad, Previsión, Informes, Catálogo, Compras, Plantillas, Utilidades y Ajustes. Inspección visual móvil de Biblioteca, Contactos, Presupuestos, Contabilidad, Calendario, Catálogo y Compras; revisión oscura de Ajustes, Catálogo y Presupuestos. Ventana de nuevo contacto y selector telefónico revisados sin guardar registros.

Durante la revisión, dos registros incompletos del clon mostraron errores de lectura anteriores: Calendario suponía que todo proyecto tenía una lista de tareas y Presupuestos suponía que toda marca existía. Se añadieron valores de reserva sin transformar registros.

## Puesta en marcha y publicación

Usar el servidor local documentado del repositorio (`scripts/identity-clone-server.mjs`) para revisar contra el clon. No incluir páginas auxiliares locales de pruebas en la publicación. Ejecutar `node --test scripts/*.test.mjs` y `git diff --check` antes de subir. El flujo `deploy-app.yml` prueba el candidato y publica recursos antes del HTML al actualizar main.

Para futuras páginas, reutilizar estas variables y componentes; evitar colores literales o reglas globales que alcancen documentos. Para revertir el aspecto, retirar el enlace a esta hoja; las correcciones de lectura pueden permanecer.
