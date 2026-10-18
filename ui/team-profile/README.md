# Perfil ReUI original

Componente aislado encargado por el propietario el 18/10/2026 desde https://reui.io/components/button-group, ejemplo `c-button-group-5` (Base UI, Nova, Inter). Código público MIT de https://github.com/keenthemes/reui, referencia `067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a`.

`vendor/reui/` conserva los componentes originales. `SOURCE.json` identifica sus blobs Git y la única adaptación de una primitiva: permitir que el portal del menú se monte en el contenedor aislado. `style-nova.css` contiene sus secciones originales de Avatar, Button, Button Group y Dropdown Menu. `theme.css` toma los tokens originales de `styles/globals.css`; el alias local de Inter evita que la fuente cambie otros componentes de Moderno.app. No se rediseñan ni se reducen tamaños en móvil.

`pattern.tsx` utiliza los mismos componentes y clases del código enviado. Cambios funcionales solicitados: retirar + y reloj, sustituir usuarios/cifra de ejemplo por presencia existente y utilizar acciones actuales del menú, con etiquetas en español. Muestra cuatro retratos y el total real de conectados. Desde v3.65.51 se retira «Cambiar estudio» y su puente al selector antiguo por decisión del propietario. Las acciones de perfil, ajustes y herramientas mantienen sus manejadores originales; no se altera la identidad de la sesión ni se migran datos.

`notifications.tsx` incorpora el patrón Button/BellIcon/Badge enviado después por el propietario. Badge procede de `registry-reui/bases/base/reui/badge.tsx`, sin modificaciones; no es la primitiva Badge de shadcn/ui. Se conservan `size="icon"`, `variant="outline"`, el Badge destructivo `xs` y sus clases de posición. El ejemplo fijo 8 se sustituye por el contador actual de avisos no leídos, oculto a cero y abreviado a 99+; la etiqueta accesible conserva el total completo. La acción delega en el botón original de la aplicación, sin sustituir su lógica.

`project-settings.tsx` utiliza el último patrón DropdownMenu enviado por el propietario para las opciones del proyecto: Button outline/icon con EllipsisVerticalIcon, contenido w-48 alineado al final, etiqueta Acciones y eliminación destructiva separada. Se conservan las cinco acciones actuales mediante sus botones nativos; no se añaden submenús, atajos o acciones ficticias del ejemplo. Comparte fuente, primitiva y estilos originales con los otros componentes aislados.

`index.tsx` monta React exclusivamente en el perfil y la campana, en árboles Shadow DOM separados que comparten los mismos recursos locales. El resto de la app mantiene su HTML, JavaScript, navegación y persistencia. El menú usa Base UI original, con posicionamiento, Escape, teclado y retorno del foco. Ante un fallo del componente o de su CSS se recupera la presentación nativa anterior.

Construcción reproducible, desde la raíz del repositorio:

```sh
npm ci --prefix ui/team-profile --ignore-scripts --no-audit --no-fund
npm run build --prefix ui/team-profile
node --test scripts/reui-profile-build.test.mjs
```

Las dependencias están fijadas en `package.json`/`package-lock.json`. Se versionan los artefactos de `app/`, los originales y las licencias completas. El despliegue continúa siendo estático y no necesita Node en producción. El manifiesto SHA-256 detecta fuentes o artefactos pendientes de recompilar. La fuente se sirve localmente; no se carga React, CSS ni fuentes desde un CDN. Las imágenes de perfil conservan su origen autorizado actual.
