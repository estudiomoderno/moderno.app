# Secretario lavanda: expresiones y acceso plegado

## Objetivo y autorización

Javier aporta el paquete de animaciones y elige la variante lavanda. Tras definir la presencia central, lateral y plegada, solicita publicarla el 26/11/2026. Esta entrega incorpora esa presentación al Secretario existente y conserva la configuración del piloto y sus límites.

## Comportamiento

- Bienvenida de Finanzas con el personaje de 160 px en escritorio y 112 px en móvil; al comenzar la conversación, las respuestas ocupan el centro y el personaje queda pequeño.
- Un único personaje animado visible: bienvenida, cabecera o acceso plegado. Los avatares del historial son estáticos.
- El lateral aparece al abrir un documento o editor, conservando el comportamiento existente. Plegar y volver a abrir conserva la conversación y el contexto.
- Acceso de 64 px abajo a la derecha, con nombre accesible y navegación por teclado. Su posición evita el estado de guardado, el dock y el teclado móvil.
- Una respuesta o pregunta recibida mientras el panel está plegado deja un indicador pendiente de leer. El panel permanece plegado y la consulta no se cancela por esa acción.

| Archivo | Estado real | Fin del gesto |
| --- | --- | --- |
| `espera` | Disponible o bienvenida | Expresión tranquila tras un ciclo |
| `pensando` | Preparación de la consulta | Cambia cuando comienza la petición |
| `trabajando` | Petición del Secretario en curso | Cambia al recibir resultado, fallo o cancelación |
| `terminado` | Respuesta o borrador preparado | Un ciclo de cuatro segundos, después reposo |
| `aviso` | Pregunta necesaria o consulta fallida | Un ciclo de cinco segundos, después expresión estática |

El gesto no sustituye al mensaje: un borrador preparado no acredita guardado, envío ni emisión. La interfaz no simula pasos del servidor. La reducción de movimiento del dispositivo y las pestañas ocultas utilizan las imágenes PNG. El lavanda mantiene su color en tema oscuro.

## Recursos y alcance

Se copian sin editar los cinco WebP y los cinco PNG de 512 px de la variante lavanda del ZIP entregado por el propietario. Son recursos propios del Secretario, bajo `app/brand/secretario/lavanda/`. Se conserva la silueta original. No se incorporan bibliotecas, fuentes externas ni llamadas adicionales a la IA.

Los cambios afectan a la presentación del Secretario, su estado visual, sus pruebas y la verificación de recursos publicados. No requieren migración, despliegue de funciones, permisos nuevos, escrituras de prueba ni cambios en documentos. Los editores, las consultas y los cálculos siguen sus contratos existentes.

## Validación y publicación

El candidato debe superar las pruebas Node y el recorrido de navegador del Secretario con registros ficticios, SDK simulado y red externa bloqueada. Se revisan escritorio y móvil, apertura y plegado, resultados y errores, documentos y borradores, reducción de movimiento, tema oscuro, superposición con guardado y aislamiento de sesión.

Validación local: 927 pruebas Node aprobadas y comprobación de formato correcta. El ejecutable de Chromium local no está disponible; el recorrido de navegador se ejecuta en el workflow aislado del PR, que instala su navegador y conserva las capturas sintéticas para revisión antes de integrar.

El workflow habitual publica los recursos antes de `index.html` y verifica sus hashes públicos. Los diez nuevos recursos están incluidos en esa comprobación. La versión candidata es `v3.67.71`; se actualizan las referencias de caché del CSS y JavaScript modificados. La confirmación de publicación requiere el éxito del despliegue del commit fusionado.

## Reversión

Revertir el commit de esta entrega y publicarlo con el flujo habitual. No se restauran datos ni se alteran esquemas, permisos o credenciales. Las sesiones abiertas conservan el aviso de actualización y las guardas existentes para borradores pendientes.
