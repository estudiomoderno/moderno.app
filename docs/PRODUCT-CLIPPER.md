# Product Clipper — v3.50

Estado a 12/09/2026: v3.50 publicada en app.moderno.app tras autorización expresa adicional para producción. Backend y SQL se ensayaron primero en **Moderno App - Recuperacion aislada v335 20260911** (`szbswxpkhidywaosdfcg`). En producción se instalaron tablas y función antes del frontend; la huella de todos los bloques existentes permaneció idéntica después de la instalación. Storage sigue privado y no se crearon capturas de prueba en producción.

## Funcionamiento y contrato

`POST /functions/v1/product-clipper` acepta `action: capture` con `id` UUID estable por intento, `studyId`, `url` y `destination`. Para consultar: `action: read` e `id`. Exige JWT de usuario validado mediante Auth.getUser; una clave pública por sí sola no autoriza. El gateway legacy JWT está desactivado porque solo admite la firma antigua, pero la validación del usuario sigue siendo obligatoria dentro de la función.

Destino Biblioteca: `{kind: 'biblioteca', brand: '<workspace existente>'}`. Destino lista: `{kind: 'lista', projectId, roomId, sectionId}`. El servidor comprueba membresía y destino, conserva sus identificadores y nombres y crea una fila propia en `productos_entrantes`. Capturar nunca modifica los bloques del estudio.

El usuario revisa los campos, elige categoría, unidad e imagen principal y confirma. `clipper_absorber` bloquea y relee el bloque actual, comprueba de nuevo el destino y añade un Borrador. Repetir la misma petición devuelve el mismo identificador; no crea duplicados. No aprueba, compra, manda correos ni modifica presupuestos o sus borradores. Las ediciones concurrentes ajenas se conservan; un destino cambiado se rechaza.

Los campos conservan valor, estado y procedencia. Lectura por JSON-LD Product, microdatos, Open Graph con evidencia de producto y adaptadores DOM acotados. No interpreta instrucciones de la página ni usa IA para inventar campos. Precios se guardan como cadenas decimales exactas junto a moneda, texto original y evidencia fiscal. No convierte rangos, ofertas agregadas ni variantes ambiguas a un importe concreto. Solo un precio EUR con IVA explícitamente incluido y variante verificada puede aplicarse tras confirmación. Los importes netos o impuestos desconocidos quedan para revisión manual; no se presupone el 21 %. Medidas se convierten a cm solo con eje y unidad conocidos; los rangos permanecen como texto.

Las imágenes se descargan en el backend y se guardan en el bucket **privado** `archivos`, bajo `<estudio>/clipper/<captura>/<sha256>.<ext>`. Las referencias canónicas de Storage se resuelven con firma temporal; no son acceso público ni hotlinks finales a la tienda. La primera imagen es la principal propuesta, editable al revisar. Las alternativas de resolución se comparan mediante dimensiones reales. No se garantiza que la galería de la tienda sea completa.

## Red y límites

- Solo HTTP(S), puertos estándar, sin credenciales en URL. Comprueba todas las respuestas DNS y cada salto de redirección, incluidas imágenes; rechaza IP internas, loopback, enlace local, metadatos, IPv4 mapeada y rangos reservados.
- Conecta a la IP comprobada. En Supabase no sirve `node:https` con `lookup` personalizado: el shim lanza `ERR_NOT_IMPLEMENTED`. `deno-transport.mjs` usa `Deno.connect` a la IP seguida de `Deno.startTls` con el nombre original y validación normal del certificado. No desactiva TLS ni vuelve a resolver el host para conectar.
- HTTP/1.1 limitado, cabeceras 32 KiB, longitud/fragmentos comprobados, sin respuestas comprimidas, encuadres ambiguos ni SVG remotos. JPEG, PNG, WebP y AVIF deben coincidir con MIME y cabecera binaria.
- HTML 3 MiB; imagen 4 MiB; 12 imágenes como máximo, hasta 3 resoluciones por imagen; presupuesto de imágenes 20 MiB; dimensión mínima 120 px, máxima 12.000 px y 40 megapíxeles. Una descarga iniciada puede exceder el presupuesto agregado hasta el límite individual antes de rechazarse; no se almacena esa imagen.
- Captura 65 s, página 15 s, imagen 10 s, hasta 5 saltos. Por estudio: 100 intentos/día y 3 capturas simultáneas recientes; por usuario: 15/hora. Los errores también consumen cuota.
- Limpieza oportunista solo de capturas propias caducadas a los 7 días, nunca absorbidas ni referenciadas por bloques. Si falla, no borra otras rutas ni bloquea nuevas capturas.

No se usan cookies de usuario, proxies para sortear bloqueos, CAPTCHA ni sesiones de tiendas.

## Despliegue y continuidad

