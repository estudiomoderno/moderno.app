import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/product-clipper.js',import.meta.url),'utf8').replace('return {open};','return {open,save,read,capture,activate:c=>active=c};')+';globalThis.clipper=ProductClipper;';
function setup({kind='biblioteca',missing='',rpcError=false,readError=false,localConflict=false}={}){
 const id='capture-1',item={id:'item-1',captureId:id,name:'Mesa',cat:'Mobiliario'},dest=kind==='biblioteca'?{kind}:{kind,projectId:'1',roomId:'2',sectionId:'3'};
 const state={sessionUser:{id:'user'},library:[],projects:[{id:1,rooms:[{id:2,sections:[{id:3,items:[]}]}]}]},block=kind==='biblioteca'?'compras':'proyectos';
 const server=kind==='biblioteca'?[item]:[{id:1,rooms:[{id:2,sections:[{id:3,items:[item]}]}]}];
 const nodes={},messages=[{textContent:''},{textContent:''}];let closed=false,calls=0,removed=false,focus=null,confirmed=false,failRead=readError,lastRevision=null;
 for(const [selector,value] of Object.entries({'#clip-name':'Mesa','#clip-category':'Mobiliario','#clip-unit':'ud','#clip-confirm':'yes','[data-save]':''}))nodes[selector]={value:selector===missing?'':value,checked:selector===missing?false:true,setAttribute(k,v){this[k]=v;},focus(){focus=selector;},scrollIntoView(){},disabled:false};
 const dialog={isConnected:true,querySelector:s=>nodes[s]||null,querySelectorAll:()=>messages,close(){closed=true;this.isConnected=false;}};
 const ctx={dialog,owner:'study|user',study:'study',id,row:{destino:dest},busy:false};
 const CLOUD_BLOCKS={compras:{get:()=>state.library},proyectos:{get:()=>state.projects}};
 const c={state,ESTUDIO_ID:'study',_accessRole:'admin',CLOUD_BLOCKS,_cloudBusy:false,_cloudHash:{[block]:JSON.stringify(CLOUD_BLOCKS[block].get())},canon:JSON.stringify,
  cloudFlush:async()=>{},cloudReadBlock:async()=>failRead?{error:Error('Sin conexión al consultar')}:{data:{contenido:server,updated_at:'version'}},
  cloudApplyRemote(){if(!localConflict){if(kind==='biblioteca')state.library=server;else state.projects=server;}},persistNow(){confirmed=true;},closeModal(){},render(){},toast(){},
  localStorage:{removeItem(){removed=true;},getItem:()=>id},sb:{rpc:async(name,args)=>{lastRevision=args?.p_revision;calls++;return rpcError?{error:{message:'Guardado denegado'}}:{data:{status:calls===1?'absorbed':'already_absorbed',itemId:item.id}};},functions:{invoke:async()=>({data:{estado:'absorbido',item_id:item.id,destino:dest}})}}};
 vm.createContext(c);vm.runInContext(source,c);c.clipper.activate(ctx);
 return {c,ctx,nodes,messages,state,save:()=>c.clipper.save(ctx),read:()=>c.clipper.read(ctx),recover:()=>failRead=false,revision:()=>lastRevision,status:()=>({closed,calls,removed,focus,confirmed})};
}
test('missing category and unit focus the exact field and show the error beside Save',async()=>{
 for(const missing of ['#clip-category','#clip-unit','#clip-name']){const f=setup({missing});await f.save();assert.equal(f.status().calls,0);assert.equal(f.status().focus,missing);assert.equal(f.nodes[missing]['aria-invalid'],'true');assert.ok(f.messages[1].textContent);assert.equal(f.status().closed,false);}
});
test('successful save confirms server and local destination before closing and clears hidden library filters',async()=>{const f=setup();f.state.libQ='not matching';f.state.libF={cat:'Other',min:'500'};await f.save();assert.deepEqual(f.status(),{closed:true,calls:1,removed:true,focus:null,confirmed:true});assert.equal(f.state.libQ,'');assert.equal(f.state.libF.min,'');assert.equal(f.state.libF.cat,'Mobiliario');assert.equal(f.state.library.length,1);});
test('list save resolves numeric application IDs without changing the destination',async()=>{const f=setup({kind:'lista'});await f.save();assert.equal(f.status().closed,true);assert.equal(f.state.currentProject,1);assert.equal(f.state.currentRoom,2);assert.equal(f.state.view,'estancia');});
test('RPC error preserves capture and editable review',async()=>{const f=setup({rpcError:true});await f.save();assert.equal(f.status().removed,false);assert.equal(f.status().closed,false);assert.equal(f.nodes['[data-save]'].disabled,false);assert.equal(f.nodes['#clip-name'].value,'Mesa');assert.match(f.messages[1].textContent,/denegado/);});
test('lost refresh does not claim success and recovered capture opens existing item without a second absorption',async()=>{const f=setup({readError:true});await f.save();assert.equal(f.status().calls,1);assert.equal(f.status().closed,false);assert.equal(f.status().removed,false);f.recover();await f.read();assert.equal(f.status().calls,1);assert.equal(f.status().closed,true);assert.equal(f.state.library.length,1);});
test('local conflicting edits cannot be overwritten or silently treated as a displayed product',async()=>{const f=setup({localConflict:true});await f.save();assert.equal(f.status().closed,false);assert.equal(f.status().removed,false);assert.equal(f.state.library.length,0);assert.match(f.messages[1].textContent,/cambios locales pendientes/);});

