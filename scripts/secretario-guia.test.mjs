import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecretaryHandler} from '../supabase/functions/secretario/handler.mjs';
import {SECRETARY_MODEL,TEST_PROJECT_REF} from '../supabase/functions/secretario/core.mjs';

/*
 * Acceptance fixture for “Guía de conversación del Secretario de Finanzas”.
 * Everything is fictional and runs through a user-scoped in-memory RPC client.
 * No network, OpenAI request, live Supabase project or write RPC is possible.
 */
const STUDY='11111111-1111-4111-8111-111111111111';
const ACTOR='22222222-2222-4222-8222-222222222222';
const ORIGIN='http://127.0.0.1:4173';
const VERSION='2026-11-27T09:00:00.000Z';
const NOW=Date.parse('2026-11-27T12:00:00+01:00');
const baseContext={view:'finanzas',timeZone:'Europe/Madrid'};
const sourcePointer=row=>({kind:row.kind,id:String(row.id),brand:row.brand||undefined,projectId:row.projectId==null?null:String(row.projectId)});

function guideBlocks(){
  const clients=[
    {id:'ana',name:'Ana Vega',num:'CL-ANA',fiscal:'Ana Vega',type:'Cliente',brand:'cm'},
    {id:'bruno',name:'Bruno Rey',num:'CL-BRUNO',fiscal:'Bruno Rey',type:'Cliente',brand:'cm'},
    {id:'alfonso',name:'Alfonso Cerropuerta',num:'CL-ALFONSO',fiscal:'Alfonso Cerropuerta',type:'Cliente',brand:'cm'},
    {id:'lumen',name:'Lumen Demo',num:'PRV-LUMEN',type:'Proveedor',brand:'cm'},
    {id:'carpinteria',name:'Carpintería Demo',num:'PRV-CARP',type:'Proveedor',brand:'cm'}
  ];
  const projects=[
    {id:9001,name:'Patio Demo',num:'PR-PATIO',brand:'cm',client:'Ana Vega',tasks:[],files:[]},
    {id:9002,name:'Alba Demo',num:'PR-ALBA',brand:'cm',client:'Bruno Rey',tasks:[],files:[]}
  ];
  const invoice=(ref,client,clientIdx,projectId,date,due,total,status='env')=>({
    ref,client,clientIdx,projectId,brand:'cm',date,due,total,status,currency:'EUR',
    iva:{on:false,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10},
    lines:[{name:'Servicio ficticio',qty:1,unit:'ud',price:total}]
  });
  const invoices=[
    invoice('F-DEMO-01','Ana Vega',0,9001,'2026-11-01','2026-11-10',1200),
    invoice('F-DEMO-02','Ana Vega',0,9001,'2026-11-15','2026-12-10',600),
    invoice('F-DEMO-03','Bruno Rey',1,9002,'2025-12-20','2026-01-20',700),
    invoice('F-DEMO-04','Ana Vega',0,9001,'2026-10-10','2026-11-10',900,'pag'),
    invoice('F-DEMO-05','Alfonso Cerropuerta',2,9001,'2026-11-20','2026-12-20',450)
  ];
  const income=(id,link,client,pid,date,due,amount,cobros,status='pend')=>({
    id,link,client,pid,brand:'cm',kind:'in',concept:`Factura ${link} · ${client}`,
    date,due,amount,base:amount,currency:'EUR',cobros,status
  });
  const entries=[
    income(101,'F-DEMO-01','Ana Vega',9001,'01/11/2026','10/11/2026',1200,[{amount:400,date:'05/11/2026'}]),
    income(102,'F-DEMO-02','Ana Vega',9001,'15/11/2026','10/12/2026',600,[]),
    income(103,'F-DEMO-03','Bruno Rey',9002,'20/12/2025','20/01/2026',700,[{amount:200,date:'15/01/2026'}]),
    income(104,'F-DEMO-04','Ana Vega',9001,'10/10/2026','10/11/2026',900,[{amount:900,date:'20/10/2026'}],'cobr'),
    {id:201,kind:'out',concept:'G-DEMO-01',sup:'Lumen Demo',pid:9001,brand:'cm',date:'05/11/2026',due:'15/11/2026',amount:300,base:300,currency:'EUR',status:'pend'},
    {id:202,kind:'out',concept:'G-DEMO-02',sup:'Carpintería Demo',pid:9002,brand:'cm',date:'18/11/2026',due:'05/12/2026',amount:500,base:500,currency:'EUR',status:'pend'}
  ];
  return {
    config:{BRAND:{cm:{name:'Estudio Demo'}},account:{currency:'EUR',vat:21,irpf:0},series:{fc:'F-DEMO'},catalog:[]},
    contactos:clients,proyectos:projects,presupuestos:{quotes:[],drafts:[]},facturas:{invoices,entries}
  };
}

