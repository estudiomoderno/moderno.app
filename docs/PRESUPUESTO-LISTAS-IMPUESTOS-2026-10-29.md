# Presupuesto desde listas: impuestos incluidos o excluidos — v3.65.137

Antes de generar el presupuesto, el propietario pide una ventana para indicar si los precios de las listas incluyen impuestos o los excluyen, adaptada a su configuración fiscal.

Generar presupuesto abre un diálogo con dos opciones sin preseleccionar. Muestra el país fiscal (`account.country`), el nombre de impuesto guardado (`account.taxName`, con la denominación por país como alternativa si falta) y el porcentaje configurado (`account.vat`). No se inventan porcentajes legales a partir del país ni se modifica la configuración. Admite nombres personalizados como IGIC y tipos del 0 %. La moneda y el formato siguen los ajustes actuales.

Al elegir, se muestra base, impuesto y total del nuevo presupuesto. Con impuestos incluidos, el precio unitario se divide por `1 + porcentaje / 100` antes de importarlo como base. Con impuestos excluidos, el precio se mantiene y el documento añade su impuesto normal. Ejemplo: 2 × 121 € con IVA 21 % incluido dan base 200 €, IVA 42 €, total 242 €. No se vuelve a sumar IVA sobre el precio bruto.

Los precios y cantidades de las listas no se cambian. La copia de origen de cada línea conserva el precio original y añade el criterio fiscal de importación en `source.tax`; el precio neto mantiene precisión suficiente para varias unidades o cantidades fraccionarias. Se usan los cálculos existentes del documento. Los costes se conservan con su significado actual. Las fichas añadidas posteriormente a ese documento heredan el mismo criterio; no se reinterpretan presupuestos históricos sin ese dato. La comparación del criterio no depende del orden de claves de JSON después de guardar y leer.

Abrir, elegir o cancelar no genera presupuesto ni inicia el guardado de fichas. Solo confirmar continúa el proceso existente de normalización/guardado del proyecto y preparación del borrador. Las fichas ocultas y alternativas continúan excluidas como en el flujo anterior. El presupuesto se revisa y guarda después, en su editor habitual.

Se revalidan rol administrador, estudio/sesión, espacios visibles, configuración fiscal, proyecto, borrador y fichas antes y después de esperar el guardado. Una modificación concurrente o cancelar durante la espera impide crear el borrador con otro criterio. No hay migraciones, SQL nuevo, permisos nuevos ni cobros/facturas reales. Todas las escrituras de prueba usan registros ficticios aislados.

Verificación:

- Node: 700 pruebas. Cálculos incluidos/excluidos, 0 %, cantidades fraccionarias, precisión con 90 unidades, IVA/VAT/IGIC y alternativa TVA, importación inmutable, identidad/origen, serialización, nuevas fichas y documentos históricos.
- Chromium 1440/1100/390 con servidor oficial aislado: selección obligatoria, país/nombre/porcentaje, desglose previo, cancelar sin convertir, generación incluida/excluida, guardado ficticio del total/origen y bloqueo ante cambios fiscales, de producto o rol. Sin solicitudes ni escrituras de backend remoto.
- Publicación mediante CI/Actions y verificación de 57 recursos públicos, añadiendo el adaptador existente `project-quotes.js` a los hashes comprobados.

Reversión: revertir este PR y sus recursos. No exige restaurar datos. Los documentos conservan líneas netas, impuesto y copia de origen en su estructura existente.
