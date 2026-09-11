# Identidad de Moderno.app — v3.51

El símbolo aprobado procede de `path28-8.svg`, aportado por el propietario. Su copia original está en `app/brand/simbolo-original.svg`. Las versiones grafito y clara conservan exactamente el trazado, la transformación y las proporciones; únicamente cambia el color. El favicon incorpora margen y un fondo beige para ser legible en ambas apariencias del navegador.

La identidad se aplica al acceso, al menú abierto y contraído y a la cabecera móvil. `app/brand/identity.css` define sus dimensiones y la variante clara en modo oscuro. Los recursos llevan versión de caché 351.

Los logos propios de los estudios no cambian. Los documentos y portales que antes utilizaban el logo general conservan el recurso anterior mediante `legacyDocumentLogo()` y `pdfFoot()`. No hay cambios de tablas, archivos privados ni datos de usuarios.

## Generar los recursos

Con Node y Sharp disponibles, ejecutar desde el repositorio:

```sh
node scripts/build-brand-assets.mjs /ruta/al/modulo/sharp
node --test scripts/*.test.mjs
php scripts/invitation-auth.test.php
```

Se generan SVG claros y oscuros y PNG de 16, 32, 48, 180, 192 y 512 píxeles. Se conservan los SVG previos y los antiguos iconos PNG para poder revertir.

## Validación del candidato

- 286 pruebas JavaScript correctas y 24 comprobaciones PHP de permisos, sin enviar correos.
- Revisión visual local del acceso claro y oscuro, cabecera móvil de 390 píxeles y menú abierto y contraído. El símbolo no invade el control del menú.
- La previsualización visual no utiliza conexión con datos del estudio; las pruebas de datos pertenecen a sus verificaciones independientes.

## Publicación y vuelta atrás

El flujo de GitHub publica primero los recursos y después el HTML por FTPS. Antes de dar la publicación por terminada, comprobar el resultado del flujo, la versión servida y los nuevos recursos públicos.

Para revertir, crear un commit inverso del cambio de identidad, conservando cualquier arreglo posterior, y publicarlo por el mismo flujo. No restaurar bases de datos por un cambio visual. La versión anterior es v3.50 (commit de publicación `17a59c6f8b9be25a4f4cece4eea90c0c6098501b`).
