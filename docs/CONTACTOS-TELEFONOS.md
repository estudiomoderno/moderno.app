# Contactos y teléfonos — v3.49.1

Se añaden los cinco SVG aportados por el usuario a las categorías de contactos. Clientes conserva el icono de contactos existente. Los SVG están en la raíz pública: el alojamiento intercepta `/icons/` y no debe usarse esa ruta.

Los campos de teléfono de contactos, emisor y bienvenida comparten `phone-controls.js` y `contact-controls.css`. El país inicial procede de `state.account.country` (país fiscal); un número internacional existente tiene prioridad. El selector muestra una bandera SVG local y permite buscar el país con el teclado en el selector nativo. El teléfono incorpora el prefijo internacional al escribir, admite pegar `+` o `00` y aplica agrupación española 3–2–2–2. Otros países conservan su formato internacional.

No hay migración de datos. Abrir y guardar una ficha sin editar el teléfono conserva su cadena original. Vaciar el campo guarda vacío; no guarda un prefijo suelto por elegir país. Se conservan extensiones y texto antiguo no reconocido. No se truncan números largos ni se bloquean por una validación estricta. El formato no acredita que un número exista.

Dependencias servidas desde la propia app, sin enviar teléfonos a servicios externos:

- libphonenumber-js 1.13.13, bundle min, `phone-vendor.js`. Código y documentación: https://github.com/catamphetamine/libphonenumber-js . Licencia adjunta `phone-vendor-LICENSE.txt`.
- flag-icons 7.5.0, banderas 4x3 de los países fiscales admitidos. Fuente: https://github.com/lipis/flag-icons . Licencia adjunta `phone-flags-LICENSE.txt`.

Validación: suite Node completa (274 pruebas), formato español, Francia/Reino Unido/Italia, cambio de prefijo, extensiones, cadenas antiguas, escape HTML y conservación del valor inicial. Ensayo visual local con datos ficticios en claro y oscuro: bandera, selector, escritura y valor resultante. No se crean contactos de prueba en producción.

Publicación mediante el flujo existente de GitHub Actions: recursos antes que HTML. Reversión visual: revertir el commit; no requiere restaurar datos ni tocar archivos, presupuestos o facturas.
