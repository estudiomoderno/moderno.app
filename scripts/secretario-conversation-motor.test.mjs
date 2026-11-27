import assert from 'node:assert/strict';
import test from 'node:test';
import {fixtureBlocks,fixtureRequest,studyId} from './secretario-receivables-fixture.mjs';

/*
 * Conversational acceptance motor for the Secretary.
 *
 * All names, references and amounts below are fictional. Every turn goes
 * through the real HTTP handler with a user-scoped in-memory RPC client. The
 * fixture cannot contact OpenAI, Supabase, the network or a production study.
 *
 * Acceptance coverage:
 *   CA01 direction, CA02 name ambiguity/no result, CA03 five complete chains,
 *   CA04 combined filters/date rationale, CA05 exact money/source evidence,
 *   CA06 ordinal/native/PDF/sent, CA13 brief replies, CA14 cancel/errors.
 */

const CONTEXT={view:'finanzas',timeZone:'Europe/Madrid'};
const VERSION='2026-11-22T09:00:00Z';
const baseInput={studyId,context:CONTEXT};
const clean=value=>String(value??'').replaceAll('\u00a0',' ');
const pointer=source=>({kind:source.kind,id:String(source.id),brand:source.brand,
  projectId:source.projectId==null?null:String(source.projectId)});

const GOLD=Object.freeze({
  direction:{
    variants:['Las facturas sin pagar','¿Qué facturas están sin pagar?'],
    question:'¿Quieres ver las facturas que tienes que pagar a proveedores o las que te deben tus clientes?'
  },
  filtered:{
    query:'Facturas pendientes de cobro del proyecto Casa Sol de este año en euros',
    source:'F-DEMO-001',total:1000,paid:0,pending:1000,date:'2026-10-13',due:'2026-11-12'
  },
  ordinal:{
    variants:['Abre la segunda factura','¿Puedes abrir la segunda factura?'],
    source:'F-DEMO-001'
  },
  brief:{
    variants:['Dame un resumen económico','Dame un resumen económico breve'],
    metrics:{invoiced:3900,recordedCollections:1600,acceptedQuotes:0,costs:1605}
  },
  cancel:{variants:['Déjalo','Cancela la consulta'],reply:'Vale, dejo esta consulta.'}
});

function duplicateClientBlocks(){
  const blocks=fixtureBlocks({acceptance:true});
  const first=blocks.contactos.push({id:'gem-a',name:'Cliente Gemelo',num:'CL-GEM-A',
    fiscal:'Cliente Gemelo A',type:'Cliente',brand:'cm'})-1;
  const second=blocks.contactos.push({id:'gem-b',name:'Cliente Gemelo',num:'CL-GEM-B',
    fiscal:'Cliente Gemelo B',type:'Cliente',brand:'cm'})-1;
  for(const [clientIdx,id,ref,total] of [
    [first,901,'F-GEM-001',300],
    [second,902,'F-GEM-002',450]
  ]){
    blocks.facturas.invoices.push({ref,client:'Cliente Gemelo',clientIdx,projectId:9001,
      brand:'cm',date:'2026-11-20',due:'2026-12-20',total,status:'env',currency:'EUR'});
    blocks.facturas.entries.push({id,link:ref,client:'Cliente Gemelo',pid:9001,brand:'cm',kind:'in',
      concept:`Factura ${ref} · Cliente Gemelo`,date:'20/11/2026',due:'20/12/2026',
      amount:total,base:total,currency:'EUR',cobros:[],status:'pend'});
  }
  return blocks;
}

test('CA02: a shortened typed name resolves before planning and keeps the full billing evidence',async()=>{
 const blocks=fixtureBlocks({acceptance:true});
 blocks.contactos.push({id:'amador-demo',type:'Cliente',brand:'cm',name:'Amador Estudio Demo'});
 blocks.facturas.invoices.push({ref:'F-AMADOR-001',projectId:9001,brand:'cm',client:'Amador Estudio Demo',total:1200,date:'2026-09-15',status:'env'});
 blocks.facturas.entries.push({id:903,link:'F-AMADOR-001',kind:'in',brand:'cm',client:'Amador Estudio Demo',pid:9001,
  concept:'Factura F-AMADOR-001 · Amador Estudio Demo',amount:1200,date:'15/09/2026',status:'pend'});
 for(const message of ['Qué he facturado con el cliente Amador','Dime cuánto he facturado a Amador']){
  const result=await fixtureRequest({...baseInput,message},{acceptance:true,blocks});
  assert.equal(result.status,200);
  assert.equal(result.body.status,'answer');
  assert.match(result.body.message,/^Amador Estudio Demo\nHay 1200,00\s€ de facturación registrada\.$/);
  assert.deepEqual(result.body.sources.map(({kind,id})=>[kind,id]),[['invoice','F-AMADOR-001']]);
  assert.equal(result.body.metrics.invoiced,1200);
  assertAuthorizedEvidence(result,blocks);
 }
});

