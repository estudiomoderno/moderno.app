# Retirar el marco exterior del calendario de obra — v3.65.114

El propietario pide quitar el rectángulo que rodea el título y el calendario para evitar bordes duplicados. Se elimina borde, fondo, radio, sombra y relleno del panel únicamente cuando su etiqueta accesible corresponde a Calendario de obra. Se conserva el marco propio de ReUI, la cuadrícula y el indicador de foco de teclado.

Comprobaciones: 668 pruebas Node y Chromium aislado a 1440, 1100 y 390 px. Se comprueba el estilo calculado del panel sin marco y se ejercitan vistas, edición, arrastre, creación como colaborador y recuperación nativa. Sin cambios de datos, guardado, permisos ni esquema.

Publicar después de CI y verificar Actions y los 51 recursos públicos. Reversión: revertir el commit de CSS y la versión de su carga; no restaurar datos.
