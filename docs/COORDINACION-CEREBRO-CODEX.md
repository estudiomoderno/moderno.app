# Coordinación Cerebro ↔ Codex — Moderno.app

**Objetivo:** trasladar el Taller a Codex sin perder contexto ni arriesgar producción. Este documento no crea por sí solo un proyecto en la interfaz de Codex ni importa historiales de ChatGPT.

## Responsabilidades
- **Cerebro Moderno.app (ChatGPT):** define estrategia, producto, experiencia, decisiones, prioridades y criterios de aceptación.
- **Taller Moderno.app (Codex, proyecto «Moderno.app»):** analiza el código, implementa, prueba, revisa, publica cambios ordinarios autorizados y registra resultados.
- **Control Moderno.app (ChatGPT):** revisa seguridad, riesgos y calidad, cuando exista ese espacio.
- **Negocio Moderno.app (ChatGPT):** propone precios, captación, fabricantes, crecimiento y requisitos comerciales, cuando exista ese espacio.
- **GitHub:** fuente compartida de código, tareas (issues), ramas, PR, pruebas y entregas.
- **GitBook:** documentación aprobada, manuales y academia. No asumir sincronización hasta verificar conexión y permisos.

Repositorio: https://github.com/estudiomoderno/moderno.app

## Contexto y siete subdominios
- `admin.moderno.app`: futuro panel privado de empleados, usuarios, soporte, ventas y operaciones.
- `app.moderno.app`: aplicación de gestión profesional; contemplar evolución a Android, iOS y escritorio sin iniciar una reescritura sin decisión.
- `auth.moderno.app`: autenticación e identidad compartida.
- `brands.moderno.app`: portal de catálogos de fabricantes y marcas.
- `demo.moderno.app`: demostraciones sin datos reales.
- `docs.moderno.app`: documentación, tutoriales y academia de GitBook.
- `www.moderno.app`: presentación, adquisición comercial y suscripciones.

Esto expresa las responsabilidades *previstas*, no que todas las funcionalidades estén construidas.

## Prioridad compartida — aplicación multiplataforma (10/10/2026)
**Terminar Moderno.app es la prioridad principal del equipo.** El objetivo de distribución es **web**, **Windows descargable**, **Mac descargable**, **iPhone**, **iPad** y **Android en móviles y tabletas**. Esto es un compromiso de producto, no una declaración de disponibilidad actual. La responsabilidad de implementación corresponde exclusivamente al Taller de la aplicación; webs comerciales independientes continúan en otros chats.

**Fuente común y tareas por rol:** [PRIORIDAD-APP-MULTIPLATAFORMA.md](PRIORIDAD-APP-MULTIPLATAFORMA.md). Cerebro marca prioridades; Taller audita y propone arquitectura sin reescritura automática; Control valida calidad/seguridad por dispositivo; Negocio revisa impacto comercial; Academia documenta versiones verificadas; Integraciones evalúa necesidades técnicas. Las conversaciones no reciben automáticamente cambios de GitHub: deben consultar esta fuente compartida al iniciar tareas relacionadas.

## Separación de encargos de desarrollo
- **🔧 Taller Moderno.app (Codex Cloud) es exclusivo de `app.moderno.app`**: aplicación profesional, sus pruebas y su mantenimiento.
- El futuro escaparate **`www.moderno.app` tendrá su propio chat de desarrollo**, separado del Taller de la app. Cada nueva web independiente tendrá su chat especializado cuando se aborde, sin reutilizar el Taller de la aplicación.
- Cerebro coordina prioridades y puede compartir documentación mediante GitHub; esto **no** sincroniza historiales de chats ni autoriza a un chat a modificar otros productos.
- Para cambios comunes (por ejemplo identidad, autenticación o infraestructura compartida), acordar explícitamente responsables, alcance, pruebas, seguridad y despliegue antes de mezclar trabajo entre productos.
- Separar chats **no garantiza separación técnica** de repositorio, entorno o despliegue: comprobarla en cada proyecto nuevo antes de tocar producción.

