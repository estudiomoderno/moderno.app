# Dirección 2 y cabecera — v3.65.130

Se añade «Dirección 2», con ejemplo «Portal, piso, puerta…», en el Sheet Nuevo proyecto y su fallback nativo. Lleva `autocomplete="off"`; Google no escribe en ese campo y una nueva selección mantiene lo introducido manualmente. Se conserva al pasar por Crear cliente o recuperar el formulario nativo. El dato forma parte de la dirección completa guardada en `addr`, igual que el resto de sus componentes; no se añade ninguna propiedad nueva al contrato de servidor ni se cambia Supabase.

En la cabecera, se oculta la zona de pestañas cuando está vacía y se reduce a 4 px la separación de los controles del componente. Inicio y + quedan próximos sin reducir su área de pulsación de 32 px. El fallback también oculta su zona vacía. Las pestañas abiertas, la búsqueda y las secciones del proyecto conservan su funcionamiento.

Validación: 682 pruebas Node; Chromium 1440/1100/390 con Dirección 2 manual, no sobrescrita por Google ficticio, guardado, reanudación y fallback; distancia Inicio/+ medida sin pestañas abiertas; regresión completa de ventanas de proyectos, búsqueda, cierre, teclado y móvil; 1428 comprobaciones PostgreSQL 17 local sin red con dirección que incluye portal/piso, relectura por colaborador y ROLLBACK. Ninguna escritura de prueba en producción. El deploy comprueba además Google real y los hashes públicos antes de anunciar publicación.

Recuperación: revertir el PR y sus recursos recompilados. No requiere restauración de BD ni cambios de permisos. El texto de Dirección 2 de proyectos ya creados permanece en su dirección completa.
