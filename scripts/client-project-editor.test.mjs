import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/client-portal-site.js',import.meta.url),'utf8');
function context(){const c=vm.createContext({});vm.runInContext(source+';globalThis.portal=ClientPortalSite;',c);return c;}
test('client editor omits descriptions and uses shopping mosaics with the existing modes',()=>{
 const c=context();c.cliModeOf=r=>r.cliMode||'ver';c.fileImageAttrs=()=>'';const project={id:1,rooms:[{id:"r'1",name:'<Salón>',sections:[{items:[{img:'fake'}]}],cliMode:'coment'}],files:[]};const before=JSON.stringify(project);
 const html=c.portal.roomSharingEditor(project);assert.match(html,/dl-grid/);assert.match(html,/dl-mosaic/);assert.match(html,/&lt;Salón&gt;/);for(const title of ['Oculta','Solo ver','Puede comentar','Aprobar / rechazar'])assert.ok(html.includes(title));assert.equal(JSON.stringify(project),before);
 assert.doesNotMatch(c.portal.linksEditor(project),/Aparecerán en Documentos/);assert.doesNotMatch(c.portal.coverEditor(project),/Una imagen para recibir/);
});
test('document cards have inline sharing selectors and preserve original indices and flags',()=>{
 const c=context();vm.runInContext(fs.readFileSync(new URL('../app/project-documents.js',import.meta.url),'utf8'),c);
 const project={id:4,notes:'Keep',files:[{name:'Cover',docKind:'portal-cover',data:'fake',cli:true},{name:'Link',docKind:'portal-link',url:'fake',cli:true},{name:'<Plano>.pdf',data:'fake',cli:false},'Legacy.pdf',{name:'Acta.txt',body:'text',cli:true}]};c.fileOk=f=>typeof f==='object'&&!!(f.data||f.url||f.body);c.fileCli=f=>typeof f==='string'||f.cli!==false;
 const before=JSON.stringify(project),editor=c.portal.sharedDocumentsEditor(project);assert.match(editor,/project-files-grid/);assert.match(editor,/data-index="2"/);assert.match(editor,/Compartir &lt;Plano&gt;.pdf/);assert.match(editor,/Acta.txt/);assert.match(editor,/disabled/);assert.doesNotMatch(editor,/>Cover<|>Link<|Ver y anotar|trashFile|Seleccionar documentos/);assert.equal(JSON.stringify(project),before);
});
test('room mode action changes only the chosen room using the existing persistence flow',()=>{
 const c=context(),project={id:9,notes:'Keep',rooms:[{id:'a',cliMode:'ver',sections:[]},{id:'b',cliMode:'off',sections:[]}],files:[]};c.state={projects:[project]};let saved=0,flushed=0;c.persistSoon=()=>saved++;c.cloudFlush=()=>flushed++;c.window={render(){}};
 c.portal.setRoomMode(9,'a','aprob');assert.equal(project.rooms[0].cliMode,'aprob');assert.equal(project.rooms[1].cliMode,'off');assert.equal(project.notes,'Keep');assert.equal(saved,1);assert.equal(flushed,1);c.portal.setRoomMode(9,'a','invalid');assert.equal(saved,1);
});
test('removed project blocks do not delete notes, messages or accounting functions',()=>{
 const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/<h2 class="sec">Notas del proyecto|Vinculado a Contabilidad\.|El cliente nunca ve costes internos|<h2 class="sec">Respuestas del cliente|id="pj-chat"/);
 assert.match(html,/function sendChat\(pid\)/);assert.match(html,/function cliChatSend\(pid\)/);assert.match(html,/hitoInvoiceDraft\(\$\{p.id\}/);assert.match(html,/ClientPortalSite.sharedDocumentsEditor\(p\)/);
 const start=html.indexOf('${tb!=="cliente"'),end=html.indexOf('${tb!=="fin"',start),editor=html.slice(start,end);assert.doesNotMatch(editor,/max-width:820px|cChatIn|Por cada lista|Conversaci/);assert.match(editor,/client-project-editor/);assert.ok(editor.indexOf('ClientPortalSite.coverEditor(p)')<editor.indexOf('cliLink(p)'));
});
