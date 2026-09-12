import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../app/billing-ui.js',import.meta.url),'utf8');
function fixture(result){
 const calls=[],redirects=[],toasts=[];const ctx={window:{},ModernoDaily:{escape:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},ESTUDIO_ID:'study',_accessRole:'admin',state:{view:'ajustes',account:{name:'Estudio ficticio'}},render(){},Intl,URL,URLSearchParams,sessionStorage:{},ModernoBillingIntent:{read:()=>({plan:'synthetic'})},location:{search:'?billing_return=success',assign:u=>redirects.push(u)},crypto,prepareAppReload:async()=>true,toast:s=>toasts.push(s),sb:{functions:{invoke:async(name,{body})=>{calls.push(body);return {data:typeof result==='function'?result(body):result};}}}};
 vm.runInNewContext(source,ctx);return {ctx,ui:ctx.window.BillingUI,calls,redirects,toasts};
}
test('unconfigured subscriptions show no invented plan or payment button',async()=>{
 const f=fixture({available:false});await f.ui.load();assert.match(f.ui.view(),/todavía no está disponible/);assert.doesNotMatch(f.ui.view(),/Continuar en prueba/);
});
test('return success never calls checkout or activates access',async()=>{
 const f=fixture({available:true,plans:[],account:{status:'incomplete'}});await f.ui.load();assert.match(f.ui.view(),/no confirma la suscripción/);assert.equal(f.calls.length,1);assert.equal(f.calls[0].action,'status');assert.equal(f.redirects.length,0);
});
test('history has truthful empty state and rejects foreign download URLs',async()=>{
 const f=fixture(b=>b.action==='status'?{available:true,plans:[]}:{invoices:[{number:'Ensayo',total:100,currency:'EUR',status:'paid',pdf:'https://evil.invalid/file'}]});await f.ui.load(true);assert.doesNotMatch(f.ui.view(true),/evil.invalid|Descargar PDF/);
 const empty=fixture(b=>b.action==='status'?{available:true,plans:[]}:{invoices:[]});await empty.ui.load(true);assert.match(empty.ui.view(true),/No hay facturas/);
});
test('switching study hides prior subscription data',async()=>{
 const f=fixture({available:true,plans:[],account:{status:'active'}});await f.ui.load();f.ctx.ESTUDIO_ID='other';assert.doesNotMatch(f.ui.view(),/Activa/);
});
