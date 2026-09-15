import test from 'node:test';
import assert from 'node:assert/strict';
import origin from '../app/library-origin.js';
import fs from 'node:fs';
import vm from 'node:vm';
const record=()=>({id:'product',brandId:'brand',revision:1,status:'published',rights:{display:true,saveToStudy:true},product:{name:'Producto sintético',sku:'S1',price:30,files:[{private:true}],studyId:'other'}});
test('legacy and forged public metadata remain private without rewriting records',()=>{
 for(const item of [{id:1},{id:2,visibility:'public'},{id:3,libraryOrigin:{kind:'brand',brandId:'b',productId:'p',revision:1}}]){
  const before=JSON.stringify(item);assert.equal(origin.metadata(item).visibility,'study');assert.equal(origin.metadata(item).rights.publish,false);assert.equal(JSON.stringify(item),before);
 }
});
test('only published authorized revisions qualify, save rights are separate',()=>{
 for(const patch of [{status:'draft'},{status:'withdrawn'},{rights:{}},{revision:0},{brandId:''}])assert.equal(origin.published({...record(),...patch}),false);
 const r=record();r.rights.saveToStudy=false;assert.equal(origin.published(r),true);assert.throws(()=>origin.copyPublished(r,'copy'));
});
test('private copies and project snapshots stay independent of later brand revisions',()=>{
 const master=record(),copy=origin.copyPublished(master,'local',{price:44,notes:'Privado',supplier:'Proveedor propio'});
 assert.equal(copy.price,44);assert.equal(copy.files,undefined);assert.equal(copy.studyId,undefined);
 assert.equal(master.product.price,30);assert.equal(master.product.notes,undefined);
 const c={crypto:{randomUUID:()=> 'snapshot'}};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../app/specifications.js',import.meta.url),'utf8'),c);
 const snapshot=c.ModernoSpec.fromProduct(copy);const before=JSON.stringify(snapshot);
 master.revision=2;master.product.name='Otro nombre';copy.notes='Nueva nota';copy.price=99;
 assert.equal(copy.libraryOrigin.revision,1);assert.equal(copy.name,'Producto sintético');assert.equal(JSON.stringify(snapshot),before);
 assert.equal(origin.copyPublished(record(),'second').price,null);
});
