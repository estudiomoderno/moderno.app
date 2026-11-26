import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const bridge=require('../app/secretario-bridge.js');
const stamp='2026-11-22T09:00:00Z';
const versions=()=>Object.fromEntries(bridge.BLOCKS.map(key=>[key,stamp]));
function fixture(){
  const snapshot={role:'admin',studyId:'fictional-study',brands:['cm'],irpf:false,today:'2026-11-22',versions:versions(),dirtyBlocks:[],
    clients:[{name:'Cliente ficticio',brand:'cm',type:'Cliente'}],projects:[{id:9001,name:'Proyecto ficticio',brand:'cm'}],quotes:[],drafts:[]};
  const payload={mode:'create',kind:'factura',brand:'cm',clientId:'contact:0',clientIndex:0,clientLabel:'Cliente ficticio',clientBrand:'cm',projectId:9001,
    lines:[{name:'Asesoría ficticia',qty:2,unit:'h',price:100,cap:'Servicios'}],iva:{on:true,pct:21},irpf:{on:false,pct:0},disc:{on:false,pct:10},legend:'',sourceVersions:versions()};
  return {snapshot,payload};
}

test('creates a real editor draft without assigning an issued reference, counter or saved total',()=>{
  const {snapshot,payload}=fixture(),before=JSON.stringify(snapshot);
  const draft=bridge.prepareDraft(payload,snapshot);
  assert.equal(draft.kind,'factura');assert.equal(draft.clientIdx,0);assert.equal(draft.projectId,9001);
  assert.deepEqual(draft.lines,[{name:'Asesoría ficticia',qty:2,unit:'h',price:100,desc:'',cap:'Servicios'}]);
  assert.equal(draft.num,null);assert.equal(draft.editRef,null);assert.equal(draft.date,'2026-11-22');
  assert.equal(Object.hasOwn(draft,'total'),false);assert.equal(Object.hasOwn(draft,'ref'),false);
  assert.equal(JSON.stringify(snapshot),before);
  payload.lines[0].qty=9;assert.equal(draft.lines[0].qty,2);
});

test('unknown prices, missing amounts and nonfinite values cannot silently become zero',()=>{
  for(const value of [null,undefined,'',NaN,Infinity,'100',-1]){
    const {snapshot,payload}=fixture();payload.lines[0].price=value;
    assert.throws(()=>bridge.prepareDraft(payload,snapshot),/precio/);
  }
  const {snapshot,payload}=fixture();payload.lines[0].price=0;
  assert.equal(bridge.prepareDraft(payload,snapshot).lines[0].price,0);
  payload.lines[0].qty=0;assert.throws(()=>bridge.prepareDraft(payload,snapshot),/mayor que cero/);
});

test('server versions and local unsaved source changes both invalidate a proposal',()=>{
  for(const key of bridge.BLOCKS){
    const {snapshot,payload}=fixture();snapshot.versions[key]='new-version';
    assert.throws(()=>bridge.prepareDraft(payload,snapshot),error=>error.code==='stale_proposal');
  }
  const {snapshot,payload}=fixture();snapshot.dirtyBlocks=['config'];
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/cambios pendientes/);
  snapshot.dirtyBlocks=[];delete payload.sourceVersions.contactos;
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),error=>error.code==='stale_proposal');
});

test('ambiguous or changed contact identity never resolves to the first display-name match',()=>{
  const {snapshot,payload}=fixture();snapshot.clients.unshift({name:'Otra persona',brand:'cm',type:'Cliente'});
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/contacto ha cambiado/);
  snapshot.clients.shift();payload.clientId='actual-id';snapshot.clients[0].id='actual-id';
  assert.equal(bridge.prepareDraft(payload,snapshot).clientIdx,0);
  snapshot.clients.push({...snapshot.clients[0]});
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/contacto ha cambiado/);
});

test('roles, project ownership, configured tax settings and spaces are checked again at the editor boundary',()=>{
  for(const role of ['colaborador','miembro','cliente','gestoria',null]){
    const {snapshot,payload}=fixture();snapshot.role=role;
    assert.throws(()=>bridge.prepareDraft(payload,snapshot),error=>error.code==='forbidden');
  }
  const {snapshot,payload}=fixture();payload.projectId=777;
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),error=>error.code==='forbidden');
  payload.projectId=9001;payload.irpf.on=true;
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/retención/);
  payload.irpf.on=false;payload.iva.pct=150;
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/impuesto/);
});

