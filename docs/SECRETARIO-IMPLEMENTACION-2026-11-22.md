# Secretario de Moderno.app — implementación y piloto

## Objetivo y estado

Finanzas necesita una entrada comprensible para profesionales del diseño. El Secretario abre una conversación central, ayuda a encontrar información y prepara documentos editables. La conversación se traslada al lateral al navegar y puede plegarse; las secciones existentes siguen disponibles.

La entrega inicial y el hotfix de contexto acotado están fusionados en `main` y publicados. El 22/11/2026 se preparó el proyecto Supabase aislado `moderno-pruebas` y se completó una prueba real de extremo a extremo con una identidad, estudio y datos exclusivamente ficticios. Auth, RLS, cuota, Edge Function, Responses API y respuesta financiera quedaron comprobados con una sola consulta. El acceso temporal de prueba se desactivó después.

La revisión `v3.67.69` completa la primera versión para el piloto: añade estado determinista de proyecto, vincula cada petición al proyecto y pantalla donde nació, protege todos los campos editables antes de navegar, ofrece errores en español con reintento seguro, propaga cancelación/timeout y sustituye la segunda lectura completa por una revalidación ligera de rol y versiones. No añade tablas, columnas, permisos ni migraciones.

El propietario ha autorizado publicar el piloto directamente en la aplicación porque actualmente es el único usuario. Esa autorización no elimina las condiciones de copia, reversión y verificación. La copia se acreditó antes de aplicar el runtime y desplegar la función apagada. El lanzamiento queda limitado por allowlist de usuario en servidor y no se abre automáticamente a futuros usuarios.

## Componentes

| Componente | Responsabilidad |
| --- | --- |
| `app/secretario-ui.js` | Una conversación en memoria por sesión, navegación, preguntas, propuestas, fuentes, plegado, consentimiento y valoraciones. |
| `app/secretario-bridge.js` | Valida propuestas frente al estado, versiones y permisos antes de abrir el editor existente. |
| `app/brand/secretario.css` | Presentación central y lateral adaptada a escritorio y móvil con el logotipo existente. |
| `supabase/functions/secretario/` | Verifica la sesión con `getClaims`, lee datos mediante el JWT del usuario, solicita un plan estructurado y verifica acciones/fuentes. |
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
- Cambiar usuario, estudio o rol limpia la conversación y cancela solicitudes pendientes. Cambiar de pantalla o proyecto detiene la petición iniciada en el contexto anterior y nunca ejecuta sus acciones tardías.
- Las consultas de proyecto pueden resumir de forma determinista tareas pendientes/completadas, vencidas, previstas para hoy y el siguiente plazo, además del número de documentos autorizados.
- La actividad visible indica fases reales y acotadas de la consulta. Los fallos de red, cuota, contexto, timeout o proveedor se muestran en español y ofrecen reintento cuando es seguro.
- No se consulta ningún chat privado de ChatGPT.

La lectura/calibración de planos, mediciones gráficas, subida de adjuntos al modelo y emisión/envío desde el chat no están implementadas en esta versión. La continuidad al recargar o cambiar de dispositivo y una memoria compartida de reglas del estudio requieren una fase posterior. Las valoraciones comunes no son esa memoria y no trasladan datos de otros estudios a las respuestas.

## Verificación de datos y acciones

El cliente envía la consulta, contexto de pantalla, respuestas y un historial acotado. El JWT de sesión viaja dentro de un sobre JSON con límites independientes de 128 KiB para el transporte, 64 KiB para la sesión y 48 KiB para la consulta. La sesión productiva contiene un avatar de unos 21 KiB en metadatos y supera los límites habituales de cabeceras; la pasarela alojada la rechazaba dentro de `Authorization` antes de ejecutar la función incluso con `verify_jwt=false`. La función no confía en el contenido del sobre como identidad: comprueba firma, caducidad y claims ES256 contra el JWKS del proyecto mediante `getClaims`, y crea un cliente limitado al usuario. El servidor no acepta el estado del navegador como fuente financiera: comprueba `app_rol` y lee `app_leer_bloques` con el JWT del usuario. Tras la llamada al modelo usa `app_leer_versiones` para revalidar únicamente el rol y las versiones de los bloques utilizados; una fila ausente, duplicada, ambigua o modificada rechaza la propuesta. El cálculo y las acciones se ejecutan sobre el snapshot inmutable inicial, sin descargar por segunda vez todos los datos.

En esta versión se admiten administradores para Finanzas y preparación de documentos, y colaboradores para la información de proyectos que devuelve el RPC filtrado. Otros roles se rechazan hasta disponer de un contrato específico probado. No se utiliza `service_role` para consultar documentos ni se autoriza mediante `user_metadata`.

