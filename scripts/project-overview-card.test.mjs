import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function fixture(){const c={ModernoDaily:{escape:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},ModernoRouter:{path:({project})=>'/es/proyecto/'+project},projectClientAvatar:()=>'',ico:()=>'',projectFolderNotifications:()=>''};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../app/project-insights.js',import.meta.url),'utf8'),c);c.projectFolderNotifications=()=>'';vm.runInContext(html.slice(html.indexOf('function projectOverviewCard('),html.indexOf('function projectFolio(')),c);return c;}
test('overview cards reuse task progress, preserve project records and escape labels',()=>{const c=fixture(),p={id:4,num:'PR-4',name:'Proyecto <ficticio>',client:'Cliente "ficticio"',status:'En progreso',tasks:[{col:'listo'},{col:'listo'},{col:'rev'}]};const before=JSON.stringify(p),out=c.projectOverviewCard(p);assert.match(out,/--project-progress:67%/);assert.match(out,/67% completado; 2 de 3 tareas completadas/);assert.match(out,/2\/3 tareas/);assert.match(out,/href="\/es\/proyecto\/4"/);assert.match(out,/Proyecto &lt;ficticio>/);assert.match(out,/Cliente &quot;ficticio&quot;/);assert.equal(JSON.stringify(p),before);});
test('overview cards distinguish no tasks, zero progress and completion',()=>{const c=fixture();const empty=c.projectOverviewCard({id:1,name:'Vacío',tasks:[]});assert.doesNotMatch(empty,/Sin tareas|project-card-reference-progress/);assert.doesNotMatch(empty,/project-card-client|Sin cliente asignado/);for(const [tasks,percent] of [[[{col:'pend'}],0],[[{col:'listo'}],100]])assert.match(c.projectOverviewCard({id:2,name:'Prueba',tasks}),new RegExp('--project-progress:'+percent+'%'));});

test('reference card uses only genuine project fields and dated tasks, never fabricated priority',()=>{
 const c=fixture(),p={id:15,num:'PR-15',name:'Reforma ficticia',client:'Cliente real del fixture',status:'En progreso',tasks:[{col:'listo'},{col:'pend',due:'2040-01-02'}]};
 const before=JSON.stringify(p),out=c.projectOverviewCard(p);
 assert.match(out,/project-card-reference-head/);
 assert.match(out,/project-card-folder-symbol/);
 assert.match(out,/data-tone="active"/);
 assert.match(out,/En progreso/);
 assert.match(out,/Próxima tarea: 02\/01\/2040/);
 assert.match(out,/project-card-reference-ring/);
 assert.match(out,/1\/2 tareas/);
 assert.match(out,/--project-progress:50%/);
 assert.doesNotMatch(out,/High|Medium|Prioridad|Fecha inventada|foto de stock/);
 assert.doesNotMatch(out,/<img|project-card-cover/);
 assert.equal(JSON.stringify(p),before);
 const absent=c.projectOverviewCard({id:17,name:'Sin fecha ni tareas',tasks:[]});
 assert.doesNotMatch(absent,/Próxima tarea:|project-card-reference-ring|project-card-reference-task-count/);
 assert.match(absent,/project-card-reference-head/);
});