function authorizedIds(blocks){
  return {
    invoices:new Set((blocks.facturas?.invoices??[]).map(row=>String(row.ref))),
    entries:new Set((blocks.facturas?.entries??[]).map(row=>String(row.id))),
    quotes:new Set((blocks.presupuestos?.quotes??[]).map(row=>String(row.ref))),
    drafts:new Set((blocks.presupuestos?.drafts??[]).map(row=>String(row.id)))
  };
}

function assertAuthorizedEvidence(result,blocks,{policyOnly=false,failedRead=false}={}){
  const names=result.calls.map(call=>call.name);
  assert.equal(names[0],'app_rol','authorization is always checked first');
  assert.ok(names.every(name=>['app_rol','app_leer_bloques','app_leer_versiones'].includes(name)),
    'the deterministic conversation cannot reserve quota, write or call a provider');
  assert.ok(result.calls.every(call=>call.args?.p_estudio===studyId),'every RPC stays in the authorized study');
  if(policyOnly)assert.deepEqual(names,['app_rol']);
  else if(failedRead)assert.deepEqual(names,['app_rol','app_leer_bloques']);
  else assert.deepEqual(names,['app_rol','app_leer_bloques','app_leer_versiones']);

  const ids=authorizedIds(blocks);
  for(const source of result.body.sources??[]){
    if(source.kind==='invoice')assert.ok(ids.invoices.has(String(source.id)),`authorized invoice ${source.id}`);
    else if(source.kind==='invoice_entry'||source.kind==='entry')
      assert.ok(ids.entries.has(String(source.id)),`authorized entry ${source.id}`);
    else if(source.kind==='quote')assert.ok(ids.quotes.has(String(source.id)),`authorized quote ${source.id}`);
    else if(source.kind==='draft')assert.ok(ids.drafts.has(String(source.id)),`authorized draft ${source.id}`);
    else assert.fail(`unexpected source kind in acceptance fixture: ${source.kind}`);
  }
  for(const action of result.body.actions??[]){
    if(action.type!=='open_document')continue;
    const payload=action.payload;
    if(payload.kind==='invoice')assert.ok(ids.invoices.has(String(payload.id)),`authorized action invoice ${payload.id}`);
    else if(payload.kind==='entry'||payload.kind==='invoice_entry')assert.ok(ids.entries.has(String(payload.id)),
      `authorized action entry ${payload.id}`);
    assert.equal(action.sourceVersions?.facturas,VERSION,'open actions carry the authorized snapshot version');
  }
  if(result.body.sourceVersions?.facturas)assert.equal(result.body.sourceVersions.facturas,VERSION);
}

function conversation(blocks=fixtureBlocks({acceptance:true})){
  const history=[];
  return {
    blocks,
    history,
    async turn(message,extra={},options={}){
      const result=await fixtureRequest({...baseInput,message,history:structuredClone(history),...extra},
        {acceptance:true,blocks,...options});
      if(result.body?.message)history.push({role:'user',content:message},{role:'assistant',content:result.body.message});
      return result;
    }
  };
}

function sourceLabels(result){return (result.body.sources??[]).map(source=>source.label);}
function assertOneLine(message,max=100){
  assert.equal(clean(message).split('\n').length,1);
  assert.ok(clean(message).length<=max,`expected a brief reply, got ${clean(message).length} characters`);
}

