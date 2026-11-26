import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import queueApi from '../app/file-upload-queue.js';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const uploadSource=html.slice(html.indexOf('let _fileQueue=null'),html.indexOf('const LOCAL_SAVE_DEBOUNCE_MS'));
const migrationSource=html.slice(html.indexOf('function _dataUrlBlob('),html.indexOf('function cloudOfferMigration('));
const study='11111111-1111-4111-8111-111111111111';
const otherStudy='22222222-2222-4222-8222-222222222222';

function context({uploadError=true,uploadImpl=null,downloadImpl=null}={}){
  const store=queueApi.createMemoryStore(),tags=[],state={projects:[],entries:[],logos:{},account:{},sessionUser:{id:'user'}},timers=[],uploads=[],downloads=[],toasts=[];
  const localValues=new Map();
  let uuid=0;
  const cryptoSource={randomUUID:()=>`${String(++uuid).padStart(8,'0')}-0000-4000-8000-000000000000`,subtle:webcrypto.subtle};
  const c={
    Blob,console,crypto:cryptoSource,TextEncoder,atob,navigator:{onLine:true},window:{indexedDB:{}},
    ModernoFileUploadQueue:{...queueApi,createStore:()=>store},
    sb:{storage(){},},ESTUDIO_ID:study,_cloudLoadedStudy:study,_cloudUserId:'user',_accessLoading:false,_accessRole:'admin',
    state,CLOUD_BLOCKS:{
      proyectos:{get:()=>state.projects},
      facturas:{get:()=>({entries:state.entries})},
      config:{get:()=>({account:state.account,logos:state.logos})}
    },LS_KEY:'fixture',localStorage:{getItem:key=>localValues.get(key)??null,setItem:(key,value)=>localValues.set(key,String(value)),removeItem:key=>localValues.delete(key)},
    _verifiedLocalContent:null,_verifiedLocalReference:null,_localWrite:null,_saveErr:false,
    fileViewIdentity:()=>String(c.ESTUDIO_ID)+'|'+String(c.state.sessionUser?.id||''),syncTag:(mode,message)=>tags.push({mode,message}),
    cloudDirty(){},render(){},toast(message){toasts.push(message)},persistNow(){c._saveErr=false;},
    setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},
    FileReader:class{readAsDataURL(){throw Error('A synced upload must never become a data URL');}}
  };
  c.sb.storage={from:()=>({
    upload:async(path,blob,options)=>{uploads.push({path,blob,options});return uploadImpl?uploadImpl(path,blob,options,uploads.length):uploadError?{error:Error('offline')}:{error:null};},
    download:async path=>{downloads.push(path);return downloadImpl?downloadImpl(path,downloads.length):{error:Error('not found')};}
  })};
  vm.createContext(c);vm.runInContext(uploadSource+'\n'+migrationSource,c);
  return {c,state,tags,timers,store,uploads,downloads,toasts};
}

async function confirmLocal(c){return c.fileConfirmLocalPersistence(c.fileLocalPersistenceSnapshot());}

test('a failed synced upload returns a small durable reference, never Base64',async()=>{
  const {c,store}=context(),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const reference=await c.fileUp(blob);
  assert.match(reference,/^local-file:\/\/[a-f0-9-]{36}$/);
  assert.equal(reference.includes('data:'),false);
  const [saved]=await store.list();assert.equal(saved.blob.size,5);assert.equal(saved.study,study);assert.equal(saved.owner,'user');assert.equal(saved.remote??null,null);
});

test('session reset releases queue resources without deleting pending Blobs',async()=>{
  const {c,store}=context(),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  await c.fileUp(blob);assert.equal((await store.list()).length,1);c.fileResetSession();assert.equal((await store.list()).length,1);
});

test('the Blob mapping remains durable after local replacement and before cloud acknowledgement',async()=>{
  const {c,state,store}=context({uploadError:false}),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const reference=await c.fileUp(blob);state.projects.push({id:1,img:reference});
  await confirmLocal(c);
  const results=await c.fileRetryPending();
  assert.equal(results.length,1);assert.equal(results[0].confirmed,false);
  assert.match(state.projects[0].img,new RegExp('^storage://archivos/'+study+'/pending/'));
  const [saved]=await store.list();assert.equal(saved.remote,state.projects[0].img);assert.equal(saved.cloudConfirmedAt??null,null);
});

test('a draft is not uploaded until its reference reaches persistent state',async()=>{
  const {c,state,store,uploads}=context({uploadError:false}),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const reference=await c.fileUp(blob);
  const early=await c.fileRetryPending();
  assert.deepEqual(early,[]);assert.equal(uploads.length,0);assert.equal((await store.list()).length,1);
  state.projects.push({id:1,draft:{img:reference}});
  await confirmLocal(c);
  const confirmed=await c.fileRetryPending();
  assert.equal(confirmed[0].confirmed,false);assert.match(state.projects[0].draft.img,new RegExp('^storage://archivos/'+study+'/pending/'));
  assert.equal(uploads.length,1);await c.fileConfirmCloudReferences([state.projects]);
  const [saved]=await store.list();assert.equal(saved.remote,state.projects[0].draft.img);assert.ok(saved.cloudConfirmedAt);
});

