import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
const navigation=await readFile(new URL('../app/page-breadcrumbs.js',import.meta.url),'utf8');
const css=await readFile(new URL('../app/brand/finance-ui.css',import.meta.url),'utf8');
const component=await readFile(new URL('../ui/team-profile/finance-grid.tsx',import.meta.url),'utf8');
const bridge=await readFile(new URL('../app/finance-grid.js',import.meta.url),'utf8');
const iconPlaceholder=await readFile(new URL('../ui/team-profile/icon-placeholder.tsx',import.meta.url),'utf8');

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

test('sales and expenses use the exact ReUI data grid and Filters composition without an actions column',()=>{
 const block=html.slice(html.indexOf('function financeGridComponentData('),html.indexOf('function invoiceListHtml()'));
 assert.match(block,/entry\.kind==="out"/);
 assert.match(block,/finance-reui-grid-host/);
 for(const primitive of ['DataGrid','DataGridColumnHeader','DataGridPagination','DataGridScrollArea','DataGridTable','Filters','CardHeader','CardContent','CardFooter'])assert.match(component,new RegExp(primitive));
 for(const label of ['Factura','Estado','Cliente','Proyecto','Importe \\(con IVA\\)','Total filtrado'])assert.match(component,new RegExp(label));
 assert.match(block,/dueDate:String\(financeDateISO\(row\.e\?\.due/);
 assert.match(component,/folder-simple-star-light\.svg/);
 assert.doesNotMatch(component,/title="Acciones"|>Acciones<|finance-grid-actions/);
 assert.match(bridge,/mountFinanceGrid/);
});

test('Finance styles cover compact desktop, tablet, mobile, dark mode and reduced motion',()=>{
 assert.match(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(css,/@media screen and \(max-width: 900px\)/);
 assert.match(css,/@media screen and \(max-width: 600px\)/);
 assert.match(css,/body\.dark/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
 assert.match(css,/--finance-assistant-width:\s*0px/);
});

test('invoice grid copies the supplied Card and filter composition classes exactly',()=>{
 assert.match(component,/Card className="w-full gap-0 p-0"/);
 assert.match(component,/CardHeader className="flex items-center justify-between gap-3 px-4 py-2"/);
 assert.match(component,/CardTitle className="truncate text-sm font-medium"/);
 assert.match(component,/CardDescription className="truncate text-xs tabular-nums"/);
 assert.match(component,/CardAction className="flex shrink-0 items-center gap-2"/);
 assert.match(component,/variant="advanced"[\s\S]*advancedMode="popover"[\s\S]*advancedAlign="end"[\s\S]*reorderable/);
 assert.match(component,/createFilterQuery<unknown>\(/);
 for(const id of ['initial-status','initial-client','initial-total','initial-invoice-ref','initial-invoice-date'])assert.match(component,new RegExp(id));
 assert.match(component,/useState<FilterQuery>\(SEED\)/);
 assert.match(component,/Button[\s\S]*variant="ghost"[\s\S]*disabled=\{query === SEED\}/);
 assert.match(component,/>\s*Restablecer\s*</);
 assert.match(component,/CardContent className="border-y px-0"/);
 assert.match(component,/CardFooter className="border-t-0 px-4 py-2\.5"/);
 assert.match(component,/sizes=\{pageSizes\}/);
 assert.match(component,/function fitRowsToViewport/);
 assert.match(component,/useLayoutEffect/);
 assert.match(component,/ResizeObserver/);
 assert.match(component,/viewportBottom - cardRect\.top/);
 assert.match(component,/FilterValueDisplayContext/);
 assert.match(component,/function StackedTones/);
 assert.match(component,/function PatternValue/);
 assert.match(component,/function TermReach/);
 assert.match(component,/function isIncomplete/);
 assert.match(component,/function matches\(/);
 assert.match(component,/SPANISH_FILTER_LABELS/);
 assert.match(component,/SPANISH_OPERATORS/);
 assert.match(component,/FilterDateEditor/);
 for(const label of ['Fecha de emisión','Fecha de vencimiento','Sin proyecto'])assert.match(component,new RegExp(label));
 assert.match(component,/valueText: moneyText/);
 for(const size of [125,110,134,79,104])assert.match(component,new RegExp(`size: ${size}`));
});

test('the exact ReUI filters render their requested Lucide icons',()=>{
 assert.match(iconPlaceholder,/ListFilterIcon/);
 assert.match(iconPlaceholder,/ListFilterPlusIcon/);
 assert.doesNotMatch(iconPlaceholder,/\|\|\s*CheckIcon/);
});