const lookup=(metric=null,{documentType=null,period=null,reference=null,overdue=null,continuation=false}={})=>
  ({metric,documentType,period,reference,overdue,continuation});
const plan=(intent,changes={})=>({intent,view:null,projectId:null,projectQuery:null,clientId:null,clientQuery:null,
  kind:null,quoteRef:null,draftId:null,lines:[],edits:[],sourceIds:[],question:null,lookup:null,...changes});

async function requestGuide(input,{blocks=guideBlocks(),planner}={}){
  const calls=[];
  const client={async rpc(name,args){
    calls.push({name,args:structuredClone(args)});
    assert.equal(args.p_estudio,STUDY);
    if(name==='app_rol')return {data:'admin',error:null};
    if(name==='secretary_request_reserve')return {data:{accepted:true,daily_remaining:99,monthly_remaining:999,global_monthly_remaining:9999},error:null};
    if(name==='app_leer_bloques'||name==='app_leer_versiones')return {data:args.p_bloques.map(bloque=>({
      bloque,rol:'admin',updated_at:VERSION,...(name==='app_leer_bloques'?{contenido:structuredClone(blocks[bloque])}:{})
    })),error:null};
    throw Error(`Unexpected RPC ${name}`);
  }};
  let plannerCalls=0;
  const handler=createSecretaryHandler({
    env:{SECRETARY_ENABLED:'true',SECRETARY_ENVIRONMENT:'test',SECRETARY_ALLOWED_PROJECT_REF:TEST_PROJECT_REF,
      SECRETARY_ALLOWED_ORIGINS:ORIGIN,SUPABASE_URL:`https://${TEST_PROJECT_REF}.supabase.co`,
      SUPABASE_ANON_KEY:'fixture-publishable',OPENAI_API_KEY:'fixture-unused',OPENAI_MODEL:SECRETARY_MODEL},
    authenticate:async token=>token==='fictional-session-with-enough-length'?{client,userId:ACTOR}:null,
    now:()=>NOW,uuid:()=>`guide-${String(calls.length+1).padStart(4,'0')}`,
    planner:async payload=>{plannerCalls++;if(!planner)throw Error(`Unexpected planner call for ${input.message}`);return planner(payload);}
  });
  const response=await handler(new Request(`https://${TEST_PROJECT_REF}.supabase.co/functions/v1/secretario`,{
    method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},
    body:JSON.stringify({session:'fictional-session-with-enough-length',payload:{context:baseContext,automatic:false,history:[],...input,studyId:STUDY}})
  }));
  return {status:response.status,body:await response.json(),calls,plannerCalls};
}

