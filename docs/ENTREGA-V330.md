# Entrega v3.30 — publicada el 9 de septiembre de 2026

## Resultado de publicación

- Publicada en `https://app.moderno.app/`. Código de aplicación `1bc6a7d`; ajuste del workflow `8421f83`.
- [Despliegue 34370512628](https://github.com/estudiomoderno/moderno.app/actions/runs/34370512628) completado correctamente. El primer intento se detuvo antes de subir archivos porque el checkout superficial no contenía el commit usado por la prueba de transición. Se corrigió con `fetch-depth: 0`, conservando todas las pruebas.
- Equipo confirmó guardado y cierre de sesiones. Autorizó expresamente cambios de funciones, políticas, disparadores, tablas de clasificación y privacidad.
- Respaldo previo y comparación posterior comprobados. Los respaldos y el informe operativo detallado se conservan fuera del repositorio público.
- Paquete SQL SHA-256 `6a5280ec51df13fab2921c4c5af6aa0e69a660fbae383d67ab79894c656cba39` aplicado correctamente en una transacción. Funciones `portal-archivo` e ICS desplegadas; validan sus propios tokens.
- Almacén `archivos` cambiado de público a privado después de publicar el cliente y las funciones. Sin borrar, mover ni reemplazar objetos. Una ruta existente rechaza acceso público.
- HTTP 200 y contenido exacto del candidato para `index.html` y los cuatro módulos JavaScript. Portal con token inválido: 403; ICS con token inválido: 404.
- Acceso, estado de sincronización, apertura y descarga de PDF comprobados. Las escrituras y restricciones por rol se probaron con identidades ficticias en un entorno aislado.
- Las copias locales pendientes deben conservarse y revisarse aparte, sin aplicarlas automáticamente sobre la nube.
- Se avisó al equipo de que podía volver a entrar tras estas comprobaciones. Google Calendar continúa aplazado.

## Comprobaciones del 9 de septiembre de 2026

- 122 pruebas locales correctas y 40 comprobaciones SQL correctas en el clon.
- Paquete completo de seis SQL instalado en el clon. Generador: `node scripts/build-release-sql.mjs paquete.sql`. No ejecuta SQL por sí mismo.
- Tres identidades ficticias: administrador, colaborador y Gestoría. Subidas HTTP de administrador y colaborador correctas; descargas autorizadas comparadas byte a byte; documentos contables rechazados al colaborador; Gestoría descarga el PDF contable y no puede subir ni guardar datos.
- Dos sesiones HTTP: la versión antigua recibe 409; releer y guardar conserva ambos cambios y los importes privados.
- Interfaz: Gestoría carga su consulta y abre el PDF de una página; colaborador abre su adjunto, utiliza la vista Lista y guarda una tarea. La lectura posterior de la base confirma el título editado, el importe y el documento contable oculto intactos. El administrador confirma guardado en nube.
- La descarga desde el visor PDF del navegador integrado no produjo un archivo local verificable; la recepción íntegra está acreditada por la comparación HTTP y la apertura del visor. No atribuir a esta prueba una descarga local comprobada.
- Se corrigieron el intento de escribir bloques reservados desde una cuenta colaboradora, la creación automática de `payPlan` al mostrar resúmenes y el selector de espacios con claves antiguas. Los contactos conservan NIF, código postal y carpeta; las altas de proyecto admiten autoría.
- Suscripción ICS existente actualizada en el clon: tres eventos ficticios correctos, token inválido rechazado y baja de membresía rechazada. Esto no conecta Google Calendar.
- Inventario del clon: 142 objetos contando ensayos; 23 referenciados como trabajo, 103 privados y ninguna coincidencia entre ambas clasificaciones. Los restantes no reciben acceso compartido por defecto; administrador conserva acceso. No se han borrado ni movido archivos.
- Copia real de archivos: [ejecución 34366760607](https://github.com/estudiomoderno/moderno.app/actions/runs/34366760607), completada correctamente a las 16:57 de Madrid, registro `Copy verified.`. No es una exportación de base de datos.

## Publicación coordinada

1. Obtener confirmación actual del equipo: formularios guardados, sin errores ni pendientes y cierre voluntario de todas las sesiones antiguas. No usar esa confirmación para descartar copias locales.
2. Comprobar respaldo de base de datos y conservar exportación actual antes de aplicar permisos. No restaurar sobre producción.
3. Aplicar el paquete SQL y las funciones `portal-archivo` y `calendario-ics` con sus dependencias. La pasarela JWT de ambas está desactivada porque validan sus propios tokens; no retirar esa validación interna.
4. Publicar la rama verificada en main. El workflow ejecuta pruebas, sube primero los recursos y después index.html, con estados FTP separados. No borra la API PHP existente. No permite despliegue manual desde otra rama.
5. Coordinar privacidad de Storage con el cliente y las funciones ya disponibles. No mover ni reemplazar objetos.
6. Verificar versión pública, carga de recursos, acceso, guardado y apertura de archivos antes de pedir al equipo que retome el trabajo.

Estado: corte realizado y versión publicada. La secuencia anterior queda como guía para próximas entregas; las comprobaciones iniciales describen el ensayo previo.

Referencia de las opciones FTP usadas: [documentación de FTP-Deploy-Action v4.3.5](https://github.com/SamKirkland/FTP-Deploy-Action/tree/v4.3.5).
