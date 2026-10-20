# AGENTS.md — Taller Windows Moderno.app

**Este archivo complementa el AGENTS.md raíz, sin modificar sus protecciones.**

## Taller dedicado y rama
- Nombre exacto de la conversación nueva en Codex Cloud: **Taller Windows Moderno.app**.
- Encargo fuente de verdad [GitHub #109](https://github.com/estudiomoderno/moderno.app/issues/109).
- Rama única autorizada de este Taller: `experimento/windows-espejo`, siempre partiendo de un `main` vigente y coordinando conflictos.
- Editar **solo** `desktop/windows/**` y su workflow aislado `.github/workflows/windows-beta.yml`; prohibido modificar `app/`, `mailer/`, `supabase/`, `SQL/`, `main`, el workflow de despliegue o recursos productivos. No fusionar por cuenta propia.
- El Taller principal mantiene web, datos, módulos y despliegues sin que este trabajo los interrumpa.

## Diseño de la solución
- Contenedor WebView2 WinForms que abre SIEMPRE `https://app.moderno.app/` con internet; sin app web replicada, sin offline falso, sin secretos ni cliente de Supabase dentro del ejecutable.
- Reflejar el sitio vigente cuando se abre/recarga, nunca refrescar forzadamente un formulario con cambios sin guardar.
- Los cambios nativos del contenedor y su empaquetado son independientes y requieren compilación/actualización beta.
- Mantener marca y pantalla web tal cual. Icono `.ico` del ejecutable será el vigente **solo después de verificar conversión y licencia**; no inventar nuevos logotipos.

## Seguridad y pruebas
- No leer ni escribir datos productivos para pruebas. Usa usuarios y proyectos ficticios **de un entorno de pruebas autenticado y verificado**; sin acceso seguro confirmado, limitarse a smoke tests no invasivos. Nunca copiar datos/cookies a GitHub ni a logs, nunca dejar claves o secretos en commits.
- Comprobar flujo OAuth y proveedores externos antes de prometer soporte; no solicitar cambiar configuración de autenticación en producción por una incidencia de WebView2. Navegador externo para OAuth requiere flujo seguro de retorno y evaluación técnica.
- Mantener bloqueo de orígenes externos dentro del WebView, sin `file:` ni JS host bridge innecesario; permisos de dispositivo denegados por defecto.
- Probar ventana real en Windows, internet caído/reconexión, sesiones, redirecciones, archivos, impresión, portapapeles, actualizar web sin reinstalar, no sobrescritura de trabajo y SmartScreen.
- El workflow Windows genera **ZIP beta de prueba**, no instalador firmado. No declarar que la aplicación está disponible comercialmente antes de prueba y proceso de firma/distribución.
- Sin API de pago, sin compras ni cuentas adicionales, sin migraciones, sin despliegues ni cambios en Supabase.

## Proceso
1. Comprueba estado del branch, revisa issue #109 y estos archivos, verifica que la build automatizada no toca producción.
2. Compila y prueba Windows x64; registra CI/artifact y, si puede, deja un instalable beta seguro.
3. Resuelve y documenta problemas de login/cookies/SSO, teclado, descarga y WebView2 con datos ficticios; los problemas que exijan cambios web deben ir a un issue para Taller principal y a autorización específica.
4. Reporta estado real, enlace de artefacto y prueba funcional/limitaciones; pide al propietario las pruebas de uso real solo cuando la beta esté lista, sin hacerle copiar código.

La conversación de Codex Cloud **no se inicia automáticamente** al crear esta rama o issue. El propietario tendrá que crear el chat y enviar el primer encargo.
