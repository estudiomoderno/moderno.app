# AGENTS.md — Taller Moderno.app V2

## Encargo

Construir una nueva Moderno.app desde cero, usando ReUI y bloques completos con una identidad visual común. Javier abrirá un Codex nuevo. La decisión procede de su conversación del 28/11/2026; no presupone que el nuevo chat herede el historial de otro.

Leer este archivo, README.md y docs/MIGRACION-DATOS.md en este directorio. Después revisar las fuentes de la app antigua necesarias para cada módulo. Distinguir siempre una decisión del propietario, una propuesta técnica y un resultado comprobado.

## Aislamiento y autonomía

- Trabajar en `moderno-v2/`, con configuración, dependencias y comandos propios. La rama inicial es `v2/reui`.
- El código antiguo sirve para entender comportamiento, contratos y activos de marca. Conservar intactos `app/`, `mailer/`, `ui/`, `SQL/`, `supabase/` y los workflows de producción durante este arranque.
- Una rama distinta no aísla los datos. Usar inicialmente datos sintéticos. Antes de conectar Supabase, identificar y verificar el proyecto **Moderno Prueba**, su URL, claves de cliente, aislamiento y usuarios ficticios. No asumir que un nombre histórico identifica ese entorno.
- La configuración V2 debe fallar de forma segura si falta el destino de pruebas o no coincide con el proyecto verificado. No heredar URLs, claves ni valores por defecto de producción; no reutilizar el servidor o el .env de la app antigua sin comprobarlos.
- Stripe exclusivamente en modo de prueba si se trabaja esa integración. Ningún envío real, cobro real, migración productiva o cambio de DNS queda autorizado por construir V2.
- No incluir secretos, claves ReUI, datos reales, exportaciones privadas o copias de seguridad en Git. La clave de licencia de ReUI no es una variable pública del frontend.
- Avanzar autónomamente en diseño, código, instalaciones compatibles, pruebas y arreglos dentro del alcance. Resolver con las integraciones los pasos disponibles; no pedir a Javier que copie componentes entre herramientas.
- Antes de incorporar código ReUI Pro, Ultimate o plantillas sujetas a su licencia, verificar acceso y destino privado. La rama inicial está en un repositorio público. Se puede avanzar con código propio y componentes MIT; no publicar el código premium en él.
- No cambiar la visibilidad del repositorio actual. Si hace falta un repositorio nuevo privado, prepararlo mediante las herramientas disponibles y comprobar su acceso desde Codex; si falta esa capacidad, comunicar el paso concreto pendiente.
- La puesta en producción y la migración de datos requieren un plan final verificable, ensayo y autorización específica. No fusionar esta nueva app a main ni activar el despliegue actual como atajo.

## Construcción

La base técnica propuesta es React + TypeScript + Vite + Tailwind 4 + ReUI/shadcn sobre Base UI. Verificar versiones y fijarlas con lockfile al crear el proyecto. No trasladar el montaje híbrido antiguo a V2 por inercia.

Establecer tokens de marca y componentes compartidos. Conservar el imagotipo y recursos oficiales; barra de herramientas del proyecto arriba y menú lateral inicialmente contraído. Prioridad de escritorio con estructura adaptable.

Buscar composiciones y bloques completos antes de montar pantallas control a control. Leer el código real del bloque: no confundir una maqueta con autenticación, guardado, correo o visor conectado.

Separar la interfaz, las reglas del producto y el acceso a los datos. Los componentes visuales no deben depender del JSON antiguo ni implementar permisos por su cuenta. Diseñar adaptadores e importadores con correspondencias explícitas de identidad.

Primer recorrido: listado de proyectos → abrir/crear → editar → guardar → recargar y recuperar el cambio. Hacer primero una demostración sintética y después el recorrido con persistencia de pruebas verificada. Declarar con claridad si el guardado es local o de servidor.

## Verificación y entrega

Comprobar compilación, recorrido funcional y apariencia de cada entrega; añadir pruebas útiles para permisos, persistencia y migración cuando se implementen. No presentar botones de demostración como funciones terminadas.

Documentar qué funciona, qué está simulado, pruebas realizadas, límites y siguiente entrega. GitHub conserva la trazabilidad técnica; GitBook puede recibir documentación funcional al verificar su destino y sincronización. No afirmar que un documento se ha sincronizado por existir en GitHub.

No deducir el estado de una base de datos por un SQL versionado ni una publicación por un commit. Responder en español claro, con enlaces verificables.
