# Moderno.app — Taller de la aplicación

CRM para estudios de interiorismo y reformas. Producción: https://app.moderno.app. Estado de publicación y límites en [ESTADO-TALLER](docs/ESTADO-TALLER.md); entregas recientes en [ROADMAP-V339-V345](docs/ROADMAP-V339-V345.md). Leer también [DECISIONES](docs/DECISIONES.md) antes de desarrollar.

## Continuar desde otro ordenador

Instala Git y Node.js 22 o superior. No hacen falta paquetes npm para el servidor local.

```sh
git clone https://github.com/estudiomoderno/moderno.app.git
cd moderno.app
git switch -c mi-cambio
cp .env.example .env
# Configura URL y clave pública de un proyecto de pruebas.
npm run dev
```

En PowerShell usa `Copy-Item .env.example .env`. Abre http://localhost:3000. Detener: Ctrl+C. También puedes usar `node --env-file=.env scripts/dev-server.mjs`. Pruebas: `node --test scripts/*.test.mjs`; autorización del correo: `php scripts/invitation-auth.test.php`.

Se necesita Internet y un usuario ficticio del proyecto de pruebas. El servidor sustituye la conexión en memoria, separa el almacenamiento local y rechaza el proyecto productivo conocido y las claves administrativas. No sirvas app/ con un servidor genérico: conservaría la conexión de producción del HTML. `.env` y las credenciales no se suben a GitHub.

## Organización y publicación

- `app/`: aplicación servida y reglas Apache.
- `SQL/`: funciones/permisos, con instalación y validación documentadas por entrega.
- `scripts/`: servidor, pruebas, copias y generadores SQL. Los ensayos de recuperación se ejecutan solo en un clon, nunca en producción.
- `mailer/`: servicio PHP de invitaciones; configuración SMTP privada excluida del despliegue.
- `docs/`: arranque, decisiones, conservación, recuperación y evidencias.

El checkout de este Taller es `C:\Chat Codex\moderno-validacion`, rama `taller-operativa-20260909`. En otro ordenador vincula Codex a la raíz de tu clon. Usa una rama propia para evitar editar simultáneamente el mismo checkout.

Los cambios de `app/` y `mailer/` en main activan `.github/workflows/deploy-app.yml`: pruebas, recursos primero y HTML después, publicación por FTPS. Las funciones SQL requieren su procedimiento separado; no se aplican automáticamente desde ese workflow. Verifica Actions y los recursos servidos antes de dar una entrega por publicada. No fuerces recargas ni restaures datos antiguos para revertir una interfaz.

En este Windows, si Git no encuentra `git-remote-https`, usa `scripts/git-codex.ps1` con los argumentos habituales de Git. La autenticación utiliza Git Credential Manager; nunca copies sus credenciales al repositorio.

## Datos reales y pruebas pendientes

Consulta [PROTECCION-DATOS](docs/PROTECCION-DATOS.md), [RECUPERACION-SERVICIO](docs/RECUPERACION-SERVICIO.md) y [MONITORIZACION-COPIAS](docs/MONITORIZACION-COPIAS.md). Una copia programada correcta no demuestra por sí sola que se hayan restaurado todos los archivos posteriores.

La guía dentro de Compras y aprobaciones explica el recorrido de fichas, láminas, aprobaciones, presupuestos y pedidos. La prueba de recepción real de una invitación requiere destinatario y alta autorizados específicamente; no se presenta el ensayo local de correo como una entrega a un buzón real. Google Calendar continúa aplazado; no forma parte de este cierre.