## Cómo coordinar encargos y entregas
1. **Cerebro decide** el cambio, prioridad y alcance. Si supone desarrollo, se documenta una tarea en GitHub con objetivo, módulo, criterios de aceptación y restricciones.
2. **Codex lee** `AGENTS.md`, `README.md`, `docs/Moderno-app-traspaso-Codex-2026-10-10.md`, `docs/DECISIONES.md` y los archivos actuales antes de tocar código. Debe comprobar la vigencia de los documentos.
3. **Codex implementa** en rama propia y prueba en el entorno aislado `moderno-pruebas`, previa comprobación del proyecto/credenciales. Nunca usar datos productivos como datos ficticios.
4. **Control revisa**, cuando corresponda, riesgos de permisos, seguridad, recuperación y regresiones. Los hallazgos se registran de forma trazable.
5. **Despliegue:** para cambios ordinarios aprobados, tras pasar pruebas, se admite publicación automática siguiendo la autorización general del usuario y verificando Actions y recursos servidos. **Solicitar autorización específica** si afecta datos reales, DNS, pagos reales o decisiones difíciles de revertir.
6. **Cierre:** Codex deja enlace al commit/PR y resumen breve con pruebas realmente ejecutadas, limitaciones, versión comprobada y plan de reversión. Actualiza GitBook solo si su vinculación se ha confirmado.

## Unidad compartida oficial de Google Drive (11/10/2026)
- Para tareas de **Moderno.app**, utilizar **exclusivamente la unidad compartida de Google Workspace «03 Moderno App»**. Es una *unidad compartida*, no una carpeta homónima dentro de Mi unidad. Se ha confirmado que existe y es accesible.
- **No buscar, leer, copiar, guardar ni modificar archivos en otras unidades compartidas** para este proyecto, aunque sus nombres también mencionen «Moderno», salvo autorización expresa del propietario para un caso concreto. Cuando se use Drive, resolver primero la unidad «03 Moderno App» y acotar las búsquedas a ella.
- Centralizar **documentación, diseños, materiales de trabajo y nuevos archivos del proyecto** dentro de esa unidad, usando su estructura de carpetas ya existente; evitar duplicados innecesarios.
- **Excepciones por responsabilidad técnica:** el código fuente y sus versiones permanecen en GitHub; la documentación publicada de usuarios en GitBook; los datos operativos de la aplicación en Supabase según el entorno. «Todo» no autoriza subir credenciales, datos de clientes, exportaciones privadas, ni publicar información sensible en el repositorio público.
- **No mover archivos ni cambiar destinos de copias automatizadas existentes** sin verificar sus dependencias, su recuperación y sin autorización específica. Esta decisión rige nuevas operaciones y no implica una migración automática.
- Los demás chats no leen automáticamente esta conversación: consultar este acuerdo en las fuentes compartidas al iniciar un trabajo relacionado.

## Seguridad y continuidad
- El proyecto de pruebas preferente es **moderno-pruebas**. Comprobar su aislamiento antes de cualquier escritura. Otros proyectos de recuperación son históricos y no deben utilizarse para nuevas pruebas sin verificarlo.
- El repositorio es público. No incorporar claves, credenciales, usuarios reales, backups, tokens, registros sensibles ni datos de clientes.
- `main` puede desplegar automáticamente mediante `.github/workflows/deploy-app.yml` si cambian `app/**`, `mailer/**` o el workflow. SQL y Edge Functions requieren proceso distinto.
- Antes de cambios de base de datos, Storage, autenticación o permisos: comprobar backups por separado, ensayar en pruebas y diseñar una vuelta atrás verificable. No escribir a producción solo porque haya un backup.
- No iniciar una segunda supervisión de copias sin verificar la automatización previa y su funcionamiento.
- **Los historiales de ChatGPT y Codex no se sincronizan automáticamente.** La continuidad se materializa con GitHub, documentación y decisiones explícitas.

## Primer encargo de Codex
Crear/abrir proyecto de nombre **Moderno.app** asociado a este repositorio. Primero hacer diagnóstico **solo lectura**, verificar rama y versión, reconocer el estado de pruebas/producción, revisar workflows y dejar un informe breve. No editar el producto ni desplegar hasta recibir un encargo concreto.
