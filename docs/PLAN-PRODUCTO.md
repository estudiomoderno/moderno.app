# Taller Moderno.App: producto y dominios

Fecha: 2026-09-09. Revisión inicial, no auditoría completa.

## Decisiones del usuario

- Esta tarea principal se llama Taller Moderno.App.
- app.moderno.app aloja el CRM para los equipos.
- www.moderno.app será el escaparate comercial y el punto de entrada para contratar suscripciones.
- Existe un equipo piloto con datos reales. Cada entrega debe conservar sus registros, archivos y acceso compatible.

## Alcance de esta revisión

Lectura del código del cliente y navegación de consulta en Inicio y Proyectos. No se editaron registros ni se probaron pagos, escrituras simultáneas o recuperación integral en producción. La interfaz de suscripción revisada contiene elementos de demostración; no acredita un sistema comercial de cobro operativo.

## Orden propuesto de trabajo

1. Protección: ensayar recuperación conjunta de base de datos y archivos en aislamiento, comprobar permisos entre estudios y validar con dos sesiones de prueba que las ediciones simultáneas se conservan. Las copias diarias permiten recuperar puntos anteriores, pero no garantizan pérdida cero entre copias. Completar supervisión de copias ausentes.
2. Uso diario: acercar tareas, avisos y próximos vencimientos a la parte superior del inicio. Reducir el espacio del saludo, reloj y tarjetas. Mantener la identidad visual actual.
3. Proyectos: mostrar mejor estado, responsable y siguiente fecha; facilitar filtros y nombres largos. Ya existen vistas de lista y cronograma. Unificar los nombres del menú en español y revisar legibilidad y móvil con pruebas específicas.
4. Guardado comprensible: revisar los indicadores existentes para que el usuario distinga cambios pendientes, confirmados, desconexión y errores. Validar también la confirmación de subida de archivos.
5. Suscripciones y escaparate: construir el recorrido comercial una vez comprobadas las bases de protección y acceso.

## Diseño propuesto de suscripciones

La web pública explicará el producto, mostrará ejemplos sin datos de clientes y ofrecerá planes, alta y contratación. El CRM conservará el trabajo diario y la gestión de cuenta y plan.

La suscripción debe asociarse al estudio existente, conservando identificadores, miembros y archivos. Proponer un estado de piloto explícito para el equipo actual antes de activar restricciones comerciales. Separar la suscripción al SaaS de las facturas que cada estudio emite a sus clientes.

El servidor debe verificar los eventos del proveedor de pagos y actualizar el acceso; una pantalla de pago completado o un valor del navegador no bastan. Referencia: [ciclo de suscripciones de Stripe](https://docs.stripe.com/billing/subscriptions/overview).

Propuesta pendiente de decisión comercial: periodo de gracia y acceso de consulta/exportación ante impago, sin eliminación automática de datos al cancelar. Aún deben definirse precios, límites, duración de prueba y condiciones del piloto.

## Condiciones para futuras entregas

No migrar ni borrar información real para habilitar planes. Probar cambios de guardado, permisos y facturación con datos aislados, contemplando sesiones con versiones anteriores. Consultar DECISIONES.md y BACKUP-SETUP.md antes de publicar cambios que afecten a datos. Esta revisión solo añade documentación; no activa cobros ni modifica el CRM.
