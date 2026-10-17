# Taller Nueva app Codex

**Estado inicial: espacio de experimento preparado; no se ha diseñado ni implementado ninguna pantalla todavía.**

Este directorio es **el único** lugar autorizado para desarrollar la nueva interfaz de escritorio de Moderno.app en la rama `experimento/taller-nueva-app-codex`.

## Aislamiento
- **100 % datos inventados** y solo frontend autónomo.
- **0 conexiones con Supabase**, ni a producción ni a pruebas.
- Sin cuentas reales, integración de correo, Stripe, Drive, APIs ni servidores de `moderno.app`.
- Ninguna modificación de `app/` ni ningún despliegue. **No fusionar a main**.
- La interfaz se construirá cuando el propietario empiece a dar indicaciones en su conversación **Taller Nueva app Codex**.

## Concepto aprobado
- Barra de navegación superior compacta: icono M, Proyectos, Tareas, Calendario, Agenda, Finanzas, Mail y Productos y Servicios, con botón de comprimir.
- Perfil de usuario arriba a la derecha con futuros Ajustes e Integraciones (solo simulados).
- Zona central espaciosa para contenido de un proyecto ficticio abierto.
- Barra inferior fija flotante con **iconos**: Inicio, Planos, Obra, Tareas, Compras, Economía, Documentos, IA, Utilidades y Comentarios; iconos con tooltip al pasar el ratón y al enfocar, selección activa visible.
- Inspiración de experiencia: herramientas de diseño tipo Rayon, sin copiar su código o marcas.

## Próximos pasos
1. Abrir una nueva conversación en Codex Cloud llamada **Taller Nueva app Codex**.
2. Trabajar en la rama `experimento/taller-nueva-app-codex` y leer `AGENTS.md` de esta carpeta, `docs/TALLER-NUEVA-APP-CODEX.md` e issue [#47](https://github.com/estudiomoderno/moderno.app/issues/47).
3. Empezar con un pequeño prototipo visual navegable de escritorio 100 % ficticio, sin backend ni librerías que carguen servicios externos.
4. Revisar iterativamente con el propietario. No se traslada a producción hasta una decisión posterior.
