# Taller Nueva app Codex — primera versión de escritorio

**Estado:** primera versión experimental **implementada en la rama aislada** `experimento/taller-nueva-app-codex`. **No está publicada en app.moderno.app** y no se debe integrar en `main`.

## Logotipo y tipografías originales (corrección 17/10/2026)

Se revisó la identidad visual tras el comentario del propietario: **los colores no eran suficientes, había que usar el mismo imagotipo y las fuentes originales**.

- **Imagotipo «m» exacto:** `assets/icono-m-grafito.svg` es una copia local del recurso corporativo `app/brand/icono-m-grafito.svg`. No se reconstruye con caracteres ni se inventa una M. El favicon también usa su recurso oficial.
- **Tipografía real de los títulos:** **Acorn**, con los mismos cinco pesos que el código de la app carga en `app/brand/tasks-identity.css`: 200, 400, 500, 600, 700. Los archivos de fuente se reutilizan como blobs de Git de los ya presentes en el repositorio, **solo en esta rama**, dentro de `assets/fonts/`. No dependen de dominios ni CDNs; no se entregan fuentes como adjuntos.
- **CSP:** `font-src 'self'` permite fuentes locales; `connect-src 'none'` sigue prohibiendo red hacia Supabase y cualquier otro backend.
- **Color corporativo:** `brand.css` conserva crema `#f6f4eb`, superficie `#f8f6ef`, beige `#e4dfce`, grafito `#181818`, tinta `#20201e` y líneas `#d8d2c2`.
- **Menús y texto corriente:** fuentes de interfaz del sistema; títulos, cifras y encabezados principales usan Acorn real. Si se necesita una equivalencia tipográfica adicional, comprobar el CSS vigente antes de improvisar.
- **No confundimos los distintos símbolos**: el recurso `simbolo-grafito.svg` también existe en la app para otros contextos; la cabecera de este prototipo usa específicamente la **«m» corporativa** solicitada.

**Verificar en la vista previa real:** recargar sin caché, comprobar que se cargan los cinco `.ttf` desde `assets/fonts/` y que el icono mostrado es `icono-m-grafito.svg`. Si Codex muestra una versión anterior, comprobar la rama y la ruta. No se ha publicado nada en `app.moderno.app`.

## Qué incluye esta versión

- Menú superior con imagotipo «M», navegación general (ficticia), botón de comprimir y perfil con Ajustes/Integraciones simulados.
- Zona central: proyecto completamente inventado «Casa Oliva», tarjetas de resumen y acceso a las herramientas.
- Barra de herramientas flotante inferior con **10 iconos**, etiqueta al pasar el ratón/enfocar con teclado y estado de herramienta activa.
- Vistas navegables de Planos, Obra, Tareas, Compras, Economía, Documentos, IA, Utilidades y Comentarios; todo es una **simulación local**, sin datos ni operaciones reales.
- En Tareas se pueden marcar ejemplos como completados; el estado solo existe en memoria y desaparece al recargar. No existen autenticación, guardado, subida de archivos ni conexiones.
- CSS responsive básico para no desbordar pantallas estrechas, con prioridad a escritorio y soporte `prefers-reduced-motion`.

## Seguridad y ausencia de conexiones

El prototipo solo carga `index.html`, `styles.css` y `app.js` **locales**. La política CSP bloquea toda comunicación de red (`connect-src 'none'`) y la carga de recursos de terceros. **No conecta a Supabase —ni producción ni pruebas—**, no importa dependencias de la app, no usa credenciales, no almacena datos reales y no toca `app/` ni otros servicios.

**No copiar** conexiones, tokens, entidades reales ni plantillas privadas para hacer más «realista» la demostración.

## Cómo verlo en Codex Cloud

Seleccionar la rama `experimento/taller-nueva-app-codex`. Abrir con el sistema de vista previa estática de Codex el archivo `prototipos/nueva-app/index.html`; alternativamente, iniciar **solo dentro de esta carpeta** un servidor HTTP estático para la vista previa, sin ejecutar `app/`. No abrir el servidor de la aplicación real ni utilizar ningún backend externo.

Esta instrucción describe cómo crear la vista previa; **no significa que Codex ya la haya iniciado**.

## Comprobar aislamiento y sintaxis

Con Node.js 22+ desde la raíz del repositorio:

```bash
node --check prototipos/nueva-app/app.js
node --test prototipos/nueva-app/prototype.test.mjs
```

Antes de mostrarla al propietario, verificar interacción con teclado/ratón y ausencia de peticiones externas. El prototipo usa recursos locales y no necesita acceder a internet.

## Qué sigue

**🎨 Taller Nueva app Codex:** revisar la base junto al propietario, seguir sus indicaciones y ajustar la interfaz por iteraciones. No añadir integraciones, persistencia ni datos reales. La hipotética migración a Moderno.app se decidirá y probará **en otro encargo futuro**.

Referencias: [instrucciones del taller](../../docs/TALLER-NUEVA-APP-CODEX.md) · [encargo #47](https://github.com/estudiomoderno/moderno.app/issues/47).
