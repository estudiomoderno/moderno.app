# Automatización de Cerebro a Taller (10/10/2026)

## Estado verificable

- **Activo:** Cerebro (ChatGPT) puede crear issues en GitHub; el repositorio `estudiomoderno/moderno.app` tiene `AGENTS.md` y `docs/COORDINACION-CEREBRO-CODEX.md`; Codex Cloud tiene un entorno `moderno.app` visible y el Taller confirmó acceso al repositorio.
- **Automático a partir de este cambio:** los PR dirigidos a `main` pasan comprobaciones Node/PHP sin credenciales de producción ni despliegue. Esto **no inicia Codex** y **no prueba Supabase**.
- **No activo:** ejecución automática de Codex desde los issues o desde ChatGPT. No hay herramienta de Codex Cloud accesible directamente desde Cerebro para iniciar esas sesiones.
- **Bloqueo del entorno:** `moderno-pruebas` (ref `chsilowzrtumbcofspwv`) está activo, pero la comprobación de solo lectura el 10/10/2026 devolvió 0 tablas `public`, 0 migraciones y 0 Edge Functions. No se han realizado escrituras. Ver [issue #3](https://github.com/estudiomoderno/moderno.app/issues/3).
- **Bloqueo de automatización:** para un disparador GitHub Actions con Codex, la alternativa oficial es [openai/codex-action](https://github.com/openai/codex-action). Requiere autenticación de OpenAI API, presupuesto/autorización de consumo aparte de ChatGPT y seguridad adicional en un repo público. Ver [issue #4](https://github.com/estudiomoderno/moderno.app/issues/4).
- **Presupuesto APROBADO, configuración PENDIENTE:** Cerebro autorizó un máximo de **20 EUR por mes** para OpenAI API; el compromiso y los controles de gasto se describen en [PRESUPUESTO-CODEX-API](PRESUPUESTO-CODEX-API.md). El proyecto API dedicado, límite duro, alertas y credenciales privadas todavía no están configurados ni verificados. **No activar la acción facturable** hasta completar los requisitos.

## Flujo de trabajo mientras no exista el disparador

1. Cerebro recibe el objetivo del usuario, aclara prioridades y registra un issue de GitHub con alcance, restricciones, pruebas y aceptación.
2. El issue es la fuente compartida de trabajo para Taller. **Crear el issue no provoca una ejecución de Codex.**
3. El Taller en Codex toma el issue autorizado, lee `AGENTS.md`, abre rama independiente, verifica aislamiento del entorno, desarrolla y publica un PR sin mezclar.
4. GitHub verifica automáticamente los tests Node/PHP del PR. Cuando sea pertinente, Taller ejecuta además pruebas funcionales en `moderno-pruebas` y revisiones de seguridad.
5. Tras revisión de resultados, se documenta la entrega y se publica solo si procede. Nunca se aplican SQL/Edge Functions ni se modifican datos reales por el mero hecho de mezclar un PR.

## Diseño de futura automatización (no habilitar sin condiciones)

1. Confirmar el esquema, permisos, tests y cuentas ficticias en `moderno-pruebas`.
2. Aprobar conscientemente el sistema de ejecución y el gasto API; no asumir que la suscripción de ChatGPT incluye llamadas a `openai/codex-action`.
3. Configurar autenticación segura mediante las opciones documentadas de OpenAI (secret de Actions restringido o federación de identidades, si el flujo concreto la admite). No guardar tokens en Git.
4. Disparar **solo** tareas autorizadas por el propietario y marcadas específicamente para ejecutar; jamás desde cualquier comentario o issue público.
5. Usar sandbox con acceso limitado a código de pruebas y sin secretos de producción. La creación del PR se realiza en un job distinto al que ejecuta código generado, con permisos mínimos.
6. Abrir PR de borrador y vincular resultado al issue; **no hacer auto-merge ni desplegar automáticamente**. Controlar tiempo, coste y cancelación.
7. Ejecutar una prueba extremo a extremo inocua sin tocar la aplicación productiva y registrar los resultados.

## Garantías

- La carpeta de Windows no es necesaria como lugar de almacenamiento; GitHub y Codex Cloud son servicios en la nube.
- No hay sincronización automática del historial entre ChatGPT y Codex. Las decisiones se transfieren por GitHub y, cuando se compruebe, por GitBook.
- `main` tiene un workflow de despliegue productivo cuando cambian `app/**`, `mailer/**` o el propio `deploy-app.yml`. **El workflow de PR aquí definido nunca publica.**
- Cualquier gasto adicional o cambio a infraestructura productiva exige autorización concreta.
