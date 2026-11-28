# Moderno.app V2 — arranque del nuevo Taller

**Decisión del 28/11/2026:** construir una nueva aplicación desde cero, con ReUI y bloques completos. La app actual seguirá operativa mientras se desarrolla y comprueba V2. La migración de información se ejecutará cuando V2 esté preparada; su compatibilidad se diseña desde el principio.

## Estado de esta entrega

| Elemento | Estado |
| --- | --- |
| Arranque y reglas del nuevo Codex | Documentados en esta rama |
| Aplicación V2 ejecutable | Pendiente de construir |
| Modelo de datos y migrador | Inventario inicial; diseño e implementación pendientes |
| Supabase Moderno Prueba | Entorno exigido; conexión y funcionamiento de la nueva V2 pendientes de validar |
| ReUI premium | Compra/acceso pendientes de verificar; no se ha instalado código premium |
| MCP de ReUI | Guía de preparación revisada; conexión pendiente de configurar y comprobar en el nuevo Codex |
| Producción y datos reales | Sin cambios por este arranque |

Repositorio de referencia: [estudiomoderno/moderno.app](https://github.com/estudiomoderno/moderno.app). Punto de partida inspeccionado: [61a0c09c044abbd576a6c485ca58d0db75831317](https://github.com/estudiomoderno/moderno.app/commit/61a0c09c044abbd576a6c485ca58d0db75831317).

## Abrir el nuevo Codex

Nombre sugerido: **Taller Moderno.app V2**. Seleccionar el repositorio de referencia y la rama `v2/reui` para recoger este arranque. El AGENTS.md de la raíz dirige a las instrucciones de este directorio; no hace falta trasladar el historial ni copiar un prompt largo.

Esta rama documenta el inicio y permite trabajo propio/MIT. **Antes de subir código premium, el destino de V2 debe ser privado.** La API de GitHub confirmó que el repositorio actual era público el 28/11/2026. ReUI prohíbe publicar sus materiales licenciados en repositorios públicos. Usar un repositorio privado separado para V2 conserva la situación del repositorio existente. Aún no se ha creado ni verificado ese destino privado. Fuente: [licencia oficial de ReUI](https://reui.io/legal/license).

## Base técnica propuesta

Una aplicación React con TypeScript y Vite, Tailwind CSS 4 y ReUI/shadcn sobre Base UI. `base-nova` es un punto de partida compatible para definir la identidad; los tokens de Moderno decidirán el acabado.

La app actual ya contiene React/Base UI/Tailwind en [ui/team-profile/package.json](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/ui/team-profile/package.json), aunque su arquitectura general es híbrida. V2 tendrá su propio proyecto y lockfile. Las versiones finales se comprobarán al instalar.

Fuentes de instalación: [ReUI Get Started](https://reui.io/docs/get-started), [registro ReUI](https://reui.io/docs/registry) y [shadcn para Vite](https://ui.shadcn.com/docs/installation/vite).

## Uso de ReUI sin copiar botón a botón

Antes de comenzar, seguir la [guía de preparación de ReUI para Codex](docs/REUI-CODEX.md), revisada a partir de los tres enlaces facilitados por Javier. Distingue el cliente local del Taller alojado y define una comprobación real de la conexión.

Configurar una sola vez el registro de ReUI en `components.json`. El Taller incorporará bloques mediante el CLI de shadcn, revisará sus dependencias y los adaptará a los componentes y tokens compartidos. `@reui` es un namespace del registro, no un paquete npm.

Los bloques premium requieren licencia válida y un repositorio privado adecuado. Guardar `REUI_LICENSE_KEY` como secreto del entorno de herramientas, nunca en el bundle del navegador. Las plantillas completas se descargan desde sus páginas; no son elementos del registro. El MCP facilita encontrar y consultar componentes, pero su configuración debe comprobarse en el Codex concreto.

Elegir un bloque de Mail proporciona una base visual cuyo alcance hay que revisar. El envío, recepción, proveedores, adjuntos, permisos y sincronización necesitan su propia implementación o integración. No dar por acabado el módulo porque se vea un buzón.

## Identidad y primer hito

Mantener la marca Moderno: imagotipo oficial, paleta crema/beige/grafito y tipografía existente verificada. Definir de forma compartida tamaños, espacios, bordes, estados y densidad. La barra de proyecto va arriba; la navegación lateral comienza contraída.

Después del primer hito de publicación y Google, continuar este recorrido:

1. Inventariar las funciones actuales por módulo y registrar qué se conserva, cambia o se pospone.
2. Preparar el proyecto independiente, su entorno y los tokens comunes.
3. Construir navegación, listado y ficha de proyectos con bloques seleccionados.
4. Completar crear/editar/guardar/recargar con datos sintéticos y después persistencia en Moderno Prueba verificada.
5. Ensayar una primera importación sintética de proyectos y relaciones para probar pronto el contrato de datos.
6. Ampliar a documentos y visualizadores, compras/presupuestos y Mail, verificando cada recorrido completo.

El [prototipo de octubre](https://github.com/estudiomoderno/moderno.app/tree/experimento/taller-nueva-app-codex/prototipos/nueva-app) sirve como referencia de marca. Es una simulación estática distinta, sin backend ni autenticación; no representa una V2 funcional ya construida.

## Migración prevista

El [plan inicial de migración](docs/MIGRACION-DATOS.md) identifica datos, relaciones y criterios de aceptación. Crear una app nueva no obliga por sí solo a cambiar de proyecto Supabase: se decidirá el destino definitivo según compatibilidad, aislamiento y operación. El desarrollo se mantiene siempre en pruebas.

## Verificación de esta preparación

Solo se han preparado documentos. Se ha revisado el workflow [deploy-app.yml](https://github.com/estudiomoderno/moderno.app/blob/61a0c09c044abbd576a6c485ca58d0db75831317/.github/workflows/deploy-app.yml): su despliegue exige la rama main. No se han modificado código de aplicación, workflows, bases de datos, archivos privados ni servicios de producción. No hay compilación o pruebas funcionales de V2 que ejecutar todavía.

## Publicación de avances y acceso con Google

El primer hito debe ser una V2 publicada en una URL HTTPS estable, con Google funcional y un espacio de pruebas vacío. Cada entrega comprobada se publicará en ese destino. «Sin datos» significa sin importar datos de negocio reales; se permiten las identidades autorizadas y los ejemplos ficticios de pruebas. La migración requiere la orden expresa posterior del propietario. Ver [publicación V2 y Google](docs/PUBLICACION-V2-Y-GOOGLE.md).
