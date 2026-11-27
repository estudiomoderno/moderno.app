import assert from 'node:assert/strict';
import test from 'node:test';
import {documentSearchTurn,plannedDocumentTurn,searchDocuments,validDocumentContext} from '../supabase/functions/secretario/document-search.mjs';
import {fixtureBlocks,fixtureRequest,studyId} from './secretario-receivables-fixture.mjs';

const now=Date.parse('2026-11-27T10:00:00Z');
const base={
  studyId:'11111111-1111-4111-8111-111111111111',role:'admin',versions:{facturas:'f1',presupuestos:'p1'},
  projects:[{id:2,name:'Patio Demo',num:'PR-0202'},{id:3,name:'Alba Demo',num:'PR-0303'}],
  config:{account:{currency:'EUR'}},
  clients:[
    {id:1,name:'Alfonso Cerropuerta',fiscal:'Digi',brand:'demo',type:'Cliente'},
    {id:2,name:'Alfonso Oliver',brand:'demo',type:'Cliente'},
    {id:3,name:'Ana Vega',brand:'demo',type:'Cliente'}
  ],
  invoices:[
    {ref:'F-DEMO-05',brand:'demo',projectId:2,client:'Alfonso Cerropuerta',clientIdx:0,date:'2026-11-25',total:200},
    {ref:'F-DEMO-01',brand:'demo',projectId:2,client:'Ana Vega',clientIdx:2,date:'2026-11-01',total:1200,sourceQuoteRef:'P-DEMO-01'},
    {ref:'F-DEMO-04',brand:'demo',projectId:2,client:'Ana Vega',clientIdx:2,date:'2026-10-10',total:900},
    {ref:'F-DEMO-06',brand:'demo',projectId:3,client:'Alfonso Oliver',clientIdx:1,date:'2025-12-29',total:1000}
  ],
  quotes:[
    {ref:'P-DEMO-01',brand:'demo',projectId:2,client:'Ana Vega',clientIdx:2,date:'2026-10-08',status:'acc',total:900},
    {ref:'P-DEMO-02',brand:'demo',projectId:2,client:'Ana Vega',clientIdx:2,date:'2026-10-08',status:'acc',total:500,currency:'USD'},
    {ref:'P-DEMO-03',brand:'demo',projectId:2,client:'Ana Vega',clientIdx:2,date:'2026-11-08',status:'pend',total:480},
    {ref:'P-DEMO-04',brand:'demo',projectId:2,client:'Ana Vega',clientIdx:2,date:'2025-10-08',status:'rej',total:920}
  ]
};
base.entries=base.invoices.map((invoice,i)=>({
  id:23+i,kind:'in',link:invoice.ref,brand:'demo',pid:invoice.projectId,date:invoice.date,amount:invoice.total,
  status:i===2?'cobr':'pend',...(i===2?{cobros:[{amount:900}]}:{})
}));
base.entries.push({id:501,kind:'out',brand:'demo',pid:2,concept:'G-DEMO-01',sup:'Lumen Demo',date:'2026-11-15',
  due:'2026-12-05',amount:300,status:'pend'});
const refs=result=>result.sources.map(source=>source.label);
function ask(message,{previous,context,study=base,documentPage,answers,receivableContext,history}={}){
  const request={message,context:{view:'finanzas',timeZone:'Europe/Madrid',...context},
    documentContext:previous,documentPage,answers,receivableContext,history,automatic:!!answers};
  const turn=documentSearchTurn(request);
  if(!turn)return null;
  const result=searchDocuments(study,request,turn,now);
  if(result?.documentContext)assert.ok(validDocumentContext(result.documentContext));
  return result;
}

