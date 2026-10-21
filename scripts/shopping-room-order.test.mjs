import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import sync from '../app/sync-merge.js';
const code=readFileSync(new URL('../app/project-ui.js',import.meta.url),'utf8');
function fixture(){
 const rooms=[{id:1,name:'A',sections:[{items:[{id:'same',files:['keep']}]}]},{id:8,kind:'pav',name:'Pavimento'},{id:2,name:'B',sections:[{items:[{id:'same'}]}]},{id:9,kind:'otra',name:'Otra'},{id:3,name:'C'}],p={id:100,rooms,pres:[{pages:[{els:[{rid:2,rsi:0,rii:0}]}]}]},base=structuredClone(p);let allowed=true,modal=false,renders=0;
 const c={state:{view:'proyecto',currentProject:100,projTab:'listas',projects:[p],sessionUser:{id:'fictional'}},ESTUDIO_ID:'fictional',_accessRole:'admin',_accessLoading:false,myAccessLevel:()=>allowed?'owner':'colab',canView:()=>allowed,projectTabKey:v=>v,render:()=>renders++,document:{querySelector:()=>modal?{}:null,addEventListener(){}}};vm.createContext(c);vm.runInContext(code,c);
 return {c,p,rooms,base,allowed:v=>allowed=v,modal:v=>modal=v,renders:()=>renders};
}
test('room order changes only the slots of its group and preserves exact objects, items and references',()=>{
 const f=fixture(),ctx=f.c.shoppingRoomsMoveContext(0),details=f.rooms.map(r=>JSON.stringify(r)),refs=JSON.stringify(f.p.pres);
 assert.equal(f.c.shoppingRoomsMoveCommit(ctx,f.rooms[4],true),true);
 assert.deepEqual(f.p.rooms.map(r=>r.name),['B','Pavimento','C','Otra','A']);assert.equal(f.p.rooms[4],ctx.room);
 assert.deepEqual(f.p.rooms.map(r=>JSON.stringify(r)).sort(),details.sort());assert.equal(JSON.stringify(f.p.pres),refs);assert.equal(f.renders(),1);
 const merged=sync.mergeSavedData(f.base,JSON.parse(JSON.stringify(f.p)),f.base);assert.deepEqual(merged.rooms.map(r=>r.name),['B','Pavimento','C','Otra','A']);
});
test('stale drag, changed session, wrong group, role or open editor cannot mutate room order',()=>{
 for(const change of ['session','replace','order','view','role','modal','group']){
  const f=fixture(),ctx=f.c.shoppingRoomsMoveContext(0),target=f.rooms[2];
  if(change==='session')f.c.ESTUDIO_ID='other';if(change==='replace')f.c.state.projects=[structuredClone(f.p)];if(change==='order')f.rooms.reverse();if(change==='view')f.c.state.view='estancia';if(change==='role')f.allowed(false);if(change==='modal')f.modal(true);
  const before=JSON.stringify(f.p);assert.equal(f.c.shoppingRoomsMoveCommit(ctx,change==='group'?f.rooms[1]:target,true),false,change);assert.equal(JSON.stringify(f.p),before);assert.equal(f.renders(),0);
 }
});
test('keyboard moves an adjacent room in either direction without opening it; boundaries and cancellation do nothing',()=>{
 const f=fixture(),event=key=>({key,preventDefault(){},stopPropagation(){}});
 f.c.shoppingRoomsMoveKey(event('ArrowLeft'),0);assert.equal(f.renders(),0);
 f.c.shoppingRoomsMoveKey(event('ArrowRight'),0);assert.deepEqual(f.rooms.map(r=>r.name),['B','Pavimento','A','Otra','C']);
 f.c.shoppingRoomsMoveKey(event('ArrowUp'),2);assert.deepEqual(f.rooms.map(r=>r.name),['A','Pavimento','B','Otra','C']);
 f.allowed(false);assert.equal(f.c.shoppingRoomsMoveContext(0),null);f.allowed(true);f.modal(true);assert.equal(f.c.shoppingRoomsMoveContext(0),null);
});