test('quote conversion is bound to a unique reference, project and space',()=>{
  const {snapshot,payload}=fixture();payload.mode='from_quote';payload.sourceQuoteRef='PS-0001';
  snapshot.quotes=[{ref:'PS-0001',brand:'cm',projectId:9001,client:'Cliente ficticio'}];
  assert.equal(bridge.prepareDraft(payload,snapshot).sourceQuoteRef,'PS-0001');
  snapshot.quotes.push({...snapshot.quotes[0]});
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/presupuesto de origen/);
});

test('saved-draft changes are limited to the existing line order and cannot edit an issued document',()=>{
  const {snapshot,payload}=fixture();payload.mode='edit_saved_draft';payload.draftId=42;
  snapshot.drafts=[{id:42,kind:'factura',draft:{brand:'cm',clientIdx:0,lines:[{name:'Asesoría ficticia',qty:1,unit:'h',price:75,sourceProof:{revision:'original'}}]}}];
  const proposal=bridge.prepareDraft(payload,snapshot);
  assert.equal(proposal._draftId,42);assert.equal(proposal.lines[0].qty,2);
  assert.equal(snapshot.drafts[0].draft.lines[0].qty,1);
  payload.lines[0].name='Otra partida';assert.throws(()=>bridge.prepareDraft(payload,snapshot),/partidas.*cambiado/);
  payload.lines[0].name='Asesoría ficticia';snapshot.drafts[0].draft.editRef='F-0001';
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),/borrador guardado/);
});

test('source metadata is retained as a clone and rejects a different study',()=>{
  const {snapshot,payload}=fixture();payload.lines[0].source={study:'fictional-study',project:9001,row:'line-1'};
  payload.lines[0].catalogSource={id:'service-1',price:100,unit:'h'};payload.lines[0].catId='service-1';
  const draft=bridge.prepareDraft(payload,snapshot);
  assert.deepEqual(draft.lines[0].source,payload.lines[0].source);
  assert.notEqual(draft.lines[0].source,payload.lines[0].source);
  payload.lines[0].source.study='another-study';
  assert.throws(()=>bridge.prepareDraft(payload,snapshot),error=>error.code==='forbidden');
});

test('navigation accepts only existing authorized app screens and accessible projects',()=>{
  const snapshot={projects:[{id:9001}],canView:view=>view!=='facturas'};
  assert.deepEqual(bridge.navigation({view:'gastos'},snapshot),{view:'contabilidad'});
  assert.deepEqual(bridge.navigation({view:'prevision'},snapshot),{view:'prevision'});
  assert.deepEqual(bridge.navigation({view:'proyecto',projectId:'9001'},snapshot),{view:'proyecto',projectId:9001});
  for(const payload of [{view:'https://outside.invalid'},{view:'javascript:alert(1)'},{view:'facturas'},{view:'proyecto',projectId:22}])
    assert.throws(()=>bridge.navigation(payload,snapshot),error=>error.code==='forbidden');
});

test('production without an explicit gate does not install handlers or touch the existing app',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  for(const config of [undefined,{}, {enabled:false},{enabled:'true'}]){
    const context=vm.createContext({window:{MODERNO_SECRETARY_CONFIG:config}});
    vm.runInContext(code,context);
    assert.equal(context.ModernoSecretary.enabled,false);
    assert.equal(context.ModernoSecretary.openFinance(),false);
  }
});

test('published app enables only the production endpoint and keeps feedback off',async()=>{
  const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
  const config='window.MODERNO_SECRETARY_CONFIG=Object.freeze({enabled:true,endpoint:"https://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario",feedbackEnabled:false});';
  assert.equal(html.split(config).length,2);
  assert.ok(html.indexOf(config)>html.indexOf('const SUPABASE_URL = "https://auth.moderno.app";'));
  assert.ok(html.includes('<script src="/secretario-bridge.js?v=3"></script>'));
  assert.ok(html.includes('<link rel="stylesheet" href="/brand/secretario.css?v=5">'));
  assert.ok(html.indexOf(config)<html.indexOf('<script src="/secretario-ui.js?v=10"></script>'));
  assert.doesNotMatch(config,/OPENAI|sk-/i);
});

test('secretary sends the session only to the exact canonical project function',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  const start=code.indexOf('function endpoint()'),end=code.indexOf('\n  async function submitMessage',start);
  assert.ok(start>=0&&end>start);
  const source=code.slice(start,end);
  const resolve=(base,configured)=>vm.runInNewContext(`(()=>{const config=${JSON.stringify({endpoint:configured})};${source};return endpoint();})()`,{
    URL,SUPABASE_URL:base,location:{origin:'https://app.moderno.app'}
  });
  const canonical='https://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario';
  assert.equal(resolve('https://auth.moderno.app',canonical),canonical);
  assert.equal(resolve('https://chsilowzrtumbcofspwv.supabase.co','https://chsilowzrtumbcofspwv.supabase.co/functions/v1/secretario'),'https://chsilowzrtumbcofspwv.supabase.co/functions/v1/secretario');
  for(const invalid of [
    'https://auth.moderno.app/functions/v1/secretario',
    'https://other-project.supabase.co/functions/v1/secretario',
    canonical+'?next=outside',canonical+'#fragment',
    'https://user@cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario',
    'http://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario'
  ])assert.throws(()=>resolve('https://auth.moderno.app',invalid),/todavía no está configurada/);
});

