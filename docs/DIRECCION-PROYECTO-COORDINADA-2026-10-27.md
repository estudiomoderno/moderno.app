# Dirección coordinada al crear y editar — v3.65.133

El propietario solicita que la dirección de Editar proyecto esté coordinada con Nuevo proyecto. Ambos usan ahora `ProjectAddressFields`: mismo orden, tamaño y autocompletado de Google, Calle, Número, Dirección 2 manual, Ciudad, Provincia, Código postal y País. El guardado espera a que termine la selección; los cambios manuales cancelan las respuestas pendientes. Dirección 2 no se sustituye al elegir una sugerencia.

El editor usa el mismo formateador que la creación. Actualiza conjuntamente `addr`, `city`, `cp` y `country`, campos ya admitidos para colaboradores, y programa persistencia incluso si solo cambia la ubicación. Conserva los ceros iniciales del código postal. El borrador y la recuperación nativa incluyen los siete campos. Cancelar o cambiar de sesión no modifica el proyecto.

Compatibilidad: la aplicación histórica guarda la dirección completa como texto; no almacena calle, portal y provincia en propiedades separadas. Se recupera el formato de creación mediante los metadatos existentes y se exige reconstrucción sin pérdida. Ciudad y provincia con el mismo nombre se distinguen. El texto antiguo no reconocible se conserva completo en Calle para su revisión, manteniendo ciudad/país/CP conocidos. Abrir y guardar sin editar la dirección no reescribe ni normaliza el texto anterior. Los formatos ambiguos no se geocodifican ni migran automáticamente. No se añade esquema ni permisos, ni se modifica producción durante las pruebas.

El identificador de Google continúa sujeto a `canPersistLocation`; la activación de su persistencia permanente sigue deshabilitada. No se solicitan ni guardan coordenadas. Editar dirección invalida referencias antiguas. El aspecto del proyecto, habitaciones, tareas, archivos, identificadores y clientes permanecen en sus contratos existentes.

Comprobaciones:

- Node: 687 pruebas, incluidas recuperación de campos, ciudad/provincia homónimas, texto histórico, código postal, guardado coordinado y ausencia de referencia no activada.
- Chromium 1440/1100/390: campos existentes, guardar/cancelar, autocompletado simulado por teclado, Dirección 2 con comas, reabrir después de selección y edición manual, persistencia aislada, recuperación nativa, colaborador, sesión y validación de cliente. Solo registros ficticios, red externa y escrituras remotas bloqueadas.
- Regresión de Crear proyecto y ventanas/navegación/protección del borrador.
- PostgreSQL 17 sin red: 1430 aserciones con ROLLBACK, incluida actualización conjunta y relectura como colaborador. Contenedor retirado. Sin SQL productivo.
- Compilación original compartida actualizada; publicación mediante CI/Actions y verificación de recursos públicos, más comprobación de Google con dirección pública sin conectar a Supabase.

Recuperación: revertir el PR con sus recursos compilados. Sin restaurar datos, eliminar direcciones ni cambiar permisos. La versión anterior continúa leyendo las direcciones guardadas.
