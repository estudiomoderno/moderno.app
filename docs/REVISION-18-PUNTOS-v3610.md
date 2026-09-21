# Versión 3.61.0 — revisión de 18 puntos

Validación: 371 pruebas automáticas correctas. Revisión visual local con datos ficticios de biblioteca, contactos, calendario, contabilidad y previsión, incluyendo móvil. No se han ejecutado migraciones ni escrituras de prueba en datos reales.

| Punto | Resultado |
|---|---|
| 1 | Fundido Mis tareas / Todas |
| 2 | Contadores circulares alineados |
| 3 | Entrada principal a Biblioteca restablece categorías |
| 4 | Tarjetas con Editar; uso y eliminación dentro del editor |
| 5 | Categorías sustituye Carpetas en biblioteca |
| 6 | Orden por estudio en configuración, arrastre, teclado y menú |
| 7 | Transición direccional Mi estudio / Marcas |
| 8 | Acciones de carpeta en una fila |
| 9 | Contactos empieza por Clientes desde menú principal |
| 10 | Transiciones y selección de categorías de contactos |
| 11 | Exportar / Nuevo conservan posición |
| 12 | Calendario Mes / Semana / Día / Agenda sin controles de integración en vista normal |
| 13 | Buscador de proyecto sin flechas superpuestas |
| 14 | Acciones contables alineadas y espacio de cobro parcial reservado |
| 15 | Ingresos / Gastos con transición; resumen fiscal y exportación por periodo en ventanas |
| 16 | Previsión con lista y calendario, mes y búsqueda; tres resúmenes |
| 17 | Fundido de navegación principal sin duplicarlo con transición de pestaña de proyecto |
| 18 | Cuadrícula de presupuestos en pantalla; impresión preservada |

Límites de la validación: orden guardado mediante el canal existente de configuración del estudio; se comprobó serialización y autorización local, sin modificar categorías reales. Las conexiones de calendario permanecen intactas. El flujo de despliegue vuelve a ejecutar la suite y publica recursos antes del HTML.