test('reload reconciles a durable snapshot if the tab crashed before marking its Blob attached',async()=>{
  const {c,state,store,uploads}=context({uploadError:false}),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const reference=await c.fileUp(blob);state.projects.push({id:1,img:reference});
  const verified=JSON.stringify({state,sync:{v:1,study,user:'user',role:'admin',pending:{}}}),pointer='durable-local-snapshot';
  c.localStorage.setItem(c.LS_KEY,pointer);c._verifiedLocalReference=pointer;c._verifiedLocalContent=verified;
  assert.equal((await c.fileUploadQueue().list(study))[0].attachedAt,null);
  c.fileResetSession(); // new queue instance, as after a real tab reload
  const results=await c.fileRetryPending();
  assert.equal(results.length,1);assert.equal(results[0].confirmed,false);assert.equal(uploads.length,1);
  assert.match(state.projects[0].img,new RegExp('^storage://archivos/'+study+'/pending/'));
  assert.ok((await store.list())[0].attachedAt,'the durable snapshot must repair the missing attachment marker');
});

test('a local reference without an IndexedDB row becomes an actionable review error',async()=>{
  const {c,state,tags,uploads}=context({uploadError:false}),reference='local-file://99999999-9999-4999-8999-999999999999';
  state.projects.push({id:1,img:reference});
  const results=await c.fileRetryPending();
  assert.equal(results.length,1);assert.equal(results[0].error?.code,'LOCAL_FILE_MISSING');assert.equal(uploads.length,0);
  assert.ok(tags.some(tag=>tag.mode==='err'&&/Falta la copia local/.test(tag.message)&&/vuelve a adjuntarlo/.test(tag.message)));
});

test('a file cannot fall back to Base64 before an authenticated study exists',async()=>{
  const {c,store,tags}=context(),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  c.sb=null;c.ESTUDIO_ID=null;
  assert.equal(await c.fileUp(blob),null);assert.deepEqual(await store.list(),[]);assert.deepEqual(tags,[]);
});

test('a rejected attachment does not turn the whole save into a review incident',async()=>{
  const {c,store,tags,toasts}=context(),empty=new Blob([],{type:'image/png'});Object.defineProperty(empty,'name',{value:'empty.png'});
  assert.equal(await c.fileUp(empty),null);assert.deepEqual(await store.list(),[]);
  assert.equal(tags.some(tag=>tag.mode==='err'),false);assert.ok(toasts.some(message=>/No se pudo conservar el archivo/.test(message)));
});

test('an upload started in one study cannot write its local reference after the session changes',async()=>{
  const {c,state,store,uploads}=context({uploadError:false});let releasePut,putStarted;const started=new Promise(resolve=>{putStarted=resolve;}),originalPut=store.put;
  store.put=async record=>{putStarted();await new Promise(resolve=>{releasePut=resolve;});return originalPut(record);};
  const blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const pending=c.fileUp(blob);await started;c.ESTUDIO_ID=otherStudy;releasePut();
  assert.equal(await pending,null);assert.deepEqual(state.projects,[]);assert.equal(uploads.length,0);
});

test('a session change during local persistence cannot acknowledge or lose the pending Blob',async()=>{
  const {c,state,store,uploads}=context({uploadError:false}),blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const reference=await c.fileUp(blob);state.projects.push({id:1,img:reference});let release;
  c._localWrite=new Promise(resolve=>{release=resolve;});
  const attachment=Promise.resolve(c._localWrite).then(()=>confirmLocal(c));
  assert.deepEqual(await c.fileRetryPending(),[]);assert.equal(uploads.length,0);
  c.ESTUDIO_ID=otherStudy;release();await attachment;
  const afterSwitch=await c.fileRetryPending();assert.equal(afterSwitch[0]?.error?.code,'LOCAL_FILE_MISSING');
  assert.equal(state.projects[0].img,reference);assert.equal((await store.list()).length,1);assert.equal(uploads.length,0);
});

test('removing a reference while its upload is in flight never reintroduces or acknowledges it',async()=>{
  let releaseUpload,uploadStarted;const started=new Promise(resolve=>{uploadStarted=resolve;});
  const {c,state,store}=context({uploadError:false,uploadImpl:async()=>{uploadStarted();await new Promise(resolve=>{releaseUpload=resolve;});return {error:null};}});
  const blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const reference=await c.fileUp(blob);state.projects.push({id:1,img:reference});
  await confirmLocal(c);
  const pending=c.fileRetryPending();await started;delete state.projects[0].img;releaseUpload();
  const results=await pending;assert.equal(results[0].confirmed,false);assert.equal(state.projects[0].img,undefined);
  const [saved]=await store.list();assert.ok(saved.blob instanceof Blob);assert.match(saved.remote,new RegExp('^storage://archivos/'+study+'/pending/'));assert.equal(saved.cloudConfirmedAt??null,null);
});

