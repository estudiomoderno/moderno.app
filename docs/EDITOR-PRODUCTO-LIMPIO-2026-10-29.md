# Ficha de producto compacta — v3.65.140

A petición del propietario, se eliminan la ayuda bajo Subir imagen y el texto de ficha independiente. Características, Archivos y Acciones del producto son desplegables nativos, cerrados al abrir la ficha. Producto y Precios y cantidades permanecen abiertos. Los campos siguen en el formulario aunque estén contraídos, por lo que guardar conserva sus valores y archivos.

Las filas de campos asignan el mismo alto a sus etiquetas: una etiqueta de dimensiones de dos líneas no desplaza su entrada respecto a Material/acabado. En la pantalla más estrecha las parejas se apilan.

El margen del editor de listas utiliza una entrada en la misma fila que 0/5/10/15/20 %. Vacía muestra Libre y permite precio/coste independientes; escribir un porcentaje activa el cálculo bidireccional existente. Los accesos rápidos rellenan esa entrada. Se elimina el botón Libre y el campo adicional «otro» para este editor. La biblioteca conserva su control anterior. La revisión desde biblioteca sigue aplicándose al borrador y puede dejar el margen libre.

## Alcance y validación

- Plantilla y presentación del editor; controles, identidad, permisos, adjuntos, contratos y guardado existentes. No hay cambios de SQL, Auth, Storage o datos reales.
- 700 pruebas Node aprobadas.
- Chromium aislado: 1440×900, 1100×768, 390×844 y 320×568; bloques cerrados, apertura de Características, alineación de entradas, margen escrito/prefijado/libre, conservación de valores y adjuntos al guardar, cancelación, cierre, pie fijo y teclado.
- Regresión de acciones con registros ficticios: abrir el bloque, duplicar, descartar o confirmar borrado y proteger borradores/referencias. Prueba histórica actualizada para las cantidades que la app ya mostraba.
- Se actualiza el recorrido del ensayo de colaborador para abrir Acciones antes de eliminar; la autorización y el escritor no cambian. CI verifica los ensayos aislados existentes.
- Servidor oficial con credenciales ficticias; peticiones externas y escrituras HTTP bloqueadas. No se usan registros ni archivos de clientes.
- Capturas de escritorio y móvil revisadas. El verificador de publicación incorpora spec-master.js: 58 recursos.

## Publicación y reversión

La evidencia de CI, despliegue y monitor queda en el PR. Verificar la versión pública antes de anunciar la entrega. Revertir el commit recupera la presentación y el control de margen anteriores sin restaurar datos. No cerrar borradores abiertos para forzar una actualización.