El modelo devuelve intenciones dentro de un esquema cerrado. El servidor vincula las aclaraciones estructuradas con la clase y el nombre elegidos, y resuelve sin bucles los documentos heredados demasiado grandes, incompletos o con impuestos inválidos. El servidor construye las respuestas verificables y el navegador vuelve a contrastar permisos, referencias, versiones y cualquier cambio local pendiente —fechas, proyecto, marca, impuestos, descuento, leyenda, resumen y líneas— antes de abrir un borrador. No hay herramientas de emisión, envío, cobro, borrado ni ejecución de código. Las trazas visibles describen operaciones, no pensamientos internos.

El snapshot autorizado permanece completo dentro de la función para cálculos y validación, pero no se envía íntegro al modelo. El planificador recibe inventario, el proyecto activo y candidatos deterministas relacionados con el texto o las respuestas del usuario. Cada categoría tiene límites y señala si existen coincidencias omitidas; si hay demasiadas no se elige un subconjunto arbitrario. Después del modelo, todos los identificadores propuestos deben pertenecer al conjunto de candidatos presentado y vuelven a comprobarse contra el snapshot completo. Esto permite trabajar con estudios grandes sin enviar miles de registros irrelevantes ni convertir una omisión en una selección silenciosa.

Las respuestas estructuradas de una cadena de aclaraciones se conservan solo mientras esa cadena permanece abierta. Las etiquetas automáticas siguen visibles en la conversación, pero sus números no cuentan como evidencia de cantidad o precio; únicamente sirve el valor de la pregunta correspondiente. Así una referencia de catálogo no puede convertirse por accidente en unidades o importe.

Los importes de resumen se calculan de forma determinista y las pruebas comparan la semántica de cobros con las funciones existentes. Se distingue el cobro desglosado de documentos marcados como cobrados sin detalle. Los totales de un documento los calcula su editor. No se realizan conversiones de divisa ni estimaciones de precios.

## Activación controlada

### Navegador y servidor local

El candidato de HTML publicado conserva `https://auth.moderno.app` para Auth y utiliza exclusivamente el endpoint canónico del mismo proyecto para la Edge Function: `https://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario`. El dominio personalizado rechazaba los POST autenticados en la pasarela antes del runtime. El endpoint canónico sí aceptó el preflight, pero la pasarela alojada devolvió nginx HTML 400 al POST que llevaba el JWT ES256 grande en `Authorization`, también antes del runtime. Por ello el navegador envía ese mismo token dentro del cuerpo JSON acotado; la función lo verifica contra las claves públicas del proyecto y conserva las mismas RLS, proyecto y restricciones de origen. La clave `apikey` sigue en su cabecera pública separada. El Secretario está activado y el feedback desactivado. El navegador no contiene la clave de OpenAI. El servidor local sustituye esa configuración y solo puede activar el Secretario contra `moderno-pruebas`; continúa rechazando producción y claves administrativas.

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

La llamada al proveedor usa `store:false`; esto no es una promesa de retención cero del proveedor. El manejador limita tamaño, duración y ráfagas por instancia, propaga la cancelación a los RPC y al proveedor y corta cada petición a los 25 segundos. Emite una sola traza técnica segura con identificador de petición, etapa, estado, duración, bytes, modelo y cuota restante; nunca registra JWT, usuario, estudio, mensajes, documentos, importes ni errores crudos. Antes de cada llamada, `secretary_request_reserve` toma primero un bloqueo mensual global y después el del usuario/estudio: como máximo 20 consultas diarias por persona/estudio, 200 mensuales por persona/estudio y 200 mensuales entre toda la aplicación. Solo guarda identidad técnica, estudio, fecha y contador; no guarda mensajes ni documentos. La cuota cuenta intentos reservados, no respuestas correctas, tokens ni euros, y complementa los controles de facturación del proyecto OpenAI.

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

El preflight de solo lectura confirmó que producción tiene PostgreSQL 17, RLS en `estudios`, `miembros` y `datos_estudio`, y las firmas `app_rol`, `app_rol_usuario` y `app_leer_bloques`. Antes del despliegue no existía ningún objeto homónimo del Secretario. Para el piloto se aplicó solo `secretario-runtime.sql`; no se aplicaron los prerrequisitos de pruebas, feedback ni cron.

Storage tiene una copia programada verificada el 22/11/2026 con 945 objetos idénticos. El panel productivo `Database → Backups → Scheduled` mostró una copia física del 22/11/2026 a las 00:25:39 UTC y la opción `Restore`, además de las copias diarias anteriores. Con ambas evidencias se aplicó la migración aditiva `secretario_runtime_pilot` (`20261122145441`): esquema y tabla privados, RLS, RPC con `search_path=''`, `anon` sin ejecución, `authenticated` sin acceso directo y contador inicial `0/200`.

