# Botón Actualizar ahora — v3.65.81

El propietario informa de que el botón de la franja de versión ya no produce una respuesta visible. Se comprobaron dos mecanismos en el código anterior: `cloudFlush` retorna inmediatamente si ya hay un guardado en curso y `prepareAppReload` rechazaba entonces la recarga; el aviso se mostraba en un toast inferior con z-index 200, cubierto por la franja de actualización con z-index 9999. No se ha inspeccionado la sesión real del propietario ni se atribuye un conflicto concreto a sus datos.

La actualización muestra ahora el progreso y cualquier impedimento dentro de la propia franja, sin depender del toast oculto. Espera un guardado activo y comprueba los cambios con el mismo criterio por rol que utiliza la sincronización. No recarga con conflictos, cambios sin confirmar, fallo de copia local, acceso en comprobación, cambio de identidad ni un editor abierto. El guardado dispone de un plazo conjunto de 15 segundos; al agotarse, el botón vuelve a estar disponible, mantiene la pestaña y no cancela la operación en curso. Los borradores de Ajustes comunican su motivo por el mismo canal visible.

Cuando el guardado está confirmado, realiza navegación real con parámetro de caché nuevo, conservando ruta, fragmento y los parámetros existentes. La franja admite varias líneas en móvil. Las versiones remotas se escriben con textContent y solo se comprueban respuestas HTTP correctas. No se borran cachés de datos, localStorage, sesiones, copias pendientes ni archivos.

Validación: 514 pruebas Node correctas, incluidos guardado en curso, timeout, fallo de copia local inicial/final, conflictos, proyecciones de colaborador, identidad, editores, doble clic y errores inesperados. Navegador real con servidor oficial aislado a 1440 y 390 px: motivo visible, botón reutilizable, espera de guardado ficticio, navegación efectiva conservando URL y borrador real de Ajustes conservado. Red externa y escrituras bloqueadas; sin pruebas con datos reales. PHP se verifica en CI, no está instalado localmente.

Cambios limitados a frontend. No se modifican contratos de guardado, SQL, permisos, Storage ni servicios. La llamada a cloudFlush reutiliza el flujo existente; no se fuerzan escrituras ni se ignoran bloqueos. Se añade settings-ui.js al verificador: 38 recursos públicos.

Despliegue: CI del mismo HEAD correcto, integrar PR, comprobar workflow final y huellas públicas. Una pestaña que ya tenía cargado el botón antiguo necesita una recarga manual inicial, después de guardar o cancelar los borradores y confirmar el guardado. Publicar código no reemplaza JavaScript que ya se está ejecutando en otra pestaña.

Reversión: revertir el commit de interfaz mediante el proceso habitual. No restaurar datos, borrar claves locales o cerrar sesiones como medida para actualizar la aplicación.
