import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const code=await readFile(new URL('../app/page-breadcrumbs.js',import.meta.url),'utf8');
test('a route UI failure restores the original sidebar so all five Finance pages remain reachable',()=>{
 let desktop=true;
 const calls=[];
 const context=vm.createContext({
  window:{matchMedia:()=>({matches:true,addEventListener(){}})},
  document:{body:{classList:{contains:()=>desktop}},
   querySelector:selector=>selector.startsWith('aside.sidebar')?{textContent:'Inicio'}:null,
   createElement(){throw Error('Synthetic presentation failure');}},
  state:{view:'home'},_accessLoading:false,_accessRole:'admin',canView:()=>true,
  ModernoDesktopShell:{setEnabled(value){desktop=value;calls.push(['desktop',value]);}},
  console:{warn(){calls.push(['warning']);}},
  render(...args){calls.push(['render',...args]);return 'native-render';}
 });
 vm.runInContext(code,context);
 assert.equal(desktop,false);
 assert.deepEqual(calls,[['desktop',false],['warning']]);
 assert.equal(vm.runInContext('render("draft",42)',context),'native-render');
 assert.deepEqual(calls.at(-1),['render','draft',42]);
});
