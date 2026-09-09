# Moderno.app — TALLER

CRM para estudios de interiorismo y reformas. Candidato v3.30-pruebas, sin publicar. Lee [Validación de protección](docs/VALIDACION-PROTECCION.md) antes de continuar.

## Arranque local

Instala Node.js 22 o superior y Git. Desde la raíz del repositorio:

```sh
cp .env.example .env
# Rellena .env con URL y clave pública del proyecto de pruebas.
npm run dev
```

No hace falta instalar paquetes. En PowerShell puedes copiar el archivo con `Copy-Item .env.example .env`. Abre http://localhost:3000. Detener: Ctrl+C. El servidor escucha solo en este ordenador, sirve app/, desactiva la caché y admite rutas como /proyectos. También admite `node --env-file=.env scripts/dev-server.mjs`.

Aquí la raíz Git es `C:\Chat Codex\moderno.app-main`; Codex está vinculado a su carpeta contenedora `C:\Chat Codex`. En otros ordenadores conviene vincular la raíz Git directamente.

## Otro ordenador

```sh
git clone --branch taller https://github.com/estudiomoderno/moderno.app.git
cd moderno.app
cp .env.example .env
# Configura el proyecto de pruebas antes de arrancar.
npm run dev
```

La rama de trabajo es taller; al terminar cada trabajo se suben los cambios revisados. Leer `docs/ESTADO-TALLER.md` y `docs/DECISIONES.md` antes de desarrollar.

## Datos y login

El HTML entregado en producción conserva su configuración. El servidor local la sustituye en memoria por la URL y clave pública de `.env`; rechaza el proyecto productivo conocido y las claves administrativas. Limita las conexiones al proyecto de pruebas y usa una clave de almacenamiento local distinta, conservando las copias de producción del navegador. Se necesita Internet y un usuario ficticio de ese proyecto. No basta con servir el HTML con otro servidor: eso conservaría su conexión productiva.

Para Google OAuth comprobar en Supabase Authentication → URL Configuration que se permite `http://localhost:3000/` e iniciar el acceso desde la raíz. No se ha inspeccionado la configuración real de OAuth. Revisar el error y las URL permitidas antes de modificar Google. Nunca guardar secretos en el repositorio.

## Estructura

- app/: aplicación y .htaccess para Apache.
- scripts/: servidor local sin dependencias.
- docs/: estado, decisiones e historial.
- admin/, web/, extension/, mailer/: contienen README, no implementaciones.
- supabase/: calendario recuperado, función de autorización de adjuntos y configuración. La función gcal sigue pendiente de fuente y despliegue.

## Publicación

.github/workflows/deploy-app.yml publica app/ por FTPS al subir cambios de esa carpeta a main y permite ejecución manual. No se han comprobado secretos ni ejecuciones. Trabajar en una rama y revisar antes de publicar.

## Git en el entorno Codex de Windows

Si Git no encuentra git-remote-https, usar el adaptador incluido:

    ./scripts/git-codex.ps1 fetch origin
    ./scripts/git-codex.ps1 push -u origin taller

Usa Git Credential Manager para iniciar sesión; no incluir credenciales en archivos. En una instalación completa de Git se pueden usar los comandos git habituales.

## Candidato de operativa diaria

La primera tanda aprobada está en v3.31-operativa-pruebas, rama local taller-operativa-20260909. Consultar [alcance, pruebas y publicación pendiente](docs/OPERATIVA-DIARIA.md). Incluye como base el candidato de protección anterior; no equivale a la versión publicada.
