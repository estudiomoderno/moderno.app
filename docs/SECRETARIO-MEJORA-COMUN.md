# Secretario: mejora común con participación opcional

## Alcance

`app/secretary-feedback.js` prepara valoraciones categóricas para identificar recorridos que necesitan mejoras, por ejemplo la creación de una factura desde un presupuesto. Las conversaciones, los documentos y la memoria de cada estudio permanecen fuera de este circuito.

El módulo no llama a OpenAI, no entrena modelos y no incorpora información de otros estudios a las respuestas del Secretario. Los informes se destinan a personas que revisan posibles mejoras. Cualquier cambio posterior en instrucciones, preguntas o interfaz necesita revisión, pruebas y una publicación versionada.

La participación está desactivada por defecto. El permiso corresponde a la pareja **usuario autenticado + estudio autorizado**. No se guarda en `state.account` ni en la configuración compartida del estudio. Tener permiso para trabajar en un estudio no equivale a aceptar esta participación.

## Contrato de eventos

Un evento válido contiene únicamente:

```json
{
  "version": 1,
  "event": "secretary_feedback",
  "task": "invoice_from_quote",
  "outcome": "unhelpful",
  "reason": "too_many_questions"
}
```

| Campo | Valores admitidos |
| --- | --- |
| `version` | El número `1`. |
| `event` | `secretary_feedback`. |
| `task` | `invoice_from_quote`, `invoice_create`, `quote_create`, `finance_question`, `project_question`, `navigation`. |
| `outcome` | `helpful`, `unhelpful`. |
| `reason` si `outcome=helpful` | Opcional: `clear_answer`, `saved_time`. |
| `reason` si `outcome=unhelpful` | Opcional: `too_many_questions`, `unclear_answer`, `wrong_navigation`, `missing_information`, `could_not_finish`, `other`. |

`other` es una categoría cerrada, sin campo posterior de texto libre. El módulo rechaza claves desconocidas y valores no enumerados. Tampoco acepta propiedades ocultas, símbolos, accesores o prototipos personalizados. El validador no devuelve mensajes que reproduzcan el contenido rechazado.

Los eventos no admiten prompts, respuestas, resúmenes de conversaciones, nombres, correos, importes, precios, archivos, referencias de documentos, clientes o proyectos, URLs ni rutas arbitrarias. No se deducen estas categorías analizando conversaciones para enviarlas: la interfaz las elige a partir del recorrido que acaba de usar el usuario y de su valoración explícita.

La identidad necesaria para autenticar la solicitud se gestiona por separado. Por tanto, **no se presenta esta recogida como anónima**. Un transporte autenticado identifica al usuario aunque el cuerpo del evento solo contenga categorías.

## API del módulo

El archivo sigue el formato UMD del repositorio: `window.ModernoSecretaryFeedback` en el navegador y `require('../app/secretary-feedback.js')` en Node. No depende del DOM, no instala dependencias y no incluye `fetch`, almacenamiento, temporizadores, registro en consola ni SDK de analítica.

| Método | Comportamiento |
| --- | --- |
| `buildEvent({task,outcome,reason?})` | Valida una selección y devuelve el evento cerrado e inmutable. |
| `validateEvent(event)` | Valida el contrato completo y devuelve una copia cerrada. Es una función pura reutilizable en JavaScript de servidor. |
| `createClient({send})` | Crea el controlador opcional. Sin transporte, queda indisponible y no permite activar la participación. |
| `client.setContext({userId,studyId})` | Establece la identidad actual y devuelve un token de contexto. Un cambio de usuario o estudio retira el permiso local y cancela solicitudes pendientes. Una identidad inválida elimina el contexto. |
| `client.setConsent(enabled,token)` | Aplica un estado local ya comprobado con el servidor. Devuelve `false` si el token es antiguo. Retirar el permiso cancela solicitudes e invalida también las lecturas o activaciones anteriores del mismo contexto. |
| `client.getState()` | Devuelve `available`, `hasContext`, `consent` y `pending`, sin identidades. |
| `client.submit({task,outcome,reason?})` | Devuelve un resultado seguro: `sent`, `consent_required`, `unavailable`, `cancelled`, `invalid` o `failed`. |
| `client.dispose()` | Retira el permiso, elimina el contexto y cancela solicitudes. El controlador deja de usarse. |
| `aggregateForReview(records,options?)` | Prepara categorías y recuentos para revisión humana; uso exclusivo del servidor o del proceso interno de revisión. |

El adaptador `send` recibe `(event, {signal, context:{userId,studyId}})` y solo comunica éxito devolviendo `{accepted:true}` tras una confirmación real del servidor. El contexto permite comprobar que la sesión sigue siendo la correcta antes de construir la solicitud. No debe copiarse dentro de `event`. El servidor obtiene el usuario del JWT y comprueba el estudio; no confía en `userId` enviado por el navegador.

El controlador no conserva preferencias entre instancias o inicios de sesión. Al abrir una sesión consulta la preferencia real mediante la integración. No hay cola offline, reintentos automáticos ni envío retroactivo de valoraciones anteriores al consentimiento.

## Persistencia y revocación

Contrato de integración acordado con las RPC autenticadas de Supabase:

| RPC | Entrada | Resultado esperado |
| --- | --- | --- |
| `secretary_feedback_consent_get` | `p_estudio` | `{enabled,version:1,revision}`. |
| `secretary_feedback_consent_set` | `p_estudio,p_enabled,p_expected_revision` | Preferencia confirmada `{enabled,version:1,revision}`. |
| `secretary_feedback_submit` | `p_estudio,p_event` | `{accepted:true}` solo si el evento se ha aceptado. |

La implementación de estas RPC y sus controles se realiza por separado. Añadir el archivo cliente no activa por sí solo el servicio.