test('keeps edition time with a refined client, registered alias and authorized ambiguity options',()=>{
  const initial=ask('Enséñame mis facturas');
  assert.deepEqual(refs(initial),['F-DEMO-05','F-DEMO-01','F-DEMO-04','F-DEMO-06']);
  const year=ask('Solo las de este año',{previous:initial.documentContext});
  const ambiguity=ask('Las de Alfonso',{previous:year.documentContext});
  assert.equal(ambiguity.status,'clarifying');
  assert.deepEqual(ambiguity.questions[0].options.map(option=>option.label),['Alfonso Cerropuerta · demo','Alfonso Oliver · demo']);
  for(const result of [
    ask('Alfonso Cerropuerta',{previous:ambiguity.documentContext}),
    ask('Alfonso Cerropuerta',{previous:ambiguity.documentContext,answers:{document_client:ambiguity.questions[0].options[0].value}}),
    ask('Dime las facturas del cliente de Digi')
  ])assert.deepEqual(refs(result),['F-DEMO-05']);
  assert.equal(ask('Facturas de Ana Vega en primavera').status,'clarifying');
  assert.equal(ask('Facturas del cliente inventado de este año').status,'clarifying');
});

test('keeps paid filters exact and original payment/creation journeys separate',()=>{
  assert.deepEqual(refs(ask('Solo las cobradas')),['F-DEMO-04']);
  for(const message of ['¿Cuánto he cobrado este año?','¿Qué facturas tengo pendientes de cobrar?','¿Qué ingresos de facturas faltan?',
    'Prepara un presupuesto para Ana','Abre la segunda factura','Enseña el PDF de esta factura'])
    assert.equal(ask(message),null,message);
  const received=ask('Enséñame mis facturas',{context:{view:'contabilidad'}});
  assert.equal(received.documents.kind,'received');
  assert.deepEqual(refs(received),['G-DEMO-01']);
  assert.equal(received.sources[0].supplier,'Lumen Demo');
  assert.equal(received.sources[0].pending,300);
});

test('settled follow-ups preserve confirmed client, project, issue year and supplier period',()=>{
  const study=structuredClone(base);
  study.invoices.push({ref:'F-DISTINTA',brand:'demo',projectId:3,client:'Ana Vega',clientIdx:2,date:'2026-11-11',total:200});
  study.entries.push(
    {id:201,kind:'in',brand:'demo',pid:3,link:'F-DISTINTA',status:'cobr',amount:200,date:'2026-11-11'},
    {id:701,kind:'out',brand:'demo',pid:2,concept:'G-COINCIDE',sup:'Lumen Demo',date:'2026-11-15',due:'2026-12-02',amount:100,status:'cobr'},
    {id:702,kind:'out',brand:'demo',pid:2,concept:'G-OTRO-ANO',sup:'Lumen Demo',date:'2025-11-15',due:'2025-12-02',amount:100,status:'cobr'},
    {id:703,kind:'out',brand:'demo',pid:3,concept:'G-OTRO-PROYECTO',sup:'Lumen Demo',date:'2026-11-15',amount:100,status:'cobr'},
    {id:704,kind:'out',brand:'demo',pid:2,concept:'G-OTRO-PROVEEDOR',sup:'Otro Demo',date:'2026-11-15',amount:100,status:'cobr'}
  );
  const receivableContext={scope:{projectId:'2',clientKey:'["ana vega","demo"]',date:{from:'2026-01-01',to:'2026-12-31',field:'issued'},
    overdue:'overdue',reference:null,currency:'EUR'}};
  const paid=ask('Solo las cobradas',{study,receivableContext});
  assert.deepEqual(refs(paid),['F-DEMO-04']);
  assert.match(paid.documents.scopeLabel,/Ana Vega.*Patio Demo.*2026/);
  const ordered=ask('Enséñame todas',{study,previous:paid.documentContext});
  assert.deepEqual(refs(ordered),['F-DEMO-04']);
  const history=[
    {role:'user',content:'Facturas por pagar de Lumen Demo para Patio Demo este año'},
    {role:'assistant',content:'Hay una factura por pagar.'}
  ];
  const suppliers=ask('Solo las pagadas',{study,history});
  assert.equal(suppliers.documents.kind,'received');
  assert.deepEqual(refs(suppliers),['G-COINCIDE']);
  assert.match(suppliers.documents.scopeLabel,/Lumen Demo.*Patio Demo.*2026/);
  const unverified=ask('Solo las pagadas',{study,history:[
    {role:'user',content:'Facturas por pagar del proveedor Desconocido'},
    {role:'assistant',content:'¿De qué proveedor quieres ver las facturas?'}
  ]});
  assert.deepEqual(unverified.sources,[]);
  assert.match(unverified.message,/confirmar el filtro anterior/);
});

