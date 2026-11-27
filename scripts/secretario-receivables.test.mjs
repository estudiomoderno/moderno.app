import test from 'node:test';
import assert from 'node:assert/strict';
import {collectReceivables, receivablesPage} from '../supabase/functions/secretario/receivables.mjs';
import {isReceivableIntent,receivableQuestion} from '../supabase/functions/secretario/receivable-scope.mjs';
import {executePlan} from '../supabase/functions/secretario/core.mjs';
import {fixtureRequest, invoiceFixture, studyId} from './secretario-receivables-fixture.mjs';

const today = '2026-11-26';
const message = 'Dime qué facturas tengo pendientes de cobrar';
const request = {studyId,message,context:{view:'finanzas',timeZone:'Europe/Madrid'}};
const snapshot = extra => ({...invoiceFixture({extra}),config:{account:{currency:'EUR'},series:{fc:'FC'}}});

test('the question uses the authorized invoice blocks and never calls the planner', async () => {
  const {status,body,calls} = await fixtureRequest(request);
  assert.equal(status,200);
  assert.deepEqual(calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
  assert.deepEqual(calls[1].args.p_bloques,['proyectos','contactos','config','facturas']);
  assert.equal(body.receivables.intent,'pending_invoices');
  assert.equal(body.receivables.count,3);
  assert.equal(body.receivables.overdue,1);
  assert.deepEqual(body.receivables.amounts,[{currency:'EUR',amount:1680}]);
  assert.deepEqual(body.sources.map(({label,pending,overdue,partial})=>[label,pending,overdue,partial]),[
    ['FC-0001',480,true,false],['FC-0002',750,false,false],['FC-0003',450,false,true]
  ]);
  assert.deepEqual(body.actions,[]);
  assert.equal(body.message.replaceAll('\u00a0',' '),'Tienes 3 facturas pendientes de cobro por 1.680 €. Una está vencida.');
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
  assert.equal(result.review,0);
  assert.deepEqual(collectReceivables(s,{today,projectId:'9002'}),{review:1,rows:[],reviewReasons:[{reason:'duplicate',count:1}]});
  assert.deepEqual(result.rows.map(row=>[row.kind,row.label,row.due]),[
    ['invoice_entry','FC-0300','2026-11-26'],['invoice','FC-0003','2030-01-20']
  ]);
  assert.equal(result.rows[0].overdue,false);
  assert.deepEqual(collectReceivables(s,{today,projectId:'9003'}),{review:0,rows:[],reviewReasons:[]});
});

test('filters by authorized client, project, issue dates, due dates and overdue status', async () => {
  const cases = [
    ['Facturas pendientes de cobro de Casa Lino', [2], 750, 0, 'Casa Lino'],
    ['Facturas pendientes del proyecto PR-0901', [1,3], 930, 1, 'Proyecto ficticio'],
    ['Facturas pendientes emitidas en febrero de 2026', [2], 750, 0, 'Emisión: 2026-02-01 a 2026-02-28'],
    ['Facturas pendientes con vencimiento en enero de 2030', [2,3], 1200, 0, 'Vencimiento: 2030-01-01 a 2030-01-31'],
    ['Facturas pendientes del proyecto Reforma Lino del cliente Casa Lino, emitidas en febrero de 2026', [2], 750, 0, 'Casa Lino · Reforma Lino · Emisión: 2026-02-01 a 2026-02-28'],
    ['Facturas pendientes del cliente Cliente sin facturas', [], 0, 0, 'Cliente sin facturas'],
    ['Facturas pendientes del cliente Casa Cobro Completo', [], 0, 0, 'Casa Cobro Completo'],
    ['Facturas pendientes del proyecto PR-0901 de Casa Lino', [], 0, 0, 'Casa Lino · Proyecto ficticio'],
    ['Facturas pendientes vencidas', [1], 480, 1, 'Solo vencidas'],
    ['Facturas pendientes sin vencer', [2,3], 1200, 0, 'Sin vencer']
  ];
  for (const [message,numbers,total,overdue,scopeLabel] of cases) {
    const {status,body}=await fixtureRequest({...request,message});
    assert.equal(status,200,message);
    const {count,amounts,overdue:expired,scopeLabel:label}=body.receivables;
    assert.deepEqual([count,expired,label],[numbers.length,overdue,scopeLabel],message);
    assert.deepEqual(amounts,total?[{currency:'EUR',amount:total}]:[]);
    assert.deepEqual(body.sources.map(row=>row.label),numbers.map(n=>'FC-000'+n));
    assert.equal(body.sources.reduce((sum,row)=>sum+row.pending,0),total);
    assert.deepEqual(body.actions,[]);
    if(!numbers.length)assert.equal(body.message,'No tienes facturas pendientes de cobro con esos filtros.');
    else assert.ok(body.message.includes(new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:0,useGrouping:'always'}).format(total)));
  }
});