test('browser call sends the public project key separately from the user session',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  const start=code.indexOf('function sendQuery('),end=code.indexOf('async function submitMessage(',start);
  assert.ok(start>=0&&end>start);
  const request=code.slice(start,end);
  assert.match(request,/credentials:'omit'/);
  assert.match(request,/apikey:SUPABASE_ANON_KEY/);
  assert.doesNotMatch(request,/Authorization/);
  assert.doesNotMatch(request,/x-moderno-session/);
  assert.match(request,/JSON\.stringify\(\{session:session\.access_token,payload:input\}\)/);
  assert.doesNotMatch(request,/service[_-]?role|sb_secret_/i);
});

test('a bounded-context response keeps its specific safe message instead of becoming generic',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  assert.match(code,/code==='context_limit'.*payload\?\.error\?\.message/);
  assert.match(code,/No he podido completar la consulta\. Puedes volver a intentarlo\./);
});

test('network, quota and changed-context errors have stable Spanish recovery paths',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  assert.match(code,/No se ha podido conectar con el Secretario\. Comprueba la conexión y vuelve a intentarlo\./);
  assert.match(code,/code==='quota_exhausted'/);assert.match(code,/code==='context_changed'/);assert.match(code,/code==='provider_busy'/);
  assert.match(code,/record\.retryContent=content/);assert.match(code,/Volver a intentar/);
  assert.doesNotMatch(code,/appendMessage\('assistant',error\.message/);
});

test('an in-flight request is bound to its original screen and project',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  assert.match(code,/originContext=currentContext\(\)/);assert.match(code,/if\(!sameContext\(originContext\)\)/);
  assert.match(code,/La consulta se detuvo porque cambiaste de pantalla o de proyecto/);
  assert.match(code,/if\(changedView\)\{questions=\[\];answers=\{\};pendingAnswers=\{\}/);
  assert.doesNotMatch(code,/changedView&&\['proyecto','estancia'\]\.includes\(state\.view\)\)collapsed=false/);
});

