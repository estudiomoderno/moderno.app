# Eliminar producto en el pie del Sheet — v3.65.145

El botón Eliminar sale del bloque contraído Acciones del producto y pasa al pie fijo, junto a Cancelar y Guardar, con texto/borde rojos y fondo rojo suave. Su nombre accesible sigue siendo Eliminar producto. Solo aparece al editar un producto existente; Añadir producto no ofrece borrado.

Se reutilizan shoppingProductDelete y su confirmación, identidad, validación de contexto y borrado existentes. Cancelar la confirmación conserva el borrador y devuelve el foco al botón del pie. Los avisos informativos se muestran por encima del pie y no interceptan clics mientras esta ficha está abierta. El resto de acciones y campos no cambian. Sin cambios de permisos, contratos, SQL, servicios o datos reales.

Validación: 700 pruebas Node; editor en Chromium aislado a 1440/1100/390/320 px, botón visible sin abrir Acciones, color rojo, pie sin desbordamiento, cancelación/foco y ausencia de borrado al añadir. Se conservan las comprobaciones de campos, margen, archivos y guardado ficticio. Regresión de duplicación, cancelación y borrado confirmado con referencias conservadas a 1440/1100/390. Servidor oficial y registros ficticios, SDK nulo, peticiones externas/escrituras HTTP bloqueadas. Capturas de escritorio y móvil revisadas.

El PR registra CI, despliegue y verificación pública. Revertir el commit recupera la ubicación anterior sin restaurar datos.