Secuencia de integración:

1. Al cambiar sesión o estudio, llamar inmediatamente a `setContext`. Obtener su token antes de cargar el consentimiento del servidor. Solo aplicar la respuesta con ese token.
2. Al activar la participación, obtener el token vigente con `setContext` para la identidad actual; guardar `true` en el servidor con la `revision` leída y aplicar `setConsent(true,token)` únicamente si el servidor lo confirma. Actualizar la revisión desde la respuesta. La preferencia de otro estudio o una respuesta tardía nunca deben activar este contexto.
3. Al retirarla, aplicar `setConsent(false,token)` **inmediatamente**, antes de esperar la red. Guardar `false` en el servidor. El contrato servidor debe retirar el permiso y borrar los eventos identificables de ese usuario en ese estudio dentro de la misma transacción, incrementando su revisión.
4. Antes de una nueva lectura o activación, volver a obtener el token con `setContext` para la identidad actual. Retirar el permiso invalida el token anterior incluso cuando el estudio sigue siendo el mismo.
5. Si la retirada no pudo persistirse, mantener el bloqueo local y explicar que queda pendiente confirmar la retirada en el servidor. No mostrarla como completada ni restablecer automáticamente el permiso.

El servidor aplica control de revisión: `SET true` solo se acepta si `p_expected_revision` coincide con la revisión actual; `SET false` siempre retira el permiso e incrementa la revisión, aunque la revisión esperada sea antigua. Así, una activación anterior que llegue después de la retirada no puede reactivar la preferencia. No se reintentan activaciones automáticamente ante un conflicto. Cancelar una petición HTTP no demuestra que el servidor no la haya recibido. La retirada local sigue siendo inmediata mientras se confirma la operación persistente.

El servidor debe validar categorías y claves de nuevo, resolver `auth.uid()`, comprobar la pertenencia y los permisos del estudio, y revalidar el consentimiento de manera atómica con la aceptación del evento. Una solicitud aceptada antes de retirar el permiso puede haber llegado; la retirada persistente elimina esos eventos propios. No se debe afirmar que la cancelación del navegador deshace una escritura ya completada.

La [propuesta SQL](../SQL/secretario-feedback.sql) conserva como máximo una valoración por usuario, estudio, tarea y mes natural UTC; una nueva valoración de ese recorrido actualiza la anterior. Los informes usan meses completos como unidad de selección y solo incluyen registros de los últimos 90 días. Antes de activar la recogida debe programarse y comprobarse la purga de registros vencidos, incluso cuando no haya tráfico. El módulo cliente no programa esta operación.

## Revisión común de recorridos

La entrada de `aggregateForReview` es una lista interna de `{event,contributorKey,studyKey}`. Las claves deben derivarse en el servidor de identidades verificadas; no se aceptan desde el evento del cliente. `contributorKey` debe representar al mismo usuario aunque participe en varios estudios. Las claves no aparecen en la salida.

Cada combinación exacta de tarea, valoración y motivo necesita **al menos 5 usuarios distintos y 3 estudios distintos**. Los límites se pueden subir, pero no bajar desde las opciones del módulo. Se suprimen los grupos pequeños y tampoco se publican totales de los grupos suprimidos. Repetir una valoración no aumenta el número de participantes.

Ejemplo de salida:

```json
{
  "version": 1,
  "purpose": "human_review",
  "minimumContributors": 5,
  "minimumStudies": 3,
  "groups": [
    {
      "task": "invoice_from_quote",
      "outcome": "unhelpful",
      "reason": "too_many_questions",
      "contributors": 8,
      "studies": 4
    }
  ]
}
```

El proceso que prepara el informe debe seleccionar solo eventos elegibles y aplicar un periodo de revisión definido. No se ofrecen filtros arbitrarios por usuario o estudio ni informes sucesivos con ventanas pequeñas para deducir las aportaciones individuales. El umbral es una regla de supresión de grupos pequeños y no una garantía matemática de anonimato.

Las personas responsables pueden usar el informe para proponer una pregunta más clara o reducir pasos repetidos, probarlo con datos ficticios y revisar la modificación antes de publicarla. El informe no se añade al contexto de otros clientes ni cambia automáticamente las instrucciones del Secretario. Tras una retirada, los informes aún no publicados deben recalcularse desde los eventos elegibles; los informes agregados ya revisados no permiten atribuir una contribución individual para eliminarla por usuario.

## Interfaz recomendada

Control discreto en las opciones del Secretario:

> **Ayudar a mejorar el Secretario**
>
> Comparte valoraciones y motivos predefinidos. No incluye tus conversaciones ni documentos. Puedes desactivarlo cuando quieras.

Si aún falta el backend o el transporte, el control debe quedar desactivado y mostrar **“Pendiente de activar”**. No simular un guardado local como si el servidor ya conociera la preferencia.

Después de una respuesta, ofrecer “Me ha ayudado” y “Podría mejorar”, con motivos predefinidos cuando corresponda. Solo mostrar confirmación de envío tras `status:sent`. Un fallo de feedback no bloquea el chat, los editores ni el trabajo del usuario.

## Comprobación

`node --test scripts/secretary-feedback.test.mjs` cubre exclusión de datos confidenciales, ausencia de envío sin permiso, aislamiento de identidad, respuestas tardías de consentimiento, revocación antes y durante el envío, cancelación con un adaptador que ignore la señal, errores sin filtración de texto y supresión de categorías pequeñas. Todas las identidades usadas en pruebas son ficticias y los transportes son dobles locales, sin red.

Las comprobaciones de SQL/RLS y del adaptador real pertenecen a la integración en Moderno Prueba. Este módulo no aplica migraciones, no modifica datos reales y no publica cambios.
