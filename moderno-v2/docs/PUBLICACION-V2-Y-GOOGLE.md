# V2: publicación de avances y acceso con Google

## Requisito del propietario

La nueva versión debe poder verse publicada mientras se construye, conservar el acceso mediante Google y comenzar sin importar los datos de negocio de la aplicación actual.

La primera entrega funcional debe ofrecer una dirección HTTPS estable, inicio y cierre de sesión con Google y un espacio de pruebas vacío. Las entregas siguientes se publicarán en ese mismo destino una vez comprobadas.

## Funcionamiento esperado

- Usar exclusivamente el entorno de pruebas autorizado para desarrollar y validar V2.
- «Sin datos» significa sin importar proyectos, clientes, facturas, archivos ni otros registros de negocio reales. El acceso puede crear la identidad y el perfil mínimo del usuario autorizado en pruebas.
- Permitir crear ejemplos ficticios y conservarlos entre sesiones y publicaciones.
- Mantener independientes la publicación de avances, la aplicación actual y la futura migración.
- Verificar el acceso, el retorno a la app, la recarga y el cierre de sesión en la versión publicada. Una demostración visual no acredita un inicio de sesión real.
- Comunicar la URL y las funciones comprobadas en cada entrega.

## Migración posterior

Publicar una nueva entrega no ejecuta una migración. El traslado de información real se preparará y ensayará por separado y se ejecutará únicamente cuando el propietario lo indique expresamente.

El plan de cambio debe contemplar los cambios de última hora, las comprobaciones, la recuperación y la conservación del acceso y los permisos existentes. Los ejemplos de pruebas no se trasladarán automáticamente a producción.

## Estado de esta documentación

Este documento registra requisitos; no confirma que exista un destino V2 activo ni que Google esté ya verificado en pruebas. Esos resultados deben comprobarse al ejecutar el primer hito.
