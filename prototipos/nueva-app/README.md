# Taller Nueva app Codex — primera versión de escritorio

**Estado:** primera versión experimental **implementada en la rama aislada** `experimento/taller-nueva-app-codex`. **No está publicada en app.moderno.app** y no se debe integrar en `main`.

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
