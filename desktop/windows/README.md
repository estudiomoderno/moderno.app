# Moderno.app para Windows — beta 0.2.0

Contenedor WinForms/.NET 10 con WebView2 Evergreen. Abre siempre
**https://app.moderno.app/**. No incluye una copia de la web, backend ni credenciales.
**Beta de evaluación, sin firma; todavía no es una versión estable para clientes.**

## Instalar sin compilar

1. Abrir [Actions de Windows](https://github.com/estudiomoderno/moderno.app/actions?query=branch%3Aexperimento%2Fwindows-espejo).
2. Elegir una ejecución **verde** de `Windows beta - Moderno.app (experimental)`.
3. En **Artifacts**, descargar `Moderno-Windows-Beta-Installer-x64` y descomprimir.
4. Ejecutar `Moderno-Windows-Beta-0.2.0-Setup-x64.exe`. Instala para el usuario actual,
   añade acceso a Inicio y permite elegir acceso al escritorio, sin permisos de administrador.
5. Abrir **Moderno.app Beta** desde Inicio. Requiere internet y WebView2 Evergreen.
   Si falta, la ventana ofrece el enlace oficial de Microsoft; no descarga ni instala nada en silencio.

El artefacto incluye `SHA256SUMS.txt`. Puede comprobarse con `Get-FileHash` en PowerShell.
Sin firma digital, Windows puede mostrar SmartScreen: **no desactivar protecciones**.
Si la política del equipo bloquea el ejecutable, registrar el bloqueo y esperar distribución firmada.
No requiere instalar .NET. La alternativa ZIP portátil sigue disponible y necesita **toda** su carpeta.
Los artefactos caducan: instalador 30 días, ZIP 14; no son un canal comercial de distribución.

## Qué probar primero en tu Windows

Sin iniciar sesión ni acceder a datos reales:

1. Instalación, icono oficial, apertura desde Inicio y pantalla de acceso.
2. Cerrar/reabrir; F5/Ctrl+R; escalado de pantalla al 100/150/200 %.
3. Desconectar Wi-Fi/Ethernet con la pantalla de acceso abierta. Debe mostrar **Sin conexión**.
   Reconectar conserva la ventana sin recargar formularios. Si la navegación falló, pulsar Reintentar.
4. Instalar la misma beta otra vez y desinstalar desde Configuración → Aplicaciones.

Comunicar en [#109](https://github.com/estudiomoderno/moderno.app/issues/109): versión de Windows,
versión beta, paso, esperado y resultado. No adjuntar correos, cookies, URL de retorno OAuth,
tokens ni capturas de clientes. Matriz completa: [PRUEBAS.md](PRUEBAS.md).

**Login, módulos autenticados, descargas privadas y escrituras requieren un entorno aislado
verificado y cuentas ficticias.** La beta distribuida apunta a producción: no introducir
cuentas ficticias en producción pensando que eso la convierte en un entorno de pruebas.

## Google y sesiones

**Google no es compatible todavía con el retorno de sesión a esta beta.** El flujo web actual
redirige al proveedor; abrirlo en otro navegador no devuelve la sesión a WebView2. Además,
Google puede rechazar navegadores incrustados. Se muestra una explicación y se ofrece abrir
la portada de Moderno.app en el navegador habitual. Reintentar vuelve a la portada dentro
 del programa. No se transportan cookies, no se altera el user-agent ni la configuración Auth.

La alternativa temporal es utilizar la web en el navegador habitual. Un retorno nativo seguro
necesita diseño específico y coordinación con el Taller principal; no se ha implementado ni
se promete mediante un simple enlace externo. El acceso por contraseña tampoco se certifica
hasta probarlo en aislamiento.

El perfil propio está en `%LOCALAPPDATA%\Moderno.app\Windows\WebView2`.
Contiene sesiones, caché y posibles borradores; no compartirlo ni subirlo a GitHub.
Actualizar/desinstalar conserva ese perfil. Para restablecerlo voluntariamente: cerrar la app,
asegurar que no hay trabajo local pendiente y eliminar **solo esa carpeta**. Se pierden las
sesiones y borradores locales; no se borran datos del servidor ni se revocan otras sesiones.

## Navegación, archivos y conexión

- Solo HTTPS, puerto estándar y hosts exactos `app.moderno.app`/`auth.moderno.app` en la ventana.
- Popups internos navegan en la misma ventana; enlaces HTTP(S) externos salen al navegador.
- `file:`, `javascript:`, protocolos arbitrarios y URLs con credenciales se rechazan.
- Descargas iniciadas por WebView2 muestran Guardar como, confirmación de sobrescritura y
  controles de progreso/cancelación de WebView2. No se ejecutan archivos automáticamente.
- Popups `blob:`/`about:blank`, PDF que dependa de ellos y `mailto:` siguen pendientes;
  no se permite navegación arbitraria para ocultar esas limitaciones.
- Permisos de dispositivo denegados; sin puente host-web, DevTools, autoguardado de contraseñas
  ni telemetría añadida por el contenedor.
- Errores HTTP/carga muestran Reintentar; fallo del proceso navegador permite recrear WebView2.
- La detección inmediata de desconexión observa el adaptador de red. Un router sin salida,
  portal cautivo o un fallo de API dentro de una SPA requieren pruebas adicionales; no existe
  un modo offline ni una garantía de detección de todos los fallos de internet.

## Actualizaciones

Se desactiva la caché HTTP del contenedor sin borrar cookies/almacenamiento. Al abrir o recargar
se solicita la web vigente; el comportamiento de service workers, si la web los incorpora,
se debe verificar por separado. No hay recargas periódicas ni al recuperar la red.
Guardar el trabajo antes de F5/Ctrl+R: las protecciones de borradores corresponden también a la web.

Actualizar la web no requiere reinstalar el ejecutable. Actualizar **el contenedor** requiere
un nuevo instalador, con el mismo identificador y perfil. No hay actualizador nativo automático.

## Compilación y pruebas

En Windows x64 con .NET SDK 10 y WebView2 Evergreen:

```powershell
dotnet run --project desktop/windows/Moderno.Windows.Tests -c Release
dotnet run --project desktop/windows/Moderno.Windows.SmokeTests -c Release
dotnet restore desktop/windows/Moderno.Windows -r win-x64
dotnet publish desktop/windows/Moderno.Windows -c Release -r win-x64 --self-contained true -o desktop/windows/publish
```

El segundo ejecutable compila el mismo shell con un perfil temporal y **todas** las solicitudes
interceptadas con HTML ficticio. No es la app distribuida, no llama a producción ni prueba OAuth real.
Sus puntos de inyección están excluidos del ejecutable distribuido por compilación condicional.
El workflow `.github/workflows/windows-beta.yml` ejecuta pruebas, publica, compila con Inno Setup 6,
comprueba instalación/reinstalación/desinstalación con un perfil ficticio y adjunta instalador y ZIP.

Identidad: [procedencia del icono](Moderno.Windows/Assets/ORIGEN.md). No se distribuyen fuentes.
Antes de entrega comercial: resolver Google, verificar sesiones y archivos, pruebas Windows 10/11,
revisión de licencias de redistribución, firma y canal de actualización. No se ha contratado nada.

## Alcance y reversión

Solo `desktop/windows/**` y su workflow en `experimento/windows-espejo`. No fusionar a main ni
modificar producción. Para revertir el contenedor, desinstalar la beta y usar el ZIP anterior;
no eliminar el perfil ni restaurar datos del servidor. Fuente: [#109](https://github.com/estudiomoderno/moderno.app/issues/109).
