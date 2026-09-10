# Estado actual de Taller

Versión publicada y verificada: v3.35, aprobaciones por revisión y ciclo de compras; ver ENTREGA-V335.md. Servidor instalado con comprobación de conservación, 182 pruebas locales y 20 comprobaciones SQL en clon. GitHub Actions 34537483465 correcto; HTML, CSS y módulos públicos coinciden. Los apartados siguientes conservan el historial.

# Estado inicial de TALLER — 9 septiembre 2026

Última versión: v3.33, publicada y verificada. Rutas /es/ y transición discreta; detalles y límites en RUTAS-V333.md. Logo moderno.app aprobado en trazados; véase brand/README.md. El botón del menú contraído ya no se superpone a Inicio. Corrige las etiquetas recortadas bajo nombres de varias líneas. Editor renovado, color editable y botón de fotos integrado, sin selector de emojis. Incluye hasta tres fotos opcionales por carpeta y transición suave. Ajuste visual: menú gris sin franja, carpetas beige claro y desplegables redondeados. Aplica la apariencia B elegida por el usuario, conserva iconos y menú contraíble y corrige el tablero móvil. Mantiene las protecciones de guardado, permisos y copias de v3.31. Véase [Entrega v3.32](ENTREGA-V332.md) y CHANGELOG.md.

Estado de publicación vigente: [Entrega v3.32](ENTREGA-V332.md), publicada el 9/9/2026. 137 pruebas locales correctas, comprobación visual con datos ficticios, recursos públicos y carga de sesión verificados. No requiere cambios SQL. La entrega documenta cómo recuperar el aspecto anterior sin restaurar datos. Los apartados siguientes son históricos.

Último ensayo de permisos: [archivos y calendario](VALIDACION-ARCHIVOS-CALENDARIO.md), 118 pruebas locales y 38 comprobaciones SQL en el clon; candidato todavía sin publicar.

Actualización posterior: véase [Validación de protección](VALIDACION-PROTECCION.md). Hay un candidato v3.30-pruebas en una rama aislada; producción continúa sin esta modificación. Los apartados siguientes conservan el estado de la revisión inicial.

## Comprobado

- Repositorio real: C:\Chat Codex\moderno.app-main, con .git y origin correcto. Estado inicial limpio.
- HEAD local y GitHub main coinciden: 2b048cc3c133f21972bc46779d8162e01d72d898. Comprobado mediante API HTTPS.
- Aplicación local v3.29, unos 1,1 MB. Producción responde HTTP 200 y declara v3.29; no se ha comparado byte a byte.
- GitHub muestra el repositorio como público, aunque el README anterior decía privado.
- Node disponible v24.19.0. Python no está en PATH y no hace falta.
- Servidor local y pantalla de acceso v3.29 comprobados en navegador. /proyectos carga directamente con el login visible.
- Los tres scripts inline pasan comprobación de sintaxis con Node. No sustituye pruebas funcionales.
- El cliente usa https://auth.moderno.app, sin backend local aislado.
- Hay código de acceso Google y correo/contraseña; el traspaso describía solo Google.
- Existe publicación FTPS para cambios de app/ en main. No se ha ejecutado en esta preparación.

## Pendiente

1. Validar login con una cuenta autorizada y probar proyectos, guardado, facturas, adjuntos y permisos en un entorno de pruebas. No se inició sesión ni se modificaron datos reales.
2. Incorporar esquema, RLS y funciones desde fuentes reales: SQL/gcal solo contienen README.
3. Confirmar integraciones desplegadas: webcal, Google Calendar y correo. El traspaso no verifica el estado actual del backend.
4. Revisar concurrencia, permisos por espacio, responsive y apertura comercial antes de priorizar funcionalidades.
5. Usar scripts/git-codex.ps1 para operaciones remotas en este entorno; corrige la ruta del componente HTTPS.
6. Git Credential Manager autenticado y prueba push --dry-run completada. La integración API devolvió 403; la sincronización se realiza con Git local autenticado.

## Fuentes

Código local; https://github.com/estudiomoderno/moderno.app y API commits/main; lectura de versión de https://app.moderno.app/.

Documento aportado: C:\Users\soyja\Downloads\TRASPASO.md, 9/9/2026, basado en v3.18 y reportes posteriores. Usado como contexto, no como autorización. No se copia íntegramente al repositorio público por contener información operativa interna.



## Reparación de Git local
Se localizó git-remote-https.exe en mingw64/bin. Con --exec-path a esa carpeta, ls-remote origin HEAD funciona. scripts/git-codex.ps1 aplica la corrección sin cambiar la instalación. La autenticación en Git Credential Manager se completó y push --dry-run confirmó acceso de escritura. La rama de trabajo para sincronizar esta preparación es taller.

## Copias de archivos — 2026-09-09

Primera copia real de Storage a Google Drive completada y verificada, además de una prueba sintética de recuperación. Workflow diario preparado a las 04:23 de Madrid y ejecución manual disponible. Configuración privada en secretos de GitHub; instrucciones en docs/BACKUP-SETUP.md. Pendientes: observar el primer disparo programado, supervisión externa y ensayo de recuperación integral del CRM. No se han modificado datos ni archivos de producción durante esta preparación.

## Actualización v3.33.1
Corrección de presentación de facturas y cobros históricos. Ver FACTURAS-V3331.md. Sin modificación de datos reales.

## v3.33.2
Tema oscuro actualizado y selector móvil antes del usuario. Ver TEMA-V3332.md.
