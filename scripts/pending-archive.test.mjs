import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={};vm.createContext(context);vm.runInContext(readFileSync(new URL('../app/pending-archive.js',import.meta.url),'utf8'),context);
const archive=context.ModernoPendingArchive;
function fixture(){const map=new Map([['app_pendiente_1','{"saved":"one"}'],['app_pendiente_2','{"saved":"two"}'],['app','current'],['app_dirty','1']]),disk=new Map();return {map,disk,storage:{get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},store:{write:async(k,v)=>disk.set(k,v),read:async k=>disk.get(k),remove:async k=>disk.delete(k)}};}
test('archives every copy, verifies content and keeps current snapshot and dirty flag',async()=>{const f=fixture();await archive.migrate(f.storage,'app_pendiente_',f.store);assert.equal(f.map.get('app'),'current');assert.equal(f.map.get('app_dirty'),'1');assert.equal(f.map.size,4);assert.equal(await archive.resolve(f.storage,'app_pendiente_1',f.store),'{"saved":"one"}');assert.equal(await archive.resolve(f.storage,'app_pendiente_2',f.store),'{"saved":"two"}');await archive.migrate(f.storage,'app_pendiente_',f.store);assert.equal(f.disk.size,2);});
for(const failure of ['write','readback'])test(failure+' failure preserves original copy',async()=>{const f=fixture();if(failure==='write')f.store.write=async()=>{throw Error('quota')};else f.store.read=async()=>null;await assert.rejects(archive.migrate(f.storage,'app_pendiente_',f.store));assert.equal(f.map.get('app_pendiente_1'),'{"saved":"one"}');assert.equal(f.map.get('app_dirty'),'1');});
test('concurrent edits are not replaced by archive pointers',async()=>{const f=fixture();f.store.write=async(k,v)=>{f.disk.set(k,v);f.map.set(k,'newer')};await assert.rejects(archive.migrate(f.storage,'app_pendiente_',f.store));assert.equal(f.map.get('app_pendiente_1'),'newer');});
test('missing archive cannot be downloaded as a successful empty copy',async()=>{const f=fixture();f.map.set('app_pendiente_1',archive.marker('app_pendiente_1'));await assert.rejects(archive.resolve(f.storage,'app_pendiente_1',f.store));});
function pending(){const f=fixture();f.storage.removeItem=k=>f.map.delete(k);return f;}
test('large pending snapshot is archived directly without duplicating it in localStorage',async()=>{
 const f=pending(),raw='large-current';f.map.set('app',raw);
 f.storage.setItem=(k,v)=>{assert.notEqual(v,raw);f.map.set(k,v);};
 await archive.preserve(f.storage,'app','app_pendiente_3',f.store);
 assert.equal(f.map.get('app'),raw);assert.equal(f.map.has('app_dirty'),false);
 assert.equal(await archive.resolve(f.storage,'app_pendiente_3',f.store),raw);
 assert.equal(f.map.get('app_pendiente_1'),'{"saved":"one"}');
});
for(const failure of ['write','readback','pointer','identity','changed','occupied'])test('direct pending archive preserves original and dirty flag on '+failure,async()=>{
 const f=pending();let valid=true;
 if(failure==='write')f.store.write=async()=>{throw Error('quota');};
 if(failure==='readback')f.store.write=async()=>{};
 if(failure==='pointer')f.storage.setItem=()=>{throw Error('quota');};
 if(failure==='identity'||failure==='changed'){const write=f.store.write;f.store.write=async(k,v)=>{await write(k,v);if(failure==='identity')valid=false;else f.map.set('app','newer');};}
 if(failure==='occupied')f.disk.set('app_pendiente_3','existing');
 await assert.rejects(archive.preserve(f.storage,'app','app_pendiente_3',f.store,()=>valid));
 assert.equal(f.map.get('app'),failure==='changed'?'newer':'current');assert.equal(f.map.get('app_dirty'),'1');
 assert.equal(f.map.get('app_pendiente_1'),'{"saved":"one"}');
 if(failure==='occupied')assert.equal(f.disk.get('app_pendiente_3'),'existing');
});

test('oversized live snapshot uses a bounded IndexedDB slot and a verified local pointer',async()=>{
 const f=pending(),raw='x'.repeat(6*1024*1024);
 assert.equal(await archive.writeCurrent(f.storage,'app',raw,f.store),true);
 assert.ok(archive.pointer(f.map.get('app')).startsWith('app_actual_'));
 assert.equal(await archive.resolve(f.storage,'app',f.store),raw);
 for(let i=0;i<5;i++)await archive.writeCurrent(f.storage,'app',raw+i,f.store);
 assert.equal(f.disk.size,1);assert.equal(await archive.resolve(f.storage,'app',f.store),raw+'4');
 assert.equal(f.map.get('app_dirty'),'1');assert.equal(f.map.get('app_pendiente_1'),'{"saved":"one"}');
});
for(const failure of ['write','readback','pointer','changed','identity'])test('live fallback does not acknowledge an unverified write: '+failure,async()=>{
 const f=pending();let valid=true;
 if(failure==='write')f.store.write=async()=>{throw Error('disk full');};
 if(failure==='readback')f.store.write=async()=>{};
 if(failure==='pointer')f.storage.setItem=()=>{throw Error('quota');};
 if(failure==='identity'||failure==='changed'){const write=f.store.write;f.store.write=async(k,v)=>{await write(k,v);if(failure==='identity')valid=false;else f.map.set('app','another tab');};}
 if(failure==='identity')assert.equal(await archive.writeCurrent(f.storage,'app','new',f.store,()=>valid),false);
 else await assert.rejects(archive.writeCurrent(f.storage,'app','new',f.store,()=>valid));
 assert.equal(f.map.get('app'),failure==='changed'?'another tab':'current');assert.equal(f.map.get('app_dirty'),'1');
});
test('pending history materializes a live pointer so later live writes cannot replace it',async()=>{
 const f=pending();await archive.writeCurrent(f.storage,'app','first live',f.store);
 await archive.preserve(f.storage,'app','app_pendiente_3',f.store);
 await archive.writeCurrent(f.storage,'app','next live',f.store);
 assert.equal(await archive.resolve(f.storage,'app_pendiente_3',f.store),'first live');
 assert.equal(await archive.resolve(f.storage,'app',f.store),'next live');
});
test('concurrent live content changes cannot clear the pending flag during historical preservation',async()=>{
 const f=pending();await archive.writeCurrent(f.storage,'app','first live',f.store);
 const write=f.store.write;f.store.write=async(k,v)=>{await write(k,v);f.disk.set(archive.pointer(f.map.get('app')),'changed live');};
 await assert.rejects(archive.preserve(f.storage,'app','app_pendiente_3',f.store));
 assert.equal(f.map.get('app_dirty'),'1');assert.equal(await archive.resolve(f.storage,'app',f.store),'changed live');
});

 test('legacy alias to a live copy prevents cleanup of the referenced historical snapshot',async()=>{
 const f=pending();await archive.writeCurrent(f.storage,'app','original',f.store);
 f.map.set('app_pendiente_legacy',f.map.get('app'));
 await archive.writeCurrent(f.storage,'app','new',f.store);
 assert.equal(await archive.resolve(f.storage,'app_pendiente_legacy',f.store),'original');
 assert.equal(await archive.resolve(f.storage,'app',f.store),'new');
 });
