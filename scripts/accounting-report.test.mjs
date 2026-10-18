import test from 'node:test';
import assert from 'node:assert/strict';
import report from '../app/accounting-report.js';
const entry={kind:'in',brand:'a',concept:'Servicio ficticio',date:'01/01/2026',amount:106,base:100,iva:21,link:'F-1',status:'pend'};
const invoice={ref:'F-1',brand:'a',client:'Cliente ficticio',projectId:1,iva:{on:true,pct:21},irpf:{on:true,pct:15}};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
test('report uses recorded amounts without subtracting invoice retention twice and never mutates source data',()=>{
 const entries=freeze([{...entry,cobros:[{date:'2026-01-04',amount:50,note:'Primer cobro'}]}]),options=freeze({invoices:[invoice],projects:[{id:1,brand:'a',num:'PR-1',name:'Proyecto ficticio'}],brands:{a:{name:'Estudio ficticio'}}});
 const before=JSON.stringify({entries,options}),data=report.model(entries,options),item=data.items[0];
 assert.equal(data.income,106);assert.equal(item.retention,15);assert.equal(item.party,'Cliente ficticio');assert.equal(item.project,'PR-1 · Proyecto ficticio');assert.equal(item.payments[0].amount,50);assert.equal(item.taxRate,21);assert.equal(JSON.stringify({entries,options}),before);
});
test('unknown historical fields remain unknown while explicit zero and numeric strings are retained',()=>{
 const data=report.model([{...entry,base:undefined,iva:null,amount:' ',link:'',status:'cobr'},{...entry,amount:'0',base:0,iva:0,irpf:0}]);
 assert.equal(data.items[0].base,null);assert.equal(data.items[0].tax,null);assert.equal(data.items[0].amount,null);assert.equal(data.missingAmounts,1);assert.equal(data.income,0);assert.equal(data.items[1].retention,0);
 const html=report.render(data);assert.match(html,/No consta/);assert.match(html,/Marcado como cobrado; sin desglose de cobros/);assert.equal(data.items[0].payments.length,0);
});
test('linked documents must match brand uniquely and ambiguous projects are not guessed',()=>{
 const cross=report.model([entry],{invoices:[{...invoice,brand:'b'}]});assert.equal(cross.items[0].party,'');assert.equal(cross.items[0].invoice,'');
 const duplicate=report.model([entry],{invoices:[invoice,{...invoice}],projects:[]});assert.equal(duplicate.items[0].retention,null);
 const projects=report.model([{...entry,pid:1}],{projects:[{id:1,brand:'b',name:'Private other project'}]});assert.equal(projects.items[0].project,'Proyecto no disponible');
 assert.equal(report.model([{...entry,pid:1}],{projects:[{id:1,brand:'a'},{id:1,brand:'a'}]}).items[0].project,'Proyecto no disponible');
});
test('manual income and expenses retain their stored party, taxes, payment state and currency',()=>{
 const data=report.model([{...entry,sup:'Origen manual',irpf:7,link:''},{...entry,kind:'out',sup:'Proveedor ficticio',status:'cobr',amount:121,vat:21,irpf:0}]);
 assert.equal(data.items[0].party,'Origen manual');assert.equal(data.items[0].retention,7);assert.equal(data.items[1].status,'Pagado');assert.equal(data.items[1].taxRate,21);assert.equal(data.expense,121);assert.equal(data.balance,-15);
 const html=report.render(data,{formatMoney:v=>v.toFixed(2)+' USD'});assert.match(html,/106.00 USD/);assert.match(html,/−121.00 USD/);assert.doesNotMatch(html,/€/);
});
test('text is escaped and attachment metadata never embeds private URLs or file payloads',()=>{
 const attack='<img src=x onerror=alert(1)>',data=report.model([{...entry,concept:attack,sup:attack,cat:attack,ref:attack,link:'',files:[{name:attack,url:'https://private.invalid/secret?token=secret'},{name:'Plano.pdf',data:'data:application/pdf;base64,PRIVATE'},{name:'En proceso.pdf',subiendo:true},'https://private.invalid/file?token=secret','C:\\old\\Histórico.pdf'],cobros:[{amount:1,date:attack,note:attack}]}]);
 const html=report.render(data,{title:attack,period:attack,scope:attack,issuer:{name:attack,addr:attack,nif:attack},issuedOn:attack});
 assert.ok(html.includes('&lt;img'));assert.doesNotMatch(html,/<img|private\.invalid|PRIVATE|data:application|token=secret/);assert.match(html,/Histórico.pdf/);assert.match(html,/Pendiente de subida/);assert.match(html,/Solo nombre/);
});
test('totals use cents, credits retain correct signs and input order is preserved',()=>{
 const data=report.model([{...entry,concept:'First',amount:.1},{...entry,concept:'Second',amount:.2},{...entry,kind:'out',amount:-10},{...entry,amount:-2}]);
 assert.equal(data.income,-1.7);assert.equal(data.expense,-10);assert.equal(data.balance,8.3);assert.deepEqual(data.items.slice(0,2).map(i=>i.concept),['First','Second']);const html=report.render(data);assert.match(html,/\+10/);assert.match(html,/−2/);assert.doesNotMatch(html,/\+−|−-/);
});
