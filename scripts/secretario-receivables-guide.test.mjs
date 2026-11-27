import test from 'node:test';
import assert from 'node:assert/strict';
import {isReceivableIntent,receivableDetailQuestion,receivableQuestion,resolveReceivableScope,validReceivableContext} from '../supabase/functions/secretario/receivable-scope.mjs';
import {receivablesPage} from '../supabase/functions/secretario/receivables.mjs';
import {fixtureBlocks,fixtureRequest,studyId} from './secretario-receivables-fixture.mjs';

const today='2026-11-27';
const records=[
  ['F-DEMO-01','Ana Vega','patio','2026-11-01','2026-11-10',1200,400],
  ['F-DEMO-02','Ana Vega','patio','2026-11-15',null,600,0],
  ['F-DEMO-03','Bruno Rey','alba','2025-12-20','2026-01-20',700,200],
  ['F-DEMO-04','Ana Vega','patio','2026-10-10','2026-11-10',900,900]
];
const fixture=()=>({
  config:{account:{currency:'EUR'},series:{fc:'F'}},
  clients:['Ana Vega','Bruno Rey','Bruno sin facturas'].map(name=>({name,type:'Cliente',brand:'cm'})),
  projects:[{id:'patio',name:'Patio Demo',brand:'cm'},{id:'alba',name:'Alba Demo',brand:'cm'}],
  invoices:records.map(([ref,client,projectId,date,due,total,paid])=>({ref,client,projectId,date,due,total,brand:'cm',status:total===paid?'pag':'env'})),
  entries:records.map(([link,client,pid,date,due,amount,paid],id)=>({id,link,client,pid,date,due,amount,brand:'cm',kind:'in',base:amount,
    status:amount===paid?'cobr':'pend',cobros:paid?[{amount:paid}]:[]}))
});

function ask(snapshot,message,receivableContext,answers){
  const request={message,receivableContext,context:{},history:[],automatic:!!answers,answers};
  const turn=receivableQuestion(request);
  assert.ok(turn,message);
  const resolved=resolveReceivableScope(snapshot,request,turn,today);
  if(resolved.question){
    const {field}=resolved.question;
    return {question:resolved.question,context:{scope:turn.base,clarification:{field,query:turn.query,answers:turn.answers}}};
  }
  const {scope,clientKey}=resolved;
  const {projectId,overdue,date,reference,brand,currency}=scope;
  const context={scope:{clientKey,projectId,overdue,date,reference,brand,currency}};
  assert.ok(validReceivableContext(context));
  return {page:receivablesPage(snapshot,{today,...scope}),context};
}

test('COB-01–06 and CON-01–05 remove only the named filter and expand due status',()=>{
  const snapshot=fixture();
  const all=ask(snapshot,'¿Qué me deben?');
  assert.equal(all.page.count,3);
  assert.deepEqual(all.page.amounts,[{currency:'EUR',amount:1900}]);
  const annual=ask(snapshot,'Solo las de este año',all.context);
  assert.deepEqual(annual.page.page.map(row=>row.label),['F-DEMO-01','F-DEMO-02']);
  assert.deepEqual(annual.page.amounts,[{currency:'EUR',amount:1400}]);
  const debtor=ask(snapshot,'Solo las de Ana Vega',annual.context);
  assert.equal(debtor.context.scope.clientKey,JSON.stringify(['ana vega','cm']));
  const overdue=ask(snapshot,'Y de esas, las vencidas',debtor.context);
  assert.deepEqual(overdue.page.amounts,[{currency:'EUR',amount:800}]);
  assert.equal(overdue.page.page[0].dueCalculated,false);
  const plusOpen=ask(snapshot,'También las que no han vencido',overdue.context);
  assert.equal(plusOpen.context.scope.overdue,null);
  assert.deepEqual(plusOpen.page.amounts,[{currency:'EUR',amount:1400}]);
  const openOnly=ask(snapshot,'Ahora solo las que aún no han vencido',plusOpen.context);
  assert.equal(openOnly.context.scope.overdue,'open');
  assert.equal(openOnly.page.page[0].label,'F-DEMO-02');
  assert.equal(openOnly.page.page[0].dueCalculated,true);
  assert.equal(openOnly.page.page[0].due,'2026-12-15');
  const allClients=ask(snapshot,'De todos los clientes',openOnly.context);
  assert.equal(allClients.context.scope.clientKey,null);
  assert.equal(allClients.context.scope.overdue,'open');
  assert.deepEqual(allClients.context.scope.date,annual.context.scope.date);
  const noFilters=ask(snapshot,'Ahora sin filtros',allClients.context);
  assert.deepEqual(noFilters.page.amounts,all.page.amounts);
});

