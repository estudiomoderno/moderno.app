import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={};vm.createContext(context);vm.runInContext(readFileSync(new URL('../app/pending-archive.js',import.meta.url),'utf8'),context);
const archive=context.ModernoPendingArchive;
function fixture(){const map=new Map([['app_pendiente_1','{"saved":"one"}'],['app_pendiente_2','{"saved":"two"}'],['app','current'],['app_dirty','1']]),disk=new Map();return {map,disk,storage:{get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},store:{write:async(k,v)=>disk.set(k,v),read:async k=>disk.get(k)}};}
test('archives every copy, verifies content and keeps current snapshot and dirty flag',async()=>{const f=fixture();await archive.migrate(f.storage,'app_pendiente_',f.store);assert.equal(f.map.get('app'),'current');assert.equal(f.map.get('app_dirty'),'1');assert.equal(f.map.size,4);assert.equal(await archive.resolve(f.storage,'app_pendiente_1',f.store),'{"saved":"one"}');assert.equal(await archive.resolve(f.storage,'app_pendiente_2',f.store),'{"saved":"two"}');await archive.migrate(f.storage,'app_pendiente_',f.store);assert.equal(f.disk.size,2);});
for(const failure of ['write','readback'])test(failure+' failure preserves original copy',async()=>{const f=fixture();if(failure==='write')f.store.write=async()=>{throw Error('quota')};else f.store.read=async()=>null;await assert.rejects(archive.migrate(f.storage,'app_pendiente_',f.store));assert.equal(f.map.get('app_pendiente_1'),'{"saved":"one"}');assert.equal(f.map.get('app_dirty'),'1');});
test('concurrent edits are not replaced by archive pointers',async()=>{const f=fixture();f.store.write=async(k,v)=>{f.disk.set(k,v);f.map.set(k,'newer')};await assert.rejects(archive.migrate(f.storage,'app_pendiente_',f.store));assert.equal(f.map.get('app_pendiente_1'),'newer');});
test('missing archive cannot be downloaded as a successful empty copy',async()=>{const f=fixture();f.map.set('app_pendiente_1',archive.marker('app_pendiente_1'));await assert.rejects(archive.resolve(f.storage,'app_pendiente_1',f.store));});
