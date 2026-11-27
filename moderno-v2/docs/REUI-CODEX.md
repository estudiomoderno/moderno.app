# Preparar ReUI para el nuevo Codex

Revisión: 28/11/2026, a petición de Javier, antes de comenzar la nueva app.

**Estado:** documentación revisada y arranque actualizado. No se ha ejecutado el instalador, conectado ReUI, adquirido licencia ni abierto un nuevo chat. Esta guía no demuestra que el próximo Taller tenga las herramientas disponibles.

## Qué aporta cada pieza

| Pieza | Función |
| --- | --- |
| MCP de ReUI | Buscar en el catálogo vigente, consultar APIs y obtener comandos de instalación. También puede proponer las secciones de una página. |
| Agent Skill | Guiar la selección, adaptación y revisión de los componentes. |
| Registro en components.json | Permitir que el CLI de shadcn incorpore el código y sus dependencias. |
| Licencia | Habilitar el contenido premium incluido en el plan contratado. |

Fuentes: [ReUI para agentes](https://reui.io/mcp), [MCP](https://reui.io/docs/mcp), [Agent Skills](https://reui.io/docs/agent-skills) y [registro](https://reui.io/docs/registry). MCP y skill son gratuitos; Pro habilita bloques y Ultimate añade iconos y plantillas según la [licencia](https://reui.io/legal/license). Verificar el plan efectivo, sin dar por realizada una compra.

## Elegir la ruta según el entorno real

La [guía de ReUI para Codex](https://reui.io/docs/codex#install-the-reui-skill) describe principalmente el cliente local. Los comandos siguientes son referencia para ese cliente, no acciones ejecutadas:

```bash
codex mcp add reui --url https://mcp.reui.io
codex mcp login reui
codex mcp list
```

La configuración local puede compartirse entre clientes que usan el mismo host. En cambio, ChatGPT web y un chat Work alojado acceden a herramientas MCP mediante plugins y no leen automáticamente la configuración local. Fuente: [documentación oficial de OpenAI](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

En esta revisión no aparecen herramientas ReUI conectadas en la sesión y la búsqueda del directorio de plugins no devolvió un resultado ReUI. Esto no demuestra que sea imposible conectarlo: comprobar las integraciones admitidas por el nuevo Taller. La instalación en un contenedor distinto no acredita la conexión del chat futuro.

Para un agente alojado con MCP conectado, ReUI permite consultar su flujo mediante get_agent_skill. No hace falta forzar una instalación local que ese agente no vaya a leer.

## Revisar el instalador antes de usarlo

Se examinó el [JavaScript oficial](https://mcp.reui.io/install) por lectura estática, sin ejecutarlo. Huella SHA-256 observada: e6b175a91be41325b0dd44fa9c54e669a83dbaf6804dd94f4708462605850712. Revisar de nuevo si cambia.

El instalador general afecta a varios agentes y a la configuración global de Codex. Si existe REUI_LICENSE_KEY en su entorno, también puede guardar el valor en la configuración local de Claude. Esto debe considerarse aunque solo se pretenda configurar Codex.

La [documentación del instalador](https://reui.io/docs/agent-skills) permite simular con REUI_DRY_RUN=1 y omitir cambios de AGENTS.md/GEMINI.md con REUI_AGENTS_MD=0. Esta última opción no desactiva las demás escrituras. El modo de simulación sigue haciendo lecturas y descargando información.

Mantener las reglas de Moderno en sus propios archivos; las personalizaciones dentro de la carpeta gestionada de la skill pueden desaparecer al actualizar. Revisar las escrituras y el diff, conservando las reglas de marca, pruebas y producción.

Para MCP, elegir OAuth o un token de entorno. La guía de Codex advierte que el token configurado prevalece sobre OAuth; no añadir ambos sin necesidad. El acceso premium del registro se configura aparte, sin incluir secretos en Git ni en el frontend.

## Orden de preparación propuesto

1. Identificar el cliente/entorno del nuevo Taller y el mecanismo de conexión que realmente admite.
2. Preparar el destino privado antes de incorporar materiales premium; la rama documental actual está en un repositorio público.
3. Configurar MCP y cargar la skill por la ruta adecuada.
4. Preparar el proyecto React y su registro ReUI, usando un único estilo base y los tokens de Moderno.
5. Ejecutar la comprobación práctica descrita abajo.
6. Construir el primer módulo de proyectos con datos sintéticos y, al conectar servicios, exclusivamente Moderno Prueba verificado.

## Comprobación práctica antes de afirmar que funciona

- El nuevo Taller realiza una búsqueda real y recibe un identificador y enlace verificables.
- Puede consultar la API del componente y el flujo de la skill.
- Incorpora un elemento autorizado por el plan mediante el registro, con dependencias resueltas.
- La compilación y una vista de prueba muestran ese elemento con los tokens previstos.
- El informe identifica qué se instaló, la fuente, lo verificado y cualquier función todavía simulada.

Para una página, probar compose_page y revisar sus elecciones. Si el catálogo no contiene un módulo completo, componer con los componentes adecuados y explicar qué falta. Un bloque de Mail sigue necesitando comprobar envío, recepción, adjuntos, permisos y persistencia; la conexión al catálogo no aporta por sí misma esos servicios.

El objetivo de aceptación de Moderno es que Javier describa una pantalla y el Taller pueda buscar, incorporar, adaptar y verificar sus componentes sin pedirle que copie código entre herramientas.
