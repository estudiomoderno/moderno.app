import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import sync from '../app/sync-merge.js';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const code=section('async function cloudReadRows(','async function cloudRecoverBlock(')+section('async function cloudPoll(){','/* Presencia:');
test('rendering payment summaries cannot add financial fields to collaborator projects',()=>{
 const c={_accessRole:'colaborador'};vm.createContext(c);vm.runInContext(html.match(/function planHitos\(p\)\{[^\n]+/)[0],c);const project={id:1};assert.equal(c.planHitos(project).length,0);assert.deepEqual(project,{id:1});
});
test('a missing read-only block does not become a collaborator write',()=>{
 const c={_accessRole:'colaborador',_cloudHash:{},_cloudCount:{},canon:sync.canonical,blockCount:()=>0,CLOUD_BLOCKS:{contratistas:{get:()=>({})},contactos:{get:()=>[]}}};
 vm.createContext(c);vm.runInContext(section('function cloudMarkLoadedBlocks(rows){','async function cloudLoad(){'),c);c.cloudMarkLoadedBlocks([]);
 assert.equal(c._cloudHash.contratistas,'{}');assert.equal(c._cloudHash.contactos,undefined);
});
test('unavailable workspace names never reappear as a fallback',()=>{
 const c={wsOrder:['eliminado','privado'],wsVisible:()=>false};vm.createContext(c);vm.runInContext(section('function visibleWsOrder(){','const byBrand'),c);assert.equal(c.visibleWsOrder().length,0);
});
function fixture(){
 const calls=[],applied=[];
 const c={ESTUDIO_ID:'ficticio',_accessRole:'colaborador',_cloudSeen:{},document:{hidden:false},syncTag:(...args)=>calls.push(args),cloudApplyRemote:(...args)=>applied.push(args),sb:{from(){assert.fail('No se permite leer la tabla sin filtrar');},rpc:async(name,p)=>{calls.push([name,p]);return {data:[{bloque:'proyectos',contenido:[{id:1,name:'Ficticio'}],updated_at:'1',rol:'colaborador'}]};}}};
 vm.createContext(c);vm.runInContext(code,c);return {c,calls,applied};
}
test('a block is read through the server permission filter',async()=>{const {c,calls}=fixture();const r=await c.cloudReadBlock('proyectos');assert.equal(r.data.contenido[0].name,'Ficticio');assert.equal(calls[0][0],'app_leer_bloques');assert.deepEqual(Array.from(calls[0][1].p_bloques),['proyectos']);});
test('a changed role cannot feed a snapshot into the old session',async()=>{const {c,applied,calls}=fixture();c.sb.rpc=async()=>({data:[{bloque:'proyectos',contenido:[],updated_at:'2',rol:'admin'}]});await c.cloudPoll();assert.equal(applied.length,0);assert.equal(calls[0][0],'err');});
test('a late response for another study is discarded',async()=>{const {c}=fixture();c.sb.rpc=async()=>{c.ESTUDIO_ID='otro';return {data:[]};};const r=await c.cloudReadRows();assert.ok(r.error);assert.equal(r.data,undefined);});
test('duplicate or incorrect blocks are rejected',async()=>{for(const rows of [[{bloque:'otro',rol:'colaborador'}],[{bloque:'proyectos',rol:'colaborador'},{bloque:'proyectos',rol:'colaborador'}]]){const {c}=fixture();c.sb.rpc=async()=>({data:rows});assert.ok((await c.cloudReadBlock('proyectos')).error);}});
test('polling applies only confirmed filtered rows',async()=>{const {c,applied}=fixture();await c.cloudPoll();assert.equal(applied.length,1);assert.equal(applied[0][0],'proyectos');c._cloudSeen.proyectos='1';await c.cloudPoll();assert.equal(applied.length,1);});
test('a failed read never falls back to the raw table',async()=>{const {c}=fixture();c.sb.rpc=async()=>({error:{message:'denegado'}});assert.equal((await c.cloudReadRows()).error.message,'denegado');});
test('filtered loading cannot merge old invoices, comments or configuration back in',()=>{const {c}=fixture();c.state={projects:[{id:1,comments:[{txt:'anterior'}]}],invoices:[{ref:'privada'}],quotes:[{ref:'privado'}],account:{iban:'anterior'},emitter:{iban:'anterior'},_hist:{rows:['anterior']}};c.cloudPrepareFilteredCache([{bloque:'config',contenido:{account:{name:'Estudio ficticio'}}}]);assert.equal(c.state.projects.length,0);assert.equal(c.state.invoices.length,0);assert.equal(c.state.quotes.length,0);assert.equal(c.state.account.iban,undefined);assert.equal(c.state.account.name,'Estudio ficticio');assert.equal(c.state._hist,null);});
test('an administrator snapshot is not cleared by the collaborator cache preparation',()=>{const {c}=fixture();c._accessRole='admin';c.state={invoices:[{ref:'FICTICIA'}]};c.cloudPrepareFilteredCache([]);assert.equal(c.state.invoices[0].ref,'FICTICIA');});
test('a hidden finance update cannot generate a false pending write',()=>{
 const value={invoices:[],n:0,entries:[],del:{},ddel:{}};
 const c={_accessRole:'colaborador',canon:sync.canonical,CLOUD_BLOCKS:{facturas:{get:()=>value,set(){}}},_cloudHash:{facturas:sync.canonical(value)},_cloudSeen:{},_cloudCount:{},document:{activeElement:null},_modalAbierto:()=>false,persistNow(){},render(){},syncTag(){},blockCount:Object.keys,syncHasChanges:()=>c._cloudHash.facturas!==sync.canonical(value)};
 vm.createContext(c);vm.runInContext(section('function cloudApplyRemote(','function _rtFlushRerender('),c);
 c.cloudApplyRemote('facturas',{},'nueva');assert.equal(c.syncHasChanges(),false);assert.equal(c._cloudSeen.facturas,'nueva');
});
test('cached content is not rendered while checking study permissions',()=>{
 const c={_accessLoading:true,state:{view:'facturas'},V:{innerHTML:''}};
 vm.createContext(c);vm.runInContext(section('function render(){','/* =================== VIEWS'),c);c.render();assert.match(c.V.innerHTML,/Comprobando el acceso/);assert.doesNotMatch(c.V.innerHTML,/Factura/);
});
test('collaborators never subscribe to raw database payloads',()=>{
 for(const role of ['admin','colaborador']){
  const events=[];const channel={on(event){events.push(event);return this;},subscribe(){return this;}};
  const c={_accessRole:role,sb:{channel:()=>channel},ESTUDIO_ID:'ficticio',_rtChan:null,_rtPoll:null,meMail:()=> 'prueba@example.invalid',cloudPoll(){},setInterval:()=>1,invAutoLoad(){},document:{addEventListener(){}},console};
  vm.createContext(c);vm.runInContext(section('function cloudRealtimeStart(){','function cloudKeepPendingCopy('),c);c.cloudRealtimeStart();assert.equal(events.includes('postgres_changes'),role==='admin');assert.ok(events.includes('presence'));
 }
});
