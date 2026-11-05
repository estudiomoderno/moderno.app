import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),cad=require('../app/cad-viewer.js'),docs=require('../app/project-documents.js');

const fixture=`0\nSECTION\n2\nTABLES\n0\nLAYER\n2\nMuros\n62\n1\n0\nLAYER\n2\nMobiliario\n62\n5\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nMuros\n10\n0\n20\n0\n11\n600\n21\n0\n0\nLWPOLYLINE\n8\nMobiliario\n70\n1\n10\n100\n20\n100\n10\n300\n20\n100\n10\n300\n20\n250\n10\n100\n20\n250\n0\nCIRCLE\n8\nMobiliario\n10\n200\n20\n175\n40\n35\n0\nTEXT\n8\nMuros\n10\n20\n20\n30\n1\nPlano de prueba\n0\nENDSEC\n0\nEOF\n`;

test('ASCII DXF is parsed locally with layers and supported geometry',()=>{
 const model=cad.parse(fixture);assert.equal(model.entities.length,4);assert.deepEqual(model.layers.map(x=>x.name),['0','Muros','Mobiliario']);assert.equal(model.entities[1].closed,true);assert.equal(model.entities[2].radius,35);assert.equal(model.entities[3].text,'Plano de prueba');
});

test('CAD formats are identified without changing stored file objects',()=>{
 const dxf={name:'planta.DXF',data:'private'},dwg={name:'modelo.dwg',data:'private'},before=JSON.stringify([dxf,dwg]);assert.equal(docs.type(dxf),'application/dxf');assert.equal(docs.type(dwg),'application/vnd.dwg');assert.equal(JSON.stringify([dxf,dwg]),before);assert.match(docs.action({id:1,files:[dxf]},0),/Abrir visor/);
});

test('binary and empty DXF fail with explicit compatibility errors',()=>{
 assert.throws(()=>cad.parse('AutoCAD Binary DXF\r\n'),/binario/);assert.throws(()=>cad.parse('0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n'),/entidades compatibles/);
});
