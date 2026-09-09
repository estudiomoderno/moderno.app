# Decisiones de TALLER

## 2026-09-09 — Entorno y continuidad

- TALLER es la tarea principal. Explicar en español sencillo y resumir estado y pendientes antes de desarrollar funcionalidades, según petición del usuario.
- Mantener la aplicación actual durante la preparación; servidor Node sin dependencias y con rutas limpias.
- Actualizar README, estado y decisiones al cerrar trabajos importantes.
- Distinguir hechos comprobados de información histórica. El traspaso no sustituye al código ni a la configuración real.
- La sesión local usa Supabase real. Preparar un entorno de pruebas antes de ensayos que escriban datos.
- Revisar publicación antes de subir app/ a main: existe flujo automático FTPS.

## Criterios históricos del traspaso, a confirmar al trabajar en cada área

- Separar previsión de cobros de contabilidad real.
- Facturas inmutables y numeración preservada.
- No mostrar costes internos ni márgenes en documentos y portales de clientes; portal de obra sin precios.
- Español activo; revisar diccionario existente para textos nuevos.
- React/TypeScript y permisos por fila son una dirección futura, no una reescritura autorizada ahora.

Estas referencias no verifican la implementación técnica ni fiscal.

## 2026-09-09 — Sincronización autorizada

El usuario autoriza subir automáticamente a GitHub los cambios revisados al terminar cada trabajo. Usar la rama taller mediante Git local autenticado (scripts/git-codex.ps1 en este entorno). La autorización de publicación se amplía en la decisión siguiente.

## 2026-09-09 — Publicación y protección de usuarios reales

El usuario autoriza que TALLER desarrolle, compruebe y publique las modificaciones terminadas de la aplicación para todos los usuarios. Hay usuarios activos con datos y archivos reales que deben conservarse.

- Trabajar en taller, comprobar el cambio y llevar a main la entrega validada. No publicar cada edición intermedia. No hace falta volver a pedir autorización para publicaciones ordinarias dentro de este alcance.
- Verificar el resultado de GitHub Actions y la versión servida en producción antes de afirmar que se ha publicado. El flujo FTPS existe; su ejecución efectiva todavía no se ha verificado desde TALLER.
- Conservar la versión anterior y un procedimiento de reversión del código. Revertir HTML no restaura datos ni archivos.
- Mantener compatibilidad con datos existentes y sesiones que todavía ejecuten la versión anterior. No forzar una recarga que pueda descartar trabajo sin guardar. Los usuarios recibirán la versión al abrir o recargar la app; no prometer actualización inmediata de todas las pestañas abiertas.
- No borrar, reinicializar ni sustituir datos reales por datos de prueba. Probar escrituras con datos de prueba aislados.
- Antes de cambios que afecten al esquema, guardado, migraciones o archivos: comprobar respaldo recuperable de base de datos y de archivos de Storage por separado, ensayar recuperación y migración en un entorno de pruebas y definir reversión. Si no es posible verificarlo, detener esa publicación y explicar el bloqueo.
- Pendiente prioritario: comprobar con acceso real a Supabase los respaldos, la recuperación de archivos y la disponibilidad de un entorno de pruebas. No dar por existente una protección todavía no verificada.
