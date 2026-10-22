import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
test('collaborator can delete a product through the same guarded editItems operation',()=>{
 const p={rooms:[]},r={sections:[{items:[{id:'fixture',name:'Ficticio'}]}]};let edits=0,renders=0;
 const context={_accessRole:'colaborador',getRoom:()=>({p,r}),ModernoSpec:{editItems:(project,room,si,ii,op)=>{assert.equal(project,p);assert.equal(room,r);assert.equal(op,'remove');edits++;}},render:()=>renders++,toast:message=>assert.fail(message)};
 vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function delItem('),html.indexOf('let itFiles=')),context);
 assert.equal(context.delItem(0,0),true);assert.equal(edits,1);assert.equal(renders,1);
});
test('both project delete entry points refuse collaborator before changing state or opening confirmation',()=>{
 const state={projects:[{id:1}],trash:[]};const messages=[];
 const context={_accessRole:'colaborador',state,toast:m=>messages.push(m),askConfirm:()=>assert.fail('confirmation must not open')};
 vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function deleteProject('),html.indexOf('function trashFile(')),context);
 const before=JSON.stringify(state);context.deleteProject(1);context.deleteProjectGo(1);
 assert.equal(JSON.stringify(state),before);assert.equal(messages.length,2);assert.ok(messages.every(m=>m.includes('administrador')));
});
