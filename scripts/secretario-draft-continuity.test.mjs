import test from 'node:test';
import assert from 'node:assert/strict';
import {executePlan,normalizeRequest} from '../supabase/functions/secretario/core.mjs';

const STUDY='00000000-0000-4000-8000-0000000000c1';
const VERSION='2026-11-27T10:00:00.000Z';
const initialMessage='Haz un presupuesto para Ana Vega, de Patio Demo, con cuatro visitas de obra.';

function snapshot(){
 return {
  studyId:STUDY,role:'admin',versions:{proyectos:VERSION,contactos:VERSION,config:VERSION,presupuestos:VERSION,facturas:VERSION},
  projects:[{id:'patio',name:'Patio Demo',num:'PR-PATIO',brand:'demo',client:'Ana Vega',tasks:[],files:[]}],
  clients:[{id:'ana',name:'Ana Vega',num:'CL-ANA',brand:'demo',type:'Cliente'}],
  config:{BRAND:{demo:{name:'Demo'}},account:{vat:21,irpf:0,currency:'EUR'},catalog:[]},
  quotes:[],drafts:[],invoices:[],entries:[],invoiceData:{}
 };
}

function request(message,{history=[],answers={},automatic=false,focus}={}){
 return normalizeRequest({studyId:STUDY,message,automatic,history,answers,context:{view:'presupuestos',projectId:'patio',...(focus?{focus}:{})}});
}

function line({qty=4,qtyEvidence='cuatro visitas de obra',price=null,priceEvidence=null}={}){
 return {name:'Visitas de obra',catalogId:null,qty,qtyEvidence,unit:'ud',price,priceEvidence};
}

function plan(changes={}){
 return {intent:'prepare_draft',view:null,projectId:'patio',projectQuery:null,clientId:'ana',clientQuery:null,kind:'presupuesto',quoteRef:null,draftId:null,lines:[line()],edits:[],sourceIds:[],question:null,lookup:null,...changes};
}

test('conversation C keeps written quantity while the current number is a price',()=>{
 const s=snapshot(),firstRequest=request(initialMessage),first=executePlan(s,firstRequest,plan());
 assert.equal(first.status,'clarifying');
 assert.deepEqual(first.questions.map(question=>question.id),['line.0.price']);
 assert.equal(first.message,'¿A cuánto ponemos cada visita?');

 const priceMessage='A 90 € cada una, antes de impuestos.';
 const secondRequest=request(priceMessage,{history:[{role:'user',content:initialMessage},{role:'assistant',content:first.message}]});
 const second=executePlan(s,secondRequest,plan({lines:[line({price:90,priceEvidence:'90 € cada una'})]}));
 assert.equal(second.status,'proposal');
 assert.match(second.message,/cuatro visitas de obra a 90 € cada una, antes de impuestos/i);
 assert.match(second.message,/revisar el presupuesto en el editor/i);
 const payload=second.actions[0].payload;
 assert.equal(payload.lines[0].qty,4);assert.equal(payload.lines[0].price,90);
 assert.deepEqual(payload.sourceVersions,s.versions,'the existing dirty/stale editor guard remains active');
 assert.equal(payload.total,undefined);assert.equal(payload.num,undefined);
 assert.equal(s.drafts.length,0,'preparing never persists the draft');
});

test('a five-turn continuation updates only the evidenced line of the saved draft',()=>{
 const s=snapshot();
 s.drafts=[{id:'saved-patio',kind:'presupuesto',draft:{brand:'demo',client:'Ana Vega',clientIdx:0,projectId:'patio',lines:[{name:'Visitas de obra',qty:4,price:90,unit:'ud',desc:'Seguimiento',cap:'Servicios'}],iva:{on:true,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10}}}];
 const history=[
  {role:'user',content:initialMessage},
  {role:'assistant',content:'¿A cuánto ponemos cada visita?'},
  {role:'user',content:'A 90 € cada una, antes de impuestos.'},
  {role:'assistant',content:'He preparado cuatro visitas a 90 € cada una, antes de impuestos. Puedes revisar el presupuesto en el editor.'},
  {role:'user',content:'¿Ya está guardado?'},
  {role:'assistant',content:'Todavía no. Está preparado para revisarlo y guardarlo en el editor.'}
 ];
 const current='En ese borrador, cambia a tres visitas.';
 const r=request(current,{history,focus:{document:{kind:'draft',id:'saved-patio',projectId:'patio'}}});
 const result=executePlan(s,r,plan({draftId:'saved-patio',lines:[],edits:[{lineIndex:0,qty:3,qtyEvidence:'tres visitas',price:null,priceEvidence:null}]}));
 assert.equal(result.status,'proposal');assert.match(result.message,/cambio a tres visitas/i);assert.match(result.message,/guarda cuando esté bien/i);
 const payload=result.actions[0].payload;
 assert.equal(payload.mode,'edit_saved_draft');assert.equal(payload.lines[0].qty,3);assert.equal(payload.lines[0].price,90);
 assert.deepEqual(payload.sourceVersions,s.versions,'the existing dirty/stale editor guard remains active');
 assert.equal(payload.lines[0].desc,'Seguimiento');assert.equal(s.drafts[0].draft.lines[0].qty,4);
});

