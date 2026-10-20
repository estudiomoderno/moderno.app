# Moderno.app para Windows — beta experimental

**Destino:** aplicación real `https://app.moderno.app/` (única fuente de pantallas y datos). **Este repositorio NO contiene una segunda copia de la web.**

## Qué hace

Una ventana Windows con **Microsoft WebView2 Evergreen** carga remotamente Moderno.app. No instala un servidor, no reimplementa el CRM y no se conecta por su cuenta a Supabase. Usa exactamente los servicios que utiliza la web cuando el usuario inicia sesión de manera normal. La sesión y caché del navegador incrustado se guardan en el perfil local de Windows y **no se comparten** con el navegador Edge instalado.

- **Internet obligatorio.** Se muestra un aviso y «Reintentar» si no carga.
- **Cambios de la web:** se ven al **abrir o recargar** (F5 / Ctrl+R), sin reinstalar este programa. No recargar automáticamente una ventana con formularios abiertos: podrían existir borradores sin guardar.
- **Cambios del contenedor Windows:** necesitan una nueva beta/versión del ejecutable.
- Enlaces externos se abren fuera de la ventana. Solo el dominio `app.moderno.app` y el subdominio de autenticación `auth.moderno.app` pueden navegar dentro del contenedor.
- Rechaza permisos automáticos a dispositivos (cámara/micrófono/geolocalización, etc.) hasta validarlos.
- No incluye credenciales, keys, API ni contenido del proyecto.

## Estado de implementación

Primer **código fuente beta 0.1**, todavía pendiente de **compilación y pruebas reales en Windows**. La existencia de estos archivos **NO implica que el programa esté instalado, probado o publicado**.

**Importante: autentificación Google/OAuth.** Google puede prohibir iniciar sesión en agentes de usuario incrustados (`disallowed_useragent`). La beta inicial **NO promete compatibilidad** con inicio de sesión Google ni con otras redirecciones federadas. Las pruebas deben incluir correo/contraseña si está habilitado, SSO, salida/entrada, expiración y retorno de OAuth; si falla, **no solucionar autorizaciones cambiando producción a ciegas**. Diseñar flujo con navegador del sistema y retorno seguro, o valorar una PWA instalable para el primer envío. El botón «Abrir en navegador» de otra plataforma puede ser alternativa temporal, pero no asumir que la sesión web se transfiere al WebView2.

## Compilación (Windows 10/11 x64)

Requisitos:
- **.NET SDK 10** para compilar.
- WebView2 **Evergreen Runtime** para ejecutar. En muchos Windows modernos está instalado; si falta, obtenerlo de Microsoft: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Acceso a internet para restaurar desde NuGet; no se introducen API de pago.

Desde la raíz del repositorio:

```powershell
dotnet restore desktop/windows/Moderno.Windows/Moderno.Windows.csproj
dotnet publish desktop/windows/Moderno.Windows/Moderno.Windows.csproj -c Release -r win-x64 --self-contained true -o .\desktop\windows\publish\
.\desktop\windows\publish\Moderno.Windows.exe
```

`--self-contained true` incorpora el runtime de .NET, **no** el WebView2 Evergreen Runtime. **Distribuir la carpeta publicada completa**, no solo `.exe`. Las builds beta están sin firma y pueden despertar advertencias Windows SmartScreen; **no se debe desactivar antivirus/SmartScreen**. El instalador firmado vendrá después de probar login y navegación.

## Build beta por GitHub Actions

Ver `.github/workflows/windows-beta.yml`: build separada de los workflows de despliegue web, limitada a la rama `experimento/windows-espejo`. Cuando el workflow termine correctamente, ofrece un ZIP descargable `Moderno-Windows-Beta-win-x64` con todos los archivos publicados. **No se publica automáticamente en el sitio web ni instala nada en los PCs.**

## Lista de pruebas iniciales (no utilizar datos reales para escritura)

1. Abrir en Windows 10/11; comprobar título/ventana, tamaño, resolución y funcionamiento de WebView2.
2. Abrir Inicio, Proyectos, Tareas, Compras y Documentos **solo en lectura**. Verificar que se usan componentes vigentes de la web.
3. Inicio/cierre de sesión y **Google OAuth** con cuentas sintéticas autorizadas; registrar incompatibilidades.
4. Cerrar y volver a abrir para comprobar persistencia local de sesión, sin copiar cookies.
5. Desconectar red: mensaje de error, reconectar y Reintentar; sin prometer modo sin conexión.
6. Modificar exclusivamente un texto o CSS inocuo en entorno de pruebas / simulación; abrir o recargar beta, comprobar que se ve cambio **sin reconstruir ZIP**. No publicar archivos de test en producción.
7. Probar enlaces a sitios externos, descargas de ejemplo, enlaces `mailto:`, impresión, abrir PDFs, teclado, pegar/copiar, navegación atrás, F5/Ctrl+R y nuevos popups; anotar limitaciones.
8. Probar que una nueva versión de la app **no fuerza una recarga** cuando hay borradores sin guardar; no ejecutar ensayos de escritura en un estudio real.
9. Confirmar que el workflow no ha tocado `app/`, Supabase, FTPS ni DNS.

### Pendientes antes de distribuir a clientes

**P0:** confirmar login/SSO en WebView2; resolver enlaces de autenticación sin debilitarla; verificar almacenamiento seguro de sesión.

**P1:** icono `.ico` corporativo en el ejecutable e instalador Windows firmado (MSIX/MSI/Setup), integración con Inicio, Windows Installer/Desinstalación, actualizador **solo del contenedor** y condiciones de licencias de distribución.

**P2:** pruebas de integración con documentos/PDF, notificaciones y soporte en Win x64 / ARM64; telemetría diagnóstica sin datos privados solo si el usuario la autoriza.

## Límites del Taller

**Solo** `desktop/windows/**` y `.github/workflows/windows-beta.yml` en `experimento/windows-espejo`; nunca escribir `app/`, `supabase/`, `SQL/`, `mailer/` ni fusionar sin revisión. El desarrollo del sitio web pertenece al Taller principal.

**Encargo:** [#109](https://github.com/estudiomoderno/moderno.app/issues/109). Creación del issue o rama no lanza el chat de Codex Cloud.
