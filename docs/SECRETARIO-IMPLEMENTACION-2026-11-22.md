# Secretario de Moderno.app — implementación y piloto

## Objetivo y estado

Finanzas necesita una entrada comprensible para profesionales del diseño. El Secretario abre una conversación central, ayuda a encontrar información y prepara documentos editables. La conversación se traslada al lateral al navegar y puede plegarse; las secciones existentes siguen disponibles.

La entrega permanece en una rama y un PR de borrador hasta completar los controles productivos. El 22/11/2026 se preparó el proyecto Supabase aislado `moderno-pruebas` y se completó una prueba real de extremo a extremo con una identidad, estudio y datos exclusivamente ficticios. Auth, RLS, cuota, Edge Function, Responses API y respuesta financiera quedaron comprobados con una sola consulta. El acceso temporal de prueba se desactivó después.

El propietario ha autorizado publicar el piloto directamente en la aplicación porque actualmente es el único usuario. Esa autorización no elimina las condiciones de copia, reversión y verificación: no se aplicará SQL ni se desplegará la función en producción hasta acreditar una copia actual y restaurable de la base. El lanzamiento queda limitado por allowlist de usuario en servidor y no se abre automáticamente a futuros usuarios.

## Componentes

| Componente | Responsabilidad |
| --- | --- |
| `app/secretario-ui.js` | Una conversación en memoria por sesión, navegación, preguntas, propuestas, fuentes, plegado, consentimiento y valoraciones. |
| `app/secretario-bridge.js` | Valida propuestas frente al estado, versiones y permisos antes de abrir el editor existente. |
| `app/brand/secretario.css` | Presentación central y lateral adaptada a escritorio y móvil con el logotipo existente. |
| `supabase/functions/secretario/` | Autentica con `getUser`, lee datos mediante el JWT del usuario, solicita un plan estructurado y verifica acciones/fuentes. |
| `app/secretary-feedback.js` | Contrato cerrado, consentimiento, cancelación y agregación de revisión sin textos privados. |
| `SQL/secretario-pruebas-prerequisitos.sql` | Contrato mínimo, RLS y alta aislada para el proyecto vacío de Moderno Prueba; se niega a ejecutarse si ya hay datos. |
| `SQL/secretario-runtime.sql` | Cuota de 20 consultas por persona/estudio/día, 200 al mes y 200 globales al mes para toda la app, sin conservar contenido. |
| `SQL/secretario-runtime.rollback.sql` | Corte no destructivo de nuevas reservas; conserva los contadores. |
| `SQL/secretario-feedback.sql` | Consentimiento y valoraciones independientes de los documentos. RPC con identidad y pertenencia verificadas; tablas internas sin acceso directo. |
| `SQL/secretario-retencion-cron.sql` | Purga diaria de valoraciones vencidas y contadores antiguos mediante Supabase Cron. |

## Comportamiento de la primera versión

- Entrada central al pulsar Finanzas y continuidad de la misma conversación en el lateral de Finanzas y Proyectos durante la sesión.
- Preguntas con opciones y respuesta libre cuando falta cliente, proyecto, partida, cantidad o precio.
- Navegación por destinos permitidos y enlaces a registros que el usuario puede consultar.
- Consulta económica basada en registros autorizados, con fuentes y advertencias por datos incompletos. No equivale a un saldo bancario.
- Preparación de presupuestos y facturas para revisar en el editor nativo; conversión desde presupuesto y revisión de borradores guardados según el contrato del editor.
- Precios manuales y medidas necesitan una cifra explícita del usuario; los de catálogo se recuperan del servidor. Un precio desconocido provoca una pregunta.
- Los cálculos, numeración, guardado, emisión y sincronización de documentos permanecen en la aplicación. La IA no ejecuta escrituras financieras.
- Cambiar usuario, estudio o rol limpia la conversación y cancela solicitudes pendientes. No se consulta ningún chat privado de ChatGPT.

La lectura/calibración de planos, mediciones gráficas, subida de adjuntos al modelo y emisión/envío desde el chat no están implementadas en esta versión. La continuidad al recargar o cambiar de dispositivo y una memoria compartida de reglas del estudio requieren una fase posterior. Las valoraciones comunes no son esa memoria y no trasladan datos de otros estudios a las respuestas.

## Verificación de datos y acciones

El cliente envía la consulta, contexto de pantalla, respuestas y un historial acotado. El servidor no acepta el estado del navegador como fuente financiera: comprueba `app_rol` y lee `app_leer_bloques` con el JWT del usuario. Tras la llamada al modelo vuelve a verificar rol y versiones; si cambiaron, rechaza la propuesta.

En esta versión se admiten administradores para Finanzas y preparación de documentos, y colaboradores para la información de proyectos que devuelve el RPC filtrado. Otros roles se rechazan hasta disponer de un contrato específico probado. No se utiliza `service_role` para consultar documentos ni se autoriza mediante `user_metadata`.

