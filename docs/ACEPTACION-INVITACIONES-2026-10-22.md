# Aceptación dirigida de invitaciones — v3.65.106

## Problema y resultado

El correo anterior enlazaba al inicio genérico. El invitado debía escribir el correo, podía utilizar otra cuenta y el acceso normal llamaba a `unirse_al_estudio`, que crea «Mi estudio» cuando no encuentra una membresía/invitación para esa identidad. La cuenta reportada se ha comprobado de forma privada: está confirmada, pertenece a «Mi estudio» y tiene proyectos guardados; no hay una invitación pendiente para ese correo. No se ha movido la cuenta ni modificado su estudio.

Los nuevos correos y mensajes copiados incorporan estudio y correo. La pantalla conserva el diseño actual, oculta la entrada de email/nombre y solicita contraseña dos veces. Muestra la cuenta destinataria como información de solo lectura. Incluye Google, con selección de cuenta y login hint, y «Ya tengo cuenta» para cuentas existentes. La confirmación de email de Supabase sigue siendo necesaria; las contraseñas nunca van al enlace, al estudio o al servidor de correo propio.

El enlace **no es una credencial ni concede acceso**. Sus parámetros solo seleccionan la pantalla. Antes de cargar el estudio se verifica la identidad con `auth.getUser`, coincide el email y se llama exclusivamente a `app_aceptar_invitacion(p_estudio)`. Esta función exige email confirmado y una invitación vigente para esa identidad y ese estudio; conserva el perfil mediante el trigger existente y consume la invitación en la misma transacción. Usa el bloqueo de estudio compartido con cancelación y un bloqueo de identidad para serializar aceptaciones. Nunca llama al alta de estudios ni inserta estudios.

Un enlace cancelado, un email distinto o una cuenta ya vinculada a otro estudio falla explícitamente, permite cambiar de sesión y no provoca un alta alternativa. Una aceptación repetida es idempotente. La app actual admite una membresía por usuario; no se cambia esa arquitectura ni se traslada una cuenta a otro estudio automáticamente. Las invitaciones anteriores con enlace genérico requieren reenviarse para usar esta pantalla.

## Archivos

- `app/team-invitation.js`: lectura/contexto de invitación, URL de retorno, formulario y validación de contraseñas. Contexto de navegación en sessionStorage, sin guardar contraseñas ni autorización en metadatos de usuario.
- `app/index.html`, `app/studio-login.js`, `app/studio-login.css`: formulario invitado, flujo dirigido al cargar, retorno de Google/confirmación y salida de una sesión equivocada. El acceso normal permanece en su ruta actual. Google general no tenía un fallo confirmado: el propietario corrigió esa parte del reporte.
- `mailer/autorizar-invitacion.php`, `mailer/enviar-invitacion.php`: enlace dirigido desde estudio/email previamente autorizados por JWT y RLS; motor v1.7, sin nuevas credenciales administrativas.
- `SQL/aceptar-invitacion-estudio.sql` y rollback: función nueva, `SECURITY DEFINER SET search_path=''`, solo `authenticated`; verifica identidad en `auth.users`, nunca confía en roles/email suministrados por URL o user_metadata. No modifica funciones existentes, políticas, restricciones o filas durante su instalación.
- Pruebas nuevas de invitación en Node, generador SQL y navegador; ampliación PHP/CI y publicación a 50 recursos.

## Verificación aislada

- 651 pruebas Node correctas, incluidas URL con +, contextos malformados, callback, email distinto, estudio incorrecto, aceptación rechazada y ausencia de fallback al alta normal.
- 14 comprobaciones PostgreSQL 17: permisos anon/authenticated, UID nulo, email sin confirmar/distinto, estudio incorrecto, aceptación válida/idempotente, perfil conservado, consumo, cancelación, cuenta de otro estudio y conteo estable de estudios/membresías.
- Chromium a 1440/390 px conectado únicamente al PostgreSQL efímero `moderno-invitation-fixture`: formulario, contraseñas distintas sin alta Auth, correo fijo, confirmación simulada, Google hint, lectura de proyecto/lista ficticia después de aceptación real local; email distinto y cancelación sin acceso/alta de estudio. Ninguna escritura de red permitida. Capturas revisadas.
- Regresión del acceso normal/idiomas en seis resoluciones. PHP (sintaxis y 27 comprobaciones, sin correo) y todos los SQL se verifican en CI; PHP no está instalado localmente.
- No se han enviado invitaciones reales, creado cuentas reales ni ensayado OAuth/confirmación de correo real. Las pruebas Auth usan cliente ficticio; el control de aceptación sí se ejecuta en PostgreSQL real aislado. No se presenta como prueba de recepción en buzón real.

## Producción, respaldo y reversión

Lectura de catálogo, RLS/ACL y logs agregados; no se extraen cuentas/contraseñas de usuarios. El supervisor de Storage terminó correctamente el 22-10-2026 15:39 UTC y confirma la ejecución de copia de 07:44 UTC. La última evidencia directa de copia física de BD aportada en esta sesión corresponde al 21-10-2026; no se afirma una restauración ni copia física nueva hoy. La activación añade exclusivamente una función reversible; no transforma ni borra datos.

Orden: CI, función dirigida, comprobación de ACL/migración, frontend y mailer, hashes públicos. Reversión: primero frontend/mailer anteriores y después `SQL/aceptar-invitacion-estudio-rollback.sql`. Las membresías aceptadas y documentos se conservan. Un usuario ya en otro estudio requiere revisar su identidad y acceso por separado; no se reasigna de forma automática.

Revisión: https://github.com/estudiomoderno/moderno.app/compare/e4f44cb907aa174aa9c202e9853c9a5513758b8f...fix/aceptacion-invitaciones