test('the function switches both settled statuses without invoking the planner',async()=>{
  const request={studyId,context:{view:'finanzas',timeZone:'Europe/Madrid'}};
  const options={acceptance:true,blocks:fixtureBlocks({acceptance:true})};
  options.blocks.facturas.entries.push({id:777,kind:'out',brand:'cm',pid:9001,sup:'Proveedor A',
    concept:'G-PAGADA',amount:500,date:'2026-11-15',status:'cobr'});
  const incoming=await fixtureRequest({...request,message:'Mis facturas pendientes de cobro del proyecto Casa Sol de este año'},options);
  assert.equal(incoming.body.status,'answer',JSON.stringify(incoming.body));
  const collected=await fixtureRequest({...request,message:'Solo las cobradas',receivableContext:incoming.body.receivableContext},options);
  assert.equal(collected.status,200);
  assert.deepEqual(refs(collected.body),['F-DEMO-004']);
  const message='Facturas por pagar de Proveedor A para Casa Sol este año';
  const outgoing=await fixtureRequest({...request,message},options);
  assert.equal(outgoing.body.status,'answer',JSON.stringify(outgoing.body));
  const paid=await fixtureRequest({...request,message:'Solo las pagadas',history:[{role:'user',content:message},{role:'assistant',content:outgoing.body.message}]},options);
  assert.equal(paid.status,200);
  assert.deepEqual(refs(paid.body),['G-PAGADA']);
  for(const result of [collected,paid])assert.deepEqual(result.calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
});

test('a colloquial completed supplier payment asks only the supplier and matches text or the selected record',async()=>{
  const request={studyId,context:{view:'finanzas',timeZone:'Europe/Madrid'}};
  const blocks=fixtureBlocks({acceptance:true});
  blocks.contactos.push({id:'leroy-supplier',name:'Leroy Demo',type:'Proveedor',brand:'cm'},
    {id:'leroy-client',name:'Leroy Demo',type:'Cliente',brand:'cm'},
    {id:'leroy-other',name:'Leroy Demo',type:'Proveedor',brand:'other'});
  const paid={kind:'out',brand:'cm',pid:9001,sup:'Leroy Demo',supplierId:'leroy-supplier',amount:500,date:'2026-11-15',status:'cobr'};
  blocks.facturas.entries.push({id:701,concept:'G-OK',...paid},{id:702,concept:'G-AK',...paid,currency:'USD'},
    {id:703,concept:'G-ANTES',...paid,date:'2025-11-15'},
    {id:704,concept:'G-PEND',...paid,status:'pend'},
    {id:705,concept:'G-MARCA',...paid,brand:'other',supplierId:'leroy-other'},
    {id:706,concept:'G-OTRO',...paid,pid:9002});
  const options={acceptance:true,blocks};
  const message='hola quiero saber que facturas e pagado de un proveedor';
  const begun=await fixtureRequest({...request,message},options);
  assert.equal(begun.body.message,'¿De qué proveedor?');
  assert.equal(begun.body.documentContext.scope.kind,'received');
  assert.equal(begun.body.documentContext.scope.state,'paid');
  assert.equal(begun.body.questions[0].id,'document_client');
  assert.deepEqual(begun.body.sources,[]);
  const answerContext={...request,documentContext:begun.body.documentContext,
    history:[{role:'user',content:message},{role:'assistant',content:begun.body.message}]};
  const ambiguous=await fixtureRequest({...answerContext,message:'Leroy'},options);
  assert.equal(ambiguous.body.status,'clarifying');
  const choice=ambiguous.body.questions[0].options.find(option=>option.label==='Leroy Demo · cm');
  assert.ok(choice);
  const selected=await fixtureRequest({...answerContext,message:choice.label,automatic:true,
    documentContext:ambiguous.body.documentContext,answers:{document_client:choice.value}},options);
  assert.equal(selected.body.documents.kind,'received');
  assert.equal(selected.body.documentContext.scope.state,'paid');
  assert.deepEqual(refs(selected.body),['G-AK','G-OK','G-OTRO','G-ANTES']);
  const typed=await fixtureRequest({...answerContext,message:'Leroy Demo · cm'},options);
  assert.deepEqual(refs(typed.body),refs(selected.body));
  const refine=async(message,last)=>fixtureRequest({...request,message,documentContext:last.body.documentContext},options);
  const scoped=await refine('Solo de este año en euros para el proyecto Casa Sol',selected);
  assert.deepEqual(refs(scoped.body),['G-OK']);
  assert.match(scoped.body.documents.scopeLabel,/Leroy Demo.*Casa Sol.*2026.*EUR/);
  const noDate=await refine('Sin filtro de periodo',scoped);
  assert.deepEqual(refs(noDate.body),['G-OK','G-ANTES']);
  const noCurrency=await refine('Sin filtro de moneda',noDate);
  assert.deepEqual(refs(noCurrency.body),['G-AK','G-OK','G-ANTES']);
  const noProject=await refine('Sin filtro de proyecto',noCurrency);
  assert.deepEqual(refs(noProject.body),refs(selected.body));
  const noProvider=await refine('Sin filtro de proveedor',noProject);
  assert.ok(refs(noProvider.body).includes('G-MARCA'));
  assert.ok(!refs(noProvider.body).includes('G-PEND'));
  const noState=await refine('Sin filtro de estado',noProvider);
  assert.ok(refs(noState.body).includes('G-PEND'));
  for(const result of [begun,ambiguous,typed,selected,scoped,noDate,noCurrency,noProject,noProvider,noState]){
    assert.deepEqual(result.body.actions,[]);
    assert.deepEqual(result.calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
  }
});

test('the structured planner search validates the same supplier, date, state and currency against the snapshot',()=>{
  const study=structuredClone(base);
  study.clients.push({id:'lumen',name:'Lumen Demo',type:'Proveedor',brand:'demo'});
  study.entries.push({id:702,kind:'out',brand:'demo',pid:2,concept:'G-PAGADA',sup:'Lumen Demo',supplierId:'lumen',
    date:'2026-11-21',amount:400,status:'cobr'});
  const request={message:'Quiero ver los comprobantes liquidados de Lumen en euros de este año',
    context:{view:'finanzas',timeZone:'Europe/Madrid'}};
  const plan={lookup:{documentType:'received',partyQuery:'Lumen',supplierId:'lumen',state:'paid',period:'este año',
    dateField:'issued',currency:'EUR',continuation:false}};
  const run=override=>searchDocuments(study,request,plannedDocumentTurn(request,{lookup:{...plan.lookup,...override}}),now);
  const result=run({});
  assert.equal(result.status,'answer');
  assert.equal(result.documents.kind,'received');
  assert.equal(result.documentContext.scope.state,'paid');
  assert.deepEqual(refs(result),['G-PAGADA']);
  assert.match(result.documents.scopeLabel,/Lumen Demo.*Emisión.*EUR/);
  assert.equal(run({supplierId:'inventado'}).questions[0].id,'document_client');
  assert.equal(run({partyQuery:'Otro proveedor'}).questions[0].id,'document_client');
  assert.equal(run({reference:'G-DIFERENTE'}).questions[0].id,'document_reference');
  assert.equal(run({currency:'USD'}).questions[0].id,'document_currency');
  assert.deepEqual(run({dateField:'paid'}).sources,[]);
  assert.match(run({dateField:'paid'}).message,/fecha de emisión/);
  assert.equal(plannedDocumentTurn({...request,message:'Paga esta factura'},plan),null);
});

test('document chips remove precisely one filter and ask when the requested removal is ambiguous',()=>{
  const annual=ask('Enséñame mis facturas de este año');
  assert.deepEqual(annual.activeFilters.map(filter=>filter.clear),['sin filtro de periodo']);
  const cleared=ask('Quita ese filtro',{previous:annual.documentContext});
  assert.deepEqual(refs(cleared),['F-DEMO-05','F-DEMO-01','F-DEMO-04','F-DEMO-06']);
  assert.deepEqual(cleared.activeFilters,[]);
  const multiple=ask('Facturas de Ana Vega de este año');
  const choice=ask('Quita ese filtro',{previous:multiple.documentContext});
  assert.equal(choice.message,'¿Qué filtro quieres quitar?');
  assert.deepEqual(refs(choice),[]);
  assert.ok(choice.preserveQueryContext);
  assert.deepEqual(choice.activeFilters.map(filter=>filter.clear),['sin filtro de cliente','sin filtro de periodo']);
  const documents=ask('Sin filtro de cliente',{previous:multiple.documentContext});
  assert.deepEqual(refs(documents),['F-DEMO-05','F-DEMO-01','F-DEMO-04']);
  assert.deepEqual(documents.activeFilters.map(filter=>filter.clear),['sin filtro de periodo']);
});

test('verified mentions preserve a supplier identity through payable and paid follow-ups and chip removal',async()=>{
  const blocks=fixtureBlocks({acceptance:true});
  const options={blocks,acceptance:true};
  blocks.contactos.push({id:'lumen-1',name:'Lumen Demo',type:'Proveedor',brand:'cm'},
    {id:'lumen-2',name:'Lumen Demo',type:'Proveedor',brand:'cm'});
  const model={kind:'out',brand:'cm',pid:9001,sup:'Lumen Demo',amount:400,date:'2026-11-15',status:'pend'};
  blocks.facturas.entries.push({id:801,concept:'G-LUMEN-1',...model,supplierId:'lumen-1'},
    {id:802,concept:'G-LUMEN-2',...model,supplierId:'lumen-2'},
    {id:803,concept:'G-LUMEN-PAID',...model,supplierId:'lumen-1',status:'cobr'},
    {id:804,concept:'G-AMBIGUA',...model});
  const request={studyId,context:{view:'finanzas',timeZone:'Europe/Madrid'}};
  const initial=await fixtureRequest({...request,message:'Facturas por pagar de @Lumen Demo para @Casa Sol',
    mentions:[{label:'Lumen Demo',identity:{kind:'supplier',id:'lumen-1',brand:'cm'}},
      {label:'Casa Sol',identity:{kind:'project',id:'9001'}}]},options);
  assert.equal(initial.status,200);
  assert.deepEqual(refs(initial.body),['G-LUMEN-1']);
  assert.deepEqual(initial.body.activeFilters.map(filter=>filter.clear),['sin filtro de proveedor','sin filtro de proyecto']);
  assert.equal(initial.body.payables.review,1);
  assert.ok(validDocumentContext(initial.body.documentContext));
  const refine=(message,from)=>fixtureRequest({...request,message,documentContext:from.body.documentContext},options);
  const ambiguous=await refine('Quita ese filtro',initial);
  assert.equal(ambiguous.body.message,'¿Qué filtro quieres quitar?');
  assert.deepEqual(refs(ambiguous.body),[]);
  const noProject=await refine('Sin filtro de proyecto',initial);
  assert.deepEqual(refs(noProject.body),['G-LUMEN-1']);
  const paid=await refine('Solo las pagadas',noProject);
  assert.deepEqual(refs(paid.body),['G-LUMEN-PAID']);
  assert.equal(paid.body.documents.kind,'received');
  const noSupplier=await refine('Quita ese filtro',noProject);
  assert.deepEqual(noSupplier.body.activeFilters,[]);
  assert.ok(refs(noSupplier.body).includes('G-LUMEN-2'));
  for(const result of [initial,ambiguous,noProject,paid,noSupplier]){
    assert.deepEqual(result.body.actions,[]);
    assert.deepEqual(result.calls.map(call=>call.name),['app_rol','app_leer_bloques','app_leer_versiones']);
  }
});

test('limits send/version claims and links quotes only to their stored invoice reference',()=>{
  const mail=ask('Dime qué factura mandé a Alfonso Cerropuerta');
  assert.deepEqual(refs(mail),['F-DEMO-05']);
  assert.match(mail.message,/no puedo confirmar si la enviaste/);
  const repeat=ask('¿Seguro que ya se la mandé?',{previous:mail.documentContext});
  assert.match(repeat.message,/no puedo confirmar/);
  const copy=ask('¿Esta es la misma que le mandé?',{previous:mail.documentContext,
    context:{focus:{results:[{kind:'invoice',id:'F-DEMO-05',brand:'demo',projectId:'2'}]}}});
  assert.match(copy.message,/No puedo confirmar que sea la misma/);
  assert.deepEqual(refs(copy),['F-DEMO-05']);
  const link=ask('¿Ya hice la factura de este presupuesto?',{context:{focus:{document:{kind:'quote',id:'P-DEMO-01',brand:'demo',projectId:'2'}}}});
  assert.deepEqual(refs(link),['P-DEMO-01','F-DEMO-01']);
  const noLink=ask('¿Ya hice la factura de este presupuesto?',{context:{focus:{document:{kind:'quote',id:'P-DEMO-02',brand:'demo',projectId:'2'}}}});
  assert.match(noLink.message,/No aparece una factura vinculada/);
});

test('lists exact quote states and sums verified amounts grouped by currency',()=>{
  const quotes=ask('Enséñame los presupuestos de Ana Vega');
  assert.deepEqual(refs(ask('Los aceptados de este año',{previous:quotes.documentContext})),['P-DEMO-01','P-DEMO-02']);
  assert.deepEqual(refs(ask('Los rechazados',{previous:quotes.documentContext})),['P-DEMO-04']);
  assert.deepEqual(refs(ask('¿Cuáles están pendientes de aceptar?',{previous:quotes.documentContext})),['P-DEMO-03']);
  assert.match(ask('¿Cuánto suman los presupuestos aceptados?').message.replaceAll('\u00a0',' '),/900 € y 500 US\$/);
  assert.match(ask('¿El presupuesto P-DEMO-04 está aceptado?').message,/rechazado/);
  assert.match(ask('Los presupuestos aceptados durante este año').message,/No tengo una fecha de aceptación/);
});

test('keeps exact references, issued-date ties, and bounded stable pages',()=>{
  const latest=ask('¿Cuál es la última factura de Ana Vega?');
  assert.deepEqual(refs(latest),['F-DEMO-01']);
  assert.match(latest.message,/por fecha de emisión/);
  const tied=structuredClone(base);
  tied.invoices[2].date=tied.invoices[1].date;
  assert.deepEqual(refs(ask('¿Cuál es la última factura de Ana Vega?',{study:tied})),['F-DEMO-01','F-DEMO-04']);
  const duplicate=structuredClone(base);
  duplicate.invoices.push({...duplicate.invoices[0],brand:'other'});
  const ambiguous=ask('Busca la factura F-DEMO-05',{study:duplicate});
  assert.equal(ambiguous.status,'clarifying');
  assert.equal(ambiguous.questions[0].options.length,2);
  assert.equal(ask('Busca la factura F-DEMO-404').documents.count,0);
  const large=structuredClone(base);
  for(let i=0;i<14;i++)large.invoices.push({ref:'F-LOT-'+i,brand:'demo',projectId:2,date:'2026-11-20'});
  const first=ask('Enséñame mis facturas',{study:large});
  assert.equal(first.sources.length,12);
  const documentPage={offset:first.documents.next,version:first.documents.version};
  const second=ask('Enséñame mis facturas',{study:large,previous:first.documentContext,documentPage});
  assert.equal(second.sources.length,6);
  assert.equal(new Set(refs(first).concat(refs(second))).size,18);
  large.versions.facturas='f2';
  assert.equal(ask('Enséñame mis facturas',{study:large,previous:first.documentContext,documentPage}),null);
});