test('CON-08 replaces only project, retains currency/period, and explicitly changes the date type',()=>{
  const snapshot=fixture();
  const patio=ask(snapshot,'Facturas pendientes de cobro del proyecto Patio Demo emitidas este año en EUR');
  assert.equal(patio.context.scope.currency,'EUR');
  const alba=ask(snapshot,'Y lo mismo para el proyecto Alba Demo',patio.context);
  assert.equal(alba.context.scope.projectId,'alba');
  assert.deepEqual(alba.context.scope.date,patio.context.scope.date);
  assert.equal(alba.context.scope.currency,'EUR');
  assert.equal(alba.page.count,0);
  const due=ask(snapshot,'Vence este mes',patio.context);
  assert.equal(due.context.scope.date.field,'due');
  assert.deepEqual(due.page.page.map(row=>row.label),['F-DEMO-01']);
  const emitted=ask(snapshot,'Mejor las emitidas en noviembre de 2026',due.context);
  assert.equal(emitted.context.scope.date.field,'issued');
  assert.equal(emitted.page.count,2);
});

test('COB-06 and COB-10 recognize debtor language and do not assert a zero without checking',()=>{
  const snapshot=fixture();
  for(const query of ['¿Cuánto me debe Ana Vega?','Lo que me debe Ana Vega','Entonces Ana Vega ya no me debe nada, ¿no?']){
    assert.ok(isReceivableIntent(query));
    const result=ask(snapshot,query);
    assert.deepEqual(result.page.amounts,[{currency:'EUR',amount:1400}]);
    assert.match(result.page.message,/A Ana Vega le quedan/);
  }
  const missing=ask(snapshot,'¿Cuánto me debe Nombre inválido este año?');
  assert.equal(missing.question.field,'receivable_client');
  const resolved=ask(snapshot,'Ana Vega',missing.context,{receivable_client:'Ana Vega'});
  assert.deepEqual(resolved.page.amounts,[{currency:'EUR',amount:1400}]);
  assert.equal(resolved.context.scope.date.from,'2026-01-01');
  assert.equal(ask(snapshot,'Entonces Bruno sin facturas ya no me debe nada, ¿no?').page.count,0);
});

test('COB-07/08 reconcile partial receipts and retention for a verified brand and reference',()=>{
  const snapshot=fixture();
  snapshot.entries[0].irpf=10;
  snapshot.entries[0].base=1000;
  snapshot.invoices.push({...snapshot.invoices[0],brand:'em'});
  snapshot.entries.push({...snapshot.entries[0],id:10,brand:'em',cobros:[{amount:100}]});
  const result=receivablesPage(snapshot,{today,reference:'f-demo-01',brand:'cm'});
  assert.deepEqual(result.amounts,[{currency:'EUR',amount:700}]);
  assert.match(result.message,/Quedan 700.*1\.200.*100.*retención.*400.*cobros registrados/);
  assert.equal(result.page[0].brand,'cm');
  assert.equal(receivablesPage(snapshot,{today,reference:'f-demo-01'}).count,2);
  assert.equal(receivableDetailQuestion('¿Cuánto queda de esta?'),true);
  assert.equal(receivableDetailQuestion('¿Por qué pone 1.200 si me debe 800?'),true);
  assert.equal(receivableDetailQuestion('¿Por qué pone error al cargar?'),false);
});

test('COB-13 and ERR-02 communicate confirmed totals and bounded reasons without exposing inconsistent rows',()=>{
  const snapshot=fixture();
  snapshot.entries[0].amount=1250;
  snapshot.entries[2].status='cobr';
  const first=ask(snapshot,'¿No queda nada por cobrar?');
  const result=first.page;
  assert.equal(result.count,1);
  assert.deepEqual(result.amounts,[{currency:'EUR',amount:600}]);
  assert.match(result.message,/^Puedo confirmar 600.*2 facturas que necesitan revisión/);
  assert.doesNotMatch(result.message,/F-DEMO-0[13]|Bruno|1\.250/);
  assert.deepEqual(result.reviewReasons,[{reason:'amount',count:1},{reason:'payment',count:1}]);
  assert.deepEqual(ask(snapshot,'¿Cuánto es en total?',first.context).page.amounts,result.amounts);
  const unresolved=receivablesPage(snapshot,{today,reference:'f-demo-01'});
  assert.equal(unresolved.count,0);
  assert.match(unresolved.message,/No puedo confirmar el saldo pendiente/);
  assert.doesNotMatch(unresolved.message,/No tienes|0 €/);
});

test('currency filters constrain rows and leave amounts separated when the filter is removed',()=>{
  const snapshot=fixture();
  snapshot.invoices[2].currency='USD';
  snapshot.entries[2].currency='USD';
  const eur=ask(snapshot,'¿Qué me falta por cobrar en euros?');
  assert.deepEqual(eur.page.amounts,[{currency:'EUR',amount:1400}]);
  const everyCurrency=ask(snapshot,'En cualquier moneda',eur.context);
  assert.deepEqual(everyCurrency.page.amounts,[{currency:'EUR',amount:1400},{currency:'USD',amount:500}]);
  assert.equal(everyCurrency.context.scope.currency,null);
  const usd=ask(snapshot,'Solo en USD',everyCurrency.context);
  assert.deepEqual(usd.page.page.map(row=>row.label),['F-DEMO-03']);
});