test('old unrelated amounts and an unselected saved draft cannot become fallback evidence',()=>{
 const s=snapshot();
 const unrelated=request('Haz un presupuesto para Ana Vega de Patio Demo.',{history:[{role:'user',content:'Trabajé cuatro horas en otra tarea.'},{role:'assistant',content:'He registrado tu comentario.'}]});
 const missing=executePlan(s,unrelated,plan({lines:[line({qtyEvidence:'cuatro horas'})]}));
 assert.equal(missing.status,'clarifying');assert.ok(missing.questions.some(question=>question.id==='line.0.qty'));

 s.drafts=[{id:'not-selected',kind:'presupuesto',draft:{brand:'demo',clientIdx:0,projectId:'patio',lines:[{name:'Visitas de obra',qty:4,price:90,unit:'ud'}],iva:{on:true,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10}}}];
 const selected=executePlan(s,request('Haz un presupuesto nuevo para Ana Vega de Patio Demo.'),plan({draftId:'not-selected',lines:[]}));
 assert.equal(selected.status,'clarifying');assert.equal(selected.actions.length,0);assert.equal(selected.questions[0].id,'draftId');
});

test('a later quantity correction wins without treating a price as a quantity',()=>{
 const s=snapshot(),history=[{role:'user',content:initialMessage},{role:'assistant',content:'¿A cuánto ponemos cada visita?'}];
 const r=request('Mejor tres visitas a 90 € cada una.',{history});
 const stale=executePlan(s,r,plan({lines:[line({price:90,priceEvidence:'90 € cada una'})]}));
 assert.equal(stale.status,'clarifying');assert.ok(stale.questions.some(question=>question.id==='line.0.qty'));assert.equal(stale.actions.length,0);
 const corrected=executePlan(s,r,plan({lines:[line({qty:3,qtyEvidence:'tres visitas',price:90,priceEvidence:'90 € cada una'})]}));
 assert.equal(corrected.actions[0].payload.lines[0].qty,3);
});

test('decimal quantity and unit price remain separate exact evidence',()=>{
 const s=snapshot(),message='Haz un presupuesto para Ana Vega, de Patio Demo: son 12,5 m² a 40 €/m².';
 const result=executePlan(s,request(message),plan({lines:[{name:'Pavimento',catalogId:null,qty:12.5,qtyEvidence:'12,5 m²',unit:'m²',price:40,priceEvidence:'40 €/m²'}]}));
 assert.equal(result.status,'proposal');assert.equal(result.actions[0].payload.lines[0].qty,12.5);assert.equal(result.actions[0].payload.lines[0].price,40);assert.equal(result.actions[0].payload.lines[0].unit,'m²');
});

test('a saved draft with several lines requires the line to be identified',()=>{
 const s=snapshot();
 s.drafts=[{id:'saved-many',kind:'presupuesto',draft:{brand:'demo',clientIdx:0,projectId:'patio',lines:[{name:'Visitas de obra',qty:4,price:90,unit:'ud'},{name:'Reuniones de coordinación',qty:2,price:70,unit:'ud'}],iva:{on:true,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10}}}];
 const r=request('En ese borrador, cambia a tres unidades.',{focus:{document:{kind:'draft',id:'saved-many',projectId:'patio'}}});
 const result=executePlan(s,r,plan({draftId:'saved-many',lines:[],edits:[{lineIndex:0,qty:3,qtyEvidence:'tres unidades',price:null,priceEvidence:null}]}));
 assert.equal(result.status,'clarifying');assert.equal(result.actions.length,0);assert.equal(result.questions[0].id,'detail');assert.match(result.message,/partida concreta/i);
});

test('tax-included prices and percentage conversions stay in the editor',()=>{
 const s=snapshot();
 const included=executePlan(s,request('Pon 121 € cada una, impuestos incluidos.',{history:[{role:'user',content:initialMessage},{role:'assistant',content:'¿A cuánto ponemos cada visita?'}]}),plan({lines:[line({price:121,priceEvidence:'121 € cada una'})]}));
 assert.equal(included.status,'answer');assert.equal(included.actions.some(action=>action.type==='prepare_draft'),false);assert.match(included.message,/no voy a convertirlo ni a sumar impuestos otra vez/i);
 const partial=executePlan(s,request('Haz una factura del 30 % del presupuesto.'),plan({kind:'factura'}));
 assert.equal(partial.status,'answer');assert.equal(partial.actions.some(action=>action.type==='prepare_draft'),false);assert.match(partial.message,/factura completa.*porcentaje.*editor/i);
});
