import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import sync from '../app/sync-merge.js';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('async function cloudFlush(){'),html.indexOf('function cloudSnapshotAll(){'));
const base=[{id:1,name:'A'},{id:2,name:'B'}];
function fixture(){return {row:{contenido:structuredClone(base),updated_at:'2026-01-01T00:00:00Z'},writes:0};}
function session(store,items=structuredClone(base),hooks={}){
 const local={dirty:true};
 const c={Date,console:{warn(){},info(){}},window:{},localStorage:{removeItem(){local.dirty=false}},LS_KEY:'test',ESTUDIO_ID:'test',_cloudBusy:false,_cloudApplying:false,_cloudForce:{},_cloudCount:{contactos:base.length},_cloudHash:{contactos:sync.canonical(base)},_cloudSeen:{contactos:store.row?.updated_at},_cloudRetryT:null,CLOUD_BLOCKS:{contactos:{get:()=>items,set:v=>{items=v}}},canon:sync.canonical,ModernoSync:sync,persistSoon(){},blockCount:v=>v.length,syncTag(mode,msg){local.mode=mode;local.message=msg},clearTimeout(){},setTimeout(){},cloudGuardModal(){local.guarded=true},sb:{from(){let method='GET',payload,filters={};return {select(){return this},eq(k,v){filters[k]=v;return this},update(v){method='PATCH';payload=structuredClone(v);return this},insert(v){method='POST';payload=structuredClone(v);return this},async maybeSingle(){
 if(method==='GET'){if(hooks.failRead)return {error:new Error('offline')};const result=structuredClone(store.row);await hooks.afterRead?.();return {data:result};}
 await hooks.beforeWrite?.();
 if(method==='PATCH'&&store.row?.updated_at!==filters.updated_at)return {data:null};
 if(method==='POST'&&store.row)return {error:new Error('duplicate')};
 if(hooks.failWrite)return {error:new Error('offline')};
 store.row=structuredClone(payload);store.writes++;await hooks.afterWrite?.(items);return {data:{updated_at:payload.updated_at}};
 }}}}};
 c.sb.rpc=async(_name,p)=>{
  const row={contenido:p.p_contenido,updated_at:new Date(Date.now()+store.writes).toISOString()};
  const q=c.sb.from('datos_estudio');
  return (p.p_base===null?q.insert(row):q.update(row).eq('updated_at',p.p_base)).select().maybeSingle();
 };
 vm.createContext(c);vm.runInContext(code,c);return {c,local,flush:()=>c.cloudFlush(),get:()=>items};
}
test('two stale sessions preserve separate edits',async()=>{
 const store=fixture(),a=structuredClone(base),b=structuredClone(base);a[0].name='A1';b[1].name='B1';
 const one=session(store,a),two=session(store,b);await one.flush();await two.flush();
 assert.deepEqual(store.row.contenido,[{id:1,name:'A1'},{id:2,name:'B1'}]);assert.equal(two.local.dirty,false);
});
test('race between read and write cannot overwrite; retry merges',async()=>{
 const store=fixture(),a=structuredClone(base);a[0].name='A1';let first=true;
 const s=session(store,a,{beforeWrite(){if(first){first=false;store.row={contenido:[{id:1,name:'A'},{id:2,name:'B1'}],updated_at:'2026-01-02T00:00:00Z'};}}});
 await s.flush();assert.equal(store.row.contenido[1].name,'B1');assert.equal(store.writes,0);assert.equal(s.local.dirty,true);
 await s.flush();assert.deepEqual(store.row.contenido,[{id:1,name:'A1'},{id:2,name:'B1'}]);
});
test('same-field conflict preserves remote and local copies',async()=>{
 const store=fixture(),a=structuredClone(base),b=structuredClone(base);a[0].name='A1';b[0].name='A2';
 const one=session(store,a),two=session(store,b);await one.flush();await two.flush();
 assert.equal(store.row.contenido[0].name,'A1');assert.equal(two.get()[0].name,'A2');assert.equal(two.local.dirty,true);assert.equal(two.local.mode,'err');
});
test('edits made during upload remain pending and are saved next',async()=>{
 const store=fixture(),a=structuredClone(base);a[0].name='A1';let first=true;
 const s=session(store,a,{afterWrite(items){if(first){first=false;items[1].name='B1';}}});
 await s.flush();assert.equal(store.row.contenido[1].name,'B');assert.equal(s.get()[1].name,'B1');assert.equal(s.local.dirty,true);
 await s.flush();assert.equal(store.row.contenido[1].name,'B1');assert.equal(s.local.dirty,false);
});
for(const failure of ['failRead','failWrite'])test(`${failure} preserves pending edits`,async()=>{
 const store=fixture(),a=structuredClone(base);a[0].name='A1';const s=session(store,a,{[failure]:true});await s.flush();
 assert.equal(store.writes,0);assert.equal(s.get()[0].name,'A1');assert.equal(s.local.dirty,true);
});
test('guarded reduction is not marked saved',async()=>{
 const store=fixture(),s=session(store,[]);s.c._cloudCount.contactos=10;await s.flush();assert.equal(store.writes,0);assert.equal(s.local.dirty,true);assert.equal(s.local.guarded,true);
});
test('missing remote block is not silently recreated',async()=>{
 const store=fixture(),a=structuredClone(base);a[0].name='A1';const s=session(store,a);store.row=null;await s.flush();assert.equal(store.writes,0);assert.equal(s.local.dirty,true);
});
test('explicitly confirmed import uses current server version',async()=>{
 const store=fixture(),s=session(store,[{id:3,name:'Restored'}]);delete s.c._cloudHash.contactos;s.c._cloudForce.contactos=true;
 await s.flush();assert.deepEqual(store.row.contenido,[{id:3,name:'Restored'}]);assert.equal(s.local.dirty,false);
});
test('unknown baseline cannot replace an existing block without confirmation',async()=>{
 const store=fixture(),s=session(store,[{id:3,name:'Restored'}]);delete s.c._cloudHash.contactos;
 await s.flush();assert.equal(store.writes,0);assert.equal(s.local.dirty,true);
});
