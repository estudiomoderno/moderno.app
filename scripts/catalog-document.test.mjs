import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import Catalog from '../app/catalog-core.js';import Settings from '../app/settings-core.js';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const save=html.slice(html.indexOf('function saveDoc(){'),html.indexOf('const QST ='));
function context(){
 const item={id:8,name:'Partida',price:40,unit:'ud',tipo:'Partida',cat:'Obra'},l=Catalog.line(item);l.price=60;l.catalogPriceIntent=Catalog.priceIntent(Catalog.line(item),item,60,'ud',{role:'admin',studyId:'a'});
 const d={kind:'presupuesto',brand:'cm',lines:[l],clientIdx:0,disc:{on:false},iva:{on:false},irpf:{on:false},num:1,date:'2026-09-11'};
 const ctx={state:{draft:d,catalog:[item],clients:[{name:'Ficticio'}],quotes:[{ref:'PS-0000',lines:[{catId:8,price:12}]}],invoices:[],entries:[],quoteCounter:0},ESTUDIO_ID:'a',_accessRole:'admin',ModernoCatalog:Catalog,ModernoSettingsCore:Settings,ProjectQuotes:{validate(){}},linesSum:ls=>ls.reduce((n,l)=>n+l.qty*l.price,0),serie:()=> 'PS',toast(m){ctx.messages.push(m);},messages:[],render(){}};
 vm.createContext(ctx);vm.runInContext(save,ctx);return ctx;
}
test('saving document commits intended price locally without touching historical lines',()=>{const c=context();c.saveDoc();assert.equal(c.state.catalog[0].price,60);assert.equal(c.state.quotes[0].lines[0].price,12);assert.equal(c.state.quotes[1].lines[0].catalogPriceIntent,undefined);assert.equal(c.state.draft,null);});
test('document validation failure leaves catalog and draft intact',()=>{const c=context();c.state.draft.clientIdx=-1;c.saveDoc();assert.equal(c.state.catalog[0].price,40);assert.equal(c.state.quotes.length,1);assert.ok(c.state.draft);});
test('concurrent catalog change blocks document and catalog mutation',()=>{const c=context();c.state.catalog[0].price=50;c.saveDoc();assert.equal(c.state.catalog[0].price,50);assert.equal(c.state.quotes.length,1);assert.ok(c.state.draft);});
test('unknown unit price cannot be saved as a free line',()=>{const c=context();c.state.draft.lines[0].price=null;c.saveDoc();assert.equal(c.state.catalog[0].price,40);assert.equal(c.state.quotes.length,1);});
test('real inline JavaScript remains syntactically valid',()=>{for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){if(m[1].trim())new vm.Script(m[1]);}});


test('new document captures the selected bank without rewriting older documents',()=>{
 const c=context();c.state.account={paymentIban:'NUEVA',iban:'ANTERIOR'};c.state.emitter={iban:'EMISOR'};
 const old=JSON.stringify(c.state.quotes[0]);c.saveDoc();assert.equal(c.state.quotes[1].paymentIban,'NUEVA');assert.equal(JSON.stringify(c.state.quotes[0]),old);
 c.state.account.paymentIban='OTRA';assert.equal(c.state.quotes[1].paymentIban,'NUEVA');
});
test('editing a saved document preserves its fixed bank and legacy absence',()=>{
 for(const fixed of [undefined,'FIJA']){const c=context();c.state.account={paymentIban:'NUEVA'};c.state.emitter={iban:'EMISOR'};
 if(fixed!==undefined)c.state.quotes[0].paymentIban=fixed;c.state.draft.editRef='PS-0000';c.saveDoc();
 assert.equal(c.state.quotes[0].paymentIban,fixed);assert.equal(Object.hasOwn(c.state.quotes[0],'paymentIban'),fixed!==undefined);}
});