test('asks a focused scope question and uses the verified answer without falling back to a summary', async () => {
  const message='Facturas pendientes del cliente Nombre inválido en febrero de 2026';
  const first=(await fixtureRequest({...request,message})).body;
  assert.equal(first.questions[0].id,'receivable_client');
  assert.deepEqual(first.sources,[]);
  const second=(await fixtureRequest({...request,message:'Casa Lino',automatic:true,
    history:[{role:'user',content:message},{role:'assistant',content:first.message}],
    answers:{receivable_client:'Casa Lino'}})).body;
  assert.equal(second.receivables.scopeLabel,'Casa Lino · Emisión: 2026-02-01 a 2026-02-28');
  assert.deepEqual(second.sources.map(row=>row.label),['FC-0002']);
  for(const [message,field] of [
    ['Facturas pendientes no de Casa Lino','receivable_scope'],
    ['Facturas pendientes de cobrar de los últimos seis meses','receivable_period'],
    ['Facturas pendientes a fecha de 2026-09-01','receivable_scope']
  ]){
    const {body}=await fixtureRequest({...request,message});
    assert.equal(body.questions[0].id,field);
    assert.deepEqual(body.sources,[]);
    assert.equal(body.receivables,undefined);
  }
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
  const otherScope=await fixtureRequest({...nextRequest,message:'Facturas pendientes de cobrar de Casa Lino'},{extra:14});
  assert.equal(otherScope.status,409);
});

