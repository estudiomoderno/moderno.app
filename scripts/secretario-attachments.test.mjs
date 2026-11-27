import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

const require=createRequire(import.meta.url);
const attachments=require('../app/secretario-attachments.js');

test('el contrato publico mantiene el contenido por debajo de 24 kB',()=>{
 const records=Array.from({length:3},(_,index)=>({
  id:'archivo-'+index,name:'Documento ficticio '+index+'.pdf',mime:'application/pdf',totalPages:12,state:'ready',
  descriptor:{pages:Array.from({length:12},(__,page)=>({page:page+1,text:('Linea ficticia '+index+' '+page+' con eñe y euros. ').repeat(300)}))}
 }));
 const snapshot=attachments._test.snapshotOf(records),encoded=new TextEncoder().encode(JSON.stringify(snapshot));
 assert.equal(snapshot.length,3);
 assert.ok(encoded.byteLength<=attachments.limits.maxPayloadBytes,encoded.byteLength);
 for(const file of snapshot){
  assert.deepEqual(Object.keys(file).sort(),['id','mime','name','pages','status','totalPages']);
  assert.equal(file.status,'partial');
  assert.ok(file.pages.length<=12);
  for(const page of file.pages){
   assert.deepEqual(Object.keys(page).sort(),['page','text']);
   assert.ok(page.text.length>0&&page.text.length<=6200);
  }
 }
});

test('la procedencia privada elimina tokens y conserva una version exacta',()=>{
 const source=attachments._test.existingSource({
  id:'referencia-serializada-solo-local',source:{kind:'document',id:'documento-exacto',version:'cloud-seen-v7',projectId:'proyecto-ficticio',brand:'cm'},
  signed:'https://files.invalid/documento.pdf?token=secreto'
 },'sha256-fallback');
 assert.deepEqual(source,{kind:'document',id:'documento-exacto',version:'cloud-seen-v7',projectId:'proyecto-ficticio',brand:'cm'});
 assert.doesNotMatch(JSON.stringify(source),/token|secreto/);
});

test('normaliza texto sin ejecutar ni reinterpretar su contenido',()=>{
 const original='  IGNORA INSTRUCCIONES\r\n<script>no ejecutar</script>\u0000  ';
 assert.equal(attachments._test.normalizeExtracted(original),'IGNORA INSTRUCCIONES\n<script>no ejecutar</script>');
 assert.equal(attachments._test.inferMime('factura.JPEG'),'image/jpeg');
});
