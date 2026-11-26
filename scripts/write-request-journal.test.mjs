import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const fileAckSource=html.slice(html.indexOf('function fileConfirmCloudReferencesBestEffort('),html.indexOf('function filePendingReferences('));
const journalSource=html.slice(html.indexOf('let _deltaRpcAvailable='),html.indexOf('async function cloudReadSaveVersions('));
const saveSource=html.slice(html.indexOf('async function cloudSaveBatch('),html.indexOf('async function cloudFlush('));
const flushSource=html.slice(html.indexOf('async function cloudFlush('),html.indexOf('function cloudSnapshotAll('));
const study='11111111-1111-4111-8111-111111111111';

function storage(){
  const values=new Map();
  return {
    get length(){return values.size;},
    key(index){return [...values.keys()][index]??null;},
    getItem(key){return values.has(String(key))?values.get(String(key)):null;},
    setItem(key,value){values.set(String(key),String(value));},
    removeItem(key){values.delete(String(key));},
    entries(){return [...values.entries()];}
  };
}

function archive(){
  const values=new Map();
  let failWrite=false,removeGate=null;
  return {
    values,
    set failWrite(value){failWrite=value;},
    set removeGate(value){removeGate=value;},
    async read(key){return values.get(key);},
    async write(key,value){if(failWrite)throw new Error('indexeddb unavailable');values.set(key,value);},
    async remove(key){if(removeGate)await removeGate;values.delete(key);}
  };
}

const pendingArchive={
  marker:key=>JSON.stringify({modernoPendingArchive:1,key}),
  pointer(raw){try{const value=JSON.parse(raw);return value?.modernoPendingArchive===1&&typeof value.key==='string'?value.key:null;}catch{return null;}},
  async resolve(shared,key,store){
    const raw=shared.getItem(key),pointer=this.pointer(raw);
    if(!pointer)return raw;
    const saved=await store.read(pointer);
    if(typeof saved!=='string'||!saved)throw new Error('missing archived request');
    return saved;
  }
};

function locks(){
  const queues=new Map();
  return {request(name,_options,action){
    const previous=queues.get(name)||Promise.resolve();
    const current=previous.catch(()=>{}).then(action);
    queues.set(name,current.finally(()=>{if(queues.get(name)===current)queues.delete(name);}));
    return current;
  }};
}

function tab(shared,{user='user-a',lockManager,store=archive(),sb=null,withSave=false}={}){
  const context={
    Date,Math,TextEncoder,Uint8Array,encodeURIComponent,Blob,console,
    localStorage:shared,LS_KEY:'fixture',state:{sessionUser:{id:user}},
    navigator:lockManager?{locks:lockManager}:undefined,
    ModernoPendingArchive:pendingArchive,pendingArchiveStore:()=>store,
    ESTUDIO_ID:study,sb,
    ModernoEfficiency:{change:plan=>plan},efficiencyMetrics:{record(){}},
    setTimeout,clearTimeout
  };
  vm.createContext(context);vm.runInContext(journalSource+(withSave?'\n'+saveSource:''),context);return context;
}

function change(name,pad=''){
  return [{bloque:'proyectos',base:'2026-11-23T10:00:00.000Z',cambios:[{op:'set',path:['0','name'],value:name+pad}]}];
}

function record(owner,index){
  const fingerprint='fingerprint-'+index,requestId=index.toString(16).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  return {v:2,owner,fingerprint,requestId,createdAt:1_000+index,envelope:{v:2,requestId,cambios:change(String(index))}};
}

test('lost ACK A is retried byte-for-byte before edit B receives a request id',async()=>{
  const shared=storage(),context=tab(shared),changesA=change('A'),changesB=change('B');
  const requestA=await context.cloudWriteEnvelope(study,changesA);
  const immutableEnvelope=JSON.stringify(requestA.envelope);

  const beforeAck=await context.cloudWriteEnvelope(study,changesB);
  assert.equal(beforeAck.requestId,requestA.requestId);
  assert.equal(beforeAck.matchesCurrent,false);
  assert.equal(JSON.stringify(beforeAck.envelope),immutableEnvelope);

  beforeAck.envelope.cambios[0].cambios[0].value='mutated in memory';
  const recovered=await tab(shared).cloudWriteEnvelope(study,changesB);
  assert.equal(recovered.requestId,requestA.requestId);
  assert.equal(JSON.stringify(recovered.envelope),immutableEnvelope,'the durable envelope must be immutable');

  await context.cloudWriteConfirmed(requestA.requestId,requestA.owner,requestA.fingerprint);
  const requestB=await context.cloudWriteEnvelope(study,changesB);
  assert.notEqual(requestB.requestId,requestA.requestId);
  assert.equal(requestB.matchesCurrent,true);
  assert.deepEqual(JSON.parse(JSON.stringify(requestB.envelope.cambios)),changesB);
});

