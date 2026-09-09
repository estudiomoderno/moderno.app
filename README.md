# Moderno.app — TALLER

CRM para estudios de interiorismo y reformas. Aplicación actual: `app/index.html`, HTML, CSS y JavaScript sin compilación, v3.29.

## Arranque local

Instala Node.js 22 o superior y Git. Desde la raíz del repositorio:

```sh
node scripts/dev-server.mjs
```

También sirve `npm run dev`. No hace falta instalar paquetes. Abre http://localhost:3000. Detener: Ctrl+C. El servidor escucha solo en este ordenador, sirve app/, desactiva la caché y admite rutas como /proyectos.

Aquí la raíz Git es `C:\Chat Codex\moderno.app-main`; Codex está vinculado a su carpeta contenedora `C:\Chat Codex`. En otros ordenadores conviene vincular la raíz Git directamente.

## Otro ordenador

```sh
git clone --branch taller https://github.com/estudiomoderno/moderno.app.git
cd moderno.app
node scripts/dev-server.mjs
```

La rama de trabajo es taller; al terminar cada trabajo se suben los cambios revisados. Leer `docs/ESTADO-TALLER.md` y `docs/DECISIONES.md` antes de desarrollar.

## Datos y login

La configuración pública de Supabase está embebida en el HTML. No se necesita .env; el servidor no lo lee. Se necesita Internet para bibliotecas y Supabase. Iniciar sesión conecta al backend real: local no es una base de datos de pruebas.

Para Google OAuth comprobar en Supabase Authentication → URL Configuration que se permite `http://localhost:3000/` e iniciar el acceso desde la raíz. No se ha inspeccionado la configuración real de OAuth. Revisar el error y las URL permitidas antes de modificar Google. Nunca guardar secretos en el repositorio.

## Estructura

- app/: aplicación y .htaccess para Apache.
- scripts/: servidor local sin dependencias.
- docs/: estado, decisiones e historial.
- admin/, web/, extension/, mailer/: contienen README, no implementaciones.
- supabase/: marcadores de SQL y gcal; faltan archivos ejecutables.

## Publicación

.github/workflows/deploy-app.yml publica app/ por FTPS al subir cambios de esa carpeta a main y permite ejecución manual. No se han comprobado secretos ni ejecuciones. Trabajar en una rama y revisar antes de publicar.

## Git en el entorno Codex de Windows

Si Git no encuentra git-remote-https, usar el adaptador incluido:

    ./scripts/git-codex.ps1 fetch origin
    ./scripts/git-codex.ps1 push -u origin taller

Usa Git Credential Manager para iniciar sesión; no incluir credenciales en archivos. En una instalación completa de Git se pueden usar los comandos git habituales.
