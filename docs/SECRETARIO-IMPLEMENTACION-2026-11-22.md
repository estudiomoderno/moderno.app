# Secretario de Moderno.app — implementación en pruebas

## Objetivo y estado

Finanzas necesita una entrada comprensible para profesionales del diseño. El Secretario abre una conversación central, ayuda a encontrar información y prepara documentos editables. La conversación se traslada al lateral al navegar y puede plegarse; las secciones existentes siguen disponibles.

Esta entrega es código de prueba en una rama aislada. No implica activación en la aplicación publicada, despliegue de SQL/Edge Functions ni conexión efectiva a OpenAI. La instrucción actual del propietario permite desarrollar el asistente y preparar una credencial de pruebas; sustituye las pausas históricas sobre IA, conservando la prohibición de tocar datos reales.

## Componentes

| Componente | Responsabilidad |
| --- | --- |
| `app/secretario-ui.js` | Una conversación en memoria por sesión, navegación, preguntas, propuestas, fuentes, plegado, consentimiento y valoraciones. |
| `app/secretario-bridge.js` | Valida propuestas frente al estado, versiones y permisos antes de abrir el editor existente. |
| `app/brand/secretario.css` | Presentación central y lateral adaptada a escritorio y móvil con el logotipo existente. |
| `supabase/functions/secretario/` | Autentica con `getUser`, lee datos mediante el JWT del usuario, solicita un plan estructurado y verifica acciones/fuentes. |
| `app/secretary-feedback.js` | Contrato cerrado, consentimiento, cancelación y agregación de revisión sin textos privados. |
| `SQL/secretario-feedback.sql` | Consentimiento y valoraciones independientes de los documentos. RPC con identidad y pertenencia verificadas; tablas internas sin acceso directo. |

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

La llamada al proveedor usa `store:false`; esto no es una promesa de retención cero del proveedor. Se necesita completar la política de datos aplicable y comprobar la configuración contratada antes de activar para usuarios. El manejador limita tamaño, duración y ráfagas por instancia. **Ese límite no es un tope de gasto distribuido**: cuota real por estudio y límites de coste quedan como requisito de activación.

### Mejora compartida

El permiso está desactivado por defecto, es individual por estudio y nunca se guarda en la configuración compartida. Un evento contiene solo versión, recorrido, resultado y motivo predefinido. El servidor obtiene la identidad desde Auth; no acepta un identificador de usuario aportado por el evento.

La activación utiliza revisión esperada para impedir que una solicitud atrasada reactive un permiso retirado. Retirar funciona incluso tras abandonar el estudio para eliminar aportaciones propias. Los eventos se actualizan como máximo en una fila por usuario/estudio/mes/recorrido. El informe interno muestra una categoría solo cuando reúne al menos cinco personas distintas de tres estudios. Esto reduce exposición y **no se presenta como anonimización garantizada**.

Los informes no se exponen al asistente ni a otros usuarios. Antes de activar, programar y verificar una tarea interna que ejecute `moderno_secretary.purge_expired()` periódicamente para borrar eventos de más de 90 días. El informe excluye desde ya los vencidos. La programación no está creada en esta entrega.

## Bloqueos observados en Moderno Prueba

Consulta de metadatos del 22/11/2026, sin leer ni modificar registros de producción:

- El proyecto de pruebas es `moderno-pruebas`, referencia `chsilowzrtumbcofspwv`.
- Sus tablas `public.estudios` y `public.miembros` estaban vacías y con RLS desactivado.
- Existen `app_rol` y las funciones de correo, pero faltan `app_leer_bloques` y `app_guardar_lote`, necesarios para una copia funcional del contrato actual de la app.
- No se ha confirmado una credencial de OpenAI instalada. La selección segura de organización/proyecto se inició en ChatGPT; no se presupone completada ni se crean claves duplicadas.

Se necesita preparar el contrato de datos y políticas del entorno con datos ficticios, comprobar los permisos de cada rol y completar la credencial antes de una prueba conectada. El SQL de feedback rechaza su instalación si las tablas de identidad siguen sin RLS. No se habilita RLS sin estudiar las políticas ni se copia información real de producción para salir del bloqueo.

## Comprobaciones

Las pruebas unitarias cubren el servidor local, validación de peticiones/respuestas, referencias, permisos, propuestas, cálculos y revocación del consentimiento. Las pruebas SQL usan PostgreSQL desechable con datos inventados y `rollback`; el flujo de navegador intercepta la IA y bloquea conexiones externas. Los workflows de PR no despliegan ni usan credenciales de producción.

La primera ejecución de [CI aislada](https://github.com/estudiomoderno/moderno.app/actions/runs/45008793105) pasó las pruebas de JavaScript, las verificaciones SQL existentes y las 34 comprobaciones iniciales de feedback en PostgreSQL 17. Se añaden después cinco comprobaciones de reversión para verificar también el camino de retirada tras desactivar la función. El resultado del candidato final se anotará al verificarlo.

Chromium no pudo arrancar en el contenedor de trabajo por la restricción de sockets del entorno. Por eso se ha añadido una comprobación aislada en GitHub Actions; su resultado y los recuentos finales se anotarán al verificar el candidato. No se ha eludido la restricción ni presentado una captura no comprobada como resultado.

## Reversión

Desactivar los flags del navegador y `SECRETARY_ENABLED` devuelve la entrada a las pantallas existentes. La conversación solo vive en memoria. Ninguna propuesta del asistente modifica un documento hasta que el usuario trabaja en el editor y confirma sus acciones habituales.

Para retirar el circuito de valoración, `SQL/secretario-feedback.rollback.sql` bloquea nuevos envíos y activaciones, conserva la consulta y permite retirar los datos propios. No elimina facturas, presupuestos, contactos, archivos ni registros financieros. Una fusión a `main` publicaría recursos de la aplicación por el workflow existente: **esta entrega debe permanecer en PR de borrador hasta resolver la activación y verificarla**.

## Referencias técnicas

- [Supabase — Database functions](https://supabase.com/docs/guides/database/functions): privilegios, `security invoker`, `search_path` y acceso a RPC.
- [OpenAI — Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create): respuesta estructurada y configuración de almacenamiento.
- [OpenAI — Your data](https://developers.openai.com/api/docs/guides/your-data): tratamiento y controles de datos de la API.
