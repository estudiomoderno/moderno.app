import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Model,point}=require('../app/plan-annotations.js'),{pdf}=require('../app/plan-editor.js');
const reference={studyId:'ficticio-a',projectId:'project-a',fileId:'file-a',revisionId:'original-a'};
const make=()=>new Model({reference,pages:2,authorize:()=>true});
const ink={id:'a',type:'pen',page:1,color:'#242424',width:3,points:[{x:.2,y:.3},{x:.5,y:.6}],text:''};
test('normalized coordinates are invariant under zoom and scroll and clamped',()=>{assert.deepEqual(point(120,130,{left:20,top:30,width:200,height:200}),{x:.5,y:.5});assert.deepEqual(point(420,330,{left:20,top:-70,width:800,height:800}),{x:.5,y:.5});assert.deepEqual(point(-10,500,{left:0,top:0,width:100,height:100}),{x:0,y:1});});
test('page annotations keep original input immutable with undo and redo',()=>{const m=make(),before=JSON.stringify(ink);m.add(ink);m.add({...ink,id:'b',page:2});m.remove('a');m.undo();assert.equal(m.items.length,2);m.redo();assert.equal(m.items.length,1);assert.equal(m.items[0].page,2);assert.equal(JSON.stringify(ink),before);});
test('save/reopen recovers separate annotations through an explicit adapter',async()=>{const m=make();m.add(ink);let stored;await m.save({write:async({record,base})=>{assert.equal(base,null);stored=record;return {revision:'rev-1'};}});assert.equal(m.dirty,false);const reopened=make();reopened.load(stored,'rev-1');assert.deepEqual(reopened.items,[ink]);assert.equal(reopened.revision,'rev-1');});
test('failed save and concurrent edits preserve draft rather than falsely confirming',async()=>{const m=make();m.add(ink);await assert.rejects(m.save({write:async()=>{throw Error('PT409');}}),/PT409/);assert.equal(m.dirty,true);assert.equal(m.items.length,1);let resolve;const saving=m.save({write:()=>new Promise(r=>resolve=r)});m.add({...ink,id:'b'});resolve({revision:'rev-2'});await saving;assert.equal(m.dirty,true);assert.equal(m.items.length,2);});
test('scope mismatch, invalid coordinates and duplicate ids are rejected before load',()=>{const m=make();m.add(ink);const record=m.snapshot();assert.throws(()=>m.load({...record,reference:{...reference,studyId:'ficticio-b'}},'rev'),/distintos/);assert.throws(()=>m.load({...record,annotations:[ink,ink]},'rev'),/duplicados/);assert.throws(()=>m.add({...ink,id:'x',points:[{x:NaN,y:0}]}),/Coordenadas/);assert.equal(m.items.length,1);});
test('read-only and revoked client scope cannot mutate or confirm a save',async()=>{const m=new Model({reference,pages:1,authorize:edit=>!edit});assert.throws(()=>m.add(ink),/No autorizado/);let allowed=true;const n=new Model({reference,pages:1,authorize:()=>allowed});n.add(ink);await assert.rejects(n.save({write:async()=>{allowed=false;return {revision:'rev'};}}),/No autorizado/);assert.equal(n.dirty,true);assert.equal(n.revision,null);});
test('missing persistence is explicitly blocked, not simulated with local storage',async()=>{const m=make();m.add(ink);await assert.rejects(m.save(),/pendiente de verificar/);assert.equal(m.dirty,true);});
test('PDF exporter generates a multipage file with correct byte offsets',async()=>{const result=await pdf([{width:100,height:200,jpeg:new Uint8Array([255,216,255,217])},{width:200,height:100,jpeg:new Uint8Array([255,216,255,217])}]).arrayBuffer();const txt=new TextDecoder().decode(result);assert.match(txt,/\/Count 2/);const start=Number(/startxref\n(\d+)/.exec(txt)[1]);assert.equal(txt.slice(start,start+4),'xref');const offsets=txt.slice(start).split('\n').slice(3,11);offsets.forEach((row,i)=>{const n=Number(row.slice(0,10));assert.ok(txt.slice(n).startsWith((i+1)+' 0 obj'));});});

test('photo annotations preserve bounded raster data, coordinates and history',()=>{
 const m=make(),image={...ink,id:'photo',type:'image',imageData:'data:image/jpeg;base64,/9j/2Q=='};
 m.add(image);const record=m.snapshot();m.undo();assert.equal(m.items.length,0);m.redo();assert.deepEqual(m.items[0],image);
 const reopened=make();reopened.load(record,'photo-revision');assert.deepEqual(reopened.items,[image]);assert.equal(JSON.stringify(image),JSON.stringify(reopened.items[0]));
});
test('photo data rejects URLs, SVG, oversized payloads and invalid bounds',()=>{
 const m=make(),image={...ink,id:'photo',type:'image',imageData:'data:image/jpeg;base64,/9j/2Q=='};
 for(const imageData of ['https://fake.invalid/photo.jpg','data:image/svg+xml;base64,PHN2Zy8+','data:image/jpeg;base64,PHN2Zy8+','data:image/jpeg;base64,/9j/'+ 'A'.repeat(700001)])assert.throws(()=>m.add({...image,imageData}),/Imagen/);
 assert.throws(()=>m.add({...image,points:[{x:.8,y:.8},{x:.2,y:.2}]}),/Imagen/);assert.equal(m.items.length,0);
 for(let i=0;i<10;i++)m.add({...image,id:'photo-'+i});assert.throws(()=>m.add({...image,id:'extra'}),/10 fotos/);
});
