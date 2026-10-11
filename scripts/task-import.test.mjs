import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const section=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function fixture(){
 const original=[{id:10,title:'Revisión de planos',type:'Diseño',col:'listo',done:true,subs:[{txt:'Comprobar medidas',done:true}],deps:[],assignee:'Persona ficticia',assignees:['Persona ficticia'],comments:[{txt:'Ejemplo'}],due:'2030-01-01'},{id:11,title:'Preparar compra',type:'Compras',col:'progreso',deps:[10],subs:[]}];
 const fields={tiP:{value:'2'},tiQ:{value:''},tiProjectQ:{value:''},tiSource:{},tiProjects:{},tiList:{},tiN:{},tiAdd:{style:{}}};
 const c={state:{projects:[{id:1,tasks:[]},{id:2,num:'PR-02',name:'Proyecto de prueba',client:'Cliente ficticio',tasks:original},{id:3,num:'PR-03',name:'Otro proyecto',tasks:[{id:30,title:'Otra tarea'}]}],_tiSel:{}},document:{getElementById:id=>fields[id]},mb:{querySelector:()=>({dataset:{target:'1'}})},ModernoDaily:{escape:v=>String(v??'').replaceAll('<','&lt;').replaceAll('>','&gt;')},projectChangeStart(){},projectChangeEnd(){},persistSoon(){},closeModal(){},render(){},toast(){}};
 vm.createContext(c);vm.runInContext(section('function ensureTaskIds(','function taskById(')+section('function cloneTasksWithDeps(','/* Salir de Pendientes')+section('function taskImportModal(','function tkToggleDep('),c);
 return {c,fields,original};
}
test('imported completed tasks become pending and dependencies point to new copies',()=>{
 const {c,original}=fixture(),before=JSON.stringify(original);c.state._tiSel={10:1,11:1};c.taskImportRun(1);
 const imported=c.state.projects[0].tasks;assert.equal(imported.length,2);
 for(const t of imported){assert.equal(t.col,'pend');assert.equal(t.done,false);assert.equal(t.due,'');assert.equal(t.assignee,'');assert.equal(t.assignees.length,0);assert.equal(t.comments.length,0);assert.ok(!original.some(x=>x.id===t.id));}
 assert.equal(imported[0].subs[0].done,false);assert.equal(imported[1].deps[0],imported[0].id);assert.equal(JSON.stringify(original),before);
});
test('search ignores accents and retains selection when filtering tasks',()=>{
 const {c,fields}=fixture();c.state._tiSel={11:1};fields.tiQ.value='revision';c.taskImportDraw();assert.match(fields.tiList.innerHTML,/Revisión de planos/);assert.doesNotMatch(fields.tiList.innerHTML,/Preparar compra/);assert.equal(c.state._tiSel[11],1);
 fields.tiQ.value='no existe';c.taskImportDraw();assert.match(fields.tiList.innerHTML,/Sin tareas que coincidan/);assert.equal(c.state._tiSel[11],1);
});
test('Todas selects search results and Ninguna clears the full selection',()=>{
 const {c,fields}=fixture();fields.tiQ.value='planos';c.taskImportAll(true);assert.deepEqual(Object.keys(c.state._tiSel),['10']);c.taskImportAll(false);assert.equal(Object.keys(c.state._tiSel).length,0);
});
test('changing source clears selections so task IDs cannot leak between projects',()=>{
 const {c,fields}=fixture();c.state._tiSel={10:1};fields.tiQ.value='planos';c.taskImportSource(3);assert.equal(fields.tiP.value,3);assert.equal(fields.tiQ.value,'');assert.equal(Object.keys(c.state._tiSel).length,0);assert.equal(fields.tiSource.textContent,'PR-03 Otro proyecto');assert.match(fields.tiList.innerHTML,/Otra tarea/);
});
test('project search filters by name, number or client and excludes the destination',()=>{
 const {c,fields}=fixture();c.taskImportProjects('ficticio');assert.match(fields.tiProjects.innerHTML,/PR-02/);assert.doesNotMatch(fields.tiProjects.innerHTML,/PR-03/);c.taskImportProjects('PR-03');assert.match(fields.tiProjects.innerHTML,/Otro proyecto/);
});
test('import label stays fixed across selection counts and is disabled when empty',()=>{
 const {c,fields}=fixture();c.taskImportCount();assert.equal(fields.tiAdd.textContent,'Importar');assert.equal(fields.tiAdd.disabled,true);c.taskImportToggle(10,{checked:true});assert.equal(fields.tiAdd.textContent,'Importar');assert.equal(fields.tiAdd.disabled,false);c.taskImportToggle(11,{checked:true});assert.equal(fields.tiAdd.textContent,'Importar');assert.equal(fields.tiN.textContent,'2 seleccionadas');
});
