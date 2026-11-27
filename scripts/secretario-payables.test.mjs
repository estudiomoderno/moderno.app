import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureBlocks,fixtureRequest,studyId} from './secretario-receivables-fixture.mjs';

const request={studyId,context:{view:'finanzas',timeZone:'Europe/Madrid'}};
const first='quiero ver las facturas que me quedan por pagar';
const legacyPaymentQuestion='¿Quieres ver las facturas que tienes que pagar tú o las facturas pendientes de cobro?';
const legacyDocumentQuestion='¿Qué documentos quieres consultar?';
const oldDialogue=[
 {role:'user',content:first},
 {role:'assistant',content:'Tienes 3 facturas pendientes de cobro.'},
 {role:'user',content:'No que tengo que pagar yo'},
 {role:'assistant',content:legacyPaymentQuestion},
 {role:'user',content:'las que quiero pagar yo'},
 {role:'assistant',content:legacyDocumentQuestion}
];
const ask=(message,options={},earlier={})=>fixtureRequest({...request,message,...earlier},{acceptance:true,...options});

function assertPayables(result){
 assert.equal(result.status,200,JSON.stringify(result.body));
 const {body,calls}=result;
 assert.deepEqual(calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
 assert.deepEqual(body.payables.amounts,[{currency:'EUR',amount:830}]);
 assert.equal(body.payables.count,2);
 assert.equal(body.payables.overdue,1);
 assert.equal(body.message.replaceAll('\u00a0',' '),'Tienes 2 facturas pendientes de pago por 830 €. Una está vencida.');
 assert.deepEqual(body.sources.map(row=>[row.kind,row.label,row.supplier,row.pending,row.overdue]),[
  ['entry','FR-DEMO-001','Proveedor A',530,true],['entry','FR-DEMO-002','Proveedor B',300,false]
 ]);
 assert.equal(body.receivables,undefined);
 assert.deepEqual(body.actions,[]);
}

test('supplier invoice query and each correction use authorized payables, without a model or writes',async()=>{
 for(const query of [first,'Facturas recibidas pendientes','Facturas pendientes de proveedores',
  '¿Cuánto tengo que pagar a proveedores?', 'No las que me deben, las que tengo que pagar yo'])assertPayables(await ask(query));
 const receivable=(await ask('Dime qué facturas están pendientes de cobro')).body;
 for(const [message,length] of [['No que tengo que pagar yo',2],['las que quiero pagar yo',4],['facturas',6]]){
  assertPayables(await ask(message,{}, {history:oldDialogue.slice(0,length),receivableContext:receivable.receivableContext}));
 }
 const oldQuestion=oldDialogue.slice(0,4);
 assertPayables(await ask('las que quiero pagar yo',{}, {history:oldQuestion,automatic:true,answers:{detail:'las que quiero pagar yo'}}));
});

test('explicit customer collections remain distinct and switch back after a supplier query',async()=>{
 const result=await ask('¿Qué facturas quedan por que me paguen?',{}, {history:[{role:'user',content:first}]});
 assert.equal(result.status,200);
 assert.equal(result.body.receivables.count,3);
 assert.equal(result.body.payables,undefined);
 assert.ok(result.body.sources.every(row=>row.kind==='invoice'));
});

test('supplier, project, date and overdue filters only display verifiable records',async()=>{
 for(const [message,labels] of [
  ['Facturas por pagar al proveedor Proveedor B',['FR-DEMO-002']],
  ['Facturas por pagar del proyecto PR-0901',['FR-DEMO-001']],
  ['Facturas por pagar en octubre de 2026',[]],
  ['Facturas por pagar vencidas',['FR-DEMO-001']],
  ['Facturas por pagar sin vencer',['FR-DEMO-002']]
 ]){
  const result=await ask(message);
  assert.equal(result.status,200,message);
  assert.ok(result.body.payables,message+': '+result.body.message);
  assert.deepEqual(result.body.sources.map(row=>row.label),labels,message);
 }
 const unknown=await ask('Facturas por pagar del proveedor Desconocido');
 assert.equal(unknown.body.status,'clarifying');
 assert.deepEqual(unknown.body.sources,[]);
});

test('a scope clarification accepts the supplier and retains it on the next turn',async()=>{
 const initial='Facturas por pagar del proveedor Desconocido en noviembre de 2026';
 const question=(await ask(initial)).body;
 const history=[{role:'user',content:initial},{role:'assistant',content:question.message}];
 const clarification=await ask('Proveedor B',{}, {history});
 assert.ok(clarification.body.payables,clarification.body.message);
 assert.deepEqual(clarification.body.sources.map(row=>row.label),['FR-DEMO-002']);
 const continuation=await ask('solo las vencidas',{}, {history:[...history,{role:'user',content:'Proveedor B'},
  {role:'assistant',content:clarification.body.message}]});
 assert.equal(continuation.body.payables.count,0);
 assert.match(continuation.body.payables.scopeLabel,/Proveedor B.*2026-11/);
});

test('opening an ordinal verifies the exact expense and offers a readonly document',async()=>{
 const result=await ask('Abre la primera',{}, {context:{...request.context,focus:{results:[{kind:'entry',id:'201',brand:'cm',projectId:'9001'}]}}});
 assert.equal(result.status,200);
 assert.equal(result.body.message,'He localizado FR-DEMO-001.');
 assert.equal(result.body.actions[0].type,'open_document');
 assert.equal(result.body.actions[0].payload.pending,530);
 assert.deepEqual(result.body.actions[0].sourceVersions,{facturas:'2026-11-22T09:00:00Z'});
 assert.equal(result.body.preserveQueryContext,true);
});

test('unauthorized and failed reads do not return an empty result or customer invoices',async()=>{
 assert.equal((await ask(first,{role:'colaborador'})).status,403);
 const result=await ask(first,{failRead:'app_leer_bloques'});
 assert.equal(result.status,503);
 assert.equal(result.body.error.code,'payable_data_unavailable');
 assert.equal(result.body.sources,undefined);
});

test('known charges honor withholding, exclude tombstones and conflicts, and keep currencies separate',async()=>{
 const blocks=fixtureBlocks({acceptance:true});
 Object.assign(blocks.facturas.entries.find(row=>row.id===202),{currency:'USD'});
 blocks.facturas.del={205:true};
 blocks.facturas.entries.push(
  {id:205,kind:'out',status:'pend',amount:100,concept:'Eliminada'},
  {id:206,kind:'out',status:'pend',amount:100,irpf:10,concept:'Retención sin base'},
  {id:207,kind:'out',status:'pend',amount:100,cobros:[{amount:12}],concept:'Movimiento sin conciliar'}
 );
 const result=await ask(first,{blocks});
 assert.equal(result.body.payables.review,2);
 assert.deepEqual(result.body.payables.amounts,[{currency:'EUR',amount:530},{currency:'USD',amount:300}]);
 assert.match(result.body.message,/2 facturas que necesitan revisión/);
});

test('subsequent pages retain the direction, version, count and totals',async()=>{
 const blocks=fixtureBlocks({acceptance:true});
 for(let i=0;i<13;i++)blocks.facturas.entries.push({id:400+i,kind:'out',status:'pend',amount:10,concept:'Extra '+i});
 const firstPage=(await ask(first,{blocks})).body;
 const query={invoicePage:{projectId:null,offset:firstPage.payables.next,version:firstPage.payables.version}};
 const second=await ask(first,{blocks},query);
 assert.equal(second.status,200);
 assert.equal(second.body.payables.count,15);
 assert.equal(second.body.payables.next,null);
 assert.deepEqual(second.body.payables.amounts,firstPage.payables.amounts);
 assert.equal(new Set([...firstPage.sources,...second.body.sources].map(row=>row.id)).size,15);
 assert.equal((await ask(first,{blocks,version:'2026-11-26T09:00:00Z'},query)).status,409);
});
