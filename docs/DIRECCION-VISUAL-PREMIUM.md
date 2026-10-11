# Dirección visual aprobada: Moderno.app Premium

**Fecha de decisión: 11 de octubre de 2026.** El propietario aprueba evolucionar el aspecto de **`app.moderno.app`** hasta conseguir una experiencia **premium, elegante, moderna, profesional y coherente**, comparable en acabado a grandes aplicaciones profesionales, **preservando íntegramente el trabajo ya construido**.

## Prioridad y alcance
- **Fase actual: escritorio web**, antes de la adaptación visual profunda de móvil y tablet. El comportamiento móvil existente no debe sufrir regresiones mientras se mejora escritorio.
- Afinar el **sistema visual** de la aplicación: fuentes y jerarquía tipográfica, espaciado, contraste, color, iconos, botones, campos, menús, pestañas, tarjetas, tablas, modales, mensajes, indicadores de carga, estados vacíos y transiciones.
- La estética responde a usuarios profesionales de arquitectura, interiorismo y diseño: orden, claridad, confianza y calidad visual, sin efectos gratuitos.
- **No** desarrollar aquí el escaparate `www.moderno.app` ni otros portales independientes, que tendrán Talleres específicos.
- **No** rehacer la aplicación desde cero ni migrar a un framework por motivos estéticos. Primero evaluar CSS/HTML/JS existente, componentes/estilos reutilizables y posibilidad de evolución incremental.

## Principios visuales iniciales (a validar con muestras reales)
1. **Coherencia:** mismos estados, tipografía, iconografía, espaciado y tratamiento de controles en todos los módulos.
2. **Sutileza:** animaciones discretas y rápidas que acompañan a la acción (hover, enfoque, clic, apertura/cierre y feedback); evitar rebotes excesivos, retrasos y animaciones decorativas persistentes.
3. **Accesibilidad:** controles navegables con teclado y lector de pantalla, estados `focus-visible`, contrastes y tamaños utilizables, y respeto a `prefers-reduced-motion`.
4. **Rendimiento:** no añadir bibliotecas pesadas sin justificar; medir respuesta, movimiento y estabilidad; evitar efectos que ralenticen tablas o pantallas con muchos registros.
5. **Seguridad y continuidad:** no cambiar lógica de negocio, permisos, guardado, datos, documentos, nombres de acciones o contratos de API por una intervención meramente visual. No trabajar con datos reales en pruebas.
6. **Licencias:** utilizar referencias como Mobbin/Dribbble para inspiración; copiar solo componentes, iconos, fuentes, animaciones y recursos cuya licencia comercial se haya comprobado y respetado. Un diseño ajeno no se replica literalmente.
7. **Identidad propia:** no escoger definitivamente Inter, Lucide, shadcn/ui, Motion, GSAP ni ningún recurso sin auditar los activos y restricciones actuales. Comparar opciones y priorizar herramientas nativas de CSS si son suficientes.
8. **Reversibilidad:** cambios pequeños en rama/PR, pruebas y comparación visual por pantalla; identificar y evitar efectos secundarios del CSS global.

## Plan de trabajo del Taller (sin cambiar todavía la app)
**1. Inventario visual de escritorio:** comprobar tipografías, colores, estilos, controles existentes y duplicidades CSS/JS; identificar pantallas de alto uso y patrones inconsistentes. Usar capturas o entornos seguros, sin sesiones/productivos con datos reales.

**2. Propuesta de sistema de diseño:** presentar al Cerebro 1–2 direcciones visuales posibles para Moderno.app con ejemplos representativos de: botón primario/secundario, campo de texto, selector, tarjeta, navegación, modal, tabla, feedback y estados de carga. Precisar tipografía, escala, espaciado, radios, sombras, colores y estados; documentar tokens CSS reutilizables.

**3. Piloto reversible:** tras aceptación de la dirección, intervenir **una sola área representativa** de escritorio, con comparación antes/después, accesibilidad, compatibilidad, tests Node/PHP y pruebas visuales. No efectuar un rediseño global en un solo PR.

**4. Extensión gradual:** generalizar de forma controlada a los demás módulos de escritorio, sin romper rutas, interacciones, visores, impresión, documentos o sesiones.

**5. Móvil/tablet:** una vez estabilizado escritorio, diseñar y verificar la experiencia táctil por separado, conservando las mismas capacidades.

## Criterios de aceptación del diagnóstico inicial
- Estado real de la interfaz actual y problemas visuales priorizados (con evidencia, no inventados).
- Propuesta de tokens, componentes reutilizables y microinteracciones compatibles con el código existente.
- Plan de piloto con riesgos, pruebas, reversión y sin nueva dependencia innecesaria.
- Identificación de licencias/costes solo si son necesarios. No compras o suscripciones nuevas sin autorización.
- Comunicación mediante GitHub, sin afirmar que la publicación de este documento lanza Codex automáticamente.

## Responsables
- **Cerebro:** dirección visual, criterios de aceptación y priorización.
- **Taller (Codex Cloud):** inventario, propuestas técnicas y realización de PRs de la aplicación, únicamente para `app.moderno.app`.
- **Control:** accesibilidad, regresiones, seguridad, visualización y rendimiento.
- **Academia:** actualizar instrucciones solo tras confirmar cambios publicados.
- **Integraciones:** evitar dependencias extra, evaluar compatibilidad y licencias.
- **Negocio:** comprobar coherencia con identidad y posicionamiento profesional, sin dirigir cambios a la web comercial desde este Taller.

## Referencias internas
- [Prioridad general multiplataforma](PRIORIDAD-APP-MULTIPLATAFORMA.md)
- [Decisiones](DECISIONES.md)
- [Instrucciones de Codex](../AGENTS.md)
