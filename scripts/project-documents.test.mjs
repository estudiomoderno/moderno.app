import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),docs=require('../app/project-documents.js');
test('plan filtering preserves original indices and excludes generated documents',()=>{
 const p={files:['legacy.pdf',{name:'Notes',body:'text',type:'application/pdf'},{name:'invoice.pdf',docRef:'F-1'},{name:'plan.PDF'},{name:'render',type:'image/png'},{name:'sheet.xlsx'}]};const original=JSON.stringify(p);
 assert.deepEqual(docs.plans(p).map(x=>x.index),[3,4]);assert.equal(JSON.stringify(p),original);
});
test('documents show one heading with annotation actions only for PDF and images',()=>{
 assert.match(docs.heading(),/>Planos y Archivos<\/h2>/);assert.doesNotMatch(docs.heading(),/<button|<nav|Referencias|Revisiones|data-section/);
 const project={id:1,files:[{name:'plan.pdf',data:'fake'},{name:'notes.txt',body:'text'},{name:'missing.png'}]};
 assert.match(docs.action(project,0),/Ver y anotar/);assert.match(docs.action(project,0),/event.stopPropagation\(\)/);assert.equal(docs.action(project,1),'');assert.match(docs.action(project,2),/disabled/);
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert.match(html,/ModernoProjectDocuments.heading\(\)/);assert.match(html,/ModernoProjectDocuments.card\(p,i,/);assert.doesNotMatch(html,/projectDocumentSection|ModernoProjectDocuments.tabs/);
});
test('bounded download rejects HTTP and size errors without returning partial content',async()=>{
 const saved=global.fetch;
 try{
  global.fetch=async()=>new Response('denied',{status:403});await assert.rejects(docs.readBlob('https://fake.invalid','application/pdf'),/descargar/);
  global.fetch=async()=>new Response('x',{headers:{'content-length':String(51*1024*1024)}});await assert.rejects(docs.readBlob('https://fake.invalid','application/pdf'),/50 MB/);
  let cancelled=false;
  global.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(51*1024*1024));},cancel(){cancelled=true;}}));
  await assert.rejects(docs.readBlob('https://fake.invalid','application/pdf'),/50 MB/);assert.equal(cancelled,true);
  global.fetch=async(url,options)=>{assert.equal(options.credentials,'omit');return new Response('fake-bytes');};const blob=await docs.readBlob('https://fake.invalid','image/png');assert.equal(await blob.text(),'fake-bytes');assert.equal(blob.type,'image/png');
 }finally{global.fetch=saved;}
});
test('publication does not activate cloud annotation saving or replace existing file and note actions',()=>{
 const js=readFileSync(new URL('../app/project-documents.js',import.meta.url),'utf8'),html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 assert.ok(!js.includes('sb.storage')&&!js.includes('sb.rpc')&&!js.includes('localStorage'));
 assert.match(js,/mount\(root,\{document:doc,model\}\)/);assert.match(html,/ModernoProjectDocuments.uploadCard\(p\)/);assert.match(js,/addFiles\(Number/);assert.doesNotMatch(html,/<h2 class="sec">Notas del proyecto/);
});
test('viewer identity changes for real-format sessions without a user id',()=>{
 const code=readFileSync(new URL('../app/project-documents.js',import.meta.url),'utf8');
 const context=vm.createContext({state:{sessionUser:{mail:'fictional-a@example.invalid'}},fileViewIdentity:()=> 'fake-study||'});
 vm.runInContext(code,context);const first=context.projectPlanIdentity();context.state.sessionUser={mail:'fictional-b@example.invalid'};
 assert.notEqual(context.projectPlanIdentity(),first);context.state.sessionUser=null;assert.notEqual(context.projectPlanIdentity(),first);
});

test('file cards preserve original indices, actions, status and escaped names',()=>{
 const project={id:7,notes:'Keep',files:['legacy.pdf',{name:'<img src=x onerror=1>.pdf',data:'fake',cli:false,signed:{by:'Fake'}},{name:'report.txt',body:'unchanged'}]};const before=JSON.stringify(project);
 const card=docs.card(project,1);assert.match(card,/project-file-card/);assert.match(card,/data-project="7" data-index="1"/);assert.match(card,/fileView\(Number/);assert.match(card,/trashFile\(Number/);assert.match(card,/Ver y anotar/);assert.match(card,/Oculto al cliente/);assert.match(card,/Firmado/);assert.match(card,/&lt;img/);assert.doesNotMatch(card,/<img|fake/);
 assert.match(docs.card(project,0),/Solo nombre/);assert.doesNotMatch(docs.card(project,2),/Ver y anotar/);assert.match(docs.card(project,2),/Lo ve el cliente/);assert.equal(JSON.stringify(project),before);
});
test('project files and main document generator coexist in the production script order',()=>{
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 const c=vm.createContext({ESTUDIO_ID:'fictitious',_accessRole:'admin',state:{sessionUser:{id:'fake-user'},docs:[],projects:[],brandFilter:'all'},byBrand:x=>x});
 for(const name of ['project-documents.js','document-builder.js'].sort((a,b)=>html.indexOf('/'+a+'?')-html.indexOf('/'+b+'?')))vm.runInContext(readFileSync(new URL('../app/'+name,import.meta.url),'utf8'),c);
 assert.match(c.dgHome(),/Generador de documentos/);assert.match(c.ModernoProjectDocuments.heading(),/Planos y Archivos/);
 vm.runInContext("dgLibrary().tab='templates'",c);assert.match(c.dgHome(),/Crear plantilla/);vm.runInContext("dgLibrary().tab='documents'",c);assert.match(c.dgHome(),/Crear documento/);
 c._accessRole='colaborador';assert.equal(c.dgHome(),'');assert.match(html,/plantillas:vDocs/);
});
