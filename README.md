# Moderno.app

Repositorio privado con todo el código de Moderno.app.

## Estructura

| Carpeta | Contenido | Se despliega en |
|---|---|---|
| `app/` | Aplicación principal (hoy `prototipo-moderno.html`, mañana React + TypeScript) | app.moderno.app |
| `admin/` | Panel de administración / CRM | admin.moderno.app |
| `web/` | Web pública: `build_web.py` y el HTML generado | www.moderno.app |
| `supabase/functions/` | Edge Functions (`gcal`, clasificador de productos…) | Supabase |
| `supabase/sql/` | Esquema, RPCs (`unirse_al_estudio`, `portal_obra_lee`…) y políticas RLS | Supabase (a mano) |
| `extension/` | Extensión de Chrome "Product Clipper" (Manifest V3) | Chrome Web Store |
| `mailer/` | `enviar-invitacion.php` y utilidades PHP | DonDominio |
| `docs/` | Traspasos del Taller, resúmenes para Estrategia, especificaciones | — |

## Versiones

Cada versión de la app se etiqueta en Git: `git tag v3.29`. El historial de cambios
por versión vive en `docs/CHANGELOG.md`.

## Despliegue

Al hacer *push* a la rama `main`, GitHub Actions sube el contenido de `app/` a
app.moderno.app por SFTP/FTP (ver `.github/workflows/deploy-app.yml`).
Las credenciales del FTP se guardan en **Settings → Secrets → Actions** del repositorio,
nunca en el código.

## Regla de oro

Ningún secreto en el repositorio: ni `service_role`, ni Client Secret de Google,
ni API key de Verifacti. Solo la clave pública `anon` de Supabase puede ir en el cliente.
Copia `.env.example` a `.env` para trabajar en local; `.env` está en `.gitignore`.
