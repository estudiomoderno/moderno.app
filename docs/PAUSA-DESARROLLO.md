# Desarrollo reanudado — 13 septiembre 2026

El usuario levanta todas las pausas mediante Cerebro. Se retoman únicamente los pendientes ya autorizados. Se mantienen los requisitos específicos de publicación, fiscalidad y pruebas; no hacer cargos reales de ensayo. El diseño Tareas está en rama separada y no tiene autorización de publicación. Nueva marca pendiente Bold/SemiBold.

El inventario siguiente describe el momento de la pausa, no una comprobación nueva de los servicios. No se borró ni revirtió trabajo.

- Repositorio: moderno-suscripciones-test. Rama taller-suscripciones-test-20260912.
- Último commit: faf1428, previamente subido a GitHub. Árbol limpio al comenzar la pausa; este documento es el único archivo nuevo pendiente de incorporar a Git.
- Producción App: última versión registrada v3.53.1, main85f6989; no se volvió a consultar el sitio al pausar. Billing live no activado. Exención permanente del estudio interno registrada privadamente en billing_exemptions; no reproducir identidad en fixtures.
- Clon: szbswxpkhidywaosdfcg. Billing y solicitudes privadas desplegados; última lectura HTTP200. Protección de plazas pagadas ante ampliación fallida desplegada. Políticas de ensayo desactivadas y taxReady=false según última configuración comprobada; no se cambiaron al pausar.
- Puertos locales3194(vista previa) y3195(transporte de código): consulta de listeners no devolvió servicios escuchando. No se arrancó ningún servicio. No hay operación de despliegue en curso en esta tarea.
- Pendiente: persistencia/confirmación de ampliaciones prorrateadas y sincronización de nuevas cantidades; bajas en próxima renovación; pruebas completas Checkout base22+extras38; rendererPDF/controles finales de planes; configuración fiscal y activación live. seat-change.mjs solo prepara preview, no cobra ni está conectado a endpoint.
- La supervisión horaria de copias vigilar-copias-moderno-app permanece activa en modo solo lectura, con avisos solo ante incidencias/cambios. Último chequeo14:54UTC correcto; copia02:31:49UTC.
- Imagen: tarea01a09a9c-2344-7931-8af8-1467bf0b14a1. Facilitar referencias en lectura si las solicita; no aplicar cambios de imagen/transiciones aquí.
- Protección contraseña de Web pendiente según Cerebro; esta tarea no ha modificado esa configuración.

Detalles técnicos y pruebas: STRIPE-TEST-ESTADO.md. Los pasos pendientes quedan reanudados en esta rama aislada; consultar el estado actualizado antes de ejecutar.