El modelo devuelve intenciones dentro de un esquema cerrado. El servidor construye las respuestas verificables y el navegador vuelve a contrastar permisos, referencias, versiones y cambios locales pendientes antes de abrir un borrador. No hay herramientas de emisión, envío, cobro, borrado ni ejecución de código. Las trazas visibles describen operaciones, no pensamientos internos.

Los importes de resumen se calculan de forma determinista y las pruebas comparan la semántica de cobros con las funciones existentes. Se distingue el cobro desglosado de documentos marcados como cobrados sin detalle. Los totales de un documento los calcula su editor. No se realizan conversiones de divisa ni estimaciones de precios.

## Activación controlada

### Navegador y servidor local

El candidato de HTML publicado contiene exclusivamente el endpoint público `https://auth.moderno.app/functions/v1/secretario`, con el Secretario activado y el feedback desactivado. No contiene la clave de OpenAI. El servidor local sustituye esa configuración y solo puede activar el Secretario contra `moderno-pruebas`; continúa rechazando producción y claves administrativas.

El navegador nunca recibe la clave de OpenAI. El origen de la función se deriva del mismo backend de pruebas; la política de conexiones del servidor local se mantiene limitada a ese backend.

### Edge Function

Configuración de pruebas:

- `SECRETARY_ENABLED=true`.
- `SECRETARY_ENVIRONMENT=test`.
- `SECRETARY_ALLOWED_PROJECT_REF=chsilowzrtumbcofspwv`.
- `SECRETARY_ALLOWED_ORIGINS`: loopback local explícito, sin comodines ni el dominio de producción.
- `OPENAI_API_KEY`: secreto del proyecto autorizado, nunca en GitHub, HTML, capturas o registros.
- `OPENAI_MODEL=gpt-5.4-mini-2026-03-17`: modelo comprobado y fijado por código.
- Variables públicas de Supabase del entorno de pruebas; se rechazan claves administrativas.

Configuración productiva del canary:

- `SECRETARY_ENABLED=true` solo después de instalar y comprobar la cuota.
- `SECRETARY_ENVIRONMENT=production`.
- `SECRETARY_ALLOWED_PROJECT_REF=cgqtylvaapwbuwqvpjtb`.
- `SECRETARY_ALLOWED_ORIGINS=https://app.moderno.app`, único origen admitido y obligatorio en POST.
- `SECRETARY_ALLOWED_USER_IDS`: UUID exacto del propietario; es obligatorio en producción.
- Clave restringida del proyecto OpenAI dedicado y el mismo modelo fijado.
- La URL interna de Supabase debe coincidir exactamente con el proyecto productivo; el alias público no relaja esa guarda.

La llamada al proveedor usa `store:false`; esto no es una promesa de retención cero del proveedor. El manejador limita tamaño, duración y ráfagas por instancia. Antes de cada llamada, `secretary_request_reserve` toma primero un bloqueo mensual global y después el del usuario/estudio: como máximo 20 consultas diarias por persona/estudio, 200 mensuales por persona/estudio y 200 mensuales entre toda la aplicación. Solo guarda identidad técnica, estudio, fecha y contador; no guarda mensajes ni documentos. La cuota cuenta solicitudes, no tokens ni euros, y complementa los controles de facturación del proyecto OpenAI.

### Mejora compartida

El permiso está desactivado por defecto, es individual por estudio y nunca se guarda en la configuración compartida. Un evento contiene solo versión, recorrido, resultado y motivo predefinido. El servidor obtiene la identidad desde Auth; no acepta un identificador de usuario aportado por el evento.

La activación utiliza revisión esperada para impedir que una solicitud atrasada reactive un permiso retirado. Retirar funciona incluso tras abandonar el estudio para eliminar aportaciones propias. Los eventos se actualizan como máximo en una fila por usuario/estudio/mes/recorrido. El informe interno muestra una categoría solo cuando reúne al menos cinco personas distintas de tres estudios. Esto reduce exposición y **no se presenta como anonimización garantizada**.

Los informes no se exponen al asistente ni a otros usuarios. `SQL/secretario-retencion-cron.sql` programa una ejecución diaria de `moderno_secretary.purge_expired()` para borrar valoraciones de más de 90 días y contadores de más de 120. El informe excluye desde ya los vencidos. Debe comprobarse el primer resultado del trabajo antes de habilitar las valoraciones.

## Estado comprobado en Moderno Prueba

Comprobación del 22/11/2026, sin leer ni modificar registros de producción:

