# Reubicación de accesos — v3.65.38

Petición del propietario del 18/10/2026. Rama `interfaz/reubicar-herramientas`, base y app anterior v3.65.37 en `92146ec` (#61). Continuación visual incremental de #49.

## Resultado y alcance

En la cabecera de escritorio desaparece el grupo Más herramientas y su acceso Documentos. El código y las rutas de documentos/plantillas se conservan por compatibilidad; no se borra ningún documento. El apartado Documentos de cada proyecto mantiene sus tarjetas y archivos originales.

El menú del usuario reúne Automatizaciones, Plugins e Integraciones, usando los iconos, handlers y comprobación canView originales. No se duplican accesos de Integraciones. Se conservan perfil, ajustes, selector de estudio/espacios y notificaciones. El menú de Finanzas y el fondo fijo del símbolo permanecen.

Conversaciones aparece inmediatamente a la derecha de AI, dentro de su mismo grupo del dock, con icono de diálogo y nombre emergente. Se navega manteniendo `view=proyecto` y el identificador del proyecto. Reutiliza la presentación «Próximamente» del apartado anterior: no constituye un chat implementado, no envía mensajes ni almacena conversaciones. No cambia el alias histórico `chat → cliente` ni el Portal del cliente. El acceso global visible a Conversaciones se retira también de la barra lateral; la ruta original permanece compatible.

Los permisos no cambian: Conversaciones y las herramientas del perfil siguen excluidas para los perfiles que no tenían acceso. La navegación directa a la nueva pestaña también comprueba canView. En móvil/tablet se conserva el patrón de navegación vigente y el dock desplazable incorpora el mismo acceso de proyecto; las herramientas siguen accesibles desde su navegación original fuera de la cabecera de escritorio.

Sin cambios de base de datos, Auth, RLS, Storage, guardado, sincronización, archivos, copias, mailer ni workflows. No se implementan servicios nuevos ni la IA aplazada.

## Comprobaciones y límites

- 457 pruebas Node correctas, incluidas denegaciones de navegación a Utilidades/Conversaciones sin cambiar el panel activo.
- Chromium aislado 1440/1280/1100/1024/390 px y aplicación completa con servidor oficial 1440/1100/390 px; identidad y datos ficticios, SDK desactivado y red externa bloqueada.
- Documentos/Conversaciones ausentes de la cabecera, tres herramientas exclusivamente dentro del perfil de escritorio y apertura desde sus accesos reales. Restricciones simuladas de permisos.
- Diez accesos y cinco separadores en el dock de administrador; Conversaciones junto a AI, foco/teclado, límites de la cápsula y conservación del contexto de proyecto. Documentos conserva cuatro archivos ficticios y Planos sus índices originales.
- Borradores y confirmación de salida, menús anidados, notificaciones, todas las vistas conservadas y colecciones ficticias intactas; sin escrituras remotas. Revisión visual clara/oscura y del menú del perfil.
- PHP/autorización sin enviar correo se comprueban en Actions. No se prueban autenticación ni RPC/guardado de Supabase con datos reales; no se certifica un servicio de conversaciones que continúa preparatorio.

## Publicación y reversión

Después de CI del PR, `deploy-app.yml` publica recursos y después HTML, verificando SHA-256 de los 12 recursos públicos. El PR registra el resultado final y los enlaces antes de confirmar publicación.

Retorno inmediato de la cabecera: `ModernoDesktopShell.setEnabled(false)`, sin recarga ni escritura. Retorno completo permanente: revertir este lote y su versión/cache mediante el mismo proceso, conservando cambios posteriores. La app anterior está en `92146ec`; no restaurar datos para deshacer cambios de navegación.
