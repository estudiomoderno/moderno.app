import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../app/project-workspace.js',import.meta.url),'utf8');
function fixture({role='admin',loading=false,matches=true,allow=true,overlay=false,welcome=false,view='home'}={}){
 const calls=[],events={},projects=Object.freeze([Object.freeze({id:1,brand:'a',num:'PR-1',name:'Ficticio'}),Object.freeze({id:2,brand:'b',name:'Otro espacio'}),Object.freeze({id:3,brand:'a',tpl:true})]);
 const context=vm.createContext({
  window:{matchMedia:()=>({matches,addEventListener:(key,fn)=>events[key]=fn})},
  document:{addEventListener(){},querySelector(selector){if(selector==='.overlay.open,dialog[open]'&&overlay||selector==='#cliWelTa'&&welcome)return {};return null;},createElement(){throw Error('Synthetic missing DOM');},body:{classList:{contains:()=>true,remove(){},add(){}}}},
  state:{view,sessionUser:{id:'fictional'},myRole:'admin',brandFilter:'a',projects,projTab:'planos',_welEdit:welcome},
  _accessRole:role,_accessLoading:loading,ESTUDIO_ID:'fictional-study',canView:()=>allow,byBrand:items=>items.filter(p=>p.brand==='a'),projectTabKey:x=>x,
  toast:message=>calls.push(['toast',message]),console:{warn:()=>calls.push(['warning'])},ModernoDesktopShell:{setEnabled(value){calls.push(['shell',value]);return 'shell-result';}},
  go:(...args)=>calls.push(['go',...args]),render:(...args)=>{calls.push(['render',...args]);return 'original-result';},
  persistSoon(){throw Error('Navigation must not persist project data');}
 });vm.runInContext(source,context);return {context,calls,events};
}
test('project windows never grant access to excluded roles, denied views or a loading session',()=>{
 for(const options of [{role:'cliente'},{role:'contratista'},{role:'gestoria'},{role:null},{role:'unknown'},{allow:false},{loading:true},{matches:false}]){
  const {context,calls}=fixture(options);assert.equal(context.ModernoProjectWorkspace.active(),false);assert.equal(context.ModernoProjectWorkspace.open(1),false);assert.equal(context.ModernoProjectWorkspace.close(1),false);assert.deepEqual(calls,[]);
 }
});
test('the picker scope never opens a missing project, another space or a template',()=>{
 const {context,calls}=fixture(),before=JSON.stringify(context.state.projects);
 for(const id of [2,3,999,'<script>'])assert.equal(context.ModernoProjectWorkspace.open(id),false);
 assert.equal(JSON.stringify(context.state.projects),before);assert.deepEqual(calls,[]);
});
test('open forms, native dialogs and inline welcome drafts block switching without discarding records',()=>{
 for(const options of [{overlay:true},{welcome:true}]){const {context,calls}=fixture(options),before=JSON.stringify(context.state);assert.equal(context.ModernoProjectWorkspace.open(1),false);assert.equal(JSON.stringify(context.state),before);assert.equal(calls.length,1);assert.equal(calls[0][0],'toast');}
});
test('cancelled original navigation cannot be treated as a successful project switch',()=>{
 const {context,calls}=fixture();assert.equal(context.ModernoProjectWorkspace.open(1),false);assert.equal(context.state.view,'home');assert.deepEqual(calls,[['go','proyecto',1]]);
});
test('rollback and presentation failure preserve the original render and navigation contracts',()=>{
 const {context,calls,events}=fixture();context.ModernoProjectWorkspace.setEnabled(false);assert.equal(context.render('draft',42),'original-result');assert.deepEqual(calls,[['render','draft',42]]);assert.equal(context.ModernoDesktopShell.setEnabled(false),'shell-result');
 context.state.view='proyecto';context.state.currentProject=1;context.ModernoProjectWorkspace.setEnabled(true);assert.equal(context.ModernoProjectWorkspace.active(),false);assert.equal(calls.at(-1)[0],'warning');events.change();assert.equal(context.render(),'original-result');assert.equal(calls.at(-1)[0],'render');
});
