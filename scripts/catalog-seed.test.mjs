import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import C from '../app/catalog-core.js';
const data=JSON.parse(fs.readFileSync(new URL('../app/catalog-seeds/es-ES-2026.09.11-1.json',import.meta.url),'utf8'));
test('curated Spanish seed is complete, uniquely identified and excludes standalone products',()=>{
 assert.equal(data.items.length,1068);assert.equal(new Set(data.items.map(x=>x.code)).size,1068);
 for(const x of data.items){assert.ok(['Servicio','Partida'].includes(x.tipo));assert.ok(x.name&&x.desc&&x.unit);assert.equal(x.cost,null);assert.ok(x.price===null||Number.isFinite(x.price)&&x.price>=0);assert.equal(x.currency,'EUR');assert.equal(x.taxIncluded,false);}
 assert.equal(data.items.filter(x=>!x.extra).length,290);assert.equal(data.items.filter(x=>x.price===null).length,92);
});
test('all seed items can be searched and copied without mutating the template',()=>{
 const before=JSON.stringify(data);
 for(const x of data.items){assert.ok(C.search(data.items,{q:x.code}).some(r=>r.code===x.code));const l=C.line(x,x.price===null?{unitPrice:123}:{});assert.equal(l.catId,x.id);assert.equal(l.cost,null);assert.equal(l.unit,x.unit);}
 assert.equal(JSON.stringify(data),before);
});
test('public seed contains no source workbook names, local paths or email addresses',()=>{
 const text=JSON.stringify(data);assert.doesNotMatch(text,/\.xlsx|[A-Z]:\\|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
});
