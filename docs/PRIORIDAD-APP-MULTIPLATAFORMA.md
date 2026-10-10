# Prioridad de producto: terminar Moderno.app para web y dispositivos

**Decisión del propietario — 10 de octubre de 2026.** Prioridad principal del equipo: **terminar la aplicación profesional Moderno.app antes de distraerse con el escaparate comercial u otras webs independientes**. La distribución prevista debe contemplar las plataformas indicadas abajo.

## Plataformas de destino (requisito de producto, no estado de disponibilidad)

| Modalidad | Dispositivos | Experiencia solicitada |
| --- | --- | --- |
| **Web** | Navegador en ordenador o dispositivo compatible | Trabajar desde la web, sin instalación obligatoria |
| **Windows** | Ordenadores Windows | Descargar e instalar la aplicación |
| **macOS** | Ordenadores Mac | Descargar e instalar la aplicación |
| **iOS / iPhone** | Teléfonos iPhone | Descargar e instalar la aplicación |
| **iPadOS / iPad** | Tabletas iPad | Descargar e instalar la aplicación |
| **Android** | Teléfonos y tabletas Android | Descargar e instalar la aplicación |

**Importante:** esto es el **objetivo aprobado**. No afirmar que ya existen instaladores, apps de tiendas ni soporte validado por el solo hecho de esta decisión. Comprobar el estado técnico real antes de informar de disponibilidad.

## Principios de ejecución
1. **Un solo producto y una experiencia coherente**: estudiar cómo preservar cuentas, proyectos, permisos, archivos, borradores y sincronización entre dispositivos. No prometer sincronización u offline hasta probarlos.
2. **Prioridad a calidad de la app actual**: inventario funcional, incidencias, estabilidad, rendimiento, accesibilidad, usabilidad táctil/responsiva y seguridad antes de empaquetar para más plataformas.
3. **Decidir arquitectura tras auditar el código actual**: evaluar web adaptable/PWA, contenedores o apps nativas según limitaciones de sistema operativo, acceso a archivos/cámara, notificaciones, sesión, distribución y mantenimiento. **No iniciar una reescritura a React/TypeScript ni escoger frameworks por anticipado.**
4. **Entrega progresiva por plataforma**: preparar un plan verificable de Web → escritorio (Windows/Mac) → móviles/tabletas (iPhone, iPad, Android), pudiendo ajustar el orden tras el diagnóstico sin reducir la cobertura final.
5. **Pruebas reales por categoría de dispositivo**: navegador, resoluciones, táctil, teclado, carga, sesiones, actualizaciones, instalación, accesibilidad, seguridad y recuperación del trabajo. No afirmar soporte completo a partir de una maqueta o una prueba única.
6. **Distribución diferenciada**: evaluar requisitos de firma, empaquetado, instaladores y publicación para Windows/macOS y las tiendas de Apple/Google, sin abrir cuentas pagadas ni registrar servicios sin autorización.
7. **Producción protegida**: ninguna prueba de escritura contra usuarios reales. Trabajar en ramas propias y entorno aislado (preparar primero `moderno-pruebas`, issue #3). Los cambios ordinarios de aplicación siguen el protocolo de CI y publicación vigente; datos reales, DNS, cobros y cambios irreversibles requieren autorización concreta.
8. **Separación de Talleres**: 🔧 Taller Moderno.app sigue siendo exclusivo de `app.moderno.app` **incluidas sus futuras versiones Windows, macOS, iOS/iPadOS y Android**. La web comercial `www.moderno.app` y otras webs independientes tendrán sus propios chats.

## Distribución del trabajo entre departamentos
- **🧠 Cerebro:** mantiene el objetivo transversal, fija prioridades por fases, aceptación y decisiones de producto.
- **🔧 Taller Moderno.app / Codex Cloud:** audita el estado actual, propone la opción técnica menos compleja, desarrolla versiones de la **aplicación** y deja PR, tests, limitaciones y reversión.
- **🛡️ Control:** define y verifica matriz de pruebas por dispositivo, autenticación, permisos, backups, actualizaciones, seguridad, sesiones y regresiones.
- **📈 Negocio:** evalúa experiencia de alta, suscripciones y requisitos comerciales de cada plataforma; **no activar cobros ni asumir precios o comisiones**.
- **📚 Academia / GitBook:** prepara manuales específicos para web, escritorio y móvil según funciones efectivamente disponibles; evita publicar tutoriales de funciones futuras como si existieran.
- **🔌 Integraciones:** revisa identidad/sesiones, sincronización, archivos, notificaciones, distribución y dependencias técnicas, siempre con cambios probados y sin credenciales de producción.
- **GitHub:** fuente común para esta decisión, trabajo, auditorías y evidencias. **Registrar aquí no envía mensajes a otros chats ni inicia Codex automáticamente**; cada equipo debe leer la documentación común al iniciar trabajo relacionado.

## Primer paso solicitado al Taller (análisis, sin desarrollo ni despliegue)
Preparar un **inventario verificable** de qué partes funcionan actualmente en web de escritorio y móvil, qué fallaría como aplicación instalable y qué bloqueos de pruebas existen. Proponer una hoja de ruta por fases y una matriz de plataformas con criterios de aceptación. No comenzar empaquetados ni crear aplicaciones de tiendas hasta la aprobación de la solución técnica.

## Referencias
- [AGENTS.md](../AGENTS.md)
- [Coordinación Cerebro ↔ Codex](COORDINACION-CEREBRO-CODEX.md)
- [Decisiones del proyecto](DECISIONES.md)
- [Preparar Supabase de pruebas](https://github.com/estudiomoderno/moderno.app/issues/3)
