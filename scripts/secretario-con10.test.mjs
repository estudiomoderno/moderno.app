import test from 'node:test';
import assert from 'node:assert/strict';
import {receivableCompoundOpen} from '../supabase/functions/secretario/finance-conversation.mjs';
import {fixtureBlocks,fixtureRequest,studyId} from './secretario-receivables-fixture.mjs';

const message='Dime lo pendiente y abre la de Casa Lino';
const input=changes=>({studyId,message,context:{view:'finanzas',timeZone:'Europe/Madrid'},...changes});
const clean=value=>value.replaceAll('\u00a0',' ');

function addCasaLinoInvoice(blocks,{ref='FC-0099',id=999,total=250,due='2030-02-15'}={}){
 const original=blocks.facturas.invoices.find(row=>row.ref==='FC-0002');
 blocks.facturas.invoices.push({...structuredClone(original),ref,total,due,lines:[{name:'Servicio adicional',qty:1,price:total,unit:'ud'}]});
 const entry=blocks.facturas.entries.find(row=>row.link==='FC-0002');
 blocks.facturas.entries.push({...structuredClone(entry),id,link:ref,concept:`Factura ${ref} · Casa Lino`,amount:total,base:total,due:due.split('-').reverse().join('/')});
}

test('CON-10 parser is explicit and never absorbs another operation',()=>{
 assert.deepEqual(receivableCompoundOpen({message,automatic:false}),{
  client:'casa lino',continuation:false,query:'facturas pendientes de cobro'
 });
 assert.equal(receivableCompoundOpen({message:'Abre la factura pendiente de Casa Lino',automatic:false}),null);
 assert.equal(receivableCompoundOpen({message:'Dime lo pendiente y abre la de Casa Lino y bórrala',automatic:false}),null);
 assert.equal(receivableCompoundOpen({message:'Dime los gastos y abre la de Casa Lino',automatic:false}),null);
});

test('CON-10 labels the verified overall total and opens only one exact source',async()=>{
 const {status,body,calls}=await fixtureRequest(input());
 assert.equal(status,200);
 assert.equal(clean(body.message),'En todo el estudio, quedan 1.680 € por cobrar. De Casa Lino hay 1 factura pendiente. La abro.');
 assert.deepEqual(body.sources.map(row=>row.label),['FC-0002']);
 assert.equal(body.actions.length,1);
 assert.equal(body.actions[0].type,'open_document');
 assert.equal(body.actions[0].openImmediately,true);
 assert.equal(body.actions[0].payload.id,'FC-0002');
 assert.deepEqual(calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
});

test('CON-10 asks which invoice using verified source cards when there are several',async()=>{
 const blocks=fixtureBlocks();addCasaLinoInvoice(blocks);
 const {body}=await fixtureRequest(input(),{blocks});
 assert.equal(body.status,'clarifying');
 assert.equal(body.receivables.count,2);
 assert.deepEqual(new Set(body.sources.map(row=>row.label)),new Set(['FC-0002','FC-0099']));
 assert.deepEqual(body.actions,[]);
 assert.match(body.message,/De Casa Lino puedo confirmar 2 facturas pendientes\./);
 assert.match(body.message,/Elige cuál quieres abrir en las opciones\. No he abierto ninguna factura\.$/);
});

test('CON-10 never opens one source when another in-scope record needs review',async()=>{
 const blocks=fixtureBlocks(),original=blocks.facturas.invoices.find(row=>row.ref==='FC-0002');
 blocks.facturas.invoices.push({...structuredClone(original),ref:'FC-REVIEW-01',total:400,lines:[{name:'Registro sin movimiento',qty:1,price:400,unit:'ud'}]});
 const {body}=await fixtureRequest(input(),{blocks});
 assert.equal(body.status,'clarifying');
 assert.equal(body.receivables.count,1);
 assert.equal(body.receivables.review,1);
 assert.deepEqual(body.actions,[]);
 assert.match(body.message,/No puedo asegurar que sea la única\. No he abierto ninguna factura\.$/);
});

test('CON-10 keeps every overview filter and replaces client/reference only for the open lookup',async()=>{
 const previous=(await fixtureRequest(input({message:'¿Cuánto falta por cobrar de FC-0001?'}))).body;
 assert.equal(previous.receivables.scopeLabel,'');
 const {body}=await fixtureRequest(input({message:'Ahora dime lo pendiente y abre la de Casa Lino',receivableContext:previous.receivableContext}));
 assert.equal(clean(body.message),'Con los filtros actuales, quedan 480 € por cobrar. De Casa Lino hay 1 factura pendiente. La abro.');
 assert.equal(body.actions[0].payload.id,'FC-0002');
});

test('CON-10 discloses empty/unresolved targets and resumes only the latest clarification',async()=>{
 const empty=(await fixtureRequest(input({message:'Dime lo pendiente y abre la de Cliente sin facturas'}))).body;
 assert.equal(empty.receivables.count,0);assert.deepEqual(empty.actions,[]);
 assert.match(empty.message,/No hay facturas pendientes de Cliente sin facturas\. No he abierto ninguna factura\.$/);

 const unknownMessage='Dime lo pendiente y abre la de Cliente desconocido';
 const first=(await fixtureRequest(input({message:unknownMessage}))).body;
 assert.equal(first.status,'clarifying');assert.equal(first.questions[0].id,'receivable_client');
 assert.match(first.message,/No he abierto ninguna factura\.$/);
 const second=(await fixtureRequest(input({message:'Casa Lino',automatic:true,
  history:[{role:'user',content:unknownMessage},{role:'assistant',content:first.message}],
  answers:{receivable_client:'Casa Lino'},receivableContext:first.receivableContext}))).body;
 assert.equal(second.status,'answer');assert.equal(second.actions[0].payload.id,'FC-0002');

 assert.equal(receivableCompoundOpen({message:'Casa Lino',automatic:true,receivableContext:first.receivableContext,
  answers:{receivable_client:'Casa Lino'},history:[{role:'user',content:unknownMessage},{role:'user',content:'Otra consulta'}]}),null);
});

test('CON-10 paginates only the client options',async()=>{
 const blocks=fixtureBlocks();
 for(let index=0;index<13;index++)addCasaLinoInvoice(blocks,{ref:`FC-LINO-${String(index+1).padStart(2,'0')}`,id:700+index,total:10+index,due:'2031-01-15'});
 const first=(await fixtureRequest(input(),{blocks})).body;
 assert.equal(first.status,'clarifying');assert.equal(first.receivables.count,14);assert.equal(first.sources.length,12);
 const second=(await fixtureRequest(input({invoicePage:{offset:first.receivables.next,version:first.receivables.version,projectId:null},
  receivableContext:first.receivableContext}),{blocks})).body;
 assert.equal(second.receivables.count,14);assert.equal(second.sources.length,2);assert.equal(second.receivables.next,null);
 assert.deepEqual(second.actions,[]);
});
