// Deterministic vector conversion; preserves the supplied path and transform.
// node scripts/build-brand-assets.mjs /path/to/sharp
import fs from 'node:fs/promises';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const dir=new URL('../app/brand/',import.meta.url);
const original=await fs.readFile(new URL('simbolo-original.svg',dir),'utf8');
if(/<script|<foreignObject|<!DOCTYPE|\bhref\s*=|\bon\w+\s*=|url\(/i.test(original))throw Error('Unexpected active SVG content');
const d=original.match(/\sd="([^"]+)"/)[1],transform=original.match(/\stransform="([^"]+)"/)[1],box=original.match(/viewBox="([^"]+)"/)[1];
const logo=fill=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="Moderno.app"><path fill="${fill}" transform="${transform}" d="${d}"/></svg>\n`;
await fs.writeFile(new URL('simbolo-grafito.svg',dir),logo('#323338'));
await fs.writeFile(new URL('simbolo-claro.svg',dir),logo('#f2f0eb'));
const [, ,width,height]=box.split(/\s+/).map(Number),size=Math.max(width,height),pad=size*.12;
const square=`${-pad} ${(height-size)/2-pad} ${size+pad*2} ${size+pad*2}`;
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${square}"><rect x="${-pad}" y="${(height-size)/2-pad}" width="${size+pad*2}" height="${size+pad*2}" rx="${size*.22}" fill="#f3f0e9"/><path fill="#323338" transform="${transform}" d="${d}"/></svg>`;
await fs.writeFile(new URL('favicon.svg',dir),icon+'\n');
for(const n of [16,32,48,180,192,512])await sharp(Buffer.from(icon)).resize(n,n).png().toFile(fileURLToPath(new URL(`icon-${n}.png`,dir)));
console.log('Brand vectors and six PNG sizes generated.');