test('saving no longer requires a manual review checkbox',async()=>{const f=setup({missing:'#clip-confirm'});await f.save();assert.equal(f.status().calls,1);assert.equal(f.status().closed,true);});
test('list import reopens the saved product for editing',async()=>{const f=setup({kind:'lista'});let opened;f.c.itemModal=(...args)=>opened=args;await f.save();assert.deepEqual(opened,[0,0]);assert.equal(f.status().calls,1);});

test('the selected cover is sent unchanged through the existing absorption contract',async()=>{const f=setup({kind:'lista'});f.nodes['[name="clip-primary"]:checked']={value:'study/clipper/capture-1/second.webp'};await f.save();assert.equal(f.revision().primaryImage,'study/clipper/capture-1/second.webp');assert.equal(f.revision().confirmed,true);assert.equal(f.status().calls,1);});
test('changing identity while a capture is open prevents saving it',async()=>{const f=setup({kind:'lista'});f.state.sessionUser.id='another-user';await f.save();assert.equal(f.status().calls,0);assert.equal(f.status().closed,false);});

function captureSetup({failures=1,code='PT429',status=429}={}){
 const f=setup({kind:'lista'}),cache=new Map([['moderno-clipper:study|user','previous-capture']]),timers=new Map(),requests=[];
 Object.assign(f.nodes,{'#clip-url':{value:'https://shop.example.invalid/product'},'[data-capture]':{},'[data-status]':{}});
 f.ctx.id='previous-capture';f.ctx.destination=f.ctx.row.destino;
 let counter=0;
 Object.assign(f.c,{URL,crypto:{randomUUID:()=>`request-${++counter}`},setTimeout(fn){const id=timers.size+1;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)}});
 f.c.sb.functions.invoke=async(name,{body})=>{
  if(body.action==='capture'){
   requests.push(body);
   if(requests.length<=failures)return {error:{context:{status,json:async()=>({code,error:'Capturas ocupadas'})}}};
   return {data:{}};
  }
  return {data:{estado:'error',error_code:'fixture_failure'}};
 };
 return {...f,cache,timers,requests,capture:()=>f.c.clipper.capture(f.ctx),retry:async()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();for(let i=0;i<15;i++)await Promise.resolve();}};
}
test('busy captures wait automatically with a stable ID and preserve the prior recoverable capture',async()=>{
 const f=captureSetup({failures:2});await f.capture();
 assert.equal(f.ctx.busy,true);assert.equal(f.ctx.id,'previous-capture');assert.equal(f.cache.get('moderno-clipper:study|user'),'previous-capture');
 assert.equal(f.nodes['#clip-url'].disabled,true);assert.match(f.messages[0].textContent,/automáticamente/);
 await f.capture();await f.save();assert.equal(f.requests.length,1);assert.equal(f.status().calls,0);
 await f.retry();assert.equal(f.requests.length,2);assert.equal(f.ctx.busy,true);
 await f.retry();assert.equal(f.requests.length,3);assert.equal(f.ctx.busy,false);assert.equal(f.timers.size,0);
 assert.deepEqual(f.requests.map(r=>r.id),['request-1','request-1','request-1']);
 assert.equal(f.cache.get('moderno-clipper:study|user'),'request-1');assert.equal(f.nodes['#clip-url'].disabled,false);
});
test('closing or changing identity while queued never sends another capture',async()=>{
 for(const change of ['close','identity']){const f=captureSetup();await f.capture();if(change==='close')f.ctx.dialog.isConnected=false;else f.c.state.sessionUser.id='other';await f.retry();assert.equal(f.requests.length,1);assert.equal(f.cache.get('moderno-clipper:study|user'),'previous-capture');}
});
test('unknown HTTP 429 or lost network response is never automatically recaptured',async()=>{
 for(const code of ['upstream_rate_limit',null]){const f=captureSetup({code});await f.capture();assert.equal(f.timers.size,0);assert.equal(f.ctx.busy,false);assert.equal(f.requests.length,1);assert.equal(f.cache.get('moderno-clipper:study|user'),'request-1');}
});
test('a quota rejection without a prior capture does not cache a nonexistent request',async()=>{
 const f=captureSetup();f.ctx.id=null;f.cache.clear();await f.capture();assert.equal(f.cache.size,0);assert.equal(f.ctx.id,null);assert.equal(f.ctx.busy,true);
});
