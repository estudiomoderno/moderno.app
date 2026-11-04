import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function fixture(){const c={ModernoDaily:{escape:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')},ModernoRouter:{path:({project})=>'/es/proyecto/'+project},projectClientAvatar:()=>'',ico:()=>'',projectFolderNotifications:()=>''};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../app/project-insights.js',import.meta.url),'utf8'),c);c.projectFolderNotifications=()=>'';vm.runInContext(html.slice(html.indexOf('function projectOverviewCard('),html.indexOf('function projectFolio(')),c);return c;}
test('overview cards reuse task progress, preserve project records and escape labels',()=>{const c=fixture(),p={id:4,num:'PR-4',name:'Proyecto <ficticio>',client:'Cliente "ficticio"',status:'En progreso',tasks:[{col:'listo'},{col:'listo'},{col:'rev'}]};const before=JSON.stringify(p),out=c.projectOverviewCard(p);assert.match(out,/67 %<span/);assert.match(out,/2 de 3 tareas completadas/);assert.match(out,/value="67"/);assert.match(out,/href="\/es\/proyecto\/4"/);assert.match(out,/Proyecto &lt;ficticio>/);assert.match(out,/Cliente &quot;ficticio&quot;/);assert.equal(JSON.stringify(p),before);});
test('overview cards distinguish no tasks, zero progress and completion',()=>{const c=fixture();const empty=c.projectOverviewCard({id:1,name:'Vacío',tasks:[]});assert.doesNotMatch(empty,/Sin tareas/);assert.doesNotMatch(empty,/<progress/);assert.doesNotMatch(empty,/project-card-client|Sin cliente asignado/);for(const [tasks,percent] of [[[{col:'pend'}],0],[[{col:'listo'}],100]])assert.match(c.projectOverviewCard({id:2,name:'Prueba',tasks}),new RegExp('value="'+percent+'"'));});

test('covers use explicit existing selection only, reject arbitrary origins and leave records unchanged',()=>{
 const c=fixture();c.URL=URL;c.SUPABASE_URL='https://fixture.supabase.co';c.ESTUDIO_ID='11111111-1111-1111-1111-111111111111';
 vm.runInContext(fs.readFileSync(new URL('../app/private-files.js',import.meta.url),'utf8'),c);
 c.ClientPortalSite={cover:p=>(p.files||[]).find(f=>f.docKind==='portal-cover'&&f.cli!==false),coverPosition:()=>({x:40,y:60})};
 c.fileImageAttrs=source=>'data-private-file="'+source+'"';
 const base={id:1,name:'Casa Clara',files:[]};
 for(const f of [{type:'image/png',url:'https://stock.example/image.png'}, {docKind:'portal-cover',cli:false,type:'image/png',url:'data:image/png;base64,AA=='}, {docKind:'portal-cover',type:'image/png',url:'https://stock.example/image.png'}, {docKind:'portal-cover',type:'image/png',url:'storage://archivos/22222222-2222-2222-2222-222222222222/cover.png'}, {docKind:'portal-cover',type:'image/svg+xml',url:'data:image/svg+xml;base64,AA=='}]){
  const p={...base,files:[f]},before=JSON.stringify(p);assert.doesNotMatch(c.projectOverviewCard(p),/<img/);assert.equal(JSON.stringify(p),before);
 }
 for(const source of ['storage://archivos/'+c.ESTUDIO_ID+'/cover.png','data:image/png;base64,AA==']){
  const p={...base,files:[{docKind:'portal-cover',type:'image/png',url:source}]},before=JSON.stringify(p),out=c.projectOverviewCard(p);
  assert.match(out,/<img/);assert.match(out,/loading="lazy"/);assert.match(out,/object-position:40% 60%/);assert.equal(JSON.stringify(p),before);
 }
 assert.match(c.projectOverviewCard(base),/project-card-monogram">CC/);
});
