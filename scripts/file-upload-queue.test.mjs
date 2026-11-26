import test from 'node:test';
import assert from 'node:assert/strict';
import queueApi from '../app/file-upload-queue.js';

const study='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const owner='user-a';
const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc'];
function fixture(options={}){
  let index=0,uploads=0;const revoked=[];
  const store=queueApi.createMemoryStore();
  const queue=queueApi.createQueue({store,owner:options.owner||owner,cryptoSource:{randomUUID:()=>ids[index++]},now:options.now||(()=>1700000000000+index),createObjectURL:()=>`blob:test-${index}`,revokeObjectURL:url=>revoked.push(url),upload:async record=>{uploads++;if(options.fail)throw Error('sin red');return `storage://archivos/${record.study}/pending/${record.id}.bin`;},limits:options.limits});
  return {store,queue,revoked,get uploads(){return uploads;}};
}

test('queues a Blob as a small local reference and keeps its verified metadata',async()=>{
  const f=fixture(),blob=new Blob(['contenido'],{type:'image/png'});blob.name='foto.png';
  const ref=await f.queue.enqueue(blob,{study});
  assert.equal(ref,'local-file://'+ids[0]);assert.equal(ref.includes('data:'),false);
  assert.deepEqual(await f.queue.list(study),[{id:ids[0],reference:ref,study,name:'foto.png',type:'image/png',size:9,createdAt:1700000000001,attempts:0,attachedAt:null,remote:null,uploadedAt:null,cloudConfirmedAt:null}]);
});

test('resolves a pending Blob once and revokes its object URL only after acknowledgement',async()=>{
  const f=fixture(),ref=await f.queue.enqueue(new Blob(['x']),{study,name:'x.txt'});
  assert.equal(await f.queue.resolve(ref,{study}),'blob:test-1');assert.equal(await f.queue.resolve(ref,{study}),'blob:test-1');
  await f.queue.markPersisted([ref],{study});
  const remote=await f.queue.retry(ref,{study});assert.equal(f.uploads,1);assert.equal((await f.queue.list(study))[0].remote,remote);
  assert.equal(await f.queue.retry(ref,{study}),remote);assert.equal(f.uploads,1);assert.equal((await f.queue.list(study)).length,1);
  await f.queue.acknowledge(ref,remote,{study});assert.deepEqual(await f.queue.list(study),[]);assert.deepEqual(f.revoked,['blob:test-1']);
});

test('a failed upload preserves the Blob and records a retry',async()=>{
  const f=fixture({fail:true}),ref=await f.queue.enqueue(new Blob(['x']),{study,name:'x'});
  await f.queue.markPersisted([ref],{study});
  await assert.rejects(f.queue.retry(ref,{study}),/sin red/);
  const [pending]=await f.queue.list(study);assert.equal(pending.reference,ref);assert.equal(pending.attempts,1);assert.equal(pending.remote,null);
});

test('a draft cannot upload before a verified local snapshot attaches it',async()=>{
  const f=fixture(),ref=await f.queue.enqueue(new Blob(['x']),{study,name:'x'});
  await assert.rejects(f.queue.retry(ref,{study}),error=>error?.code==='LOCAL_FILE_NOT_PERSISTED');
  assert.equal(f.uploads,0);assert.equal((await f.queue.list(study))[0].attachedAt,null);
});

test('retryAll deletes only references whose replacement was confirmed by the caller',async()=>{
  const f=fixture(),first=await f.queue.enqueue(new Blob(['a']),{study,name:'a'}),second=await f.queue.enqueue(new Blob(['b']),{study,name:'b'});
  await f.queue.markPersisted([first,second],{study});
  const results=await f.queue.retryAll(study,{onUploaded:async ref=>ref===first});
  assert.deepEqual(results.map(row=>row.confirmed),[true,false]);assert.deepEqual((await f.queue.list(study)).map(row=>row.reference),[second]);
});

