# Estado inicial de TALLER — 9 septiembre 2026

Último ensayo de permisos: [archivos y calendario](VALIDACION-ARCHIVOS-CALENDARIO.md), 118 pruebas locales y 29 comprobaciones SQL en el clon; candidato todavía sin publicar.

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
