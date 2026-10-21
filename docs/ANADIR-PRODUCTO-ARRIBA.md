# Añadir producto desde la cabecera — v3.65.93

Las listas largas mantienen su tarjeta Añadir al final y añaden un segundo acceso «+ Añadir producto» justo debajo del total de la estancia, alineado con su borde derecho. Usa el botón nativo de la app, gris y redondeado; en móvil el presupuesto se adapta sin desbordarse. El control no se imprime.

Ambos botones llaman a `shoppingRoomAddProduct`, conservando el selector Manualmente / Desde URL con IA / Biblioteca, la etiqueta filtrada, las guardas y los formularios actuales. No cambian datos, orden, cálculos, permisos, guardado ni servicios.

Verificación: 552 pruebas Node; navegador aislado a 1440, 1100 y 390 px con 45 productos, nuevo control visible sin llegar al final, posición bajo el precio y alineación, tarjeta original como último elemento, selector y cancelación sin mutar registros. El recorrido existente de fuentes conserva alta manual, biblioteca y captura URL simulada. Sin SDK/conexiones ni escrituras reales. Capturas revisadas; PHP en CI.

Publicación pendiente de CI y despliegue con los 41 recursos públicos verificados, incluidos index.html y brand/project-ui.css. Revertir el commit de presentación si fuese necesario, sin restaurar ni borrar datos.