test('classifies financial lookup separately from opening a document or listing tasks', () => {
  const empty=receivablesPage({invoices:[],entries:[],config:{}},{today});
  assert.equal(empty.message,'No tienes facturas pendientes de cobro.');
  assert.equal(empty.count,0);
  for(const query of [message,'¿Qué tengo pendiente de cobrar?','Facturas pendientes de cobro de Casa Lino','Facturas pendientes de cobro vencidas']){
    assert.equal(isReceivableIntent(query),true,query);
  }
  for(const query of ['Abre la factura pendiente','¿Qué tareas me quedan pendientes?']){
    assert.equal(isReceivableIntent(query),false,query);
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

const demoIds=(...numbers)=>numbers.map(number=>'F-DEMO-00'+number);
const ask=(message,context,answers,options)=>fixtureRequest({...request,message,receivableContext:context,
  ...(answers?{answers,automatic:true}:{})},{acceptance:true,...options});
const shown=result=>result.body.sources.map(source=>source.label);
const say=result=>result.body.message.replaceAll('\u00a0',' ');

test('natural misspelling, adding the year, overdue refinement and fresh invoice lookup',async()=>{
  const base=await ask('que facturas quedan por que me pagen');
  assert.equal(say(base),'Tienes 3 facturas pendientes de cobro por 2.300 €. De ellas, 2 están vencidas.');
  assert.deepEqual(shown(base),demoIds(3,1,2));
  const annual=await ask('solo las de este año',base.body.receivableContext);
  assert.equal(say(annual),'De las emitidas en 2026, tienes 2 facturas pendientes por 1.500 €. Una está vencida.');
  assert.deepEqual(shown(annual),demoIds(1,2));
  const overdue=await ask('enséñame solo las vencidas',annual.body.receivableContext);
  assert.equal(say(overdue),'De esas facturas de 2026, queda 1 vencida por 1.000 €.');
  assert.deepEqual(shown(overdue),demoIds(1));
  const detail=await ask('¿Cuánto falta por cobrar de la F-DEMO-002?',overdue.body.receivableContext);
  assert.equal(say(detail),'Quedan 500 € por cobrar. La factura es de 1.200 € y tiene 700 € de cobros registrados.');
  assert.deepEqual(shown(detail),demoIds(2));
  assert.equal(detail.body.sources[0].pending,500);
  assert.deepEqual(detail.body.actions,[]);

  const priorYear=await ask('ahora las del año pasado',overdue.body.receivableContext);
  assert.deepEqual(shown(priorYear),demoIds(3));
  const clearYear=await ask('de todos los años',priorYear.body.receivableContext);
  assert.deepEqual(shown(clearYear),demoIds(3,1));
  const onlyOpen=await ask('mejor las que están sin vencer',clearYear.body.receivableContext);
  assert.deepEqual(shown(onlyOpen),demoIds(2));
  const reset=await ask('todo el estudio',onlyOpen.body.receivableContext);
  assert.deepEqual(shown(reset),demoIds(3,1,2));
  const newRequest=await ask('¿Qué me queda por cobrar?',overdue.body.receivableContext);
  assert.deepEqual(shown(newRequest),demoIds(3,1,2));
  assert.equal(receivableQuestion({receivableContext:overdue.body.receivableContext,message:'Dime las tareas pendientes de este año',history:[]}),null);
});

test('confirmation works through the form, through the composer and in older open tabs',async()=>{
  const old='¿Te refieres a facturas pendientes de cobro? Si quieres, indica también el cliente, el proyecto o el periodo.';
  const clarification=executePlan({role:'admin'},{},{intent:'pending_invoices'});
  assert.equal(clarification.questions[0].id,'receivable_confirm');
  const answer='pendientes de cobro y solo de este año';
  const fromForm=await ask(answer,clarification.receivableContext,{receivable_confirm:answer});
  const typed=await ask(answer,clarification.receivableContext);
  const legacy=await fixtureRequest({...request,message:'Describe las facturas que quieres consultar. '+answer,
    history:[{role:'user',content:'que facturas quedan por que me pagen'},{role:'assistant',content:old}],
    automatic:true,answers:{detail:answer}},{acceptance:true});
  for(const result of [fromForm,typed,legacy]){
    assert.equal(say(result),'De las emitidas en 2026, tienes 2 facturas pendientes por 1.500 €. Una está vencida.');
    assert.deepEqual(shown(result),demoIds(1,2));
  }
});

test('real client/project ambiguity offers both choices and preserves an existing year filter',async()=>{
  const annual=await ask('Facturas pendientes de este año');
  const ambiguous=await ask('Y las de Casa Sol',annual.body.receivableContext);
  assert.equal(say(ambiguous),'¿Te refieres al cliente Casa Sol o al proyecto Casa Sol?');
  const question=ambiguous.body.questions[0];
  assert.deepEqual(question.options.map(option=>option.label),['Cliente Casa Sol','Proyecto Casa Sol']);
  const client=await ask('Cliente Casa Sol',ambiguous.body.receivableContext);
  assert.equal(say(client),'No tienes facturas pendientes de cobro con esos filtros.');
  assert.deepEqual(shown(client),[]);
  const project=await ask('Proyecto Casa Sol',ambiguous.body.receivableContext,{[question.id]:question.options[1].value});
  assert.deepEqual(shown(project),demoIds(1));
  assert.equal(project.body.receivables.scopeLabel,'Casa Sol · Emisión: 2026-01-01 a 2026-12-31');
  const skipped=await ask('Dime qué facturas tengo pendientes de cobrar',ambiguous.body.receivableContext);
  assert.deepEqual(shown(skipped),demoIds(3,1,2));
});

test('read and revalidation failures never report empty results, and the date uses the caller time zone',async()=>{
  for(const failRead of ['app_leer_bloques','app_leer_versiones']){
    const error=await ask('que facturas quedan por que me pagen',undefined,undefined,{failRead});
    assert.equal(error.status,503);
    assert.deepEqual(error.body.error,{code:'invoice_data_unavailable',message:'No he podido consultar las facturas ahora. Puedes reintentarlo.'});
    assert.equal(error.body.receivables,undefined);
  }
  const now='2026-01-01T00:30:00Z';
  const lookup=zone=>fixtureRequest({...request,message:'Facturas pendientes de este año',context:{timeZone:zone}},{now,acceptance:true});
  assert.deepEqual(shown(await lookup('Europe/Madrid')),demoIds(1,2));
  assert.deepEqual(shown(await lookup('America/New_York')),demoIds(3));
});