test('COB-11 ranks verified identities in the current scope and treats currencies separately',()=>{
  const snapshot=fixture();
  snapshot.clients.push({name:'Ana Vega',type:'Cliente',brand:'cm'});
  snapshot.invoices[0].clientIdx=0;
  snapshot.invoices[1].clientIdx=3;
  snapshot.invoices[2].currency='USD';
  snapshot.entries[2].currency='USD';
  const ranking=ask(snapshot,'¿Quién me debe más?');
  assert.match(ranking.page.message,/Ana Vega \(ficha 1\) por 800.*Bruno Rey por 500/);
  assert.deepEqual(ranking.page.amounts,[{currency:'EUR',amount:800},{currency:'USD',amount:500}]);
  assert.deepEqual(ranking.page.page.map(row=>row.label),['F-DEMO-03','F-DEMO-01']);
  assert.ok(ranking.page.page.every(row=>!Object.hasOwn(row,'debtor')));
  const annual=ask(snapshot,'Facturas pendientes de cobro de este año en EUR');
  const filtered=ask(snapshot,'¿Qué cliente nos adeuda más dinero?',annual.context);
  assert.deepEqual(filtered.context.scope.date,annual.context.scope.date);
  assert.deepEqual(filtered.page.amounts,[{currency:'EUR',amount:800}]);
  delete snapshot.invoices[0].clientIdx;
  const ambiguous=ask(snapshot,'¿Qué cliente tiene más pendiente de cobro?',annual.context).page;
  assert.match(ambiguous.message,/mayor pendiente confirmado.*ficha 4.*600.*identidad del cliente no se puede confirmar/);
  assert.deepEqual(ambiguous.reviewReasons,[{reason:'debtor',count:1}]);
  assert.deepEqual(ambiguous.page.map(row=>row.label),['F-DEMO-02']);
});

test('COB-11 keeps every tied winner and pages the same set with the ranking version',()=>{
  const snapshot=fixture();
  snapshot.entries[2].amount=1600;
  snapshot.invoices[2].total=1600;
  const tied=ask(snapshot,'¿Cuál es el cliente que más me debe?').page;
  assert.match(tied.message,/empatado entre Ana Vega y Bruno Rey, con 1\.400.*cada uno/);
  assert.deepEqual(tied.amounts,[{currency:'EUR',amount:2800}]);
  for(let index=0;index<14;index++){
    const ref=`F-RANK-${100+index}`;
    snapshot.invoices.push({...snapshot.invoices[0],ref});
    snapshot.entries.push({...snapshot.entries[0],link:ref,id:100+index});
  }
  const first=ask(snapshot,'¿Quién me debe más?').page;
  assert.equal(first.count,16);
  assert.equal(first.next,12);
  const resolved=resolveReceivableScope(snapshot,{message:'EUR',context:{},invoicePage:{version:'[true,true]'}},{query:'',answers:{},base:{currency:'EUR'}},today);
  const next=receivablesPage(snapshot,{today,...resolved.scope,offset:12});
  assert.equal(next.next,null);
  assert.deepEqual(next.amounts,first.amounts);
  assert.equal(new Set([...first.page,...next.page].map(row=>row.label)).size,16);
});

test('COB-11 follow-up and pagination preserve the winning rows through the server',async()=>{
  const blocks=fixtureBlocks({acceptance:true});
  const [invoice]=blocks.facturas.invoices,[entry]=blocks.facturas.entries;
  for(let index=0;index<15;index++){
    const ref='F-RANK-'+(index+200);
    blocks.facturas.invoices.push({...invoice,ref});
    blocks.facturas.entries.push({...entry,link:ref,id:1000+index});
  }
  const request={studyId,message:'Facturas pendientes de cobro de este año',context:{view:'finanzas',timeZone:'Europe/Madrid'}};
  const annual=await fixtureRequest(request,{blocks});
  const rank={...request,message:'¿Quién me debe más?',receivableContext:annual.body.receivableContext};
  const first=await fixtureRequest(rank,{blocks});
  assert.equal(first.body.receivables.count,16);
  assert.equal(first.body.receivables.scopeLabel,'Emisión: 2026-01-01 a 2026-12-31');
  assert.match(first.body.message,/Cliente A por 16\.000/);
  const last=await fixtureRequest({...rank,receivableContext:first.body.receivableContext,
    invoicePage:{version:first.body.receivables.version,offset:first.body.receivables.next,projectId:null}},{blocks});
  assert.equal(last.status,200);
  assert.deepEqual(last.body.receivables.amounts,first.body.receivables.amounts);
  assert.equal(new Set([...first.body.sources,...last.body.sources].map(row=>row.id)).size,16);
  const mixed=await fixtureRequest({...rank,invoicePage:{version:annual.body.receivables.version,offset:12,projectId:null}},{blocks});
  assert.equal(mixed.status,409);
});