test('the editor dirty guard covers every editable field after an empty draft opens',async()=>{
  const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8'),start=html.indexOf('const _draftClean='),end=html.indexOf('\nfunction draftMeaningful',start);
  assert.ok(start>=0&&end>start);
  const context=vm.createContext({state:{account:{vat:21},draft:{kind:'factura',brand:'cm',clientIdx:-1,lines:[],iva:{on:true,pct:21},irpf:{on:false,pct:15},disc:{on:false,pct:10},legend:'',validUntil:'',due:'',num:1,date:'2026-11-22',editRef:null}},canon:value=>JSON.stringify(value),retPct:()=>15,Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-11-22T12:00:00Z']));}static now(){return Date.parse('2026-11-22T12:00:00Z');}}});
  vm.runInContext(html.slice(start,end),context);context.draftTrack();assert.equal(context.draftDirty(),false);
  for(const [field,value] of [['due','2026-12-22'],['projectId',9001],['capSummary',true],['legend','Condición']]){const before=context.state.draft[field];context.state.draft[field]=value;assert.equal(context.draftDirty(),true,field);context.state.draft[field]=before;}
  context.state.draft.iva.pct=10;assert.equal(context.draftDirty(),true);
  assert.match(html,/state\.draft\.disc=state\.draft\.disc\|\|\{on:false,pct:10\}; draftTrack\(state\.draft\)/);
});

test('assistant identity uses the verified Auth user id and never profile metadata or email',async()=>{
  const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
  const start=html.indexOf('function sbUserToSession('),end=html.indexOf('function applySessionUI(',start);
  const context=vm.createContext({});vm.runInContext(html.slice(start,end),context);
  const session=context.sbUserToSession({id:'auth-user-a',email:'person@example.invalid',user_metadata:{id:'another-user',full_name:'Persona ficticia'}});
  assert.equal(session.id,'auth-user-a');
  assert.equal(context.sbUserToSession({email:'person@example.invalid',user_metadata:{id:'another-user'}}).id,null);
});

test('long conversations fit the server budget using whole recent turns without erasing visible history',()=>{
  const records=Array.from({length:24},(_,i)=>({role:i%2?'assistant':'user',content:String(i).padEnd(5000,'x')}));
  const before=JSON.stringify(records),message='m'.repeat(6000),result=bridge.recentHistory(records,message);
  assert.equal(result.trimmed,true);assert.equal(result.history.length,3);
  assert.ok(result.history.reduce((sum,turn)=>sum+turn.content.length,0)+message.length<=24000);
  assert.equal(result.history[0].content,records[21].content);assert.equal(JSON.stringify(records),before);
  records.push({role:'assistant',content:'large'.repeat(1500)},{role:'user',content:'Después'});
  assert.deepEqual(bridge.recentHistory(records,'Continúa').history,[{role:'user',content:'Después'}]);
  assert.throws(()=>bridge.recentHistory([],message+'x'),error=>error.code==='message_length');
});

test('automatic option turns keep their marker across the browser history boundary',()=>{
  const records=[{role:'user',content:'Opción · 2 · h',automatic:true},{role:'assistant',content:'¿Cantidad?'},{role:'user',content:'Texto normal',automatic:false}];
  assert.deepEqual(bridge.recentHistory(records,'Continúa').history,[{role:'user',content:'Opción · 2 · h',automatic:true},{role:'assistant',content:'¿Cantidad?'},{role:'user',content:'Texto normal'}]);
});

test('the UI marks structured option submissions as automatic history',async()=>{
  const code=await readFile(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
  assert.match(code,/appendMessage\('user',content,undefined,!!answerValues\)/);
  assert.match(code,/\.\.\.\(automatic===true\?\{automatic:true\}:\{\}\)/);
  const mergeStart=code.indexOf('function structuredFor('),mergeEnd=code.indexOf('\n  function pendingAfter',mergeStart),mergeContext=vm.createContext({});assert.ok(mergeStart>=0&&mergeEnd>mergeStart);vm.runInContext(code.slice(mergeStart,mergeEnd),mergeContext);
  const previous={clientId:'contact:1','line.0.catalogId':'id:a','line.0.qty':'2 horas','line.0.price':'100'};
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,{'line.0.qty':'3 horas'}))),{...previous,'line.0.qty':'3 horas'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,{'line.0.catalogId':'id:b'}))),{clientId:'contact:1','line.0.catalogId':'id:b'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,{'line.0.qty':'4 horas','line.0.catalogId':'id:b'}))),{clientId:'contact:1','line.0.qty':'4 horas','line.0.catalogId':'id:b'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,{clientId:'contact:2'}))),{clientId:'contact:2'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,{projectId:'2'}))),{projectId:'2'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,{projectId:'none'}))),{clientId:'contact:1',projectId:'none'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor({clientId:'contact:1'},{brand:'demo'}))),{clientId:'contact:1',brand:'demo'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor({brand:'demo'},{clientId:'contact:1'}))),{brand:'demo',clientId:'contact:1'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor({clientId:'contact:1',brand:'demo'},{projectId:'none'}))),{clientId:'contact:1',brand:'demo',projectId:'none'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor({projectId:'1',brand:'demo'},{clientId:'contact:1'}))),{projectId:'1',brand:'demo',clientId:'contact:1'});
  assert.deepEqual(JSON.parse(JSON.stringify(mergeContext.structuredFor(previous,undefined))),{});
  assert.match(code,/automatic:!!answerValues,history/);
  assert.match(code,/hasStructuredAnswers\?\{answers:structuredAnswers\}:\{\}/);
  const start=code.indexOf('function pendingAfter('),end=code.indexOf('\n  const activeProject',start),context=vm.createContext({});assert.ok(start>=0&&end>start);vm.runInContext(code.slice(start,end),context);
  const candidate={clientId:'contact:1'};const retained=context.pendingAfter('clarifying',candidate);assert.deepEqual(JSON.parse(JSON.stringify(retained)),candidate);assert.notEqual(retained,candidate);
  assert.deepEqual(JSON.parse(JSON.stringify(context.pendingAfter('answer',candidate))),{});assert.deepEqual(JSON.parse(JSON.stringify(context.pendingAfter('error',candidate))),{});assert.deepEqual(JSON.parse(JSON.stringify(context.pendingAfter('aborted',candidate))),{});
  assert.match(code,/pendingAnswers=pendingAfter\(payload\.status,structuredAnswers\)/);
  assert.match(code,/catch\(error\)\{[\s\S]{0,180}pendingAnswers=pendingAfter\('error',structuredAnswers\)/);
  assert.doesNotMatch(code,/if\(hasStructuredAnswers\)pendingAnswers=structuredAnswers/);
});
