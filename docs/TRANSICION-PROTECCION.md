# Transición de protección — candidato sin publicar

No ejecutar en producción hasta completar VALIDACION-PROTECCION.md y coordinar al equipo piloto.

## Preparación y entrega

1. Verificar copias recuperables de base de datos y archivos. Conservarlas fuera del repositorio público.
2. Acordar responsable y ventana sin edición. Cada miembro debe guardar y descargar sus pendientes antes de cerrar voluntariamente todas las sesiones antiguas. No forzar recargas ni borrar almacenamiento local. El nuevo botón seguro no cambia las páginas antiguas ya abiertas.
3. Ensayar el paquete exacto en el clon: cliente, sync-merge.js, private-files.js, SQL/guardar-bloque-versionado.sql, SQL/portales-filtrados.sql y portal-archivo. Revisar el destino antes de cada operación.
4. En la ventana acordada, coordinar la entrega de SQL, funciones y cliente compatible. Verificar visores de miembro, cliente y obra antes de cambiar archivos a privado; comprobar después acceso autorizado y rechazo anónimo directo. No mover ni borrar objetos ni reemplazar sus referencias.
5. Reabrir voluntariamente las sesiones y comprobar versión, guardado, adjuntos y pendientes antes de reanudar el trabajo.

portal-archivo valida el token y los documentos permitidos antes de firmar. La verificación JWT de pasarela se desactiva según supabase/config.toml, manteniendo la validación propia del manejador. La clave administrativa solo pertenece al servidor. Los enlaces firmados duran 60 segundos: uno ya emitido puede seguir funcionando hasta caducar tras desactivar un portal; reabrir el visor solicita otro si sigue autorizado.

## Incidencias

- Ante fallo de guardado, conservar pestaña y copia pendiente; no reemplazarla automáticamente por la nube.
- SQL/portales-suspender.sql suspende las RPC sin borrar registros; ensayo realizado en una transacción revertida. Recuperar el acceso aplicando de nuevo portales-filtrados.sql revisado. No exponer las RPC originales sin filtrar.
- SQL/guardar-bloque-versionado.rollback.sql recupera la escritura antigua y mantiene la RPC, pero reabre el riesgo de sobrescritura. Solo usar en reversión coordinada. Revertir únicamente HTML puede impedir guardar a clientes antiguos.
- No restaurar una copia antigua encima de producción automáticamente. Recuperar por separado, comparar y reconciliar cambios posteriores.

calendario-ics está recuperada y ensayada. El usuario confirma que Google Calendar nunca llegó a conectarse y lo aplaza a una entrega futura; no es requisito de esta transición. La validación del correo que entre en la entrega sigue pendiente. Esta transición no activa cobros, nuevos mensajes ni supervisores.
