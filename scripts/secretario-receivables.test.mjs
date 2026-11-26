import test from 'node:test';
import assert from 'node:assert/strict';
import {collectReceivables, isGeneralReceivablesQuestion, receivablesPage} from '../supabase/functions/secretario/receivables.mjs';
import {fixtureRequest, invoiceFixture, studyId} from './secretario-receivables-fixture.mjs';

const today = '2026-11-26';
const message = 'Dime qué facturas tengo pendiente cobrar';
const request = {studyId,message,context:{view:'finanzas',timeZone:'Europe/Madrid'}};
const snapshot = extra => ({...invoiceFixture({extra}),config:{account:{currency:'EUR'},series:{fc:'FC'}}});

test('the question uses the authorized invoice blocks and never calls the planner', async () => {
  const {status,body,calls} = await fixtureRequest(request);
  assert.equal(status,200);
  assert.deepEqual(calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
  assert.deepEqual(calls[1].args.p_bloques,['proyectos','config','facturas']);
  assert.equal(body.receivables.count,3);
  assert.equal(body.receivables.overdue,1);
  assert.deepEqual(body.receivables.amounts,[{currency:'EUR',amount:1680}]);
  assert.deepEqual(body.sources.map(({label,pending,overdue,partial})=>[label,pending,overdue,partial]),[
    ['FC-0001',480,true,false],['FC-0002',750,false,false],['FC-0003',450,false,true]
  ]);
  assert.deepEqual(body.actions,[]);
  assert.match(body.message,/^Tienes 3 facturas pendientes de cobro por 1680,00\s*€. 1 está vencida\.$/);
});

test('uses recorded IRPF and collections, keeps currencies separate and reports contradictory records', () => {
  const s=snapshot();
  Object.assign(s.entries[1],{irpf:10,base:500,currency:'USD',cobros:[{amount:200}]});
  s.invoices[1].currency='USD';
  s.entries[2].status='cobr'; // Partial movements contradict the collected state.
  s.entries[3].cobros=[]; // An established paid status with no detail remains paid.
  const result=receivablesPage(s,{today});
  assert.deepEqual(result.amounts,[{currency:'EUR',amount:480},{currency:'USD',amount:500}]);
  assert.deepEqual(result.page.map(row=>row.label),['FC-0001','FC-0002']);
  assert.match(result.message,/Hay 1 factura que necesita revisión/);
  assert.doesNotMatch(result.message,/980|450|1250/);
});

test('respects tombstones, reconciles legacy invoices, and rejects ambiguous links', () => {
  const s=snapshot();
  s.invoiceData={ddel:{'FC-0001':1}};
  s.entries.push({...s.entries[1],id:500});
  s.entries.push({id:501,link:'FC-0300',kind:'in',brand:'cm',amount:95,status:'env',date:'27/10/2026',pid:9001});
  s.entries.push({id:502,concept:'Otros ingresos',kind:'in',brand:'cm',amount:600,status:'pend'});
  const result=collectReceivables(s,{today,projectId:'9001'});
  assert.equal(result.review,1);
  assert.deepEqual(result.rows.map(row=>[row.kind,row.label,row.due]),[
    ['invoice_entry','FC-0300','2026-11-26'],['invoice','FC-0003','2030-01-20']
  ]);
  assert.equal(result.rows[0].overdue,false);
  assert.deepEqual(collectReceivables(s,{today,projectId:'9002'}),{review:0,rows:[]});
});

test('pagination preserves the total and ordering, and forces a fresh query when versions change', async () => {
  const first=(await fixtureRequest(request,{extra:14})).body;
  const nextRequest={...request,invoicePage:{offset:first.receivables.next,version:first.receivables.version,projectId:null}};
  const second=(await fixtureRequest(nextRequest,{extra:14})).body;
  assert.equal(first.sources.length,12);
  assert.equal(second.sources.length,5);
  assert.equal(second.receivables.next,null);
  assert.deepEqual(second.receivables.amounts,first.receivables.amounts);
  assert.equal(new Set([...first.sources,...second.sources].map(row=>row.id)).size,17);
  const stale=await fixtureRequest(nextRequest,{extra:14,version:'2026-11-26T09:00:00Z'});
  assert.equal(stale.status,409);
  assert.equal(stale.body.error.code,'context_changed');
});

test('returns no results clearly and does not classify filtered questions as study-wide', () => {
  const empty=receivablesPage({invoices:[],entries:[],config:{}},{today});
  assert.equal(empty.message,'No tienes facturas pendientes de cobro.');
  assert.equal(empty.count,0);
  assert.equal(isGeneralReceivablesQuestion(message),true);
  assert.equal(isGeneralReceivablesQuestion('¿Qué tengo pendiente de cobrar?'),true);
  for(const query of ['Abre la factura pendiente','Facturas pendientes de cobro de Casa Lino','Facturas pendientes de cobro vencidas','¿Qué tareas me quedan pendientes?']){
    assert.equal(isGeneralReceivablesQuestion(query),false,query);
  }
});

test('blocks other studies and unauthorized roles, and explicitly opening a verified invoice is a separate action', async () => {
  for(const result of [await fixtureRequest(request,{role:'colaborador'}),await fixtureRequest({...request,studyId:'33333333-3333-4333-8333-333333333333'})]){
    assert.ok(result.status>=403);
    assert.equal(result.body.sources,undefined);
  }
  const open=await fixtureRequest({...request,message:'Abre la factura FC-0002'});
  assert.equal(open.status,200);
  assert.equal(open.body.actions[0].type,'open_document');
  assert.equal(open.body.actions[0].payload.id,'FC-0002');
  assert.equal(open.body.actions[0].openImmediately,true);
});
