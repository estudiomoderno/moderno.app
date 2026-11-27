import test from 'node:test';
import assert from 'node:assert/strict';
import {invoicePaymentTurn} from '../supabase/functions/secretario/payment-direction.mjs';
import {pendingPayables} from '../supabase/functions/secretario/payables.mjs';

const today=Date.parse('2026-11-26T12:00:00Z');
const received=(id,concept,sup,brand,pid,amount,date,due,currency='EUR')=>({id,kind:'out',status:'pend',concept,sup,brand,pid,amount,date,due,currency});

function snapshot(){
 return {
  studyId:'11111111-1111-1111-1111-111111111111',
  config:{account:{currency:'EUR'},BRAND:{cm:{name:'Casa Moderna'},em:{name:'Estudio Moderno'}}},
  clients:[],invoiceData:{},versions:{facturas:'2026-11-26T10:00:00Z'},
  projects:[{id:1,name:'Patio Demo',num:'PR-001'},{id:2,name:'Alba Demo',num:'PR-002'}],
  entries:[
   received(1,'G-DEMO-01','Lumen Demo','cm',1,300,'2026-11-01','2026-11-15'),
   received(2,'G-DEMO-02','Carpintería Demo','em',2,500,'2026-11-12','2026-12-05'),
   received(3,'G-DEMO-03','Proveedor USD','cm',1,100,'2026-10-01','2026-11-28','USD'),
   {id:4,kind:'in',status:'pend',concept:'F-DEMO-01',client:'Cliente ficticio',amount:900},
   {...received(5,'G-DEMO-05','Pagado Demo','cm',1,700,'2026-11-12','2026-12-05'),status:'cobr'}
  ]
 };
}

function chat(data=snapshot(),context={}){
 const history=[];
 return (message,changes={})=>{
  const request={message,history,context:{timeZone:'Europe/Madrid',...context},...changes};
  const turn=invoicePaymentTurn(request);
  if(turn?.direction!=='payable')return turn;
  const result=pendingPayables(data,request,turn,today);
  history.push({role:'user',content:message},{role:'assistant',content:result.message});
  return result;
 };
}

const refs=result=>result.sources.map(item=>item.label);

test('supplier invoice direction follows the correction and finds a unique shorthand name',()=>{
 const say=chat();
 const result=say('No, te digo las que debo yo');
 assert.deepEqual(result.payables.amounts,[{currency:'EUR',amount:800},{currency:'USD',amount:100}]);
 assert.deepEqual(refs(say('Solo la de Lumen')),['G-DEMO-01']);
 assert.deepEqual(refs(chat()('¿Qué le debo a Lumen?')),['G-DEMO-01']);
});

test('payable filters survive five refinements, are replaced selectively, and reset explicitly',()=>{
 const say=chat(snapshot(),{projectId:'1'});
 assert.equal(say('Facturas pendientes de pago').payables.count,3);
 assert.deepEqual(refs(say('Solo en euros')),['G-DEMO-01','G-DEMO-02']);
 assert.deepEqual(refs(say('Solo las de este año')),['G-DEMO-01','G-DEMO-02']);
 assert.deepEqual(refs(say('Solo las vencidas')),['G-DEMO-01']);
 assert.deepEqual(refs(say('También las que no han vencido')),['G-DEMO-01','G-DEMO-02']);
 const changedProject=say('Y lo mismo para el proyecto Alba Demo');
 assert.deepEqual(refs(changedProject),['G-DEMO-02']);
 assert.match(changedProject.payables.scopeLabel,/Alba Demo.*2026-01-01.*Euros/);
 const reset=say('Ahora sin filtros');
 assert.equal(reset.payables.count,3);
 assert.equal(reset.payables.scopeLabel,'');
 assert.deepEqual(refs(say('Solo las vencidas de este proyecto')),['G-DEMO-01']);
});

