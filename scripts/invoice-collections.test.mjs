import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function setup(){const c={syncEntryToInvoice(){}};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function aCobrar('),html.indexOf('function cobrosModal(')),c);return c;}
test('legacy paid invoice has no pending balance and no invented payments',()=>{const c=setup(),e={amount:2825.58,base:2335,irpf:15,status:'cobr'};const before=JSON.stringify(e);assert.equal(c.pendienteCobro(e),0);assert.equal(c.cobrado(e),0);assert.equal(JSON.stringify(e),before);});
test('partial payment balance subtracts withholding',()=>{const c=setup();assert.equal(c.pendienteCobro({amount:1210,base:1000,irpf:15,status:'env',cobros:[{amount:500}]}),560);});
test('removing a payment from a paid invoice recalculates from actual movements',()=>{const c=setup(),e={amount:100,status:'cobr',cobros:[{amount:40}]};c.cobroRecalc(e);assert.equal(e.status,'env');assert.equal(c.pendienteCobro(e),60);e.cobros.push({amount:60});c.cobroRecalc(e);assert.equal(e.status,'cobr');});
test('opening collections does not initialize or modify legacy payments',()=>{const c=setup(),e={id:1,amount:100,status:'cobr',concept:'Demo'};Object.assign(c,{state:{entries:[e]},fmt:String,modal(markup){c.markup=markup}});vm.runInContext(html.slice(html.indexOf('function cobrosModal('),html.indexOf('function cobroAdd(')),c);const before=JSON.stringify(e);c.cobrosModal(1);assert.equal(JSON.stringify(e),before);assert.match(c.markup,/marcada como cobrada/);assert.doesNotMatch(c.markup,/Registrar cobro/);});
