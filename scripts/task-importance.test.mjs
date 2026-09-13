import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
function edit(checked,role='admin'){
 const original={id:7,title:'Tarea ficticia',col:'pend',due:'2026-09-13',type:'Diseño',amount:80,acc:false,files:[{id:4,name:'Plano ficticio'}],comments:[{cid:'1',txt:'Conservar'}],deps:[],subs:[{txt:'Subtarea',done:false}],assignees:['Ana']};
 const c={state:{projects:[{id:1,tasks:[structuredClone(original)]}],entries:[]},tk:{...structuredClone(original)},_accessRole:role,document:{getElementById:id=>({value:({tkTitle:original.title,tkAmt:80,tkDue:original.due})[id],checked,classList:{contains:()=>false}}),querySelector:s=>({dataset:{v:s.includes('tkCol')?'pend':'Diseño'}})},tkSyncSubs(){},taskAssignees:t=>t.assignees,tkMergeComments:(_old,n)=>n,depWouldCycle:()=>false,taskDateConflicts:()=>[],taskDone:()=>false,closeModal(){},render(){},toast(){}};
 vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function saveTask('),html.indexOf('function delTask(')),c);c.saveTask(1,0);return {original,result:c.state.projects[0].tasks[0]};
}
test('real saveTask sets and clears importance while preserving task attachments and content',()=>{
 for(const flag of [true,false]){const {original,result}=edit(flag);assert.equal(result.important,flag);for(const k of ['id','title','col','due','type','files','comments','subs','deps','amount'])assert.deepEqual(JSON.parse(JSON.stringify(result[k])),original[k],k);}
});
test('collaborator saveTask sends importance but not private finance fields',()=>{const {result}=edit(true,'colaborador');assert.equal(result.important,true);assert.ok(!('amount' in result));assert.ok(!('acc' in result));assert.equal(result.files[0].id,4);});