test('CA01/CA02/CA03: five-turn direction and stable-name conversation never guesses a party',async()=>{
  const blocks=duplicateClientBlocks(),chat=conversation(blocks);

  const direction=await chat.turn(GOLD.direction.variants[0]);
  assert.equal(direction.status,200);
  assert.equal(direction.body.status,'clarifying');
  assert.equal(direction.body.message,GOLD.direction.question);
  assert.deepEqual(direction.body.questions[0].options.map(option=>option.value),['payable','receivable']);
  assert.deepEqual(direction.body.sources,[]);
  assertAuthorizedEvidence(direction,blocks);

  // Gold wording variants must produce the same semantic disambiguation.
  const directionVariant=await fixtureRequest({...baseInput,message:GOLD.direction.variants[1]},
    {acceptance:true,blocks});
  assert.equal(directionVariant.body.message,GOLD.direction.question);
  assert.deepEqual(directionVariant.body.sources,[]);
  assertAuthorizedEvidence(directionVariant,blocks);

  const receivables=await chat.turn('Las que me tienen que pagar a mí');
  assert.equal(receivables.status,200);
  assert.equal(receivables.body.status,'answer');
  assert.deepEqual(receivables.body.receivables.amounts,[{currency:'EUR',amount:3050}]);
  assert.equal(receivables.body.receivables.count,5);
  assert.deepEqual(new Set(sourceLabels(receivables)),new Set([
    'F-DEMO-003','F-DEMO-001','F-DEMO-002','F-GEM-001','F-GEM-002'
  ]));
  assertAuthorizedEvidence(receivables,blocks);

  const ambiguous=await chat.turn('Facturas pendientes de cobro del cliente Cliente Gemelo');
  assert.equal(ambiguous.body.status,'clarifying');
  assert.equal(ambiguous.body.questions[0].id,'receivable_client');
  assert.deepEqual(ambiguous.body.questions[0].options.map(option=>option.label),[
    'Cliente Gemelo · CL-GEM-A · cm','Cliente Gemelo · CL-GEM-B · cm'
  ]);
  assert.deepEqual(ambiguous.body.sources,[],'a duplicate display name never selects the first contact');
  assertAuthorizedEvidence(ambiguous,blocks);

  const selectedOption=ambiguous.body.questions[0].options[1];
  const selected=await chat.turn(selectedOption.label,{automatic:true,
    answers:{receivable_client:selectedOption.value},receivableContext:ambiguous.body.receivableContext});
  assert.equal(selected.body.status,'answer',JSON.stringify(selected.body));
  assert.deepEqual(sourceLabels(selected),['F-GEM-002']);
  assert.deepEqual(selected.body.receivables.amounts,[{currency:'EUR',amount:450}]);
  assert.equal(selected.body.receivableContext.scope.clientKey,selectedOption.value);
  assertAuthorizedEvidence(selected,blocks);

  const missing=await chat.turn('Facturas pendientes de cobro del cliente Cliente Inexistente');
  assert.equal(missing.body.status,'clarifying');
  assert.equal(missing.body.questions[0].id,'receivable_client');
  assert.deepEqual(missing.body.questions[0].options,[]);
  assert.deepEqual(missing.body.sources,[],'an unknown name must not broaden to the whole study');
  assertAuthorizedEvidence(missing,blocks);
});