test('retryAll uploads only references that are still present in the document',async()=>{
  const f=fixture(),kept=await f.queue.enqueue(new Blob(['a']),{study,name:'a'}),removed=await f.queue.enqueue(new Blob(['b']),{study,name:'b'});
  await f.queue.markPersisted([kept,removed],{study});
  const results=await f.queue.retryAll(study,{references:[kept],onUploaded:async()=>false});
  assert.deepEqual(results.map(row=>row.reference),[kept]);assert.equal(f.uploads,1);
  assert.deepEqual((await f.queue.list(study)).map(row=>row.reference),[kept,removed]);
});

test('reconciliation removes unreferenced local and already uploaded Blobs without touching active ones',async()=>{
  const f=fixture({limits:{draftLeaseMs:0}}),active=await f.queue.enqueue(new Blob(['a']),{study,name:'a'}),localOrphan=await f.queue.enqueue(new Blob(['b']),{study,name:'b'}),remoteOrphan=await f.queue.enqueue(new Blob(['c']),{study,name:'c'});
  await f.queue.markPersisted([remoteOrphan],{study});
  await f.queue.retry(remoteOrphan,{study});
  const result=await f.queue.reconcile(study,[active],{minimumAgeMs:0});
  assert.deepEqual(new Set(result.removed),new Set([localOrphan,remoteOrphan]));assert.deepEqual(result.deferred,[]);
  assert.deepEqual((await f.queue.list(study)).map(row=>row.reference),[active]);
});

test('a new unreferenced Blob keeps a durable draft lease before orphan cleanup',async()=>{
  const f=fixture(),draft=await f.queue.enqueue(new Blob(['a']),{study,name:'a'});
  const result=await f.queue.reconcile(study,[],{minimumAgeMs:0});
  assert.deepEqual(result.removed,[]);assert.deepEqual(result.deferred,[draft]);
  assert.deepEqual((await f.queue.list(study)).map(row=>row.reference),[draft]);
});

test('cloud confirmation retains the cross-tab mapping, releases Blob bytes and resolves the stale local reference',async()=>{
  let moment=1000;const f=fixture({now:()=>moment,limits:{draftLeaseMs:100,maxTotalBytes:2}}),ref=await f.queue.enqueue(new Blob(['a']),{study,name:'a'});
  await f.queue.markPersisted([ref],{study});const remote=await f.queue.retry(ref,{study});
  moment=2000;await f.queue.confirmCloud(ref,remote,{study,retentionMs:1000});
  const [saved]=await f.queue.list(study);assert.equal(saved.cloudConfirmedAt,2000);assert.equal(saved.remote,remote);
  const raw=await f.store.get(ids[0]);assert.equal(raw.blob,null);assert.equal(await f.queue.resolve(ref,{study}),remote);
  await f.queue.enqueue(new Blob(['xy']),{study,name:'b'}); // confirmed byte is no longer charged to maxTotalBytes
  moment=2500;const result=await f.queue.reconcile(study,[],{minimumAgeMs:0});assert.deepEqual(result.removed,['local-file://'+ids[1]]);assert.deepEqual(result.deferred,[ref]);
});

test('study isolation, stable references and explicit limits are enforced',async()=>{
  const f=fixture({limits:{maxItems:1,maxFileBytes:2,maxTotalBytes:2}}),ref=await f.queue.enqueue(new Blob(['xy']),{study,name:'x'});
  await assert.rejects(f.queue.resolve(ref,{study:other}),/otro estudio/);
  await assert.rejects(f.queue.enqueue(new Blob(['z']),{study,name:'z'}),/espacio/);
  await assert.rejects(f.queue.enqueue(new Blob(['xyz']),{study:other,name:'z'}),/limite/);
  assert.throws(()=>queueApi.stableReference('https://example.test/file',study),/referencia estable/);
  assert.throws(()=>queueApi.stableReference(`storage://archivos/${other}/x`,study),/remota/);
});