La Edge Function productiva `secretario` usa `verify_jwt=false` porque valida cada sesión mediante `Auth.getClaims` contra el JWKS del proyecto y crea después un cliente RLS limitado a esa sesión. Los secretos se cargaron inicialmente con `SECRETARY_ENABLED=false`, modelo fijado, origen exacto y allowlist del propietario. Una invocación sin credenciales devolvió `503 disabled`, confirmando que la función corta antes de autenticar, leer datos o llamar a OpenAI. El canary del propietario se activó después de comprobar la cuota y respondió correctamente desde la app. Feedback y cron no se instalaron y el flag productivo de valoraciones continúa desactivado.

## Comprobaciones

Las pruebas unitarias cubren el servidor local, validación de peticiones/respuestas, referencias, permisos, cuota previa al proveedor, propuestas, cálculos y revocación del consentimiento. Las pruebas SQL usan PostgreSQL desechable con datos inventados y `rollback`; incluyen contrato, RLS, alta aislada, escritura versionada, cuota diaria/mensual, feedback y retirada. El flujo de navegador intercepta la IA y bloquea conexiones externas. Los workflows de PR no despliegan ni usan credenciales de producción.

La regresión de escala reproduce con datos ficticios 70 proyectos, 48 tareas, 31 archivos, 138 contactos, 1.122 partidas de catálogo, 10 presupuestos, un borrador, 7 facturas y 412 movimientos. Comprueba que el contexto del planificador permanece en el objetivo de 80 KB, conserva coincidencias exactas aunque estén al final, no divide grupos ambiguos, rechaza identificadores omitidos y calcula el resumen sobre el snapshot completo. Otra prueba fuerza el recorte: elimina categorías completas, declara `budgetOmitted` y nunca convierte una omisión en una elección silenciosa.

La entrega inicial con guardas productivas pasó [CI general y PostgreSQL 17](https://github.com/estudiomoderno/moderno.app/actions/runs/45034657248), [navegador aislado](https://github.com/estudiomoderno/moderno.app/actions/runs/45034657227) y [visual de proyectos](https://github.com/estudiomoderno/moderno.app/actions/runs/45034657223). El hotfix de contexto acotado añadió recorridos de escala, recorte, ambigüedad y los seis intents; quedó fusionado en el PR `#222` tras superar [CI general](https://github.com/estudiomoderno/moderno.app/actions/runs/45053268122), [Secretario aislado](https://github.com/estudiomoderno/moderno.app/actions/runs/45053268211) y [regresión visual](https://github.com/estudiomoderno/moderno.app/actions/runs/45053268272). La publicación web del commit fusionado también terminó correctamente en la ejecución `45053474803`.

La revisión `v3.67.69` amplía las regresiones con revalidación ligera y fallo cerrado, cancelación y timeout, vinculación de contexto, errores de red y reintento, protección de ediciones que solo cambian fechas/impuestos/proyecto y respuesta determinista de estado de proyecto. Su publicación exige repetir los workflows y comprobar por separado la versión de la Edge Function, porque el workflow web no despliega `supabase/functions/secretario`.

La revisión `v3.67.69` pasó localmente 128 pruebas focalizadas y el recorrido Playwright completo con datos ficticios a 1440 px y 390 px. El navegador comprobó la conversación central/lateral, aclaraciones, borradores, protección de cambios, fuentes, retirada de feedback, fallos de red con reintento y descarte de respuestas tardías al cambiar de proyecto o identidad. GitHub Actions volverá a ejecutar el mismo conjunto en un entorno independiente antes de publicar.

## Reversión

Desactivar `SECRETARY_ENABLED` corta el backend; revertir la configuración del navegador devuelve la entrada a las pantallas existentes. `SQL/secretario-runtime.rollback.sql` revoca nuevas reservas sin borrar contadores. La conversación solo vive en memoria. Ninguna propuesta del asistente modifica un documento hasta que el usuario trabaja en el editor y confirma sus acciones habituales.

Para retirar el circuito de valoración, `SQL/secretario-feedback.rollback.sql` bloquea nuevos envíos y activaciones, conserva la consulta y permite retirar los datos propios. La cuota puede bloquearse revocando `secretary_request_reserve`; la tarea se retira con `cron.unschedule` antes de eliminar objetos privados. Ninguna reversión elimina facturas, presupuestos, contactos, archivos ni registros financieros. Una fusión a `main` publica los recursos de la aplicación mediante el workflow existente; la función y la app se verifican por separado antes de ampliar el piloto.

## Referencias técnicas

- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions): privilegios, `security invoker`, `search_path` y acceso a RPC.
- [OpenAI — Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create): respuesta estructurada y configuración de almacenamiento.
- [OpenAI — Your data](https://developers.openai.com/api/docs/guides/your-data): tratamiento y controles de datos de la API.
