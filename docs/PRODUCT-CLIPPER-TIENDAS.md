# Matriz de tiendas — 12/09/2026

Ensayo real desde la función desplegada en el clon v335, con usuario ficticio y sin cookies. Tres fichas devuelven una captura parcial utilizable; siete no pueden importarse en esta prueba. No son diez éxitos. Los importes son observaciones de estas URL en ese momento, no tarifas garantizadas.

| Tienda y ficha | Resultado remoto | Imágenes privadas | Precio/IVA observado |
| --- | --- | --- | --- |
| [SKLUM Teill](https://www.sklum.com/es/comprar-sillas-de-oficina/9844-silla-teill.html?id_c=21796) | Captura parcial; variante 21796 verificada | 2 | 89.95 EUR; anterior 96.95; IVA sin confirmar |
| [IKEA MARKUS](https://www.ikea.com/es/es/p/markus-silla-trabajo-vissle-gris-oscuro-70261150/) | Captura parcial | 10 | 159 EUR; IVA sin confirmar |
| [Zara Home lámpara](https://www.zarahome.com/es/lampara-mesa-base-gres-l47149047) | `no_product`: sin ficha reconocible | 0 | No capturado |
| [Leroy Merlin Luna](https://www.leroymerlin.es/productos/tikamoon-silla-en-madera-de-palisandro-luna-89963116.html) | Tienda HTTP 403 | 0 | No capturado |
| [Maisons du Monde Liam](https://cdn.maisonsdumonde.com/ES/es/p/silla-de-comedor-nordica-en-madera-de-haya-liam-M23153037.htm) | `capture_failed`; causa remota no determinada | 0 | No capturado |
| [Westwing Claire](https://www.westwing.es/silla-para-exterior-claire-132920.html) | Captura parcial | 10 | 149 EUR; IVA incluido indicado en el bloque de precio |
| [Amazon SONGMICS](https://www.amazon.es/SONGMICS-Giratoria-Regulable-Inclinaci%C3%B3n-Transpirable/dp/B082PWGGMD) | `not_html`: respuesta no utilizable como ficha | 0 | No capturado remotamente |
| [Tikamoon Luna](https://www.tikamoon.es/art-silla-en-palisandro-macizo-luna-1284.htm) | Tienda HTTP 403 | 0 | No capturado |
| [Kave Home Ciselia](https://kavehome.com/es/ca/p/cadira-ciselia-de-xenilla-beix-i-acer-beix-fsc-mix-credit) | `capture_failed`; causa remota no determinada | 0 | No capturado |
| [La Redoute Panni](https://www.laredoute.es/ppdp/prod-350271835.aspx) | Tienda HTTP 403 | 0 | No capturado |

El endpoint devuelve HTTP 400 con código de error cuando una tienda no puede capturarse; no confundir ese HTTP con el estado de la tienda. Los errores se guardan en staging, no se convierten automáticamente en artículos.

En una lectura local previa, Amazon sí expuso un producto, una imagen principal y 71.99 EUR; eso **no** demuestra compatibilidad desde Supabase. Los adaptadores presentes se basan en HTML observado de SKLUM, IKEA, Westwing y Amazon; los otros casos no se anuncian como adaptadores terminados. Las galerías se consideran parciales aun cuando se hayan guardado varias fotos. Los campos ausentes quedan marcados para revisión manual.