test('another account in the same study cannot list, open, upload or reconcile the first account files',async()=>{
  const store=queueApi.createMemoryStore();
  const queueA=queueApi.createQueue({store,owner:'user-a',now:()=>1000,cryptoSource:{randomUUID:()=>ids[0]},upload:async record=>`storage://archivos/${record.study}/pending/${record.id}.bin`,limits:{draftLeaseMs:0}});
  const queueB=queueApi.createQueue({store,owner:'user-b',now:()=>5000,cryptoSource:{randomUUID:()=>ids[1]},upload:async()=>assert.fail('B no debe subir el archivo de A'),limits:{draftLeaseMs:0}});
  const reference=await queueA.enqueue(new Blob(['privado']),{study,name:'a.txt'});await queueA.markPersisted([reference],{study});
  assert.deepEqual(await queueB.list(study),[]);
  await assert.rejects(queueB.resolve(reference,{study}),/otra cuenta/);
  assert.deepEqual(await queueB.retryAll(study,{references:[]}),[]);
  assert.deepEqual(await queueB.reconcile(study,[],{minimumAgeMs:0}),{removed:[],deferred:[]});
  assert.deepEqual((await queueA.list(study)).map(row=>row.reference),[reference]);
});

test('a verified snapshot can claim a legacy unowned row without exposing it to another account',async()=>{
  const store=queueApi.createMemoryStore(),blob=new Blob(['legacy'],{type:'text/plain'}),createdAt=1000;
  await store.put({id:ids[0],study,name:'legacy.txt',type:'text/plain',size:blob.size,createdAt,leaseUntil:createdAt+1000,attempts:0,blob});
  const queueA=queueApi.createQueue({store,owner:'user-a',now:()=>1500}),queueB=queueApi.createQueue({store,owner:'user-b',now:()=>1500});
  const reference='local-file://'+ids[0];assert.deepEqual(await queueA.list(study),[]);assert.deepEqual(await queueB.list(study),[]);
  assert.deepEqual(await queueA.markPersisted([reference],{study}),[reference]);
  assert.deepEqual((await queueA.list(study)).map(row=>row.reference),[reference]);assert.deepEqual(await queueB.list(study),[]);
});

test('collects unique pending references without traversing cycles forever',()=>{
  const a={file:'local-file://'+ids[0],children:['local-file://'+ids[0],{file:'local-file://'+ids[1]}]};a.self=a;
  assert.deepEqual(queueApi.collectReferences(a),['local-file://'+ids[0],'local-file://'+ids[1]].sort());
  assert.throws(()=>queueApi.parseReference('local-file://not-an-id'),/no valida/);
});

test('reference scanning limits containers, not ordinary scalar values in a large valid list',()=>{
  const values=Array.from({length:200000},(_,index)=>index);values[12345]='local-file://'+ids[0];
  assert.deepEqual(queueApi.collectReferences(values),['local-file://'+ids[0]]);
  assert.throws(()=>queueApi.collectReferences([{},{}],{maxNodes:2}),/demasiado grande/);
});

test('a malformed local-file value blocks persistence instead of becoming an endless pending reference',()=>{
  const valid='local-file://'+ids[0],value={note:'Consulta local-file://manual antes de guardar',url:'local-file://not-an-id',attachment:valid};
  assert.throws(()=>queueApi.collectReferences(value),/no valida/);
  assert.throws(()=>queueApi.parseReference('local-file://not-an-id'),/no valida/);
});

test('retryAll reports a referenced local file whose durable Blob row is missing',async()=>{
  const f=fixture(),missing='local-file://'+ids[0];
  const [result]=await f.queue.retryAll(study,{references:[missing]});
  assert.equal(result.reference,missing);assert.equal(result.error?.code,'LOCAL_FILE_MISSING');assert.equal(f.uploads,0);
});
