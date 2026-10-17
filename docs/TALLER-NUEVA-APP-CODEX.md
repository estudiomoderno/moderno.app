# Taller Nueva app Codex — prototipo de escritorio aislado

**Decisión del propietario — 17/10/2026.** Este segundo taller debe llamarse exactamente **«Taller Nueva app Codex»**. Es independiente del chat **«Taller Codex Moderno.app»**, que mantiene la aplicación real.

## Misión

Crear y perfeccionar **una interfaz experimental de escritorio de Moderno.app**, muy sencilla, amable y parecida en su navegación a una aplicación profesional de diseño, **sin implementar todavía una migración a la app real**. El propietario decidirá si merece la pena adoptarla después de probar su experiencia.

**Encargo de referencia:** [GitHub #47](https://github.com/estudiomoderno/moderno.app/issues/47).

## Aislamiento obligatorio

- Usar solamente **datos inventados**: usuarios, proyectos, clientes, importes, documentos y archivos ficticios; nunca extraer registros, capturas privadas ni exportaciones reales.
- **Prohibida toda conexión a Supabase**, tanto producción como pruebas: no importar su SDK, no apuntar a proyectos Supabase, no usar Auth, Storage, funciones Edge, SQL ni claves, y no ejecutar consultas directas o indirectas.
- No conectar a otros servicios: Stripe, Drive, Gmail, Google Calendar, APIs reales, webhooks ni sistemas de `*.moderno.app`; no habilitar llamadas remotas ni cargar scripts, fuentes o imágenes desde CDN. Prototipo estático autosuficiente y sin credenciales.
- Desarrollar **exclusivamente** en la rama GitHub **`experimento/taller-nueva-app-codex`** y dentro de **`prototipos/nueva-app/`**. No tocar `app/`, `mailer/`, `SQL/`, `supabase/`, otras webs ni workflows. No fusionar esta rama con `main` ni desplegarla.
- La rama está alojada en el repositorio actual por comodidad, **no implica compartir funcionamiento ni conexiones**: el prototipo no debe importar ni ejecutar archivos del producto real.
- Es posible examinar código existente de la app solo para comprender componentes e interacciones, sin usar sus credenciales ni lanzarla. Evitar ejecutar el servidor productivo o `app/index.html`.
- No contratar servicios, no activar APIs de pago, no dar permisos nuevos y no almacenar datos de proyecto reales.

## Propuesta de interfaz (abierta a iteración)

Basada en los dibujos e instrucciones del propietario:

- **Navegación global arriba:** imagotipo «M», Proyectos, Tareas, Calendario, Agenda, Finanzas, Mail, Productos y Servicios; opción de contraer/expandir. Perfil arriba a la derecha con futuras opciones de Ajustes, Integraciones, etc.
- **Barra de herramientas del proyecto abajo:** flotante, siempre accesible, compacta, solo iconos y agrupaciones; Inicio, Planos, Obra, Tareas, Compras, Economía, Documentos, IA, Utilidades, Comentarios. Tooltips al pasar cursor o enfocar con teclado, resaltado de la herramienta activa, desplegables de opciones cuando convenga.
- **Zona central libre:** mostrar una herramienta cada vez, sin perder contexto de un proyecto ficticio abierto. Inspirarse en la ergonomía de Rayon sin copiar elementos ajenos literalmente.
- **Planos** puede ser acceso directo a **Documentos → Planos** sin crear dos almacenamientos paralelos. Por ahora las interacciones pueden ser simuladas y deben identificarse como demo.
- Solo escritorio en esta primera etapa; la adaptación a móvil/tabletas y apps instalables se decidirá posteriormente.
- Refinar el estilo y las interacciones por iteraciones con comentarios del propietario. **No diseñar grandes pantallas sin acordar antes los primeros pasos con él.**

## Entregas

1. Base de prototipo autónomo con contenido 100 % ficticio y sin dependencias ni conexiones remotas.
2. Navegación e interacciones simuladas de escritorio para comprobar que el concepto resulta más amigable.
3. Pruebas simples de navegación, accesibilidad, ausencia de conexiones externas y funcionamiento sin Supabase; mostrar una previsualización en el entorno Codex, no en `app.moderno.app`.
4. Ajustes visuales iterativos. **No migrar, desplegar ni conectar a producción** hasta que el propietario apruebe posteriormente un plan específico y Control verifique compatibilidad y seguridad.

## Relación entre talleres

- **Taller Codex Moderno.app:** mantiene, prueba y publica cambios seguros en la app real; sigue gestionando los encargos existentes (como Planos interactivos).
- **Taller Nueva app Codex:** un experimento de diseño y navegación, no una segunda versión de producción ni una prueba de Supabase.

Crear la tarea/esta documentación **no crea automáticamente un chat de Codex Cloud**, ni inicia su ejecución. Abrir una nueva conversación con ese nombre y arrancar desde la rama aislada cuando el propietario esté preparado.
