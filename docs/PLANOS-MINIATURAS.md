# Planos en miniatura

El bloque plegable de Planos definitivos se sustituye por una galería siempre visible, con vista previa y nombre. Los planos de `project.files` también muestran miniatura. Se conservan las colecciones y los índices originales, las acciones de apertura/descarga, anotación, carga, eliminación y traslado de categoría, y los permisos existentes.

Las imágenes se muestran completas (contain), sin recortar. Los PDF se representan mediante su primera página con PDF.js ya utilizado por la aplicación, en canvas limitado a 480×320. Las vistas previas se cargan al acercarse a la pantalla, de una en una. Se reutiliza la resolución autorizada de archivos; no se guardan miniaturas, enlaces firmados ni datos nuevos. Se verifica identidad, archivo e incorporación al DOM antes de presentar cada resultado. Los fallos muestran una alternativa textual sin impedir abrir el archivo original.

Validación: pruebas unitarias de acciones, escape HTML, índices, conservación del estado y separación de Documentos/Planos. Prueba de navegador con PDF real e imagen sintéticos en 1440 y 390 px, sin backend ni escrituras externas; verifica miniaturas, ausencia de desplegable, acceso al original/descarga y conservación de registros. Para repetirla: `PDFJS_DIR=/ruta/pdfjs-3.11.174 python scripts/plan-gallery-browser.test.py`; la carpeta contiene `pdf.min.js` y `pdf.worker.min.js`. El servidor aislado admite data/blob únicamente dentro de la respuesta interceptada de esa prueba.

Sin cambios de esquema, almacenamiento, pagos ni DNS. Reversión: revertir el commit de interfaz; los originales nunca se transforman.