const appendHistory=(history,message,body)=>[
  ...history,{role:'user',content:message},{role:'assistant',content:body.message}
];
function assertRows(body,expected){
  assert.deepEqual(body.sources.map(row=>[row.id,Math.round(row.pending*100)]).sort(),expected.slice().sort());
}
function assertPayableRows(body,expected){
  assert.deepEqual(body.sources.map(row=>[row.label,Math.round(row.pending*100)]).sort(),expected.slice().sort());
  assert.ok(body.sources.every(row=>/^\d+$/.test(row.id)),'payable pointers use stable row ids');
}
function assertReadOnly(calls){
  assert.ok(calls.length>=2);
  assert.ok(calls.every(call=>['app_rol','app_leer_bloques','app_leer_versiones','secretary_request_reserve'].includes(call.name)));
}

test('conversation A keeps the receivable scope for five turns and reconciles exact cents',async()=>{
  let history=[];
  const firstMessage='¿Qué me falta por cobrar?';
  const first=await requestGuide({message:firstMessage});
  assert.equal(first.status,200,JSON.stringify(first.body));
  assert.equal(first.plannerCalls,0);
  assertRows(first.body,[['F-DEMO-01',80000],['F-DEMO-02',60000],['F-DEMO-03',50000]]);
  assert.deepEqual(first.body.receivables.amounts,[{currency:'EUR',amount:1900}]);
  assertReadOnly(first.calls);history=appendHistory(history,firstMessage,first.body);

  const yearMessage='Solo las de este año.';
  const year=await requestGuide({message:yearMessage,history,receivableContext:first.body.receivableContext});
  assert.equal(year.status,200,JSON.stringify(year.body));
  assert.equal(year.plannerCalls,0);
  assertRows(year.body,[['F-DEMO-01',80000],['F-DEMO-02',60000]]);
  assert.deepEqual(year.body.receivables.amounts,[{currency:'EUR',amount:1400}]);
  assert.deepEqual(year.body.receivableContext.scope.date,{from:'2026-01-01',to:'2026-12-31',field:'issued'});
  history=appendHistory(history,yearMessage,year.body);

  const overdueMessage='Y de esas, las vencidas.';
  const overdue=await requestGuide({message:overdueMessage,history,receivableContext:year.body.receivableContext});
  assert.equal(overdue.status,200,JSON.stringify(overdue.body));
  assert.equal(overdue.plannerCalls,0);
  assertRows(overdue.body,[['F-DEMO-01',80000]]);
  assert.deepEqual(overdue.body.receivables.amounts,[{currency:'EUR',amount:800}]);
  assert.equal(overdue.body.receivableContext.scope.overdue,'overdue');
  history=appendHistory(history,overdueMessage,overdue.body);

  const openMessage='Ábrela.';
  const open=await requestGuide({message:openMessage,history,receivableContext:overdue.body.receivableContext,
    context:{...baseContext,focus:{results:overdue.body.sources.map(sourcePointer)}}});
  assert.equal(open.status,200,JSON.stringify(open.body));
  assert.equal(open.plannerCalls,0);
  assert.equal(open.body.sources[0].id,'F-DEMO-01');
  assert.equal(open.body.actions[0].type,'open_document');
  assert.equal(open.body.actions[0].viewMode,'read');
  assert.equal(open.body.actions[0].openImmediately,true);
  history=appendHistory(history,openMessage,open.body);

  const detailMessage='¿Por qué pone 1.200 si me debe 800?';
  const detail=await requestGuide({message:detailMessage,history,receivableContext:overdue.body.receivableContext,
    context:{...baseContext,focus:{document:sourcePointer(open.body.actions[0].payload)}}});
  assert.equal(detail.status,200,JSON.stringify(detail.body));
  assert.equal(detail.plannerCalls,0);
  assert.match(detail.body.message,/1(?:\.|\s)200\s*€/);
  assert.match(detail.body.message,/400\s*€/);
  assert.match(detail.body.message,/800\s*€/);
  assertRows(detail.body,[['F-DEMO-01',80000]]);
  assertReadOnly(detail.calls);
});

