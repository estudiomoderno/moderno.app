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
 assert.deepEqual([...match[1].matchAll(/view:'([^']+)'/g)].map(item=>item[1]),['informes','facturas','contabilidad','presupuestos','prevision']);
 assert.deepEqual([...match[1].matchAll(/label:'([^']+)'/g)].map(item=>item[1]),['Resumen','Ventas','Gastos','Presupuestos','Previsión']);
 assert.match(navigation,/if\(state\.view==='facturas'\)return 'Nueva factura'/);
 assert.match(navigation,/if\(state\.view==='contabilidad'\)return 'Nueva factura recibida'/);
 assert.match(navigation,/\['informes','presupuestos','prevision'\]\.includes\(state\.view\).*'Nuevo presupuesto'/s);
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

test('sales and expenses use the shared filtered data grid and preserve actions',()=>{
 const block=html.slice(html.indexOf('function financeGridState('),html.indexOf('function vInvoice(kind)'));
 assert.match(block,/entry\.kind==="out"/);
 assert.match(block,/gastoFile\(\$\{row\.e\.id\}\)/);
 assert.match(block,/editEntry\(\$\{row\.e\.id\}\)/);
 assert.match(block,/delEntry\(\$\{row\.e\.id\}\)/);
 for(const label of ['Factura','Estado','Cliente','Proyecto','Importe \\(con IVA\\)','Filtros','Total filtrado'])assert.match(block,new RegExp(label));
 assert.doesNotMatch(block,/>Estudio</);
 assert.match(block,/folder-simple-star-light\.svg/);
});

test('Finance styles cover compact desktop, tablet, mobile, dark mode and reduced motion',()=>{
 assert.match(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(css,/@media screen and \(max-width: 900px\)/);
 assert.match(css,/@media screen and \(max-width: 600px\)/);
 assert.match(css,/body\.dark/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(css,/--finance-assistant-width:\s*0px/);
});

test('invoice grid header follows the supplied CardHeader typography and spacing exactly',()=>{
 assert.match(css,/\.finance-data-header\s*\{[^}]*gap:\s*12px;[^}]*padding:\s*8px 16px;/s);
 assert.match(css,/\.finance-data-header h2\s*\{[^}]*font-family:\s*"Moderno ReUI Inter",Inter,sans-serif\s*!important;[^}]*font-size:\s*14px;[^}]*font-style:\s*normal;[^}]*font-weight:\s*500\s*!important;[^}]*line-height:\s*20px;/s);
 assert.match(css,/\.finance-data-header p\s*\{[^}]*font-family:\s*"Moderno ReUI Inter",Inter,sans-serif;[^}]*font-size:\s*12px;[^}]*font-weight:\s*400;[^}]*line-height:\s*16px;/s);
 assert.match(css,/\.finance-data-footer\s*\{[^}]*padding:\s*10px 16px;/s);
});
