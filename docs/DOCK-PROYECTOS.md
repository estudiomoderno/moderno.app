# Dock de proyectos — v3.65.36

Petición del propietario del 18/10/2026, continuación incremental de #49. Base `a4f3e02`, app anterior v3.65.35 (`ec339e1`). Rama independiente `interfaz/dock-proyectos`.

## Resultado

Cápsula inferior flotante de escritorio con iconos, nombres al pasar el ratón o enfocar con teclado, y cinco separadores: Inicio | Planos / Obra | Tareas / Compras | Economía / Documentos | AI | Utilidades. Conserva Acorn, tokens oficiales y botones de 44 px. No se incorpora código del prototipo experimental ni dependencias.

Los accesos existentes mantienen sus claves y handlers. Planos es una vista de los PDF/imágenes reconocidos por el visor actual; Documentos conserva todos los archivos, incluidos los históricos. El filtrado retiene el índice original antes de crear las tarjetas, así abrir/anotar/eliminar sigue apuntando al mismo archivo. No se renumera ni duplica nada. Subidas y visor reutilizan su implementación vigente; no cambian el guardado de anotaciones ni su estado de integración.

Utilidades desaparece del menú general visible y abre las calculadoras actuales dentro del proyecto, manteniendo su contexto. Su ruta original se conserva por compatibilidad y sus restricciones se comprueban tanto al mostrar el acceso como al navegar. AI es una sección vacía con título, pendiente de definición; no llama a servicios ni requiere claves o gasto. El Portal del cliente continúa en «Opciones del proyecto», con el mismo editor y sus datos. La navegación por teclado sigue accesible desde ese panel.

En móvil/tablet se conserva la navegación superior y el patrón desplazable de pestañas; se actualizan los mismos accesos del proyecto, sin imponer la cápsula fija de escritorio. Las sesiones abiertas reciben los recursos nuevos al abrir o recargar normalmente; no se fuerza recarga sobre borradores.

## Comprobaciones

- 457 pruebas Node, todas correctas, incluidas la prohibición de abrir Utilidades sin permiso y las regresiones existentes de archivos/visor.
- Chromium aislado, sin backend ni red externa: navegación a 1440/1280/1100/1024/390 px; aplicación completa mediante el servidor oficial a 1440/1100/390 px. Datos, identidad y conexión ficticios.
- Orden y grupos, límites de la barra, nombres emergentes, flechas/Home/End, selección y foco, permisos simulados, Portal del cliente desde opciones, cálculos de Utilidades y sección AI vacía.
- PDF/imágenes filtrados con índices originales 1 y 2; Documentos muestra los cuatro archivos ficticios originales. Registros ficticios intactos tras navegación, sin escrituras remotas.
- Regresión de todos los renderizadores originales, ajustes y borradores, notificaciones, menú anidado, cambio de tamaño y retorno de la cabecera. Revisión visual clara/oscura y contraste del resumen existente.
- Sin cambios de SQL, Auth, RLS, Storage, sincronización, mailer, copias ni workflows. No se prueban con datos reales autenticación, RPC, subidas o guardado HTTP de Supabase. PHP no está instalado aquí; las comprobaciones de PHP/autorización sin correo se ejecutan en Actions.

## Publicación y reversión

La publicación sigue `deploy-app.yml`, después de CI del PR: recursos primero, HTML después y comprobación SHA-256 de los 12 recursos públicos. Consultar el PR y su ejecución final antes de declarar publicado; esta documentación de candidato no certifica por sí sola el despliegue.

Reversión permanente: revertir este lote con su versión/cache por el mismo proceso, manteniendo cualquier trabajo posterior. La app v3.65.35 está conservada en `ec339e1`; no restaurar BD ni archivos para revertir esta interfaz. `ModernoDesktopShell.setEnabled(false)` sigue restituyendo inmediatamente la cabecera original y el patrón anterior de presentación; los nuevos accesos del proyecto permanecen hasta revertir el lote. No altera datos ni recarga la pestaña.
