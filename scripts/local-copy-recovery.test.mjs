import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import daily from '../app/daily-work.js';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('let _saveT=null, _lastSave=null, _saveErr=false'),html.indexOf('/* v3.28:'));
function fixture({mode='quota',failArchive=false}={}){
 const disk=new Map([['app','old'],['app_pendiente_1','old copy']]);let archived=false,attempts=0,dirty=0,flushes=0;
 const c={pendingArchiveStore:()=>({}),ModernoPendingArchive:{writeCurrent:async()=>{const e=new Error();e.name='QuotaExceededError';throw e;}},Date,JSON,Blob,ESTUDIO_ID:'fictional',_accessRole:'admin',LS_KEY:'app',state:{sessionUser:{id:'user'},note:'latest'},BRAND:{},wsOrder:['cm'],toast(){},syncRefresh(){},closeModal(){},cloudDirty(){dirty++},async cloudFlush(){flushes++},syncCopyKeys:()=>['app_pendiente_1'],
  localStorage:{setItem(k,v){if(mode==='blocked'){const e=new Error();e.name='SecurityError';throw e;}if((mode==='quota'&&!archived||mode==='always-quota')){const e=new Error();e.name='QuotaExceededError';throw e;}if(mode!=='silent')disk.set(k,v)},getItem:k=>disk.get(k)??null},
  setTimeout(fn,ms){const t=setTimeout(fn,ms);t.unref();return t},clearTimeout,
  async cloudArchivePendingCopies(){attempts++;if(failArchive)throw Error('fictional failure');await new Promise(resolve=>setImmediate(resolve));archived=true;}
 };vm.createContext(c);vm.runInContext(code,c);
 return {c,disk,attempts:()=>attempts,dirty:()=>dirty,flushes:()=>flushes,read:expr=>vm.runInContext(expr,c)};
}
test('ordinary persist starts verified archive recovery without an update click and keeps newest state',async()=>{
 const f=fixture();f.c.persistNow();assert.equal(f.read('_saveErr'),true);f.c.state.note='edited while archiving';await f.read('_localWrite');await f.read('_localRepair');
 assert.equal(f.read('_saveErr'),false);assert.equal(JSON.parse(f.disk.get('app')).state.note,'edited while archiving');assert.equal(f.disk.get('app_pendiente_1'),'old copy');assert.equal(f.attempts(),1);assert.ok(f.dirty()>0);
});
test('archive failure preserves current state and originals, throttles automatic retries and permits explicit retry',async()=>{
 const f=fixture({failArchive:true});f.c.persistNow();await f.read('_localWrite');await f.read('_localRepair');
 assert.equal(f.read('_saveErr'),true);assert.match(f.read('_saveErrDetail'),/No hay espacio.*MB/);assert.equal(f.disk.get('app'),'old');assert.equal(f.c.state.note,'latest');
 f.c.persistNow();await f.read('_localWrite');assert.equal(f.attempts(),1);
 await f.c.syncRetrySave();assert.equal(f.attempts(),2);assert.equal(f.flushes(),1);
});
test('a blocked browser reports the reason and never treats archiving as a repair',async()=>{
 const f=fixture({mode:'blocked'});f.c.persistNow();assert.match(f.read('_saveErrDetail'),/bloqueado/);assert.equal(f.attempts(),0);assert.equal(f.read('_saveErr'),true);
});
test('silent stale local write remains an error and cannot claim successful save',()=>{
 const f=fixture({mode:'silent'});f.c.persistNow();assert.equal(f.read('_saveErr'),true);assert.match(f.read('_saveErrDetail'),/no coincide/);assert.equal(f.disk.get('app'),'old');
});
test('session changes during local repair prevent the delayed write and cloud retry',async()=>{
 const f=fixture();const pending=f.c.syncRetrySave();f.c.state.sessionUser.id='other';await pending;
 assert.equal(f.disk.get('app'),'old');assert.equal(f.flushes(),0);assert.equal(f.read('_saveErr'),true);
});
test('local reason remains visible even after a cloud acknowledgement',()=>{
 const s=daily.saveStatus({localFailure:true,localDetail:'El navegador ha bloqueado el almacenamiento local.',confirmed:true});assert.equal(s.mode,'err');assert.match(s.detail,/bloqueado/);
});

test('an oversized current copy that still fails after archiving remains an explicit error',async()=>{
 const f=fixture({mode:'always-quota'});f.c.persistNow();await f.read('_localWrite');await f.read('_localRepair');assert.equal(f.read('_saveErr'),true);assert.equal(f.disk.get('app'),'old');assert.equal(f.disk.get('app_pendiente_1'),'old copy');assert.equal(f.attempts(),1);assert.match(f.read('_saveErrDetail'),/No hay espacio/);
});
test('a hung archive times out while preserving original copies and the current memory state',async()=>{
 const f=fixture();f.c.cloudArchivePendingCopies=()=>new Promise(()=>{});f.c.setTimeout=fn=>setTimeout(fn,0);
 f.c.persistNow();await f.read('_localWrite');await f.read('_localRepair');assert.equal(f.read('_localRepair'),null);assert.equal(f.read('_saveErr'),true);assert.equal(f.disk.get('app'),'old');assert.equal(f.disk.get('app_pendiente_1'),'old copy');assert.equal(f.c.state.note,'latest');
});