test('CA03/CA04/CA05: seven-turn combined scope preserves date rationale and exact cents',async()=>{
  const blocks=fixtureBlocks({acceptance:true}),chat=conversation(blocks);

  const scoped=await chat.turn(GOLD.filtered.query);
  assert.equal(scoped.status,200);
  assert.deepEqual(sourceLabels(scoped),[GOLD.filtered.source]);
  assert.deepEqual(scoped.body.receivables.amounts,[{currency:'EUR',amount:GOLD.filtered.pending}]);
  assert.deepEqual(scoped.body.receivableContext.scope,{
    projectId:'9001',clientKey:null,date:{from:'2026-01-01',to:'2026-12-31',field:'issued'},
    overdue:null,reference:null,brand:null,currency:'EUR'
  });
  const row=scoped.body.sources[0];
  assert.deepEqual({total:row.total,paid:row.paid,pending:row.pending,date:row.date,due:row.due,overdue:row.overdue},
    {total:GOLD.filtered.total,paid:GOLD.filtered.paid,pending:GOLD.filtered.pending,
      date:GOLD.filtered.date,due:GOLD.filtered.due,overdue:true});
  assert.match(scoped.body.receivables.scopeLabel,/Casa Sol.*Emisión: 2026-01-01 a 2026-12-31.*EUR/);
  assertAuthorizedEvidence(scoped,blocks);

  const overdue=await chat.turn('Solo las vencidas',{receivableContext:scoped.body.receivableContext});
  assert.deepEqual(sourceLabels(overdue),[GOLD.filtered.source]);
  assert.equal(overdue.body.receivableContext.scope.overdue,'overdue');
  assert.equal(overdue.body.receivableContext.scope.date.field,'issued');
  assert.match(overdue.body.receivables.scopeLabel,/Solo vencidas/);
  assertAuthorizedEvidence(overdue,blocks);

  const dueReason=await chat.turn('¿Por qué aparece vencida?',{
    receivableContext:overdue.body.receivableContext,
    context:{...CONTEXT,focus:{results:overdue.body.sources.map(pointer)}}
  });
  assert.equal(dueReason.body.status,'answer');
  assert.deepEqual(sourceLabels(dueReason),[GOLD.filtered.source]);
  assert.equal(dueReason.body.message,
    'Está vencida porque su vencimiento es el 12/11/2026 y sigue pendiente de cobro.');
  assert.equal(dueReason.body.preserveQueryContext,true);
  assertAuthorizedEvidence(dueReason,blocks);

  const opened=await chat.turn('Ábrela',{receivableContext:overdue.body.receivableContext,
    context:{...CONTEXT,focus:{results:overdue.body.sources.map(pointer)}}});
  assert.equal(opened.body.actions[0].type,'open_document');
  assert.equal(opened.body.actions[0].payload.id,GOLD.filtered.source);
  assert.equal(opened.body.actions[0].viewMode,'read');
  assert.equal(opened.body.actions[0].openImmediately,true);
  assertAuthorizedEvidence(opened,blocks);

  const rationale=await chat.turn('¿Por qué pone 1.000 € si no hay cobros?',{
    receivableContext:overdue.body.receivableContext,
    context:{...CONTEXT,focus:{document:pointer(opened.body.actions[0].payload)}}
  });
  assert.equal(rationale.body.status,'answer');
  assert.deepEqual(sourceLabels(rationale),[GOLD.filtered.source]);
  assert.match(clean(rationale.body.message),/Quedan 1\.000 € por cobrar/);
  assert.match(clean(rationale.body.message),/factura es de 1\.000 €/);
  assert.match(clean(rationale.body.message),/0 € de cobros registrados/);
  assertAuthorizedEvidence(rationale,blocks);

  const notOverdue=await chat.turn('Ahora solo sin vencer',{receivableContext:overdue.body.receivableContext});
  assert.equal(notOverdue.body.status,'answer');
  assert.deepEqual(notOverdue.body.sources,[]);
  assert.deepEqual(notOverdue.body.receivables.amounts,[]);
  assert.match(notOverdue.body.receivables.scopeLabel,/Casa Sol.*2026.*Sin vencer.*EUR/);
  assertAuthorizedEvidence(notOverdue,blocks);

  const restored=await chat.turn('Sin filtro de vencimiento',{receivableContext:notOverdue.body.receivableContext});
  assert.deepEqual(sourceLabels(restored),[GOLD.filtered.source]);
  assert.equal(restored.body.receivableContext.scope.overdue,null);
  assert.deepEqual(restored.body.receivables.amounts,[{currency:'EUR',amount:1000}]);
  assertAuthorizedEvidence(restored,blocks);
});

