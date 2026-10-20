# Portal del cliente con el estilo de la app — v3.65.78

El portal conserva sus siete secciones y funciones, con la presentación actual de Moderno.app: base blanca, grises neutros, bordes finos, tarjetas de 16 px, controles redondeados y tipografía oficial existente. La portada y las imágenes de cada proyecto se mantienen.

El lateral de escritorio pasa de cápsula negra flotante a columna blanca integrada de 224 px, con selección gris y control de contraer abajo. Contraído ocupa 64 px y conserva iconos, etiquetas accesibles, sección activa y formularios. En móvil mantiene la navegación horizontal con iconos y texto. Se elimina la reserva múltiple de barras de desplazamiento para aprovechar el ancho; el desplazamiento vertical sigue en el contenedor exterior existente.

Inicio, indicadores, accesos directos, tareas, compras, documentos, facturas y mensajes usan la misma paleta. Las tareas conservan su estado y fecha sin exponer información interna. Las listas conservan importes, cantidades, imágenes ampliables y acciones configuradas. No se cambia el contenido de los documentos ni su impresión.

Sin marca personalizada se reutiliza una copia del símbolo SVG de la app, retirando los IDs de la copia. Así conserva la fuente oficial en el documento y no depende de la tipografía de un SVG externo. No se modifica el símbolo original. Las marcas personalizadas continúan sujetas al booleano customBranding del servidor; la lógica de derechos y el comportamiento de imagen de reserva permanecen intactos. Los enlaces de acceso y las flechas usan SVG en su presentación.

## Alcance y conservación

Cambian client-portal-site.css, la presentación de símbolo/iconos en client-portal-site.js y las versiones de caché en index.html. Los estilos de pantalla se limitan al portal del cliente y a sus clases; los ajustes exteriores requieren .client-site y no cambian el portal de obra. Se conserva la pantalla interna de configuración con los controles de la app.

No cambian contratos, rutas, enlaces, tokens, proyección pública, permisos, datos, archivos, guardado, envío de mensajes, aprobaciones, RPC, SQL, Auth ni Storage. No hay nuevas dependencias. Reglas comerciales de marca: [PORTAL-MARCA-v3624](PORTAL-MARCA-v3624.md).

## Comprobaciones

- 497 pruebas Node aprobadas, incluidas privacidad de tareas/listas, archivos del portal y requisitos de marca.
- Chromium con servidor oficial, SDK nulo, registros ficticios y solicitudes externas/escrituras HTTP bloqueadas: 1440, 1100, 768 y 390 px.
- Blanco y neutros en lateral, indicadores, tareas y visor; ancho abierto/contraído; aprovechamiento horizontal y ausencia de desbordamiento; símbolo compartido sin IDs duplicados y original conservado.
- Navegación por las siete secciones, cantidades y total de compras, imagen ampliada y devolución de foco, documentos/enlaces compartidos, botón PDF existente y calendario.
- Mensaje sin enviar conservado al contraer/expandir y cambiar de sección; movimiento reducido; marca con/sin derecho del servidor; datos privados fuera del DOM del portal; configuración interna y bienvenida cancelada sin cambios de registros.
- Regresión de pestañas y navegación de proyectos con protección de borradores. Capturas revisadas en escritorio y móvil.

No se envían mensajes, se capturan archivos privados ni se prueban servicios reales. Las aprobaciones, descargas e impresión conservan sus funciones existentes; no se ejercitan contra producción. PHP y autorización se verifican en Actions sin enviar correos. El PR registra CI, despliegue y hashes de los 36 recursos públicos antes de confirmar publicación.

## Recuperación

Revertir el commit y desplegar recupera la presentación anterior, sin restaurar datos ni regenerar enlaces. Los cambios de estilo están agrupados al final del CSS y no afectan a impresión. No forzar recargas que descarten borradores abiertos.