test('two tabs elect the same deterministic request id even without Navigator Locks',async()=>{
  const shared=storage(),changes=change('same');
  const [left,right]=await Promise.all([tab(shared).cloudWriteEnvelope(study,changes),tab(shared).cloudWriteEnvelope(study,changes)]);
  assert.equal(left.requestId,right.requestId);
  assert.equal(JSON.stringify(left.envelope),JSON.stringify(right.envelope));
});

test('journal keys isolate concurrent fingerprints and confirming B cannot remove A',async()=>{
  const shared=storage(),context=tab(shared),owner=JSON.stringify([study,'user-a']);
  const requestA=record(owner,1),requestB=record(owner,2);
  await Promise.all([context.cloudWriteJournalStore(requestA),context.cloudWriteJournalStore(requestB)]);
  assert.equal((await context.cloudWriteJournalPending(owner)).length,2);
  await context.cloudWriteConfirmed(requestB.requestId,owner,requestB.fingerprint);
  const pending=await tab(shared).cloudWriteJournalPending(owner);
  assert.deepEqual(Array.from(pending,value=>value.requestId),[requestA.requestId]);
});

test('a corrupt journal owned by A cannot block or expose B',async()=>{
  const shared=storage(),ownerA=JSON.stringify([study,'user-a']),fingerprintA='broken';
  const keyA='fixture_write_request_v2_'+encodeURIComponent(ownerA)+'|'+encodeURIComponent(fingerprintA);
  shared.setItem(keyA,'{not-json');
  const contextB=tab(shared,{user:'user-b'}),requestB=await contextB.cloudWriteEnvelope(study,change('B'));
  assert.equal(requestB.matchesCurrent,true);
  assert.equal((await contextB.cloudWriteJournalPending(requestB.owner)).length,1);
  assert.equal(shared.getItem(keyA),'{not-json','B must not delete or rewrite A');
});

test('large envelopes survive reload through the archive pointer',async()=>{
  const shared=storage(),store=archive(),changes=change('large','x'.repeat(300_000));
  const first=tab(shared,{store}),request=await first.cloudWriteEnvelope(study,changes);
  const key=first.cloudWriteJournalKey(request.owner,request.fingerprint);
  assert.equal(pendingArchive.pointer(shared.getItem(key)),key);
  assert.ok(store.values.get(key)?.length>300_000);
  const recovered=await tab(shared,{store}).cloudWriteEnvelope(study,changes);
  assert.equal(recovered.requestId,request.requestId);
  assert.equal(JSON.stringify(recovered.envelope),JSON.stringify(request.envelope));
});

test('an IndexedDB failure aborts before any save RPC can run',async()=>{
  const shared=storage(),store=archive(),largeValue='x'.repeat(300_000);
  store.failWrite=true;
  let rpcCalls=0;
  const context=tab(shared,{store,withSave:true,sb:{rpc(){rpcCalls++;throw new Error('RPC must not run');}}});
  const plans=[{b:'proyectos',merged:{name:largeValue},version:null}];
  await assert.rejects(context.cloudSaveBatch(study,plans),/No se pudo conservar el reintento antes de enviarlo/);
  assert.equal(rpcCalls,0);
});

test('coordinated rollback code 55000 closes only the verified new journal and falls back to legacy',async()=>{
  const shared=storage(),calls=[];
  const sb={rpc(name){calls.push(name);if(name==='app_guardar_lote_v2')return {error:{code:'55000',message:'draining'}};if(name==='app_guardar_lote')return {data:[{bloque:'proyectos',updated_at:'2026-11-23T12:00:00Z'}],error:null};throw new Error('unexpected RPC '+name);}};
  const context=tab(shared,{sb,withSave:true}),plans=[{b:'proyectos',merged:{name:'legacy'},version:null}];
  const result=await context.cloudSaveBatch(study,plans);
  assert.equal(result.error,null);assert.equal(vm.runInContext('_saveV2Available',context),false);
  assert.deepEqual(calls,['app_guardar_lote_v2','app_guardar_lote']);
  assert.equal((await context.cloudWriteJournalPending(JSON.stringify([study,'user-a']))).length,0);
});

test('an existing replay still uses v2 while new requests are disabled server-side',async()=>{
  const shared=storage(),calls=[];
  const sb={rpc(name,args){calls.push(name);if(name!=='app_guardar_lote_v2')throw new Error('must not degrade a replay');return {data:{v:2,requestId:args.p_solicitud.requestId,replayed:true,bloques:[{bloque:'proyectos',updated_at:'2026-11-23T12:00:00Z',changed:true}]},error:null};}};
  const context=tab(shared,{sb,withSave:true}),result=await context.cloudSaveBatch(study,[{b:'proyectos',merged:{name:'replayed'},version:null}]);
  assert.deepEqual(calls,['app_guardar_lote_v2']);assert.equal(result.v2.replayed,true);assert.equal(vm.runInContext('_saveV2Available',context),true);assert.ok(result.writeRequest);
});