test('conversation B corrects payment direction, filters Lumen and never writes or pays',async()=>{
  let history=[];
  const ambiguousMessage='¿Qué facturas están sin pagar?';
  const ambiguous=await requestGuide({message:ambiguousMessage});
  assert.equal(ambiguous.status,200,JSON.stringify(ambiguous.body));
  assert.equal(ambiguous.body.status,'clarifying');
  assert.match(ambiguous.body.message,/proveedores.*clientes|clientes.*proveedores/i);
  assert.equal(ambiguous.plannerCalls,0);history=appendHistory(history,ambiguousMessage,ambiguous.body);

  const payableMessage='Las que tengo que pagar yo.';
  const payable=await requestGuide({message:payableMessage,history});
  assert.equal(payable.status,200,JSON.stringify(payable.body));
  assert.equal(payable.plannerCalls,0);
  assertPayableRows(payable.body,[['G-DEMO-01',30000],['G-DEMO-02',50000]]);
  assert.deepEqual(payable.body.payables.amounts,[{currency:'EUR',amount:800}]);
  history=appendHistory(history,payableMessage,payable.body);

  const supplierMessage='Solo la de Lumen.';
  const supplier=await requestGuide({message:supplierMessage,history,
    context:{...baseContext,focus:{results:payable.body.sources.map(sourcePointer)}}});
  assert.equal(supplier.status,200,JSON.stringify(supplier.body));
  assert.equal(supplier.plannerCalls,0);
  assertPayableRows(supplier.body,[['G-DEMO-01',30000]]);
  assert.equal(supplier.body.sources[0].supplier,'Lumen Demo');
  history=appendHistory(history,supplierMessage,supplier.body);

  const refusal=await requestGuide({message:'Págalas.',history,
    context:{...baseContext,focus:{results:supplier.body.sources.map(sourcePointer)}}});
  assert.equal(refusal.status,200,JSON.stringify(refusal.body));
  assert.equal(refusal.plannerCalls,0);
  assert.match(refusal.body.message,/no puedo pagar/i);
  assert.equal(refusal.body.actions.some(action=>action.type==='prepare_draft'),false);
  assertReadOnly([...ambiguous.calls,...payable.calls,...supplier.calls,...refusal.calls]);
});

test('colloquial and misspelled variants keep their verified payment direction',async()=>{
  const receivable=await requestGuide({message:'que facturas quedan por que me pagen'});
  assert.equal(receivable.status,200,JSON.stringify(receivable.body));
  assert.equal(receivable.plannerCalls,0);
  assertRows(receivable.body,[['F-DEMO-01',80000],['F-DEMO-02',60000],['F-DEMO-03',50000]]);

  const ambiguous=await requestGuide({message:'Las facturas sin pagar'});
  assert.equal(ambiguous.body.status,'clarifying');
  assert.match(ambiguous.body.message,/proveedores.*clientes|clientes.*proveedores/i);

  const payable=await requestGuide({message:'No, te digo las que debo yo',history:[
    {role:'user',content:'¿Qué me deben?'},{role:'assistant',content:receivable.body.message}
  ]});
  assert.equal(payable.status,200,JSON.stringify(payable.body));
  assert.equal(payable.plannerCalls,0);
  assertPayableRows(payable.body,[['G-DEMO-01',30000],['G-DEMO-02',50000]]);
  assertReadOnly([...receivable.calls,...ambiguous.calls,...payable.calls]);
});

