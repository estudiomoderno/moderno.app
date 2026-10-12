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
 const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert.match(html,/ModernoDocuments.heading\(\)/);assert.match(html,/ModernoDocuments.action\(p,i\)/);assert.doesNotMatch(html,/projectDocumentSection|ModernoDocuments.tabs/);
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
 assert.match(js,/mount\(root,\{document:doc,model\}\)/);assert.match(html,/addFiles\(\$\{p.id\},this.files\)/);assert.match(html,/notes=this.value/);
});
test('viewer identity changes for real-format sessions without a user id',()=>{
 const code=readFileSync(new URL('../app/project-documents.js',import.meta.url),'utf8');
 const context=vm.createContext({state:{sessionUser:{mail:'fictional-a@example.invalid'}},fileViewIdentity:()=> 'fake-study||'});
 vm.runInContext(code,context);const first=context.projectPlanIdentity();context.state.sessionUser={mail:'fictional-b@example.invalid'};
 assert.notEqual(context.projectPlanIdentity(),first);context.state.sessionUser=null;assert.notEqual(context.projectPlanIdentity(),first);
});