1. Leer esta nota y la matriz de tiendas. Obtener una copia recuperable y comprobar su estado antes de cualquier despliegue de producción. **El ensayo aislado no equivale a una publicación aprobada técnicamente para todos los usuarios.**
2. Herramientas: Node, pnpm y Deno. `pnpm --dir tools/product-clipper install --frozen-lockfile --ignore-scripts`, después `pnpm --dir tools/product-clipper build`. Versiones fijadas y licencias junto al bundle.
3. Ejecutar `node --test scripts/*.test.mjs`. Para PostgreSQL local sin red: `node scripts/product-clipper-sql.mjs /ruta/a/@electric-sql/pglite/dist/index.js` (ensayado con PGlite 0.5.8).
4. Aplicar `SQL/productos-entrantes.sql` mediante transacción en el proyecto elegido. Es aditivo; requiere `app_rol`, `app_rol_usuario`, `datos_estudio`, `estudios` y las políticas privadas de Storage ya existentes. No reemplazar estas políticas por reglas públicas.
5. Desplegar `supabase/functions/product-clipper/index.ts` con los módulos de su carpeta y la configuración de `supabase/config.toml`. En editor web se puede empaquetar con esbuild, plataforma node, formato esm, externos `npm:*` y `canvas`. No pegar un paquete truncado.
6. Variables automáticas Supabase permanecen en el servidor. `ANTHROPIC_API_KEY` es opcional y **no se ha añadido ni verificado en este ensayo**: el flujo manual se ha probado sin depender de IA. Si se configura, Haiku solo sugiere categoría/estancia de listas cerradas; nunca cambia el destino, precio o aprobación. `CLIPPER_TEST_ORIGINS` admite orígenes de ensayo explícitos; en producción vacía salvo necesidad justificada. Nunca guardar claves en archivos, commits ni documentación.
7. Probar dos usuarios y estudios ficticios sin reutilizar cuentas del piloto; verificar captura, lectura privada, imágenes, absorción idempotente y documentos de control. Registrar resultados reales, incluidos bloqueos de tiendas.
8. La publicación del frontend debe hacerse después del backend, con versión y caché coherentes, pruebas visuales y verificación de la copia de seguridad. Ejecutado el 12/09 tras la autorización de producción y las comprobaciones previas.

Reversión: deshabilitar el botón/importador en una versión del frontend y dejar las tablas/ficheros existentes conservados. No borrar capturas absorbidas ni imágenes utilizadas, ni restaurar todo el estudio sobre ediciones posteriores. Un fallo de captura queda separado y no debe convertirse en producto automáticamente.

## Validación realizada

284 pruebas Node y 19 comprobaciones PostgreSQL locales correctas. En Supabase pasaron 28 comprobaciones funcionales con dos identidades ficticias: sin sesión/JWT falso rechazados; acceso ajeno denegado; URL interna rechazada; dos imágenes guardadas por captura SKLUM; URL firmada HTTP 200 y pública denegada; finalización directa del cliente prohibida; Biblioteca y lista guardadas como Borrador; repetición devuelve el mismo ID; el precio con IVA desconocido permanece vacío; presupuestos y borradores ficticios intactos. La matriz remota está en `PRODUCT-CLIPPER-TIENDAS.md`.

## Futura extensión

No hay extensión Chrome entregada. Una futura MV3 puede separar content script (datos DOM de la pestaña), service worker (sesión/transporte) y panel lateral (destino/revisión). Enviará el mismo contrato de staging; nunca escribirá directamente en bloques ni incluirá service_role o claves de IA. La captura de contenido visible requerirá contrato y validaciones adicionales; no elimina los controles de origen, archivos, destinos o confirmación.

Referencias: [Supabase Auth en funciones](https://supabase.com/docs/guides/functions/auth), [Deno red/TLS](https://docs.deno.com/api/deno/network/), [shim HTTP de Supabase](https://github.com/supabase/edge-runtime/blob/main/ext/node/polyfills/http.ts), [Product](https://schema.org/Product), [service workers MV3](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers).

## Publicación verificada

### Corrección de guardado v3.51.1

Se reprodujo el recorrido de Biblioteca con la app completa y una identidad ficticia en el clon autorizado `szbswxpkhidywaosdfcg`, usando la ficha SKLUM del escritorio Takeo 96601. La captura no incluía categoría ni unidad; el botón bloqueaba correctamente el guardado, pero el aviso aparecía fuera de la zona visible. Al completar ambos campos, el mismo backend guardó correctamente.

La interfaz identifica ahora los campos obligatorios, enfoca el campo pendiente y repite el aviso junto a Guardar. No inventa unidad, categoría ni precio. Después de la absorción comprueba el ID y la captura en el bloque remoto y en el estado local antes de cerrar; si no puede consultar o hay cambios locales incompatibles, conserva la captura. Consultar una captura ya absorbida vuelve a su producto sin generar otra copia. Al terminar se muestra el destino y se eliminan los filtros locales que podrían ocultar el producto.

Validación del candidato: 292 pruebas JavaScript, 24 comprobaciones PHP y 19 PostgreSQL locales. Ensayo visual con la app completa, sincronización real del clon y usuario ficticio: Biblioteca y Listas muestran el producto pese a una búsqueda anterior incompatible; ambos persisten al recargar. El transporte local del ensayo dirige solo la función a ese clon; no usa credenciales privilegiadas. El backend y las tablas de producción no cambian en esta corrección.

Reintento remoto de las mismas dos capturas bajo la identidad ficticia: `already_absorbed` con los mismos IDs. Una consulta posterior confirma exactamente un producto por captura y presupuestos/borradores de control sin cambios. Las pruebas simuladas de desconexión durante la lectura posterior, error de RPC y conflicto local mantienen la captura y no anuncian un éxito falso.

Commit de publicación: 17a59c6f8b9be25a4f4cece4eea90c0c6098501b. [Actions completado correctamente](https://github.com/estudiomoderno/moderno.app/actions/runs/34657101246). HTML, JS y CSS respondieron HTTP 200 y coincidieron con el candidato; HTML identifica v3.50. Función a través de auth.moderno.app: sin sesión y JWT inválido devuelven 401; preflight del origen app.moderno.app devuelve 204. La copia física de base de datos disponible era del 11/09 a las 00:31:45 UTC; copia de archivos programada correcta del 11/09 a las 02:32:53 UTC. No se ejecutó ninguna restauración.

Comprobación visual en producción: el estudio terminó de cargar, Biblioteca mostró el botón de importación y abrió el diálogo con URL, revisión y estado Borrador. Se cerraron ambos formularios sin capturar ni guardar productos del piloto.