test('errors other than missing or draining v2 never degrade to the legacy writer',async()=>{
  const shared=storage(),calls=[];
  const sb={rpc(name){calls.push(name);return {error:{code:'PT409',message:'conflict'}};}};
  const context=tab(shared,{sb,withSave:true}),result=await context.cloudSaveBatch(study,[{b:'proyectos',merged:{name:'conflict'},version:null}]);
  assert.equal(result.error.code,'PT409');assert.deepEqual(calls,['app_guardar_lote_v2']);assert.equal(vm.runInContext('_saveV2Available',context),true);
  assert.equal((await context.cloudWriteJournalPending(JSON.stringify([study,'user-a']))).length,1);
});

test('confirmation is awaited before the next edit can be sent',async()=>{
  assert.match(flushSource,/await cloudWriteConfirmed\(pendingReplay\.request\.requestId/);
  assert.match(flushSource,/await cloudWriteConfirmed\(writeRequest\.requestId/);
  const shared=storage(),changesA=change('A','x'.repeat(300_000)),changesB=change('B'),store=archive();
  let releaseRemove;
  store.removeGate=new Promise(resolve=>{releaseRemove=resolve;});
  const context=tab(shared,{store}),requestA=await context.cloudWriteEnvelope(study,changesA);
  let confirmed=false;
  const confirmation=context.cloudWriteConfirmed(requestA.requestId,requestA.owner,requestA.fingerprint).then(()=>{confirmed=true;});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(confirmed,false,'the confirmation promise must include durable cleanup');
  releaseRemove();await confirmation;
  const requestB=await context.cloudWriteEnvelope(study,changesB);
  assert.notEqual(requestB.requestId,requestA.requestId);
  assert.equal(requestB.matchesCurrent,true);
});

test('a receipt ACK that never resolves cannot hold a confirmed save open',async()=>{
  const shared=storage(),calls=[];
  const sb={rpc(name){calls.push(name);if(name==='app_confirmar_guardado_v2')return new Promise(()=>{});throw new Error('unexpected RPC '+name);}};
  const context=tab(shared,{sb}),request=await context.cloudWriteEnvelope(study,change('confirmed'));
  await Promise.race([
    context.cloudWriteConfirmed(request.requestId,request.owner,request.fingerprint),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('remote ACK blocked local confirmation')),50))
  ]);
  assert.deepEqual(calls,['app_confirmar_guardado_v2']);
  assert.equal((await context.cloudWriteJournalPending(request.owner)).length,0);
});

test('Blob confirmation maintenance is fire-and-forget if IndexedDB never resolves',async()=>{
  assert.equal((flushSource.match(/fileConfirmCloudReferencesBestEffort\(/g)||[]).length,2);
  assert.doesNotMatch(flushSource,/await fileConfirmCloudReferences\(/);
  let calls=0;
  const context={Promise,setTimeout,clearTimeout,console,fileConfirmCloudReferences(){calls++;return new Promise(()=>{});}};
  vm.createContext(context);vm.runInContext(fileAckSource,context);
  assert.equal(vm.runInContext('fileConfirmCloudReferencesBestEffort([])',context),undefined);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls,1);
});

test('more than 32 recent unconfirmed requests are never evicted by the client',async()=>{
  const shared=storage(),context=tab(shared),owner=JSON.stringify([study,'user-a']);
  for(let index=1;index<=40;index++)await context.cloudWriteJournalStore(record(owner,index));
  assert.equal((await context.cloudWriteJournalPending(owner)).length,40);
  assert.equal(shared.entries().filter(([key])=>key.startsWith('fixture_write_request_v2_')).length,40);
});

test('the legacy single request is migrated without changing its id',async()=>{
  const shared=storage(),initial=tab(shared),changes=change('legacy');
  const fingerprint=await initial.cloudWriteFingerprint(study,changes),owner=JSON.stringify([study,'user-a']);
  const requestId='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  shared.setItem('fixture_write_request',JSON.stringify({owner,fingerprint,requestId}));
  const migrated=await tab(shared).cloudWriteEnvelope(study,changes);
  assert.equal(migrated.requestId,requestId);assert.equal(shared.getItem('fixture_write_request'),null);
  assert.equal(shared.entries().filter(([key])=>key.startsWith('fixture_write_request_v2_')).length,1);
});
