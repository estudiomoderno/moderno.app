import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function cloudKeepPendingCopy(){'),html.indexOf('function cloudPendingNotice(){'));
function fixture(failure){
 const values=new Map([['test_dirty','1'],['test','{"synthetic":true}']]);
 const c={_resumed:true,LS_KEY:'test',Date,localStorage:{getItem:k=>failure==='readback'&&k.includes('_pendiente_')?null:values.get(k),setItem(k,v){if(failure==='quota')throw Error('quota');values.set(k,v)},removeItem:k=>values.delete(k)}};
 vm.createContext(c);vm.runInContext(code,c);return {values,c};
}
test('pending copy is verified before clearing dirty flag',()=>{const {c,values}=fixture();c.cloudKeepPendingCopy();assert.equal(values.has('test_dirty'),false);assert.equal(values.get('test'),'{"synthetic":true}');assert.equal([...values].find(([k])=>k.includes('_pendiente_'))[1],values.get('test'));});
for(const failure of ['quota','readback'])test(`${failure} preserves original and pending flag`,()=>{const {c,values}=fixture(failure);assert.throws(()=>c.cloudKeepPendingCopy());assert.equal(values.get('test_dirty'),'1');assert.equal(values.get('test'),'{"synthetic":true}');});
test('missing local snapshot does not silently clear dirty flag',()=>{const {c,values}=fixture();values.delete('test');assert.throws(()=>c.cloudKeepPendingCopy());assert.equal(values.get('test_dirty'),'1');});
