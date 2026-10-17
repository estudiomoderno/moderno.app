import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../app/desktop-shell.js',import.meta.url),'utf8');
function fixture(){
 const events={},calls=[];
 const context=vm.createContext({
  window:{matchMedia:()=>({matches:true,addEventListener:(k,fn)=>events[k]=fn})},
  document:{addEventListener(){},querySelector(){throw Error('No DOM changes allowed before recovery verification');},body:{classList:{remove(){calls.push('restore');}}}},
  state:{view:'home'},_accessLoading:true,_accessRole:'admin',console:{warn(){calls.push('warning');}},render:function(...args){calls.push(args);return 'original-render';}
 });
 vm.runInContext(code,context);return {context,calls,events};
}
test('loading stays inactive and explicit rollback preserves the render contract',()=>{
 const {context,calls,events}=fixture();
 assert.deepEqual(calls,[]);
 vm.runInContext('ModernoDesktopShell.setEnabled(false);_accessLoading=false;',context);
 assert.equal(vm.runInContext('render("draft",42)',context),'original-render');
 assert.deepEqual(calls,[['draft',42]]);
 events.change();assert.equal(calls.length,1);
});
test('presentation failure restores the old interface without breaking the original render',()=>{
 const {context,calls}=fixture();
 vm.runInContext('_accessLoading=false;ModernoDesktopShell.setEnabled(true)',context);
 assert.deepEqual(calls,['restore','warning']);
 assert.equal(vm.runInContext('render()',context),'original-render');
 assert.deepEqual(calls,['restore','warning',[]]);
});
