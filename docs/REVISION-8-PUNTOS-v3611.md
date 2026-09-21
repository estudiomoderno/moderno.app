# Revisión 3.61.1

Ocho correcciones: botón Editar de biblioteca dimensionado para texto sin tooltip duplicado; acciones de proyecto con altura común; cambio de contactos limitado a tabla; Nuevo junto a Todos y acciones secundarias horizontales en desplegable; calendario sin etiqueta Vista y selector de 140 px; contabilidad con Parcial antes de acciones e importe; barra contable unificada sin separador; previsión con buscador únicamente.

Validación previa: 373 pruebas correctas. En producción se abrió el editor real de la silla seleccionada y se comprobó nombre, SKU y precio, cerrando sin guardar. En entorno local aislado se ejecutaron las funciones reales libEdit/libSave y se guardó un nombre ficticio, confirmado tras recarga. La persistencia de esta prueba fue localStorage de la prueba, no Supabase; no se afirma validación de escritura remota. Contabilidad y contactos revisados visualmente con las plantillas reales y datos ficticios; comprobación móvil a 390 px.