- El proyecto de pruebas es `moderno-pruebas`, referencia `chsilowzrtumbcofspwv`.
- `public.estudios` y `public.miembros` estaban vacías. Se habilitó RLS con políticas explícitas y se añadió `datos_estudio` sin escrituras directas desde el cliente.
- Se instalaron el alta ficticia aislada, `app_rol`, `app_leer_bloques` y `app_guardar_lote`. El alta crea como máximo un estudio de pruebas por identidad autenticada y no copia información productiva.
- Se instalaron la cuota distribuida, el consentimiento/feedback y la purga diaria. Las tablas privadas tienen RLS y no conceden acceso directo a `anon` ni `authenticated`.
- Los asesores de seguridad y rendimiento no muestran errores de RLS ni avisos de inicialización repetida de `auth.uid()`. Permanecen avisos informativos esperados sobre tablas privadas sin políticas y funciones `security definer`: son fronteras RPC intencionadas, con privilegios y pertenencia comprobados en pruebas.
- La Edge Function `secretario` se activó en pruebas con origen, proyecto y modelo exactos y una clave restringida a Responses; no se expuso la clave al navegador ni al repositorio.
- Una cuenta ficticia confirmada, un estudio ficticio y nueve bloques vacíos completaron el recorrido. El resumen devolvió ceros coherentes y la base registró exactamente una reserva. La página temporal quedó anulada con respuesta 410 y el archivo local fue retirado.

Las migraciones aplicadas en el proyecto de pruebas son `secretario_test_prerequisites`, `secretario_runtime_quota`, `secretario_feedback_opt_in`, `secretario_retention_cron`, `secretario_test_rls_optimization` y `secretario_global_quota_guard`. El contenido creado para la comprobación es ficticio y permanece aislado; no se copió información de producción. Tras actualizar la cuota se verificó que conserva una sola reserva, que `anon` no puede ejecutarla y que el bloqueo global está instalado.

## Preparación productiva

La inspección de solo lectura confirmó que producción tiene PostgreSQL 17, RLS en `estudios`, `miembros` y `datos_estudio`, y las firmas `app_rol`, `app_rol_usuario` y `app_leer_bloques`. No existe ningún objeto homónimo del Secretario. Para el piloto se aplicará solo `secretario-runtime.sql`; no se aplicarán los prerrequisitos de pruebas, feedback ni cron.

Storage tiene una copia programada verificada el 22/11/2026 con 945 objetos idénticos. La copia actual y restaurable de la base aún debe acreditarse en el panel `Database → Backups → Scheduled` antes de cualquier migración productiva.

## Comprobaciones

Las pruebas unitarias cubren el servidor local, validación de peticiones/respuestas, referencias, permisos, cuota previa al proveedor, propuestas, cálculos y revocación del consentimiento. Las pruebas SQL usan PostgreSQL desechable con datos inventados y `rollback`; incluyen contrato, RLS, alta aislada, escritura versionada, cuota diaria/mensual, feedback y retirada. El flujo de navegador intercepta la IA y bloquea conexiones externas. Los workflows de PR no despliegan ni usan credenciales de producción.

El candidato anterior pasó [CI general y PostgreSQL 17](https://github.com/estudiomoderno/moderno.app/actions/runs/45012449672), [navegador aislado](https://github.com/estudiomoderno/moderno.app/actions/runs/45012449703) y [visual de proyectos](https://github.com/estudiomoderno/moderno.app/actions/runs/45012449739). Tras añadir las guardas productivas, 83 comprobaciones específicas y la suite local completa de 837 pruebas pasan sin fallos. El nuevo contrato SQL global deberá volver a pasar PostgreSQL 17 en el siguiente HEAD del PR antes de aplicar producción.

Chromium no pudo arrancar en el contenedor de trabajo por la restricción de sockets del entorno. Por eso se usa una comprobación aislada en GitHub Actions. La ejecución local completa tuvo cuatro fallos de infraestructura al crear procesos (`EPERM`), no fallos de aserción del Secretario; el resultado autoritativo será el workflow del PR. No se ha eludido la restricción ni presentado una captura no comprobada como resultado.

## Reversión

Desactivar `SECRETARY_ENABLED` corta el backend; revertir la configuración del navegador devuelve la entrada a las pantallas existentes. `SQL/secretario-runtime.rollback.sql` revoca nuevas reservas sin borrar contadores. La conversación solo vive en memoria. Ninguna propuesta del asistente modifica un documento hasta que el usuario trabaja en el editor y confirma sus acciones habituales.

Para retirar el circuito de valoración, `SQL/secretario-feedback.rollback.sql` bloquea nuevos envíos y activaciones, conserva la consulta y permite retirar los datos propios. La cuota puede bloquearse revocando `secretary_request_reserve`; la tarea se retira con `cron.unschedule` antes de eliminar objetos privados. Ninguna reversión elimina facturas, presupuestos, contactos, archivos ni registros financieros. Una fusión a `main` publicaría recursos de la aplicación por el workflow existente: **esta entrega debe permanecer en PR de borrador hasta resolver la activación y verificarla**.

## Referencias técnicas

- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions): privilegios, `security invoker`, `search_path` y acceso a RPC.
- [OpenAI — Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create): respuesta estructurada y configuración de almacenamiento.
- [OpenAI — Your data](https://developers.openai.com/api/docs/guides/your-data): tratamiento y controles de datos de la API.
