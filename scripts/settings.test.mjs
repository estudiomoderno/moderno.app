import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url),C=require('../app/settings-core.js');
test('settings patch preserves concurrent fields and legacy fiscal values',()=>{
 const original={country:'España',vat:0,irpf:'',name:'Original',unknown:{keep:true}};
 const concurrent={...original,unknown:{keep:true,new:true}};
 assert.deepEqual(C.patch(concurrent,original,{...original,name:'Nuevo'}),{...concurrent,name:'Nuevo'});
 assert.deepEqual(original,{country:'España',vat:0,irpf:'',name:'Original',unknown:{keep:true}});
});
test('settings rejects conflicting changes without modifying current',()=>{
 const current={name:'Otra persona',vat:21};
 assert.throws(()=>C.patch(current,{name:'Antes',vat:21},{name:'Mi edición',vat:21}),/Otra persona/);
 assert.deepEqual(current,{name:'Otra persona',vat:21});
});
test('settings retry accepts already applied values',()=>assert.deepEqual(C.patch({name:'Nuevo'},{name:'Antes'},{name:'Nuevo'}),{name:'Nuevo'}));
test('settings validates decimal percentages and series',()=>{
 assert.equal(C.percent('0'),0);assert.equal(C.percent('7.5'),7.5);
 for(const v of ['',NaN,Infinity,-1,101])assert.throws(()=>C.percent(v));
 assert.equal(C.series(' fc26 '),'FC26');for(const v of ['','FC-1','ABCDEFG','<img>'])assert.throws(()=>C.series(v));
});
test('settings and inline application scripts parse',()=>{
 for(const file of ['settings-ui.js','settings-icons.js','settings-core.js'])new vm.Script(fs.readFileSync(new URL('../app/'+file,import.meta.url),'utf8'));
 const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
 for(const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
