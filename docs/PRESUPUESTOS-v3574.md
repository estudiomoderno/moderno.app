# Presupuestos — v3.57.4

- Se corrige saveDoc: conserva el proyecto elegido en el borrador, incluso al quitarlo. Varios presupuestos pueden apuntar al mismo proyecto.
- Filtros de estado con selección/deselección, sin Limpiar filtros; campos alineados y transición de resultados respetando movimiento reducido.
- Convertido en Factura se calcula contra facturas guardadas del mismo espacio/marca, por sourceQuoteRef o por la leyenda histórica exacta Según presupuesto REF. No se deduce por cliente, importe ni proyecto. Abrir una conversión sin guardar no cambia el presupuesto.
- Se usa heart-check.svg facilitado por Javier. No se migran ni borran datos.
- Validación: 335 pruebas correctas, incluyendo guardado de vínculo, desvinculación y detección de factura explícita.

## v3.57.5
Fondo de Presupuestos con pequeños gráficos y monedas en trazo tenue (7 %), sustituyendo la cuadrícula. Variante clara y oscura; limitado a pantalla, sin afectar PDF ni datos.

## v3.57.6
La leyenda histórica puede tener notas después de la referencia. Se reconoce el prefijo Según presupuesto REF con límite de palabra/puntuación, sin confundir referencias más largas ni otras marcas. Comprobado mediante lectura de los datos existentes; sin modificaciones a los documentos.

## v3.57.7
Filas alineadas: estado y proyecto en columna; botones de editar, duplicar y eliminar en posiciones constantes, reservando el espacio de conversión en escritorio. En móvil no se reserva un hueco vacío.

## v3.57.8
Corrección solicitada: Convertido en Factura sustituye al botón Convertir en factura en la cuarta posición de Acciones, con igual ancho. Estado mantiene su selector.
