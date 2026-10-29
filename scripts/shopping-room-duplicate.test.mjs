import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import spec from '../app/specifications.js';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function fixture(){
 const room={id:11,name:'Sala',shareToken:'private',sections:[{id:'section',name:'Muebles',items:[{id:'item',name:'Silla',cli:'ok',qty:2,price:25,cost:10,libId:'master',files:[{data:'storage://archivos/fictional'}]}]}]},p={id:1,rooms:[room]},calls=[];let menu='';
 const c={crypto,ModernoSpec:spec,Date:{now:()=>1000},state:{view:'estancia',currentProject:1,currentRoom:11,projects:[p]},ESTUDIO_ID:'fixture',_cloudHash:{proyectos:'[]'},localCopyOwner:()=> 'fixture',_accessRole:'admin',_accessLoading:false,myAccessLevel:()=> 'owner',canView:()=>true,document:{querySelector:()=>null},ico:()=>'',rico:()=>'',modal:s=>menu=s,toast:s=>calls.push(s),closeModal:()=>calls.push('close'),render:()=>calls.push('render'),persistNow:()=>calls.push('persist'),cloudFlush:async()=>calls.push('flush')};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function roomCloneData('),html.indexOf('function roomToProjectModal('))+'\n'+html.slice(html.indexOf('function roomIconModal('),html.indexOf('function shareModal(')),c);
 return {c,p,room,calls,click(){return c.duplicateShoppingRoom(1,11);}};
}
test('the duplication action makes independent room/section/product identities even in the same millisecond',async()=>{
 const f=fixture(),before=JSON.stringify(f.room);await f.click();await f.click();
 assert.equal(f.p.rooms.length,3);assert.equal(new Set(f.p.rooms.map(r=>r.id)).size,3);
 assert.equal(new Set(f.p.rooms.map(r=>r.sections[0].id)).size,3);
 assert.equal(new Set(f.p.rooms.map(r=>r.sections[0].items[0].id)).size,3);
 assert.equal(JSON.stringify(f.room),before);assert.equal(f.p.rooms[1].sections[0].items[0].libId,'master');assert.deepEqual(f.p.rooms[1].sections[0].items[0].files,f.room.sections[0].items[0].files);
 assert.equal(f.p.rooms[1].sections[0].items[0].cli,undefined);assert.equal(f.p.rooms[1].shareToken,undefined);
});
test('list duplication preserves locally and starts saving immediately rather than waiting for the debounce',async()=>{
 const f=fixture();await f.click();assert.ok(f.calls.includes('persist'));assert.ok(f.calls.includes('flush'));assert.ok(f.calls.indexOf('persist')<f.calls.indexOf('flush'));
});
test('copy is already preserved locally while the first network save is still pending',async()=>{
 const f=fixture();let release;f.c.cloudFlush=()=>new Promise(r=>{release=r;});
 const saving=f.c.duplicateShoppingRoom(1,11);assert.equal(f.p.rooms.length,2);assert.ok(f.calls.includes('persist'));assert.ok(f.calls.includes('render'));
 release();await saving;
});
test('forbidden role, stale project and ambiguous room IDs leave every record unchanged',async()=>{
 for(const change of ['role','loading','project','duplicate-id']){
  const f=fixture();if(change==='role')f.c.myAccessLevel=()=> 'colab';if(change==='loading')f.c._accessLoading=true;if(change==='project')f.c.state.currentProject=999;if(change==='duplicate-id')f.p.rooms.push(structuredClone(f.room));
  const before=JSON.stringify(f.p);assert.equal(await f.c.duplicateShoppingRoom(1,11),false);assert.equal(JSON.stringify(f.p),before);assert.ok(!f.calls.includes('persist'));
 }
});

test('reload protection follows unconfirmed copies and clears only after acknowledgement, removal or session change',async()=>{
 const f=fixture();await f.c.duplicateShoppingRoom(1,11);assert.equal(f.c.roomDuplicationPending(),true);
 f.c._cloudHash.proyectos=JSON.stringify(f.p?[f.p]:[]);assert.equal(f.c.roomDuplicationPending(),false);
 f.c._cloudHash.proyectos='[]';f.c.localCopyOwner=()=> 'other';assert.equal(f.c.roomDuplicationPending(),false);
 f.c.localCopyOwner=()=> 'fixture';f.p.rooms.pop();assert.equal(f.c.roomDuplicationPending(),false);
});
