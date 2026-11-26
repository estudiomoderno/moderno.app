import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('async function pendingCopyFindDuplicate('),html.indexOf('function cloudPendingNotice(){'));
function fixture(failure){
 const values=new Map([['test_dirty','1'],['test','{"synthetic":true}']]);
 let now=1000,nonce=0;const c={ModernoPendingArchive:{pointer:()=>null},pendingCopySnapshotHint:raw=>String(raw?.length||0),pendingCopyStoredHint:()=>'',_resumed:true,LS_KEY:'test',Date:{now:()=>++now},crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++nonce).padStart(12,'0')}`},localStorage:{getItem:k=>failure==='readback'&&k.includes('_pendiente_')?null:values.get(k)??null,setItem(k,v){if(failure==='quota')throw Error('quota');values.set(k,v)},removeItem:k=>values.delete(k)},syncCopyKeys:()=>[...values.keys()].filter(key=>key.startsWith('test_pendiente_'))};
 vm.createContext(c);vm.runInContext(code,c);return {values,c};
}
test('pending copy is verified before clearing dirty flag',()=>{const {c,values}=fixture();c.cloudKeepPendingCopy();assert.equal(values.has('test_dirty'),false);assert.equal(values.get('test'),'{"synthetic":true}');assert.equal([...values].find(([k])=>k.includes('_pendiente_'))[1],values.get('test'));});
for(const failure of ['quota','readback'])test(`${failure} preserves original and pending flag`,()=>{const {c,values}=fixture(failure);assert.throws(()=>c.cloudKeepPendingCopy());assert.equal(values.get('test_dirty'),'1');assert.equal(values.get('test'),'{"synthetic":true}');});
test('missing local snapshot does not silently clear dirty flag',()=>{const {c,values}=fixture();values.delete('test');assert.throws(()=>c.cloudKeepPendingCopy());assert.equal(values.get('test_dirty'),'1');});
test('identical pending bytes are preserved once while a real edit creates a second copy',()=>{
 const {c,values}=fixture();c.cloudKeepPendingCopy();
 values.set('test_dirty','1');c.cloudKeepPendingCopy();
 assert.equal([...values.keys()].filter(key=>key.startsWith('test_pendiente_')).length,1);
 values.set('test',JSON.stringify({synthetic:true,edit:2}));values.set('test_dirty','1');c.cloudKeepPendingCopy();
 assert.equal([...values.keys()].filter(key=>key.startsWith('test_pendiente_')).length,2);
});
test('two distinct copies created in the same millisecond use different verified keys',()=>{
 const {c,values}=fixture();c.Date.now=()=>2000;c.cloudKeepPendingCopy();
 values.set('test',JSON.stringify({synthetic:true,edit:2}));values.set('test_dirty','1');c.cloudKeepPendingCopy();
 const copies=[...values].filter(([key])=>key.startsWith('test_pendiente_'));
 assert.equal(copies.length,2);assert.equal(new Set(copies.map(([key])=>key)).size,2);
 assert.deepEqual(copies.map(([,raw])=>JSON.parse(raw).edit??1),[1,2]);
});
test('expanded reconnect snapshots deduplicate by exact resolved bytes',async()=>{
 const values=new Map([['test','{"modernoPendingArchive":1,"key":"current"}'],['test_dirty','1']]),disk=new Map([['current','snapshot-one']]);let stamp=0;
 const storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 const marker=key=>JSON.stringify({modernoPendingArchive:1,key}),pointer=raw=>{try{return JSON.parse(raw)?.modernoPendingArchive===1?JSON.parse(raw).key:null}catch(e){return null}};
 const archive={pointer,marker,async resolve(s,key){const raw=s.getItem(key),target=pointer(raw);return target?disk.get(target):raw},async preserve(s,current,key,_store,valid){const raw=await this.resolve(s,current);if(!valid())throw Error('changed');disk.set(key,raw);s.setItem(key,marker(key));s.removeItem(current+'_dirty');return key}};
 const c={_resumed:true,_accessAttempt:7,LS_KEY:'test',localStorage:storage,ModernoPendingArchive:archive,pendingArchiveStore:()=>({}),pendingCopySnapshotHint:raw=>String(raw?.length||0),pendingCopyStoredHint:()=>'',localCopyOwner:()=> 'owner-a',syncCopyKeys:()=>[...values.keys()].filter(key=>key.startsWith('test_pendiente_')),pendingCopyWhen:key=>Number(key.split('test_pendiente_')[1].split('.')[0])||0,crypto:{getRandomValues(array){array[0]=++stamp;array[1]=++stamp;return array}},Date:{now:()=>1700000000000+stamp}};
 vm.createContext(c);vm.runInContext(code,c);
 await c.cloudKeepPendingCopyArchived(7);values.set('test_dirty','1');await c.cloudKeepPendingCopyArchived(7);
 assert.equal(c.syncCopyKeys().length,1);
 disk.set('current','snapshot-two');values.set('test_dirty','1');await c.cloudKeepPendingCopyArchived(7);
 assert.equal(c.syncCopyKeys().length,2);
});
test('duplicate lookup checks the newest owned copy first',async()=>{
 const values=new Map([['test_pendiente_1000',JSON.stringify({modernoPendingArchive:1,key:'old'})],['test_pendiente_3000',JSON.stringify({modernoPendingArchive:1,key:'new'})],['test_pendiente_2000',JSON.stringify({modernoPendingArchive:1,key:'middle'})]]),disk=new Map([['old','different-old'],['middle','different-middle'],['new','same-bytes']]),reads=[];
 const storage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:key=>values.get(key)??null};
 const pointer=raw=>{try{return JSON.parse(raw)?.key||null}catch(e){return null}},archive={pointer,async resolve(_storage,key){reads.push(key);return disk.get(pointer(values.get(key)))}};
 const c={localStorage:storage,ModernoPendingArchive:archive,pendingArchiveStore:()=>({}),pendingCopySnapshotHint:raw=>String(raw?.length||0),pendingCopyStoredHint:()=>'',syncCopyKeys:()=>[...values.keys()],pendingCopyWhen:key=>Number(key.split('_pendiente_')[1])||0};
 vm.createContext(c);vm.runInContext(code,c);
 assert.equal(await c.pendingCopyFindDuplicate('same-bytes'),'test_pendiente_3000');assert.deepEqual(reads,['test_pendiente_3000']);
});
test('duplicate lookup skips archived bodies whose verified hint cannot match',async()=>{
 const values=new Map([['test_pendiente_3000','pointer-new'],['test_pendiente_2000','pointer-match'],['test_pendiente_1000','pointer-old']]),reads=[];
 const storage={getItem:key=>values.get(key)??null};
 const archive={pointer:raw=>raw?.startsWith('pointer-')?raw:null,async resolve(_storage,key){reads.push(key);return key==='test_pendiente_2000'?'same-bytes':'different'}};
 const hints=new Map([['pointer-new','12:aaaaaaaa'],['pointer-match','10:bbbbbbbb'],['pointer-old','10:cccccccc']]);
 const c={localStorage:storage,ModernoPendingArchive:archive,pendingArchiveStore:()=>({}),pendingCopySnapshotHint:()=> '10:bbbbbbbb',pendingCopyStoredHint:raw=>hints.get(raw)||'',syncCopyKeys:()=>[...values.keys()],pendingCopyWhen:key=>Number(key.split('_pendiente_')[1])||0};
 vm.createContext(c);vm.runInContext(code,c);
 assert.equal(await c.pendingCopyFindDuplicate('same-bytes'),'test_pendiente_2000');assert.deepEqual(reads,['test_pendiente_2000']);
});
