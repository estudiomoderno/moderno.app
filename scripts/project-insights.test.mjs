import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import sync from '../app/sync-merge.js';
const source=fs.readFileSync(new URL('../app/project-insights.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function context(extra={}){const c={Date,crypto:{randomUUID:()=> 'test'},meName:()=> 'Persona',persistSoon(){},...extra};vm.createContext(c);vm.runInContext(source,c);return c;}
const api=context().ModernoProjectInsights;
test('folder bell hides at zero and counts only visible current alerts',()=>{
 const c=context({_accessRole:'colaborador',state:{sessionUser:{id:'u'}}});
 const p={id:1,num:'PR-1',tasks:[]};assert.equal(c.projectFolderNotifications(p),'');
 p.tasks=[{title:'<img>',col:'pend',due:'2000-01-01'},{title:'Done',col:'listo',due:'2000-01-01'}];
 const first=c.projectFolderNotifications(p);assert.match(first,/folio-notice-count[^>]*><span>1<\/span>/);assert.match(first,/notice-ring/);assert.doesNotMatch(first,/<img>/);assert.match(first,/&lt;img&gt;/);
 assert.doesNotMatch(c.projectFolderNotifications(p),/notice-ring/);
 p.tasks[0].col='listo';assert.equal(c.projectFolderNotifications(p),'');
});
test('project metrics ignore completed overdue tasks and invalid dates, retain undated work',()=>{
 const p={tasks:[{col:'listo',due:'2026-01-01'},{col:'prog',due:'2026-09-17'},{col:'rev',due:'2026-09-19'},{col:'pend',due:'2026-02-31'},{col:'pend'}]};
 const m=api.metrics(p,'2026-09-18');assert.equal(m.pending,4);assert.equal(m.overdue,1);assert.equal(m.progress,20);assert.equal(m.next.due,'2026-09-19');assert.equal(m.stale,false);
 assert.equal(api.metrics({tasks:[]}).progress,0);
});
test('inactivity uses recorded timestamps and ignores archived or delivered projects',()=>{
 const p={createdAt:'2026-08-01T00:00:00Z',tasks:[],status:'En progreso'};
 assert.equal(api.metrics(p,'2026-09-18').stale,true);
 assert.equal(api.metrics({...p,status:'Archivado'},'2026-09-18').stale,false);
 assert.equal(api.metrics({...p,comments:[{cid:'project-change-x',ts:Date.parse('2026-09-17')} ]},'2026-09-18').stale,false);
});
test('combined project filters support current and legacy assignees and budget attention',()=>{
 const p={client:'Cliente',status:'En progreso',tasks:[{assignee:'Ana'},{assignees:['Luis']}]};
 assert.ok(api.matches(p,{person:'Ana',client:'Cliente'}));assert.ok(api.matches(p,{person:'Luis'}));
 assert.equal(api.matches(p,{person:'Otro'}),false);assert.equal(api.matches(p,{status:'Entregado'}),false);
 assert.equal(api.matches(p,{attention:true}),false);assert.ok(api.matches(p,{attention:true},true));
});
test('journal records meaningful changes once and does not copy private financial values',()=>{
 const c=context(),p={name:'Antes',tasks:[{id:1,title:'Plano',col:'pend',amount:900}]};
 const before=c.projectChangeStart(p);p.name='Después';p.tasks[0].col='rev';p.tasks[0].amount=1000;c.projectChangeEnd(p,before);
 assert.equal(p.comments.length,1);assert.match(p.comments[0].txt,/Antes → Después/);assert.match(p.comments[0].txt,/Pendiente → En revisión/);assert.doesNotMatch(p.comments[0].txt,/900|1000/);
 c.projectChangeEnd(p,c.projectChangeStart(p));assert.equal(p.comments.length,1);
});
test('task additions deletions and date edits are distinguished',()=>{
 const a={tasks:[{id:1,title:'Vieja'},{id:2,title:'Fecha',due:'2026-09-18'}]},b={tasks:[{id:2,title:'Fecha',due:'2026-09-20'},{id:3,title:'Nueva'}]};
 const text=api.changes(a,b).join('\n');assert.match(text,/eliminada: Vieja/);assert.match(text,/añadida: Nueva/);assert.match(text,/18\/09\/2026 → 20\/09\/2026/);
});
test('finance overview never reads finance data for collaborator',()=>{
 const state={};for(const k of ['quotes','invoices','entries'])Object.defineProperty(state,k,{get(){throw Error('Private data read')}});
 const c=context({_accessRole:'colaborador',state,planHitos(){throw Error('Private plan read')}});
 assert.doesNotMatch(c.projectOverview({id:1,tasks:[]}),/Pendiente de cobro|presupuestos pendientes/);
});
test('admin overview uses existing pending-collection and converted-budget rules',()=>{
 const c=context({_accessRole:'admin',state:{quotes:[{projectId:1,status:'pend'},{projectId:1,status:'pend',converted:true},{projectId:2,status:'pend'}],invoices:[{projectId:1,ref:'F1'}],entries:[{kind:'in',link:'F1',pending:30},{kind:'in',pid:1,pending:20},{kind:'in',pid:2,pending:999}]},planHitos:()=>[],pendienteCobro:e=>e.pending,fmt:String,quoteInvoice:q=>q.converted});
 assert.equal(c.projectPendingQuotes({id:1}).length,1);assert.match(c.projectOverview({id:1,num:'PR1',tasks:[]}),/<strong>50<\/strong>/);
});
test('stored filters reject malformed values and remain scoped to study and user',()=>{
 let stored='[]';const c=context({ESTUDIO_ID:'study',state:{sessionUser:{id:'user'},brandFilter:'cm'},localStorage:{getItem:()=>stored}});
 assert.equal(c.projectFilterKey(),'moderno-project-filters-study-user-cm');assert.equal(Object.keys(c.projectFilters()).length,0);
 stored='{"person":"Ana","attention":true,"client":{},"unknown":"x"}';assert.deepEqual(JSON.parse(JSON.stringify(c.projectFilters())),{person:'Ana',attention:true});
});
test('history escapes names and contents before rendering',()=>{
 let out='';const c=context({state:{projects:[{id:1,num:'<img>',comments:[{cid:'project-change-a',who:'<script>',txt:'<img onerror=x>',ts:1}]}]},modal:x=>out=x});c.projectHistory(1);
 assert.doesNotMatch(out,/<img|<script>/);assert.match(out,/&lt;img/);
});
test('concurrent first journal additions merge without losing either person or independent edit',()=>{
 const base=[{id:1,name:'A',status:'En progreso'}],a=structuredClone(base),b=structuredClone(base);
 a[0].name='B';a[0].comments=[{cid:'project-change-a',txt:'Name'}];b[0].status='Entregado';b[0].comments=[{cid:'project-change-b',txt:'Status'}];
 const merged=sync.mergeSavedData(base,a,b);assert.equal(merged[0].name,'B');assert.equal(merged[0].status,'Entregado');assert.equal(merged[0].comments.length,2);
 const next=structuredClone(merged),other=structuredClone(merged);next[0].comments.push({cid:'project-change-c'});other[0].comments.push({cid:'project-change-d'});assert.equal(sync.mergeSavedData(merged,next,other)[0].comments.length,4);
});
test('conflicting journal changes still require resolution',()=>{
 const base={comments:[{cid:'project-change-a',txt:'A'}]};assert.throws(()=>sync.mergeSavedData(base,{comments:[{cid:'project-change-a',txt:'B'}]},{comments:[{cid:'project-change-a',txt:'C'}]}),/Conflicto/);
});
test('remote journal absorption is idempotent and preserves local records',()=>{
 const c={};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function absorbComments('),html.indexOf('function mergeDocs(')),c);
 const local=[{id:1,comments:[{cid:'project-change-a',ts:2}]}],remote=[{id:1,comments:[{cid:'project-change-b',ts:1}]}];assert.equal(c.absorbComments(local,remote),1);assert.equal(c.absorbComments(local,remote),0);assert.equal(local[0].comments.length,2);
});