test('a lost Storage response retries the same UUID path and verifies an existing identical object when RLS rejects update',async()=>{
  const blob=new Blob(['image'],{type:'image/png'});Object.defineProperty(blob,'name',{value:'photo.png'});
  const {c,state,store,uploads,downloads}=context({uploadError:false,
    uploadImpl:async(_path,_blob,_options,attempt)=>({error:Object.assign(Error(attempt===1?'respuesta perdida':'update forbidden'),{statusCode:attempt===1?0:403})}),
    downloadImpl:async(_path,attempt)=>attempt===1?{error:Error('respuesta perdida')}:{data:blob,error:null}
  });
  const reference=await c.fileUp(blob);state.projects.push({id:1,img:reference});
  await confirmLocal(c);
  const failed=await c.fileRetryPending();assert.ok(failed[0].error);
  const results=await c.fileRetryPending();assert.equal(results[0].confirmed,false);assert.equal(uploads.length,2);assert.equal(uploads[0].path,uploads[1].path);
  assert.equal(downloads.length,2);assert.equal(downloads[0],uploads[0].path);assert.equal(downloads[1],uploads[1].path);
  assert.equal(uploads[0].options.upsert,false);assert.equal(uploads[1].options.upsert,false);
  assert.match(state.projects[0].img,new RegExp('^storage://archivos/'+study+'/pending/'));assert.equal((await store.list()).length,1);
});

test('cloud save identifies local-only references before RPC preparation and never sends their block',()=>{
  const start=html.indexOf('async function cloudFlush(){'),scan=html.indexOf('filePendingReferences(io.get())',start),busy=html.indexOf('_cloudBusy=true;',start),skip=html.indexOf('if(pendingFileBlocks[b]?.length)continue;',busy);
  assert.ok(start>=0&&scan>start&&busy>scan&&skip>busy);
  assert.match(html.slice(scan,busy),/fileRetryPending\(\)/);
});

test('pending retry filters by live references and reconciles abandoned Blobs',()=>{
  const start=html.indexOf('function fileRetryPending(){'),end=html.indexOf('async function fileUp(',start),source=html.slice(start,end);
  assert.match(source,/references=filePendingReferences\(\),protectedReferences=\[\.\.\.new Set\(\[\.\.\.references,\.\.\._fileDraftLeases\]\)\]/);assert.match(source,/queue\.reconcile\(study,protectedReferences,\{minimumAgeMs:60000\}\)/);
  assert.match(source,/queue\.retryAll\(study,\{references,onUploaded/);
});

test('transient upload failures schedule an identity-bound exponential retry',()=>{
  const start=html.indexOf('function fileScheduleRetry('),end=html.indexOf('async function fileUp(',start),source=html.slice(start,end);
  assert.match(source,/Math\.min\(60000,1000\*2\*\*Math\.min\(_fileRetryFailures,6\)\)/);
  assert.match(source,/ESTUDIO_ID===study&&fileViewIdentity\(\)===owner/);assert.match(source,/fileScheduleRetry\(study,owner\)/);
});

test('legacy migration finds every allowed Base64 file in cloud blocks and rejects active or textual MIME types',()=>{
  const {c,state}=context(),image='data:image/png;base64,eA==',pdf='data:application/pdf;base64,cGRm',webp='data:image/webp;base64,eA==';
  state.projects=[{id:1,rooms:[{sections:[{items:[{img:image,note:image}]}]}],folderPhotos:[image],files:[{name:'Plano.pdf',data:pdf}],unsafe:'data:image/svg+xml;base64,PHN2Zy8+'}];
  state.entries=[{file:{name:'Factura.pdf',data:pdf}}];state.account={studioDetails:{logo:webp}};state.logos={main:webp,plain:'data:text/plain;base64,eA=='};
  assert.deepEqual(new Set(c._embeddedCloudFiles()),new Set([image,pdf,webp]));
});

test('legacy migration replaces repeated project, invoice and configuration payloads with stable references',async()=>{
  const {c,state,uploads}=context({uploadError:false}),image='data:image/png;base64,eA==',pdf='data:application/pdf;base64,cGRm',webp='data:image/webp;base64,eA==';
  state.projects=[{id:1,folderPhotos:[image],files:[{name:'Plano.pdf',data:pdf}]}];state.entries=[{file:{name:'Factura.pdf',data:pdf}}];state.account={studioDetails:{logo:webp}};state.logos={main:webp};
  await c.migrateEmbeddedCloudFiles();
  for(const value of [state.projects[0].folderPhotos[0],state.projects[0].files[0].data,state.entries[0].file.data,state.account.studioDetails.logo,state.logos.main])assert.match(value,new RegExp('^storage://archivos/'+study+'/pending/'));
  assert.equal(state.projects[0].files[0].data,state.entries[0].file.data);assert.equal(state.account.studioDetails.logo,state.logos.main);
  assert.equal(uploads.length,3);assert.ok(uploads.every(row=>row.options.upsert===false));
});

test('legacy migration derives the same non-overwriting UUID for the same embedded file',async()=>{
  const {c}=context(),source='data:image/png;base64,eA==';
  const first=await c._embeddedFileId(source),second=await c._embeddedFileId(source);
  assert.equal(first,second);assert.match(first,/^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
