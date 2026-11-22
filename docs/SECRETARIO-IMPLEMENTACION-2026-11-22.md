# Secretario de Moderno.app — implementación en pruebas

## Objetivo y estado

Finanzas necesita una entrada comprensible para profesionales del diseño. El Secretario abre una conversación central, ayuda a encontrar información y prepara documentos editables. La conversación se traslada al lateral al navegar y puede plegarse; las secciones existentes siguen disponibles.

Esta entrega permanece en una rama y un PR de borrador. No implica activación en la aplicación publicada ni conexión efectiva a OpenAI. El 22/11/2026 se preparó únicamente el proyecto Supabase aislado `moderno-pruebas`: se aplicaron sus migraciones de RLS, contrato, cuota y retención, y se desplegó la Edge Function desactivada por configuración. No se ha modificado producción. La instrucción actual del propietario permite desarrollar el asistente y preparar una credencial de pruebas; sustituye las pausas históricas sobre IA, conservando la prohibición de tocar datos reales.

## Componentes

| Componente | Responsabilidad |
| --- | --- |
| `app/secretario-ui.js` | Una conversación en memoria por sesión, navegación, preguntas, propuestas, fuentes, plegado, consentimiento y valoraciones. |
| `app/secretario-bridge.js` | Valida propuestas frente al estado, versiones y permisos antes de abrir el editor existente. |
| `app/brand/secretario.css` | Presentación central y lateral adaptada a escritorio y móvil con el logotipo existente. |
| `supabase/functions/secretario/` | Autentica con `getUser`, lee datos mediante el JWT del usuario, solicita un plan estructurado y verifica acciones/fuentes. |
| `app/secretary-feedback.js` | Contrato cerrado, consentimiento, cancelación y agregación de revisión sin textos privados. |
| `SQL/secretario-pruebas-prerequisitos.sql` | Contrato mínimo, RLS y alta aislada para el proyecto vacío de Moderno Prueba; se niega a ejecutarse si ya hay datos. |
| `SQL/secretario-runtime.sql` | Cuota distribuida de 20 consultas por persona/estudio/día y 200 al mes, sin conservar contenido. |
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

El HTML de producción carece de configuración activa. El servidor local oficial puede inyectarla únicamente si `MODERNO_SECRETARY_ENABLED=true` y la URL corresponde al proyecto verificado `moderno-pruebas`. La mejora compartida requiere además `MODERNO_SECRETARY_FEEDBACK_ENABLED=true` y sus RPC disponibles.

El navegador nunca recibe la clave de OpenAI. El origen de la función se deriva del mismo backend de pruebas; la política de conexiones del servidor local se mantiene limitada a ese backend.

### Edge Function

Configurar exclusivamente en el servidor de pruebas:

- `SECRETARY_ENABLED=true`.
- `SECRETARY_ENVIRONMENT=test`.
- `SECRETARY_ALLOWED_PROJECT_REF=chsilowzrtumbcofspwv`.
- `SECRETARY_ALLOWED_ORIGINS`: lista explícita de orígenes de pruebas, sin comodines ni el dominio de producción.
- `OPENAI_API_KEY`: secreto del proyecto autorizado, nunca en GitHub, HTML, capturas o registros.
- `OPENAI_MODEL`: modelo comprobado para el esquema de respuesta y el presupuesto acordado.
- Variables públicas de Supabase del entorno de pruebas; se rechazan claves administrativas.

La llamada al proveedor usa `store:false`; esto no es una promesa de retención cero del proveedor. Se necesita completar la política de datos aplicable y comprobar la configuración contratada antes de activar para usuarios. El manejador limita tamaño, duración y ráfagas por instancia. Además, antes de cada llamada reserva de forma atómica una unidad en `secretary_request_reserve`: 20 consultas por persona/estudio/día y 200 al mes. Solo guarda identidad técnica, estudio, fecha y contador; no guarda mensajes ni documentos. Esta cuota reduce el riesgo pero **no sustituye el límite de presupuesto del proyecto en OpenAI**, que debe verificarse antes de una prueba conectada.

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
- La Edge Function `secretario` está desplegada en el proyecto de pruebas, pero no se considera activada: faltan la credencial, el modelo, los orígenes permitidos y los flags de prueba.
- No se ha confirmado una credencial de OpenAI instalada. La captura disponible muestra el formulario previo a crearla y el proyecto predeterminado, que no debe utilizarse. La clave debe pertenecer a un proyecto exclusivo con límite duro y alertas comprobados; nunca debe pegarse en chat ni Git.

Las migraciones aplicadas en el proyecto de pruebas son `secretario_test_prerequisites`, `secretario_runtime_quota`, `secretario_feedback_opt_in`, `secretario_retention_cron` y `secretario_test_rls_optimization`. La base sigue sin estudios, miembros ni contenido de clientes. Falta crear una identidad ficticia y completar la configuración de OpenAI antes de una prueba conectada. No se copiará información real de producción para salir del bloqueo.

## Comprobaciones

Las pruebas unitarias cubren el servidor local, validación de peticiones/respuestas, referencias, permisos, cuota previa al proveedor, propuestas, cálculos y revocación del consentimiento. Las pruebas SQL usan PostgreSQL desechable con datos inventados y `rollback`; incluyen contrato, RLS, alta aislada, escritura versionada, cuota diaria/mensual, feedback y retirada. El flujo de navegador intercepta la IA y bloquea conexiones externas. Los workflows de PR no despliegan ni usan credenciales de producción.

La revisión anterior del candidato pasó [CI general](https://github.com/estudiomoderno/moderno.app/actions/runs/45009818016), [navegador aislado](https://github.com/estudiomoderno/moderno.app/actions/runs/45009818006) y [visual de proyectos](https://github.com/estudiomoderno/moderno.app/actions/runs/45009818078). Tras añadir cuota y migraciones, las cuatro suites específicas del Secretario pasan localmente. El resultado completo del nuevo commit se anotará al terminar su CI; no se presenta el resultado anterior como validación de código posterior.

Chromium no pudo arrancar en el contenedor de trabajo por la restricción de sockets del entorno. Por eso se usa una comprobación aislada en GitHub Actions. La ejecución local completa tuvo cuatro fallos de infraestructura al crear procesos (`EPERM`), no fallos de aserción del Secretario; el resultado autoritativo será el workflow del PR. No se ha eludido la restricción ni presentado una captura no comprobada como resultado.

## Reversión

Desactivar los flags del navegador y `SECRETARY_ENABLED` devuelve la entrada a las pantallas existentes. La conversación solo vive en memoria. Ninguna propuesta del asistente modifica un documento hasta que el usuario trabaja en el editor y confirma sus acciones habituales.

Para retirar el circuito de valoración, `SQL/secretario-feedback.rollback.sql` bloquea nuevos envíos y activaciones, conserva la consulta y permite retirar los datos propios. La cuota puede bloquearse revocando `secretary_request_reserve`; la tarea se retira con `cron.unschedule` antes de eliminar objetos privados. Ninguna reversión elimina facturas, presupuestos, contactos, archivos ni registros financieros. Una fusión a `main` publicaría recursos de la aplicación por el workflow existente: **esta entrega debe permanecer en PR de borrador hasta resolver la activación y verificarla**.

## Referencias técnicas

- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions): privilegios, `security invoker`, `search_path` y acceso a RPC.
- [OpenAI — Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create): respuesta estructurada y configuración de almacenamiento.
- [OpenAI — Your data](https://developers.openai.com/api/docs/guides/your-data): tratamiento y controles de datos de la API.
