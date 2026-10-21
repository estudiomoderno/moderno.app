# Copia local actual de más de 5 MB — v3.65.96

## Motivo y alcance

El usuario confirma el detalle del aviso: «No hay espacio para la copia local. La copia actual ocupa 5.0 MB», con 55 copias anteriores pendientes de revisión. La instantánea actual ya no cabe en localStorage. Archivar históricos o evitar duplicarla al conectar no resuelve este caso. El aviso local no demuestra por sí solo si la nube confirmó los duplicados.

Cuando la escritura normal supera la cuota, la instantánea completa se escribe en el IndexedDB ya utilizado para conservar copias. Se verifica el contenido, se publica y verifica un pequeño marcador local, y solo entonces deja de considerarse fallida la conservación local. El envío a nube mantiene sus contratos, permisos, conflictos y confirmación independientes.

Cada escritura usa una clave única, se serializa por pestaña y comprueba revisión e identidad. La copia activa anterior permanece intacta hasta verificar la nueva. Después se retira únicamente el antiguo registro activo que ya no tenga referencias locales; nunca se borran los históricos. Las escrituras intermedias obsoletas no publican marcadores ni dan confirmación. El mismo contenido verificado no vuelve a escribirse al cerrar, evitando bloquear cada recarga por una escritura asíncrona innecesaria.

El arranque espera a resolver el marcador antes de inicializar rutas y sesión. Si no puede leerlo, muestra un reintento visible, conserva el marcador y bloquea persistencia/renderizado de un estado vacío. Antes de sustituir caché con nube, materializa y verifica una copia histórica independiente del contenido completo si estaba pendiente. No se importa una copia anterior automáticamente. Actualizar ahora y Reintentar guardado esperan la conservación ampliada; beforeunload advierte si sigue en curso o falla. Exportar copia descarga el estado actual completo, nunca el marcador ni una copia obsoleta.

## Pruebas

Servidor oficial aislado con namespace de pruebas, SDK desactivado, red externa bloqueada y cero escrituras reales. Chromium 1440/390 px: cuota real con más de 6 MB, 55 históricos, edición mientras se escribe, lectura verificada, recarga real, conservación histórica inmutable, fallo IndexedDB con descarga del JSON actual y reintento nativo, fallo de lectura de arranque con reintento accesible y carga completa de nube simulada después de conservar la copia grande. También se ejecutan las regresiones de archivo automático, copia pendiente grande al conectar, Actualizar ahora y duplicación desde ajustes.

Pruebas Node del módulo comprueban escritura/lectura/marcador, fallos y cambios de identidad/pestaña, no confirmación falsa, conservación del flag pendiente y de referencias históricas antiguas. 566 pruebas Node correctas; PHP se comprueba en CI; los datos y claves de las pruebas son ficticios. No se aplican SQL, cambios de RPC/RLS, Storage remoto ni restauraciones reales.

## Publicación, transición y reversión

Continuación de la incidencia de conservación/sincronización que el propietario autorizó corregir; no autoriza ensayos ni restauraciones de datos reales. Se mantiene conocida la incidencia separada del monitor de respaldos de archivos (último éxito comunicado 18/10; monitor fallido 21/10), sin afirmar reparada ni verificada una copia nueva. La verificación histórica de BD no equivale a una prueba nueva de recuperación.

La pestaña antigua que ya supera la cuota puede seguir rechazando Actualizar ahora antes de cargar esta corrección. Conservarla abierta y descargar/validar su JSON actual antes de una transición manual. Las listas desaparecidas requieren revisar el archivo del usuario y preparar una recuperación selectiva, sin importar toda la copia sobre la nube. No se han recuperado ni inspeccionado sus datos en esta entrega.

Una vez emitidos marcadores de copia activa, no revertir a una versión que no pueda leerlos. Una reversión debe conservar el lector y la conservación de esos marcadores, o verificar/exportar primero todas las copias afectadas. Preferir corrección hacia delante. Nunca limpiar localStorage/IndexedDB ni restaurar datos de nube como reversión de código. IndexedDB también tiene cuotas y depende del espacio disponible; este cambio evita el límite pequeño de localStorage, no promete capacidad ilimitada ni protección frente a borrar el navegador o un cierre forzado.
