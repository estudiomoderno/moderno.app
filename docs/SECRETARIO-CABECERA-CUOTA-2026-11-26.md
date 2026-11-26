# Secretario de Finanzas: cabecera, aviso de cuota y ampliación diaria

## Encargo y alcance

El propietario pide renombrar la cabecera de Finanzas a «Secretario de Finanzas», retirar el subtítulo redundante «Finanzas» y ampliar el personaje lavanda para apreciar su animación. Durante el diagnóstico solicita 100 consultas diarias por usuario. La versión web candidata es `v3.67.72`.

En proyectos se conservan «Nuestro Secretario» y el nombre del proyecto. El personaje de cabecera pasa de 36 a 80 px en escritorio y 72 px en móvil. La bienvenida, los avatares del historial y el acceso plegado mantienen sus tamaños y su comportamiento de animación.

## Causa del bloqueo

La comprobación de solo lectura del 26/11 confirmó que el contador del día había alcanzado las 20 reservas del piloto, mientras el uso mensual agregado era de 30 sobre 200. El SQL productivo coincidía con el contrato versionado. No se hizo una reserva de diagnóstico ni se consultaron mensajes o documentos privados.

Los tres límites devolvían `PT429`; el backend descartaba el motivo y la interfaz volvía a sustituirlo por un texto genérico. La corrección conserva `quota_exhausted` y HTTP 429 y añade únicamente `quotaScope` validado: `daily`, `monthly` o `global_monthly`. Un mensaje SQL desconocido sigue siendo genérico. Nunca se envía el error SQL crudo ni consumo de otras personas.

La respuesta permanece en el chat central y explica la renovación diaria o mensual a las 00:00 UTC. «Abrir Facturas» usa la navegación existente tras una acción explícita del usuario, sin llamar al modelo. La referencia técnica aparece aparte de la burbuja. No hay reintento automático ni promesa de disponibilidad si otro límite también está agotado.

## Cuota de 100 autorizada

- Máximo de 100 reservas diarias por persona, agregado entre sus estudios.
- Día natural UTC; no cambia el criterio temporal del piloto.
- Se cuentan las reservas existentes. La actualización no reinicia ni borra uso.
- Se mantienen 200 reservas mensuales por persona/estudio y 200 mensuales globales.
- Se conserva la allowlist del piloto, el modelo fijado y el presupuesto máximo de 20 EUR/mes.
- La cuota mide solicitudes reservadas antes del modelo; un fallo posterior puede consumir una. Las rutas deterministas que no llaman al modelo no reservan esta cuota.

La actualización modifica únicamente el límite admitido por el contador y el cálculo diario del RPC. Conserva firma, propietario, privilegios, RLS, autenticación y bloqueos. La precondición comprueba los cuerpos conocidos del RPC y el constraint instalado antes de sustituirlos. SQL y Edge Functions no se despliegan mediante el workflow web.

**El tope mensual global del piloto sigue limitando la disponibilidad:** 100 diarias no equivale a 3.000 mensuales garantizadas por persona. Abrir ese uso sostenido requiere otra decisión de presupuesto y capacidad.

## Estimación orientativa de consumo

Fuente revisada el 26/11: [tarifas Standard de OpenAI](https://developers.openai.com/api/docs/pricing.md), `gpt-5.4-mini`: 0,75 USD por millón de tokens de entrada sin caché y 4,50 USD por millón de salida. El snapshot usado por el código sigue siendo `gpt-5.4-mini-2026-03-17`.

Supuesto: 100 llamadas al día durante 30 días, todas con entrada sin caché. Son ejemplos, no mediciones ni un máximo garantizado:

| Tokens por llamada, entrada + salida | Consumo del modelo por 3.000 llamadas |
| --- | ---: |
| 2.000 + 500 | 11,25 USD |
| 10.000 + 1.000 | 36,00 USD |
| 25.000 + 2.600 | 91,35 USD |

La entrada incluye instrucciones, contexto e historial; la salida incluye razonamiento facturable cuando corresponda. Los importes no incluyen impuestos, cambio de divisa ni infraestructura. No se ha consultado saldo, creado claves, cambiado modelo o realizado llamadas facturables para estas estimaciones.

## Verificación y publicación

La entrega exige pruebas de frontend y backend con respuestas ficticias, recorridos de navegador a 1440 y 390 px, y prueba SQL aislada de las reservas 100/101, suma entre estudios, conservación de uso, límites mensuales y reversión. Los resultados efectivos y el despliegue se registran en el PR; preparar estos archivos no acredita su ejecución.

Antes de aplicar SQL productivo se verifican por separado las copias de BD y Storage. La copia de Storage del 26/11 está comprobada: [ejecución 45823776276](https://github.com/estudiomoderno/moderno.app/actions/runs/45823776276), 945 objetos idénticos, sin faltantes ni diferencias, finalizada a las 13:08:37 UTC. La comprobación actual de la copia de base de datos requiere acceso al panel de Supabase; no se presenta la copia histórica del 22/11 como prueba actual.

## Reversión

La interfaz se revierte mediante el proceso normal de GitHub. El backend puede volver a los cinco archivos de la Edge Function anteriores, comprobados iguales al commit base `aadd419be958c71014eaf41a7fde1a680d64be54`; conservar `verify_jwt=false` y la verificación de sesión dentro de la función.

La contención SQL vuelve a 20 reservas diarias por persona sin reducir el CHECK físico de 100: así no invalida ni borra contadores históricos superiores a 20. Quien ya haya reservado 20 o más queda bloqueado hasta renovar el día. El corte completo existente revoca nuevas reservas y conserva todos los contadores. Ninguna de estas opciones modifica documentos financieros.
