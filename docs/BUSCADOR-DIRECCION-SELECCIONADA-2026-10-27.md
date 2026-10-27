# Buscador de dirección seleccionada — v3.65.131

Al escoger una sugerencia se rellenaban los campos de dirección, pero `query` conservaba el texto parcial escrito. Ahora se sustituye por el texto completo de la sugerencia, se cierra la lista y se reinicia la opción activa. La selección confirmada se distingue de una consulta escrita: ese cambio de texto no dispara otra petición a Google ni vuelve a abrir los resultados. El campo permanece editable para buscar una dirección diferente.

Si se modifica manualmente calle, número, ciudad, provincia, código postal o país, se limpia el buscador y su confirmación; los campos del formulario conservan los cambios. Dirección 2 sigue siendo manual y no es sobrescrita. Se mantienen las protecciones contra respuestas antiguas y contra búsquedas canceladas.

Validación: 682 pruebas Node; Chromium 1440/1100/390 con una consulta incompleta, selección por teclado y ratón, texto completo, lista cerrada, espera superior al debounce sin consultas adicionales, nueva búsqueda, edición manual, Dirección 2, guardado y fallback. Todo con proveedor y datos ficticios, sin escrituras remotas. Los componentes se recompilan y las cachés pasan a v3.65.131. El despliegue verifica Google real y los recursos públicos antes de anunciar publicación.

No cambia el contrato de guardado, Supabase ni los datos existentes. Reversión: revertir el PR y sus recursos compilados, sin restaurar la BD.
