# Registro de pruebas Windows — 21/10/2026

## Candidato 0.2.0

- Rama exclusiva `experimento/windows-espejo`; base beta `8c3e12a`.
- Linux: compilación cruzada .NET 10.0.402 correcta. Advertencia MSB3277 del ensamblado WPF
  transitivo de WebView2; este programa usa WinForms. Verificar también el runner Windows.
- Pruebas de política: 18 casos y clasificación Google correctos, sin red ni credenciales.
- Icono convertido desde el favicon oficial y previsualizado; varios tamaños dentro del ICO.
- CI Windows del commit `4d1ead9`: [39551407011](https://github.com/estudiomoderno/moderno.app/actions/runs/39551407011),
  shell WebView2, instalación, reinstalación y desinstalación correctas. Prueba sobre runner
  Windows, no equivale a aceptación en un PC personal Windows 11.
- Dos ejecuciones anteriores detectaron el fallo de navegación de popup; corregido difiriendo
  la navegación hasta salir de `NewWindowRequested`. La prueba queda como regresión.
- Empaquetado final con avisos .NET/WebView2: enlace definitivo y SHA-256 en #109.

| Prueba | Evidencia / estado |
| --- | --- |
| Compilación anterior 0.1 | Actions 39480198916 correcta; no era instalador |
| Instalación/reinstalación/desinstalación | Script CI verifica EXE, dependencias, acceso Inicio y perfil ficticio conservado |
| Navegación y popup interno | Harness WebView2 usa respuestas sintéticas, mismo shell |
| Actualización web sin reinstalar | Harness cambia v1 → v2; no cambia hasta recarga explícita |
| Cookies y almacenamiento | Harness conserva valores ficticios durante navegación/recarga; reinicio de proceso pendiente |
| Error HTTP y Reintentar | Harness simula 503 y recuperación; no equivale a caída física de internet |
| Google | Bloqueo explicado; no hay retorno seguro implementado; OAuth real NO probado |
| Descargas | Guardar como implementado; diálogo, cancelación, sobrescritura y archivos reales pendientes en Windows |
| Adaptador desconectado/reconexión | Eventos simulados correctos en CI, incluido evento repetido y borrador DOM conservado; prueba física pendiente |
| Windows 10/11 personal | Instalación, DPI, SmartScreen, runtime ausente y uso prolongado pendientes |
| Login/sesiones reales | Bloqueado hasta entorno aislado confirmado; ninguna escritura en producción |
| PDF, impresión, portapapeles, subida, 3+ módulos | Pendientes en aislamiento |

Los scripts presentes no constituyen por sí solos pruebas pasadas: la ejecución verde y sus
logs son la evidencia. Consultar #109 para el resultado final de cada build.

## Protocolo de siguiente ronda

1. En equipo Windows 10/11 x64: seguir instalación y pruebas sin login del README.
2. Registrar versión Windows, runtime WebView2 (Aplicaciones instaladas), beta y resultado.
3. No avanzar a pruebas autenticadas hasta confirmar destino de pruebas separado. La URL
   fija productiva impide usar esta beta para ensayar escrituras, aunque la cuenta sea ficticia.
4. En harness/entorno aislado: login permitido, cerrar/reabrir, logout, expiración, tres módulos;
   descarga ficticia, cancelar/sobrescribir, subida sintética, PDF y enlaces externos;
   caída de adaptador, router sin internet, recuperación y formularios sin recarga automática.
5. Si aparece Google en navegador externo, eso NO acredita sesión en el programa.
6. No distribuir como estable hasta resolver P0 Google y completar la matriz con evidencias.

Formato de resultado: fecha, commit/beta, Windows/runtime, caso, resultado esperado/observado,
PASÓ/FALLÓ/BLOQUEADO, pasos mínimos. Nunca adjuntar tokens, perfil ni datos de clientes.