test('conversation C asks only for price, never claims a save, and edits the real saved draft',async()=>{
  const blocks=guideBlocks();let history=[];
  const initialMessage='Haz un presupuesto para Ana, de Patio Demo, con cuatro visitas de obra.';
  const initialPlan=plan('prepare_draft',{projectId:'9001',clientId:'ana',kind:'presupuesto',
    lines:[{name:'Visita de obra',catalogId:null,qty:4,qtyEvidence:'cuatro',unit:'visita',price:null,priceEvidence:null}]});
  const initial=await requestGuide({message:initialMessage},{blocks,planner:async()=>initialPlan});
  assert.equal(initial.status,200,JSON.stringify(initial.body));
  assert.equal(initial.body.status,'clarifying');
  assert.deepEqual(initial.body.questions.map(question=>question.id),['line.0.price']);
  assert.equal(initial.plannerCalls,1);history=appendHistory(history,initialMessage,initial.body);

  const priceMessage='A 90 € cada una, antes de impuestos.';
  const pricedPlan=plan('prepare_draft',{projectId:'9001',clientId:'ana',kind:'presupuesto',
    lines:[{name:'Visita de obra',catalogId:null,qty:4,qtyEvidence:'cuatro',unit:'visita',price:90,priceEvidence:'90 €'}]});
  const priced=await requestGuide({message:`${initial.body.questions[0].prompt} ${priceMessage}`,automatic:true,
    answers:{'line.0.price':'90 €'},history},{blocks,planner:async()=>pricedPlan});
  assert.equal(priced.status,200,JSON.stringify(priced.body));
  assert.equal(priced.body.status,'proposal');
  const prepared=priced.body.actions.find(action=>action.type==='prepare_draft').payload;
  assert.deepEqual(prepared.lines.map(line=>[line.name,line.qty,line.price]),[['Visita de obra',4,90]]);
  assert.equal(Math.round(prepared.lines.reduce((sum,line)=>sum+line.qty*line.price,0)*100),36000);
  assert.doesNotMatch(priced.body.message,/guardad[oa]/i);
  history=appendHistory(history,priceMessage,priced.body);

  const saveStatus=await requestGuide({message:'¿Ya está guardado?',history},{blocks});
  assert.equal(saveStatus.status,200,JSON.stringify(saveStatus.body));
  assert.equal(saveStatus.plannerCalls,0);
  assert.match(saveStatus.body.message,/todav[ií]a no|no est[aá] guardad/i);
  history=appendHistory(history,'¿Ya está guardado?',saveStatus.body);

  blocks.presupuestos.drafts.push({id:'D-DEMO-01',kind:'presupuesto',draft:{
    brand:'cm',clientIdx:0,projectId:9001,lines:[{name:'Visita de obra',qty:4,unit:'visita',price:90}],
    iva:{on:true,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10},legend:''
  }});
  const editMessage='En ese borrador, cambia a tres visitas.';
  const editPlan=plan('prepare_draft',{projectId:'9001',clientId:'ana',kind:'presupuesto',draftId:'D-DEMO-01',
    edits:[{lineIndex:0,qty:3,qtyEvidence:'tres',price:null,priceEvidence:null}]});
  const edited=await requestGuide({message:editMessage,history,
    context:{...baseContext,focus:{document:{kind:'draft',id:'D-DEMO-01',projectId:'9001'}}}},{blocks,planner:async()=>editPlan});
  assert.equal(edited.status,200,JSON.stringify(edited.body));
  assert.equal(edited.body.status,'proposal');
  const changed=edited.body.actions.find(action=>action.type==='prepare_draft').payload;
  assert.equal(changed.mode,'edit_saved_draft');
  assert.deepEqual(changed.lines.map(line=>[line.name,line.qty,line.price]),[['Visita de obra',3,90]]);
  assert.equal(Math.round(changed.lines.reduce((sum,line)=>sum+line.qty*line.price,0)*100),27000);
  assert.doesNotMatch(edited.body.message,/ya (?:est[aá] )?guardad/i);
  assertReadOnly([...initial.calls,...priced.calls,...saveStatus.calls,...edited.calls]);
});