test('CA03/CA06: five-turn document chain keeps order, native/PDF truth and sent-copy limits',async()=>{
  const blocks=fixtureBlocks({acceptance:true}),chat=conversation(blocks);

  const listed=await chat.turn('Enséñame mis facturas');
  assert.equal(listed.body.status,'answer');
  assert.deepEqual(sourceLabels(listed),[
    'F-DEMO-002','F-DEMO-001','F-DEMO-004','F-DEMO-005','F-DEMO-006','F-DEMO-003'
  ]);
  assert.deepEqual(listed.body.actions,[]);
  assertAuthorizedEvidence(listed,blocks);

  const year=await chat.turn('Solo las de este año',{documentContext:listed.body.documentContext});
  assert.deepEqual(sourceLabels(year),[
    'F-DEMO-002','F-DEMO-001','F-DEMO-004','F-DEMO-005','F-DEMO-006'
  ]);
  assert.deepEqual(year.body.documentContext.scope.date,{from:'2026-01-01',to:'2026-12-31'});
  assert.match(year.body.documents.scopeLabel,/Emisión: 01\/01\/2026 a 31\/12\/2026/);
  assertAuthorizedEvidence(year,blocks);

  const results=year.body.sources.map(pointer);
  const opened=await chat.turn(GOLD.ordinal.variants[0],{documentContext:year.body.documentContext,
    context:{...CONTEXT,focus:{results}}});
  assert.deepEqual(sourceLabels(opened),[GOLD.ordinal.source]);
  assert.equal(opened.body.actions[0].payload.id,GOLD.ordinal.source);
  assert.equal(opened.body.actions[0].viewMode,'read');
  assert.equal(opened.body.actions[0].openImmediately,true);
  assert.equal(opened.body.preserveQueryContext,true);
  assertAuthorizedEvidence(opened,blocks);

  const ordinalVariant=await fixtureRequest({...baseInput,message:GOLD.ordinal.variants[1],
    context:{...CONTEXT,focus:{results}}},{acceptance:true,blocks});
  assert.deepEqual(sourceLabels(ordinalVariant),[GOLD.ordinal.source]);
  assertAuthorizedEvidence(ordinalVariant,blocks);

  const current=pointer(opened.body.actions[0].payload);
  const pdf=await chat.turn('Enséñame el PDF de esta factura',{documentContext:year.body.documentContext,
    context:{...CONTEXT,focus:{document:current}}});
  assert.deepEqual(sourceLabels(pdf),[GOLD.ordinal.source]);
  assert.equal(pdf.body.actions[0].viewMode,'read');
  assert.equal(pdf.body.actions[0].openImmediately,false);
  assert.match(pdf.body.message,/No hay un PDF adjunto/);
  assert.match(pdf.body.message,/versión actual/);
  assertAuthorizedEvidence(pdf,blocks);

  const sent=await chat.turn('¿Esta es la misma que le mandé?',{documentContext:year.body.documentContext,
    context:{...CONTEXT,focus:{document:current}}});
  assert.match(sent.body.message,/versión actual/);
  assert.match(sent.body.message,/No puedo confirmar/);
  assert.doesNotMatch(sent.body.message,/^Sí\b|confirmad[oa]|se envió realmente/i);
  assert.deepEqual(sent.body.sources,[]);
  assert.deepEqual(sent.body.actions,[]);
  assertAuthorizedEvidence(sent,blocks,{policyOnly:true});
});

test('CA03/CA13: five-turn brief finance chain stays deterministic and source-backed',async()=>{
  const blocks=fixtureBlocks({acceptance:true});

  // Both canonical and natural “brief” variants have the same verified gold.
  for(const variant of GOLD.brief.variants){
    const probe=await fixtureRequest({...baseInput,message:variant},{acceptance:true,blocks});
    assert.equal(probe.status,200,`${variant}: ${JSON.stringify(probe.body)}`);
    assert.equal(probe.body.status,'answer',variant);
    assert.equal(clean(probe.body.message).split('\n').length,5,variant);
    assert.equal(probe.body.metrics.invoiced,GOLD.brief.metrics.invoiced);
    assert.equal(probe.body.metrics.recordedCollections,GOLD.brief.metrics.recordedCollections);
    assert.equal(probe.body.metrics.acceptedQuotes,GOLD.brief.metrics.acceptedQuotes);
    assert.equal(probe.body.metrics.costs,GOLD.brief.metrics.costs);
    assert.deepEqual(probe.body.questions,[]);
    assert.deepEqual(probe.body.actions,[]);
    assertAuthorizedEvidence(probe,blocks);
  }

  const chat=conversation(blocks);
  const summary=await chat.turn(GOLD.brief.variants[1]);
  assert.equal(summary.body.status,'answer');
  assert.equal(clean(summary.body.message).split('\n').length,5);
  assertAuthorizedEvidence(summary,blocks);

  const invoiced=await chat.turn('Solo la facturación',{financeContext:summary.body.financeContext});
  assert.equal(invoiced.body.financeContext.metric,'invoiced');
  assert.equal(invoiced.body.metrics.invoiced,3900);
  assert.deepEqual(invoiced.body.sources.map(({kind,id})=>[kind,id]),['F-DEMO-001','F-DEMO-002','F-DEMO-003','F-DEMO-004'].map(id=>['invoice',id]));
  assertOneLine(invoiced.body.message);
  assertAuthorizedEvidence(invoiced,blocks);

  const collections=await chat.turn('Y los cobros registrados',{financeContext:invoiced.body.financeContext});
  assert.equal(collections.body.financeContext.metric,'recordedCollections');
  assert.equal(collections.body.metrics.recordedCollections,1600);
  assert.deepEqual(collections.body.sources.map(source=>String(source.id)),['101','103']);
  assertOneLine(collections.body.message);
  assertAuthorizedEvidence(collections,blocks);

  const accepted=await chat.turn('Y los presupuestos aceptados',{financeContext:collections.body.financeContext});
  assert.equal(accepted.body.financeContext.metric,'acceptedQuotes');
  assert.equal(accepted.body.metrics.acceptedQuotes,0);
  assert.deepEqual(accepted.body.sources,[]);
  assertOneLine(accepted.body.message);
  assertAuthorizedEvidence(accepted,blocks);

  const costs=await chat.turn('Y los costes',{financeContext:accepted.body.financeContext});
  assert.equal(costs.body.financeContext.metric,'costs');
  assert.equal(costs.body.metrics.costs,1605);
  assert.deepEqual(costs.body.sources.map(source=>String(source.id)),['201','202','203']);
  assertOneLine(costs.body.message);
  assertAuthorizedEvidence(costs,blocks);
});

