# Orden de productos en listas de compra — v3.65.80

El propietario solicita un icono de orden entre Vista y Buscar, del mismo tamaño. La barra muestra Filtrar, Vista, Ordenar y Buscar con controles de 32 × 32 px e iconos de 16 px. El desplegable ofrece Orden manual, Más recientes primero, Más antiguos primero, Precio: menor a mayor y Precio: mayor a menor. El precio usado es el unitario que muestra cada producto.

La preferencia se conserva durante la sesión y funciona en tarjetas y filas. Se ordena una copia de las filas de presentación, manteniendo sus índices originales de sección y producto para editar, cambiar estado y abrir adjuntos. No se reescriben arrays, etiquetas, importes, referencias ni el orden manual. Los empates conservan el orden original y los valores sin fecha/precio quedan al final en ambos sentidos; cero sigue siendo un precio válido.

La fecha usa `addedAt` y, si no está disponible, la fecha registrada `createdAt` del producto, incluido el importador URL existente. Se registra `addedAt` al crear manualmente, importar hojas, copiar desde la biblioteca o duplicar. Editar o cambiar una etiqueta conserva la fecha anterior. No se rellenan fechas de registros antiguos ni se ejecuta ninguna migración. Cuando no hay fecha válida se conserva el orden relativo de esos registros al final.

El arrastre vuelve a estar disponible al elegir Orden manual; mientras hay otro criterio los controles de movimiento están desactivados para evitar una operación que la ordenación ocultaría. Añadir producto permanece al final, también con filtros o lista vacía. El menú admite teclado, Escape, cierre al pulsar fuera, indicación de selección y movimiento reducido. No cambia la fuente global.

Validación: 507 pruebas Node correctas, con casos de precios cero/negativos/ausentes, fechas registradas/ausentes, empates, índices originales, conservación de adjuntos, borradores y fecha al editar/crear/copiar. Navegador real con servidor oficial aislado, datos ficticios y red externa bloqueada en 1680, 1440, 1100 y 390 px: opciones de orden, cuatro controles iguales, edición del producto correcto desde filas ordenadas, protección de borradores, teclado, menú dentro de pantalla, alternancia tarjetas/filas, filtros/búsqueda, arrastre manual y portal del cliente. Sin escrituras reales.

No se modifican SQL, Edge Functions, permisos ni Storage. El único nuevo metadato se incorpora por los flujos normales de creación autorizados, sin transformar registros existentes. PHP se comprueba en CI; no está instalado localmente. Se añade specifications.js a la comprobación de publicación: 37 recursos públicos.

Reversión: revertir el commit de interfaz y desplegar por el procedimiento habitual. Los metadatos `addedAt` ya guardados son aditivos y se conservan; no restaurar datos ni eliminar archivos. Verificar CI del commit y workflow final, más las huellas públicas, antes de anunciar publicación.
