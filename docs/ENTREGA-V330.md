# Entrega v3.30 — preparada, pendiente del corte

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

Estado: estos cambios aún no están desplegados en producción. La confirmación del corte es un requisito operativo, no una nueva autorización para desarrollar o publicar.

Referencia de las opciones FTP usadas: [documentación de FTP-Deploy-Action v4.3.5](https://github.com/SamKirkland/FTP-Deploy-Action/tree/v4.3.5).