test('conversation D finds the recipient document but cannot certify sending or an absent PDF',async()=>{
  let history=[];
  const findMessage='Dime qué factura mandé a Alfonso Cerropuerta.';
  const found=await requestGuide({message:findMessage});
  assert.equal(found.status,200,JSON.stringify(found.body));
  assert.equal(found.plannerCalls,0);
  assert.deepEqual(found.body.sources.map(source=>source.id),['F-DEMO-05']);
  assert.match(found.body.message,/(?:no puedo (?:comprobar|confirmar).*(?:envi|mand)|no tengo (?:un )?registro de correo.*confirm)/i);
  history=appendHistory(history,findMessage,found.body);

  const pdfMessage='Enséñame el PDF.';
  const pdf=await requestGuide({message:pdfMessage,history,documentContext:found.body.documentContext,
    context:{...baseContext,focus:{results:found.body.sources.map(sourcePointer)}}});
  assert.equal(pdf.status,200,JSON.stringify(pdf.body));
  assert.equal(pdf.plannerCalls,0);
  assert.deepEqual(pdf.body.sources.map(source=>source.id),['F-DEMO-05']);
  assert.match(pdf.body.message,/no (?:hay|tiene).*(?:pdf|adjunto)|versi[oó]n actual/i);
  assert.equal(pdf.body.actions[0].type,'open_document');
  assert.equal(pdf.body.actions[0].viewMode,'read');
  history=appendHistory(history,pdfMessage,pdf.body);

  const sentCopy=await requestGuide({message:'¿Esta es la misma que le mandé?',history,documentContext:found.body.documentContext,
    context:{...baseContext,focus:{document:sourcePointer(pdf.body.actions[0].payload)}}});
  assert.equal(sentCopy.status,200,JSON.stringify(sentCopy.body));
  assert.equal(sentCopy.plannerCalls,0);
  assert.match(sentCopy.body.message,/no puedo confirmar|versi[oó]n actual/i);
  assert.doesNotMatch(sentCopy.body.message,/s[ií],|confirmad[oa]|enviad[oa] el/i);
  assertReadOnly([...found.calls,...pdf.calls,...sentCopy.calls]);
});

test('conversation E changes project then metric without losing the 2026 finance scope',async()=>{
  let history=[];
  const firstMessage='Dime los costes de Patio Demo de este año.';
  const firstPlan=plan('summary',{projectId:'9001',lookup:lookup('costs',{period:'este año'})});
  const first=await requestGuide({message:firstMessage},{planner:async()=>firstPlan});
  assert.equal(first.status,200,JSON.stringify(first.body));
  assert.equal(first.body.metrics.costs,300);
  assert.deepEqual(first.body.financeContext,{metric:'costs',projectId:'9001',clientKey:null,period:{from:'2026-01-01',to:'2026-12-31'}});
  history=appendHistory(history,firstMessage,first.body);

  const secondMessage='Mejor los de Alba Demo.';
  const secondPlan=plan('summary',{projectId:'9002',lookup:lookup('costs',{continuation:true})});
  const second=await requestGuide({message:secondMessage,history,financeContext:first.body.financeContext},{planner:async()=>secondPlan});
  assert.equal(second.status,200,JSON.stringify(second.body));
  assert.equal(second.body.metrics.costs,500);
  assert.deepEqual(second.body.financeContext,{metric:'costs',projectId:'9002',clientKey:null,period:{from:'2026-01-01',to:'2026-12-31'}});
  history=appendHistory(history,secondMessage,second.body);

  const finalMessage='Y ahora la facturación.';
  const finalPlan=plan('summary',{projectId:'9002',lookup:lookup('invoiced',{continuation:true})});
  const final=await requestGuide({message:finalMessage,history,financeContext:second.body.financeContext},{planner:async()=>finalPlan});
  assert.equal(final.status,200,JSON.stringify(final.body));
  assert.equal(final.body.metrics.invoiced,0);
  assert.deepEqual(final.body.financeContext,{metric:'invoiced',projectId:'9002',clientKey:null,period:{from:'2026-01-01',to:'2026-12-31'}});
  assert.match(final.body.message,/no hay (?:registros|facturaci[oó]n registrada)|0(?:[,.]00)?\s*€/i);
  assertReadOnly([...first.calls,...second.calls,...final.calls]);
});
