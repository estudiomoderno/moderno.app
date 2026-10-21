import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('async function prepareAppReload('),html.indexOf('async function versionSentinel(){'));
const changes=html.slice(html.indexOf('function syncHasChanges(){'),html.indexOf('function syncCopyKeys(){'));
function context({quota=false,busy=false,conflict=false,finish=false,hang=false,role='admin',modal=false,sessionChange=false,failFinalCopy=false,recover=false,archiveFailure=false,staleCopy=false,archiveHang=false,editDuringArchive=false}={}){
 let now=0,persists=0,archived=0;const disk=new Map();const reports=[],navigations=[],status={hidden:true,textContent:''};
 const ctx={_localWrite:null,_localResumePending:false,pendingArchiveStore:()=>({}),ModernoPendingArchive:{resolve:async(storage,key)=>storage.getItem(key)},URL,Date:{now:()=>now},_saveErr:false,_cloudBusy:busy,_accessRole:role,_accessLoading:false,state:{sessionUser:{id:'user',mail:'fixture@example.invalid'}},sb:{},ESTUDIO_ID:'ficticio',CLOUD_BLOCKS:{proyectos:{get:()=>['nuevo']}},_cloudHash:{proyectos:'[]'},canon:JSON.stringify,
  document:{querySelector:()=>modal?{}:null,getElementById:()=>status},location:{href:'https://app.example.invalid/es/?fixture=kept&v=old#/proyectos',replace:url=>navigations.push(url)},
  BRAND:{cm:{name:'Ficticio'}},wsOrder:['cm'],LS_KEY:'fixture',localStorage:{getItem:k=>disk.get(k)??null},
  syncCopyKeys:()=>recover?['fixture_pendiente_1']:[],
  async cloudArchivePendingCopies(){archived++;if(archiveFailure)throw Error('fixture archive failed');if(archiveHang)return new Promise(()=>{});if(editDuringArchive)ctx.document.querySelector=()=>({});},
  toast:message=>reports.push(message),persistNow(){persists++;ctx._saveErr=quota||recover&&!archived||failFinalCopy&&persists>1;if(!ctx._saveErr)disk.set('fixture',JSON.stringify({v:1,state:staleCopy?{old:true}:ctx.state,BRAND:ctx.BRAND,wsOrder:ctx.wsOrder}));},
  setTimeout(fn,ms){return setTimeout(()=>{now+=ms;if(ms===100&&finish)ctx._cloudBusy=false;fn();},0);},clearTimeout,
  async cloudFlush(){if(hang)return new Promise(()=>{});if(sessionChange)ctx.state.sessionUser.id='other';if(!ctx._cloudBusy&&!conflict)ctx._cloudHash.proyectos='["nuevo"]';}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(changes+code,ctx);return {ctx,reports,navigations,status};
}
test('reload waits until exact local changes are saved',async()=>assert.equal(await context().ctx.prepareAppReload(),true));
test('reload is refused when either local copy fails',async()=>{for(const options of [{quota:true},{failFinalCopy:true}])assert.equal(await context(options).ctx.prepareAppReload(),false);});
test('an in-flight save is awaited instead of immediately refusing update',async()=>assert.equal(await context({busy:true,finish:true}).ctx.prepareAppReload(),true));
test('an unfinished or hung save times out without reloading or cancelling it',async()=>{for(const options of [{busy:true},{hang:true}]){const f=context(options);assert.equal(await f.ctx.prepareAppReload(),false);assert.match(f.reports.at(-1),/sigue en curso/);assert.equal(f.navigations.length,0);}});
test('reload is refused when pending changes or unresolved conflicts remain',async()=>{
 const f=context({conflict:true});assert.equal(await f.ctx.prepareAppReload(),false);
 const g=context();g.ctx._cloudConflicts={proyectos:{fixture:true}};assert.equal(await g.ctx.prepareAppReload(),false);
});
test('read-only collaborator blocks do not falsely block an otherwise confirmed save',async()=>{const f=context({role:'colaborador'});f.ctx.CLOUD_BLOCKS.config={get:()=>({private:false})};assert.equal(await f.ctx.prepareAppReload(),true);});
test('an open editor and changed session keep the page and its draft',async()=>{for(const options of [{modal:true},{sessionChange:true}]){const f=context(options);assert.equal(await f.ctx.prepareAppReload(),false);assert.equal(f.navigations.length,0);}});
test('the update button reports failures in the visible banner and becomes usable again',async()=>{
 const f=context({conflict:true}),button={textContent:'Actualizar ahora',disabled:false};await f.ctx.applyAppUpdate(button);
 assert.equal(f.status.hidden,false);assert.match(f.status.textContent,/cambios pendientes/);assert.equal(button.disabled,false);assert.equal(button.textContent,'Actualizar ahora');assert.equal(f.navigations.length,0);
});
test('a successful update preserves route and existing query parameters while bypassing cache',async()=>{
 const f=context(),button={textContent:'Actualizar ahora',disabled:false};await f.ctx.applyAppUpdate(button);
 assert.equal(f.navigations.length,1);const url=new URL(f.navigations[0]);assert.equal(url.pathname,'/es/');assert.equal(url.searchParams.get('fixture'),'kept');assert.notEqual(url.searchParams.get('v'),'old');assert.equal(url.hash,'#/proyectos');
});
test('double click cannot start duplicate updates and unexpected errors remain visible',async()=>{
 const f=context(),button={textContent:'Actualizar ahora',disabled:false};let release,calls=0;
 f.ctx.prepareAppReload=()=>{calls++;return new Promise(resolve=>release=resolve);};const pending=f.ctx.applyAppUpdate(button);await f.ctx.applyAppUpdate(button);assert.equal(calls,1);release(false);await pending;assert.equal(button.disabled,false);
 f.ctx.prepareAppReload=async()=>{throw Error('fixture');};await f.ctx.applyAppUpdate(button);assert.match(f.status.textContent,/No se ha podido actualizar/);assert.equal(button.disabled,false);assert.equal(f.navigations.length,0);
});

test('verified archiving frees space and then reload still requires cloud confirmation',async()=>{
 const f=context({recover:true});assert.equal(await f.ctx.prepareAppReload(message=>f.reports.push(message)),true);assert.ok(f.reports.some(x=>x.includes('Conservando copias')));
 const blocked=context({recover:true,conflict:true});assert.equal(await blocked.ctx.prepareAppReload(),false);assert.match(blocked.reports.at(-1),/cambios pendientes/);
});
test('failed or hung archive keeps the tab and offers current-state download',async()=>{
 for(const options of [{recover:true,archiveFailure:true},{recover:true,archiveHang:true}]){const f=context(options);assert.equal(await f.ctx.prepareAppReload(),false);assert.match(f.reports.at(-1),/Descarga los cambios actuales/);assert.equal(f.navigations.length,0);}
});
test('silent stale local copy is rejected even without a quota exception',async()=>assert.equal(await context({staleCopy:true}).ctx.prepareAppReload(),false));
test('a form opened while archiving blocks reload',async()=>assert.equal(await context({recover:true,editDuringArchive:true}).ctx.prepareAppReload(),false));