test('CA03/CA14: five-turn cancellation and read-error chain is reversible and fails closed',async()=>{
  const blocks=fixtureBlocks({acceptance:true}),chat=conversation(blocks);
  const unknown='Facturas pendientes de cobro del cliente Cliente Inexistente';

  const begun=await chat.turn(unknown);
  assert.equal(begun.body.status,'clarifying');
  assert.equal(begun.body.questions[0].id,'receivable_client');
  assert.deepEqual(begun.body.sources,[]);
  assertAuthorizedEvidence(begun,blocks);

  const cancelled=await chat.turn(GOLD.cancel.variants[0],{receivableContext:begun.body.receivableContext});
  assert.equal(cancelled.body.status,'answer');
  assert.equal(cancelled.body.message,GOLD.cancel.reply);
  assert.equal(cancelled.body.cancelledOperation,true);
  assert.deepEqual(cancelled.body.sources,[]);
  assert.deepEqual(cancelled.body.actions,[]);
  assertAuthorizedEvidence(cancelled,blocks,{policyOnly:true});

  const restarted=await chat.turn('Facturas pendientes de cobro del cliente Cliente A');
  assert.equal(restarted.body.status,'answer');
  assert.deepEqual(sourceLabels(restarted),['F-DEMO-001']);
  assert.deepEqual(restarted.body.receivables.amounts,[{currency:'EUR',amount:1000}]);
  assertAuthorizedEvidence(restarted,blocks);

  const failed=await chat.turn('Facturas pendientes de cobro del cliente Cliente A',{
    receivableContext:restarted.body.receivableContext
  },{failRead:'app_leer_bloques'});
  assert.equal(failed.status,503);
  assert.deepEqual(failed.body.error,{
    code:'invoice_data_unavailable',message:'No he podido consultar las facturas ahora. Puedes reintentarlo.'
  });
  assert.equal(failed.body.sources,undefined);
  assert.equal(failed.body.actions,undefined);
  assert.doesNotMatch(JSON.stringify(failed.body),/Cliente A|F-DEMO|test_read_error/);
  assertAuthorizedEvidence(failed,blocks,{failedRead:true});

  const retried=await chat.turn('Facturas pendientes de cobro del cliente Cliente A');
  assert.equal(retried.status,200);
  assert.equal(retried.body.status,'answer');
  assert.deepEqual(sourceLabels(retried),['F-DEMO-001']);
  assert.deepEqual(retried.body.receivables.amounts,[{currency:'EUR',amount:1000}]);
  assertAuthorizedEvidence(retried,blocks);

  const cancelVariant=await fixtureRequest({...baseInput,message:GOLD.cancel.variants[1]},
    {acceptance:true,blocks});
  assert.equal(cancelVariant.body.cancelledOperation,true);
  assert.equal(cancelVariant.body.message,GOLD.cancel.reply);
  assertAuthorizedEvidence(cancelVariant,blocks,{policyOnly:true});
});
