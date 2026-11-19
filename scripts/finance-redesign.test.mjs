import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
const navigation=await readFile(new URL('../app/page-breadcrumbs.js',import.meta.url),'utf8');
const css=await readFile(new URL('../app/brand/finance-ui.css',import.meta.url),'utf8');

test('Finance exposes exactly the five existing sections in the approved order',()=>{
 const match=navigation.match(/const finance=\[([\s\S]*?)\];/);
 assert.ok(match);
 assert.deepEqual([...match[1].matchAll(/view:'([^']+)'/g)].map(item=>item[1]),['informes','facturas','presupuestos','contabilidad','prevision']);
 assert.match(navigation,/if\(state\.view==='facturas'\)return 'Nueva factura'/);
 assert.match(navigation,/\['informes','presupuestos'\]\.includes\(state\.view\).*'Nuevo presupuesto'/s);
});

test('summary period helpers normalize legacy dates without mutating records',()=>{
 const start=html.indexOf('function financeDateISO('),end=html.indexOf('function vInformes(',start);
 const state={financeSummaryPeriod:'year:2026'};
 const context=vm.createContext({state,Date});
 vm.runInContext(html.slice(start,end),context);
 const legacy={date:'19/11/2026'};
 const before=JSON.stringify(legacy);
 assert.equal(context.financeDateISO(legacy.date),'2026-11-19');
 const range=context.financeSummaryRange();
 assert.equal(context.financeInRange(legacy.date,range),true);
 assert.equal(context.financeInRange('31/12/2025',range),false);
 assert.equal(JSON.stringify(legacy),before);
});

test('summary separates actual, collected, outstanding, expenses and projected figures',()=>{
 const block=html.slice(html.indexOf('function vInformes('),html.indexOf('function vDocs('));
 for(const label of ['Facturado','Cobrado','Pendiente de cobro','Gastos','Resultado económico','Venta estimada actual','Presupuestos pendientes'])assert.match(block,new RegExp(label));
 assert.doesNotMatch(block,/retLabel\(|IVA acumulada|IRPF acumulada/);
 assert.match(block,/data-ai-panel-ready="true"/);
});

test('received invoices reuse expense entries and existing document/edit/delete actions',()=>{
 const block=html.slice(html.indexOf('function vInvoiceList('),html.indexOf('function vInvoice(kind)'));
 assert.match(block,/entry\.kind==="out"/);
 assert.match(block,/gastoFile\(\$\{entry\.id\}\)/);
 assert.match(block,/editEntry\(\$\{entry\.id\}\)/);
 assert.match(block,/delEntry\(\$\{entry\.id\}\)/);
 assert.match(block,/Emitidas/);
 assert.match(block,/Recibidas/);
});

test('Finance styles cover compact desktop, tablet, mobile, dark mode and reduced motion',()=>{
 assert.match(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(css,/@media screen and \(max-width: 900px\)/);
 assert.match(css,/@media screen and \(max-width: 600px\)/);
 assert.match(css,/body\.dark/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(css,/--finance-assistant-width:\s*0px/);
});
