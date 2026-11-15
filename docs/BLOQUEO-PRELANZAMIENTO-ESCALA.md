# Bloqueo obligatorio antes del lanzamiento público

Decisión del propietario, 15/11/2026: Moderno.app continúa en fase de preparación y uso interno. Antes de presentarla o comercializarla de forma general se debe recordar y revisar este documento. No iniciar un lanzamiento público basándose únicamente en que la interfaz esté terminada.

## Bloqueos técnicos

- Sacar las fotos de perfil de `auth.user_metadata` y de los JWT. Guardarlas como archivos y conservar en la sesión solo una referencia corta.
- Preparar y ensayar una migración reversible de los perfiles existentes que contienen imágenes Base64. Renovar las sesiones afectadas y comprobar límites reales de cabeceras en Auth, REST, Edge Functions y Storage.
- Añadir pruebas completas de los recorridos críticos, no solo pruebas por componente. Como mínimo, el importador debe verificar URL, extracción, variante, precio, impuestos, descarga, Storage, URL firmada, portada y producto persistido.
- Probar concurrencia, volumen, tiempos de respuesta y fallos parciales con una carga representativa del objetivo de hasta 1.000 usuarios de pago. No utilizar datos ni identidades reales para estas pruebas.
- Activar observabilidad y alertas con errores identificables para Auth, guardado, Storage, funciones, correo, pagos y copias. Los mensajes genéricos no pueden ser la única evidencia disponible.
- Ensayar recuperación de base de datos y archivos, reversión de despliegue e incidentes de sesión, sin asumir que una copia existente garantiza una restauración correcta.
- Revisar el uso de `service_role`, RLS, URLs firmadas, permisos por estudio y aislamiento entre clientes. Las credenciales administrativas permanecen exclusivamente en servidor.

## Infraestructura

Antes del lanzamiento se evaluará si Supabase, DonDominio y la arquitectura vigente ofrecen capacidad, soporte, límites y observabilidad adecuados. Se compararán alternativas y una posible migración de servidores con costes, riesgos, plan de transición, pruebas y reversión. Esta nota no decide migrar ahora ni autoriza un cambio de proveedor.

## Puerta de salida

El lanzamiento público queda bloqueado hasta que el propietario reciba un informe breve con resultados verificables de los puntos anteriores, riesgos pendientes y recomendación de infraestructura. El Taller debe recordar expresamente este bloqueo cuando se solicite «publicar», «lanzar», «abrir al público», «comercializar» o una acción equivalente.
