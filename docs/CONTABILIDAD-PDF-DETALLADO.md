# Informe PDF de Contabilidad — v3.65.41

Petición del propietario del 18/10/2026, aclarada como «Informe PDF con más desglose y mejor presentación». Rama `contabilidad/pdf-detallado`, base `60c7483` (#64).

## Resultado y contratos

`Exportar PDF` conserva el intervalo inclusivo de fechas, los filtros de la vista, el orden y la selección Ingresos / Gastos / Ambos. Incluye todos los resultados, sin limitarse a la paginación de pantalla. El informe utiliza la moneda configurada mediante `fmt`, logotipo del espacio e identidad oficial; añade resumen de ingresos, gastos y balance, y un bloque por movimiento con concepto, referencia, cliente/proveedor, proyecto, espacio, categoría, vencimiento, base, impuesto, retención, estado, cobros parciales y documentación registrada cuando consten. Las cabeceras de columnas se repiten al imprimir en varias páginas.

Modelo y renderizado puros en `app/accounting-report.js`, estilos limitados al informe en `app/accounting-report.css`, integración de lectura en `exportAccountingPDF` de `app/index.html`. Los importes registrados siguen siendo la fuente de los totales. La retención se muestra desglosada sin restarla otra vez del total de una factura generada. Solo se relacionan facturas por referencia y espacio coincidentes de forma única; los proyectos ambiguos o de otro espacio no se atribuyen. Datos antiguos ausentes: «No consta». Un estado Cobrado sin apuntes no inventa fechas ni pagos.

Los nombres/estados de adjuntos se muestran como metadatos: no se descargan justificantes ni se incorporan sus URL privadas o contenido. El informe no sustituye a los originales. CSV y Facturas del periodo conservan sus recorridos existentes. No se modifica ningún registro, esquema, permiso, sesión, guardado, Supabase, Storage, copia de seguridad o servicio de correo.

## Comprobaciones y límites

- 464 pruebas Node correctas, incluyendo filtros multianuales inclusivos, signos, céntimos, retenciones manuales y de factura, valores ausentes/cero, enlaces ambiguos, moneda, texto escapado, metadatos de adjuntos, inmutabilidad y limpieza del área de impresión al interrumpirla.
- Chromium aislado a 1280 y 390 px: controles compactos, fechas, selector Ingresos/Gastos/Ambos y exportaciones PDF/CSV existentes.
- PDF A4 real de 25 movimientos ficticios, con inspección visual y extracción de texto de todas las páginas; cabeceras repetidas, conceptos finales, impuestos y cobros parciales. Caso adicional con 90 cobros en un único movimiento para comprobar que no desaparecen al dividirse entre páginas. Se verifica `printAs` y restauración de título/visibilidad.
- Aplicación completa con servidor local oficial y backend ficticio desactivado a 1440/1100/390 px: navegación y módulos originales, sin solicitudes externas ni escrituras remotas.
- PHP no está instalado en este entorno; las 24 comprobaciones de autorización y sintaxis, sin enviar correo, son obligatorias en Actions antes de integrar/publicar.

Sin pruebas con datos reales, autenticación productiva ni impresión física en equipos de usuarios. La composición final depende del navegador y de las opciones de impresión. No se recalculan impuestos históricos ausentes con ajustes actuales.

## Publicación y reversión

PR con CI previa; proceso habitual `deploy-app.yml`, recursos antes del HTML. El verificador amplía sus comprobaciones SHA-256 a 14 recursos públicos, incluyendo los dos nuevos archivos del informe. Confirmar el resultado final de Actions antes de anunciar publicación.

Para recuperar la presentación anterior, revertir el commit de esta entrega y publicar por el mismo proceso. No restaurar la base de datos ni borrar archivos o almacenamiento local: esta entrega no cambia datos. La versión/cache se actualiza sin forzar recargas de pestañas abiertas.
