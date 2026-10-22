# Planos, documentos, diario y calendario de obra

Solicitud del propietario, 22 de octubre de 2026. Versión v3.65.111.

Los archivos generales y los planos dejan de solaparse. La categoría explícita `cat: plano` distingue los planos de los documentos; el formato PDF o imagen sigue determinando si el visor admite anotaciones, pero no determina la sección. Los archivos anteriores sin categoría continúan en Documentos: no se puede inferir que un contrato PDF sea un plano. Cada tarjeta permite mover el archivo a la otra sección conservando índice original, contenido, identificador, firma y visibilidad. Los documentos generados no se reclasifican. La subida y el arrastre capturan la sección elegida antes de iniciar la operación asíncrona.

Los planos definitivos pasan de Obra a Planos conservando `obraPlanos`, sus índices y sus acciones originales. Obra mantiene fases, lista de planeación y contactos. El calendario obtiene un acceso propio junto a Obra y Diario de obra; reutiliza las fases, fechas, progreso, edición, arrastre y exportación ICS existentes. No se migran ni duplican archivos ni fases.

Diario de obra permite registrar y editar visitas con fecha, notas y hasta seis fotos JPG, PNG o WebP (8 MB cada una). Utiliza entradas con identificador único y categoría `diario-obra` en `project.events`, compatible con el contrato de guardado ya vigente; conserva otros eventos y las notas del proyecto. No añade fotos a los documentos compartidos. Usa la subida y resolución privada de archivos existentes, mantiene referencias, no enlaces firmados, y rechaza el resultado incrustado de una subida fallida cuando existe conexión al backend. Un fallo mantiene el formulario; la interfaz no anuncia confirmación en nube hasta que lo indique el guardado habitual. Los cambios de sesión, de proyecto durante la subida y las ediciones concurrentes de la misma visita bloquean la sustitución de datos. Las fotos guardadas se conservan al editar las notas.

## Verificación

- 658 pruebas Node: categorías, índices originales, metadatos, sesiones, fallo de subida, conflicto de edición, serialización del diario y regresiones existentes.
- Chromium aislado, servidor oficial y red externa bloqueada, 1440 y 390 px: mover documentos, planos definitivos, calendario separado, navegación por teclado, crear/editar visita con foto y acceso de colaborador.
- Regresión de aplicación completa en Chromium, 1440, 1100 y 390 px: rutas, paneles, ajustes, persistencia local y vuelta atrás. Se actualizan expectativas antiguas de Discover, altura del menú de Finanzas y Portal del cliente al comportamiento ya vigente, además de las nuevas secciones.
- PostgreSQL 17 efímero con usuarios ficticios: 1416 comprobaciones, incluidas ocho nuevas de categorías y diario mediante escritura completa/delta y lectura posterior como colaborador. Las restricciones económicas permanecen. Ejecutable `node scripts/build-project-sections-checks.mjs`; incorporado a CI. No modifica esquema ni políticas productivas.
- No se han realizado pruebas de escritura contra producción ni envíos reales de fotos. La subida privada real se apoya en el servicio existente; su fallo se prueba con sustituto aislado.

## Publicación y reversión

Publicación mediante el flujo existente de aplicación después de CI. Comprobar el resultado de Actions y los recursos públicos antes de afirmar que está publicada. No requiere SQL, migraciones, cambios de RLS, Storage ni membresías.

Reversión: revertir el commit de interfaz; los archivos originales y `obraPlanos` siguen en sus colecciones. Las categorías y las visitas permanecen en el estado, aunque una versión anterior no muestre el diario. Conservar las copias habituales, no restaurar la base de datos para revertir esta interfaz.
