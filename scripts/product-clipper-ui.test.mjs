import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/product-clipper.js',import.meta.url),'utf8').replace('return {open};','return {open,save,read,activate:c=>active=c};')+';globalThis.clipper=ProductClipper;';
function setup({kind='biblioteca',missing='',rpcError=false,readError=false,localConflict=false}={}){
 const id='capture-1',item={id:'item-1',captureId:id,name:'Mesa',cat:'Mobiliario'},dest=kind==='biblioteca'?{kind}:{kind,projectId:'1',roomId:'2',sectionId:'3'};
 const state={sessionUser:{id:'user'},library:[],projects:[{id:1,rooms:[{id:2,sections:[{id:3,items:[]}]}]}]},block=kind==='biblioteca'?'compras':'proyectos';
 const server=kind==='biblioteca'?[item]:[{id:1,rooms:[{id:2,sections:[{id:3,items:[item]}]}]}];
 const nodes={},messages=[{textContent:''},{textContent:''}];let closed=false,calls=0,removed=false,focus=null,confirmed=false,failRead=readError;
 for(const [selector,value] of Object.entries({'#clip-name':'Mesa','#clip-category':'Mobiliario','#clip-unit':'ud','#clip-confirm':'yes','[data-save]':''}))nodes[selector]={value:selector===missing?'':value,checked:selector===missing?false:true,setAttribute(k,v){this[k]=v;},focus(){focus=selector;},scrollIntoView(){},disabled:false};
 const dialog={isConnected:true,querySelector:s=>nodes[s]||null,querySelectorAll:()=>messages,close(){closed=true;this.isConnected=false;}};
 const ctx={dialog,owner:'study|user',study:'study',id,row:{destino:dest},busy:false};
 const CLOUD_BLOCKS={compras:{get:()=>state.library},proyectos:{get:()=>state.projects}};
 const c={state,ESTUDIO_ID:'study',_accessRole:'admin',CLOUD_BLOCKS,_cloudBusy:false,_cloudHash:{[block]:JSON.stringify(CLOUD_BLOCKS[block].get())},canon:JSON.stringify,
  cloudFlush:async()=>{},cloudReadBlock:async()=>failRead?{error:Error('Sin conexión al consultar')}:{data:{contenido:server,updated_at:'version'}},
  cloudApplyRemote(){if(!localConflict){if(kind==='biblioteca')state.library=server;else state.projects=server;}},persistNow(){confirmed=true;},closeModal(){},render(){},toast(){},
  localStorage:{removeItem(){removed=true;},getItem:()=>id},sb:{rpc:async()=>{calls++;return rpcError?{error:{message:'Guardado denegado'}}:{data:{status:calls===1?'absorbed':'already_absorbed',itemId:item.id}};},functions:{invoke:async()=>({data:{estado:'absorbido',item_id:item.id,destino:dest}})}}};
 vm.createContext(c);vm.runInContext(source,c);c.clipper.activate(ctx);
 return {c,ctx,nodes,messages,state,save:()=>c.clipper.save(ctx),read:()=>c.clipper.read(ctx),recover:()=>failRead=false,status:()=>({closed,calls,removed,focus,confirmed})};
}
test('missing category and unit focus the exact field and show the error beside Save',async()=>{
 for(const missing of ['#clip-category','#clip-unit','#clip-name','#clip-confirm']){const f=setup({missing});await f.save();assert.equal(f.status().calls,0);assert.equal(f.status().focus,missing);assert.equal(f.nodes[missing]['aria-invalid'],'true');assert.ok(f.messages[1].textContent);assert.equal(f.status().closed,false);}
});
test('successful save confirms server and local destination before closing and clears hidden library filters',async()=>{const f=setup();f.state.libQ='not matching';f.state.libF={cat:'Other',min:'500'};await f.save();assert.deepEqual(f.status(),{closed:true,calls:1,removed:true,focus:null,confirmed:true});assert.equal(f.state.libQ,'');assert.equal(f.state.libF.min,'');assert.equal(f.state.libF.cat,'Mobiliario');assert.equal(f.state.library.length,1);});
test('list save resolves numeric application IDs without changing the destination',async()=>{const f=setup({kind:'lista'});await f.save();assert.equal(f.status().closed,true);assert.equal(f.state.currentProject,1);assert.equal(f.state.currentRoom,2);assert.equal(f.state.view,'estancia');});
test('RPC error preserves capture and editable review',async()=>{const f=setup({rpcError:true});await f.save();assert.equal(f.status().removed,false);assert.equal(f.status().closed,false);assert.equal(f.nodes['[data-save]'].disabled,false);assert.equal(f.nodes['#clip-name'].value,'Mesa');assert.match(f.messages[1].textContent,/denegado/);});
test('lost refresh does not claim success and recovered capture opens existing item without a second absorption',async()=>{const f=setup({readError:true});await f.save();assert.equal(f.status().calls,1);assert.equal(f.status().closed,false);assert.equal(f.status().removed,false);f.recover();await f.read();assert.equal(f.status().calls,1);assert.equal(f.status().closed,true);assert.equal(f.state.library.length,1);});
test('local conflicting edits cannot be overwritten or silently treated as a displayed product',async()=>{const f=setup({localConflict:true});await f.save();assert.equal(f.status().closed,false);assert.equal(f.status().removed,false);assert.equal(f.state.library.length,0);assert.match(f.messages[1].textContent,/cambios locales pendientes/);});
