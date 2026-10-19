# Finanzas como sección única — v3.65.59

Solicitud del propietario, 19/10/2026: Finanzas abre una página, sin sustituir el menú lateral por un submenú. En la misma fila que la ruta aparecen, en este orden: Resumen, Facturas, Presupuestos, Contabilidad y Previsión.

El acceso Finanzas abre Resumen (la pantalla de Informes existente, con su título actualizado). Las cinco pantallas conservan sus identificadores, cálculos, filtros, exportaciones, documentos y formularios. La barra usa Button/Card/Breadcrumb originales ReUI ya instalados, Inter 12 px y altura de 32 px, como las pestañas de proyecto. Se reserva el ancho real del perfil. El menú lateral principal permanece estable y marca Finanzas mientras cualquiera de sus páginas esté activa.

Cada enlace pasa por el enrutador y canView actuales. Solo aparecen las secciones autorizadas; un miembro sin acceso a Informes/Facturas/Contabilidad entra en Presupuestos. Un colaborador sin acceso financiero no recibe el acceso. No se conceden permisos nuevos. Las guardas de factura/presupuesto sin guardar y de diálogos abiertos siguen vigentes. El foco de teclado pasa a la sección activa después del renderizado.

En móvil/tablet, Finanzas también es un acceso directo. Las secciones aparecen encima del contenido, con desplazamiento horizontal cuando falta ancho, sin invadir el perfil ni introducir un submenú. Las páginas generales no financieras mantienen su navegación. Gestoría, portales, accesos externos y editores independientes conservan su interfaz.

Los botones originales del grupo Empresa permanecen intactos como fuentes del router y recuperación; se ocultan solo mientras esta presentación está activa. Un error de CSS/React del componente recupera enlaces nativos. Desactivar `ModernoPageBreadcrumbs` restaura el encabezado, expansor y manejador originales del grupo. Desactivar la interfaz de escritorio recupera también el menú nativo. No se modifica persistencia, datos, esquemas, Supabase, archivos, permisos, autenticación, copias o servicios externos.

## Comprobación y recuperación

Pruebas Node, manifiesto SHA-256 y fuentes originales ReUI; Chromium aislado con servidor oficial, conexión ficticia, SDK nulo y red externa/escrituras HTTP bloqueadas. Recorrido de los cinco enlaces con ratón y teclado, alineación con ruta/perfil, móvil, permisos simulados, borradores de factura/presupuesto al cancelar salida, recuperación nativa y conservación de colecciones ficticias. Regresión de los módulos y secciones de proyecto existentes. PHP y autorización de invitaciones, sin correo, se ejecutan en Actions.

No se certifica autenticación ni guardado contra producción mediante estas pruebas. Publicación por el workflow habitual, tras CI correcta; confirmar resultado final y SHA-256 de los 31 recursos antes de anunciarla. Reversión: revertir este commit y desplegar, sin restaurar datos ni limpiar almacenamiento.
