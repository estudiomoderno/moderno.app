# OCR local del Secretario

Estos archivos se sirven desde el mismo origen de Moderno.app y solo se cargan
cuando una imagen o una pagina escaneada necesita OCR. No se consulta ningun
CDN ni proveedor durante el reconocimiento.

| Paquete npm | Version | Archivo usado | SHA-256 |
|---|---:|---|---|
| `tesseract.js` | 6.0.1 | `tesseract.min.js` | `10fff78484067759c43028a02a72d76d0b90eb17302bb23b58a9ec5410bc928b` |
| `tesseract.js` | 6.0.1 | `worker.min.js` | `38645599043239c0eb6db08a6504a92dcdc292200535f3e9339cd77c4443b842` |
| `tesseract.js-core` | 6.0.0 | `core/tesseract-core-lstm.wasm.js` | `775a35df6f2ae100e02609443e6bd5cafcd07983dd6175454ca4a432a7730687` |
| `tesseract.js-core` | 6.0.0 | `core/tesseract-core-simd-lstm.wasm.js` | `9d7c43fb206dc9f48475228b46bf35f888fa9e6259da2e67d5a75c77049f2dc7` |
| `@tesseract.js-data/spa` | 1.0.0 | `lang/spa.traineddata.gz` (`4.0.0_best_int`) | `40be52f97b5d4eb7460073dc1f94cd546b27150333c0bf854ed7e7132db6bceb` |

Procedencia reproducible: tarballs publicos del registro npm obtenidos con
`npm pack` el 27-11-2026. Shasum publicados por npm: `tesseract.js` 6.0.1
`5b2ff39aae92d59cef79589a43a0f3ab963801cc`; `tesseract.js-core` 6.0.0
`6f25da94f70f8e8f02aff47a43be61d49e6f67c3`; datos `spa` 1.0.0
`8cd3c04f10519916a6b85101001c4628a1a0a257`.

`tesseract.js` y `tesseract.js-core` se distribuyen bajo Apache-2.0; sus
licencias completas estan en `licenses/`. El paquete de datos `spa` declara
MIT. Los avisos de dependencias incluidas por los bundles estan en
`licenses/tesseract.min.js.LICENSE.txt` y `licenses/worker.min.js.LICENSE.txt`.