test('unknown currencies, date filters, states and references never expand the list',()=>{
 for(const message of [
  'Facturas por pagar en pesos','Facturas por pagar en ZZZ','Facturas por pagar en USD y EUR',
  'Facturas por pagar de 2025 y 2026','Facturas por pagar de mediados de noviembre',
  'Facturas por pagar con estado disputado','Facturas por pagar de referencia indeterminada'
 ]){
  const result=chat()(message);
  assert.equal(result?.status,'clarifying',message);
  assert.deepEqual(result.sources,[],message);
 }
 assert.deepEqual(refs(chat()('Facturas por pagar de referencia G-DEMO-02')),['G-DEMO-02']);
 assert.deepEqual(refs(chat()('Facturas por pagar de referencia G-DEMO-42')),[]);
});

test('soon asks for a concrete interval that can be confirmed and narrowed',()=>{
 const say=chat();
 assert.equal(say('¿Qué tengo que pagar pronto?').message,'¿Miramos las facturas que vencen en los próximos 7 días?');
 const confirmed=say('Sí');
 assert.deepEqual(refs(confirmed),['G-DEMO-03']);
 assert.match(confirmed.payables.scopeLabel,/Vencimiento.*2026-11-26 a 2026-12-03/);
 assert.deepEqual(refs(say('Solo en euros')),[]);
});

test('homonyms with separate verified spaces require a choice and keep filters',()=>{
 const data=snapshot();
 data.clients.push({name:'Lumen Demo',brand:'cm',type:'Proveedor'},{name:'Lumen Demo',brand:'em',type:'Proveedor'});
 data.entries.push(received(24,'G-DEMO-24','Lumen Demo','em',2,50,'2026-09-12','2026-12-05'));
 const say=chat(data);
 const question=say('¿Qué le debo a Lumen Demo en noviembre?');
 assert.equal(question.status,'clarifying');
 assert.deepEqual(question.sources,[]);
 const options=question.questions[0].options;
 assert.deepEqual(options.map(option=>option.label),['Lumen Demo · Espacio Casa Moderna','Lumen Demo · Espacio Estudio Moderno']);
 const chosen=say(options[0].label,{automatic:true,answers:{payable_scope:options[0].value}});
 assert.deepEqual(refs(chosen),['G-DEMO-01']);
 assert.match(chosen.payables.scopeLabel,/Casa Moderna.*2026-11/);
 assert.deepEqual(refs(say('Solo en euros')),['G-DEMO-01']);
});

test('same-space supplier homonyms need a distinct invoice reference',()=>{
 const data=snapshot();
 data.clients.push({name:'Lumen Demo',brand:'cm',type:'Proveedor'},{name:'Lumen Demo',brand:'cm',type:'Proveedor'});
 const say=chat(data);
 assert.deepEqual(say('¿Qué le debo a Lumen Demo?').questions[0].options,[]);
 assert.deepEqual(refs(say('G-DEMO-01')),['G-DEMO-01']);
});

test('partial supplier payments stay outside totals and payment status verifies the focused record',()=>{
 const data=snapshot();
 data.entries[0].pagos=[{amount:100}];
 const say=chat(data,{focus:{document:{kind:'entry',id:'1',brand:'cm',projectId:'1'}}});
 const result=say('Facturas por pagar');
 assert.equal(result.payables.review,1);
 assert.ok(!refs(result).includes('G-DEMO-01'));
 assert.match(say('Ya pagué una parte de esta, ¿cuánto queda?').message,/No puedo calcular el saldo/);
 assert.match(say('¿Esta de proveedor está pagada?').message,/necesitan revisión/);
 assert.match(say('Págalas').message,/No puedo hacer pagos/);
 const paid=chat(data,{focus:{document:{kind:'entry',id:'5',brand:'cm',projectId:'1'}}});
 assert.equal(paid('¿Esta de proveedor está pagada?').message,'Figura como pagada.');
});
