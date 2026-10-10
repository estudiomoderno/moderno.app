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

## Seguridad y continuidad
- El proyecto de pruebas preferente es **moderno-pruebas**. Comprobar su aislamiento antes de cualquier escritura. Otros proyectos de recuperación son históricos y no deben utilizarse para nuevas pruebas sin verificarlo.
- El repositorio es público. No incorporar claves, credenciales, usuarios reales, backups, tokens, registros sensibles ni datos de clientes.
- `main` puede desplegar automáticamente mediante `.github/workflows/deploy-app.yml` si cambian `app/**`, `mailer/**` o el workflow. SQL y Edge Functions requieren proceso distinto.
- Antes de cambios de base de datos, Storage, autenticación o permisos: comprobar backups por separado, ensayar en pruebas y diseñar una vuelta atrás verificable. No escribir a producción solo porque haya un backup.
- No iniciar una segunda supervisión de copias sin verificar la automatización previa y su funcionamiento.
- **Los historiales de ChatGPT y Codex no se sincronizan automáticamente.** La continuidad se materializa con GitHub, documentación y decisiones explícitas.

## Primer encargo de Codex
Crear/abrir proyecto de nombre **Moderno.app** asociado a este repositorio. Primero hacer diagnóstico **solo lectura**, verificar rama y versión, reconocer el estado de pruebas/producción, revisar workflows y dejar un informe breve. No editar el producto ni desplegar hasta recibir un encargo concreto.
