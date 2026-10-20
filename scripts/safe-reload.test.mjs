import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('async function prepareAppReload('),html.indexOf('async function versionSentinel(){'));
const changes=html.slice(html.indexOf('function syncHasChanges(){'),html.indexOf('function syncCopyKeys(){'));
function context({quota=false,busy=false,conflict=false,finish=false,hang=false,role='admin',modal=false,sessionChange=false,failFinalCopy=false}={}){
 let now=0,persists=0;const reports=[],navigations=[],status={hidden:true,textContent:''};
 const ctx={URL,Date:{now:()=>now},_saveErr:false,_cloudBusy:busy,_accessRole:role,_accessLoading:false,state:{sessionUser:{id:'user',mail:'fixture@example.invalid'}},sb:{},ESTUDIO_ID:'ficticio',CLOUD_BLOCKS:{proyectos:{get:()=>['nuevo']}},_cloudHash:{proyectos:'[]'},canon:JSON.stringify,
  document:{querySelector:()=>modal?{}:null,getElementById:()=>status},location:{href:'https://app.example.invalid/es/?fixture=kept&v=old#/proyectos',replace:url=>navigations.push(url)},
  toast:message=>reports.push(message),persistNow(){persists++;ctx._saveErr=quota||failFinalCopy&&persists>1;},
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
