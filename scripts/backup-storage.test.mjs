import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backup, inventory, incompleteSnapshot, failureCategory, createCheckReport, rcloneArguments } from './backup-storage.mjs';
const listing = JSON.stringify([{ Path: 'project/file.pdf', Size: 4, ModTime: '2026-01-01T00:00:00Z' }]);
const checked={identical:1,missingSource:0,missingDestination:0,different:0,readErrors:0};
const reply=args=>args[0]==='lsjson'?listing:args[0]==='check'?{...checked}:'';

test('complete marker requires byte verification and stable source; writes only to destination', async () => {
  const calls = [];
  await backup(async args => { calls.push(args); return reply(args); }, 'files', 'test');
  assert.equal(calls.at(-1)[1], 'destination:test/COMPLETE.json');
  assert.ok(calls.find(args => args[0] === 'check' && args.includes('--download')));
  for (const args of calls.filter(args => ['copy', 'rcat'].includes(args[0]))) {
    assert.ok(args[args[0] === 'copy' ? 2 : 1].startsWith('destination:'));
  }
});

for (const failure of ['copy', 'check', 'changed', 'empty']) {
  test(`no complete marker after ${failure}`, async () => {
    const calls = []; let reads = 0;
    await assert.rejects(backup(async args => {
      calls.push(args);
      if (args[0] === failure) throw new Error('simulated failure');
      if (args[0] === 'lsjson' && args[1].startsWith('source:')) {
        reads++;
        if (failure === 'empty') return '[]';
        if (failure === 'changed' && reads === 2) return listing.replace('"Size":4', '"Size":5');
        return listing;
      }
      return reply(args);
    }, 'files', 'test'));
    assert.ok(!calls.some(args => args[1]?.endsWith('/COMPLETE.json')));
  });
}

test('recovery fills only absent objects and still requires bytes and stable source', async()=>{
  const calls=[];
  await backup(async args=>{calls.push(args);return reply(args);},'files','test',{verifyOnly:true});
  const copy=calls.filter(args=>args[0]==='copy');assert.equal(copy.length,1);
  assert.deepEqual(copy[0],['copy','source:files','destination:test/objects','--immutable','--ignore-existing','--no-traverse','--files-from-raw','-']);
  assert.ok(calls.some(args=>args[0]==='check'&&args.includes('--download')));
  assert.equal(calls.at(-1)[1],'destination:test/COMPLETE.json');
  for(const failure of ['check','changed']){
    const calls=[];let reads=0;
    await assert.rejects(backup(async args=>{calls.push(args);if(args[0]==='check'&&failure==='check')throw Error('difference');if(args[0]==='lsjson'&&args[1].startsWith('source:'))return ++reads===2&&failure==='changed'?listing.replace('"Size":4','"Size":5'):listing;return reply(args);},'files','test',{verifyOnly:true}));
    assert.ok(!calls.some(args=>args[0]==='rcat'));
    assert.ok(calls.filter(args=>args[0]==='copy').every(args=>args.includes('--immutable')&&args.includes('--ignore-existing')));
  }
});
test('recovery selects only incomplete same-day snapshots within the configured root',async()=>{
  const valid='20261021T120000000Z-00000000-0000-4000-8000-000000000001',completed='20261021T130000000Z-00000000-0000-4000-8000-000000000002';
  const calls=[];
  const id=await incompleteSnapshot(async args=>{calls.push(args);return args[1]==='destination:'?`${valid}/\n${completed}/\n../escape/\nprueba-private/\n20261020T120000000Z-00000000-0000-4000-8000-000000000001/`:args[1]===`destination:${completed}`?'COMPLETE.json\nmanifest.json\n':'';},new Date('2026-10-21T14:00:00Z'));
  assert.equal(id,valid);assert.equal(calls.length,3);assert.ok(calls.every(args=>args[0]==='lsf'));
  await assert.rejects(incompleteSnapshot(async args=>args[1]==='destination:'?valid+'/':'manifest.json',new Date('2026-10-21T14:00:00Z')),/No incomplete/);
});
test('verification diagnostics expose bounded categories and never provider content or filenames',()=>{
  for(const [message,category] of [['private/customer.pdf: sizes differ','content-mismatch'],['private/file: file not in destination','missing-file'],['private-token: error downloading: 429 Too Many Requests','download-error,rate-limit'],['private: context deadline exceeded','timeout'],['private: no common hash','hash-unavailable'],['private-token: unknown private failure','unclassified']]){
    const result=failureCategory(message);assert.equal(result,category);assert.ok(!result.includes('private'));
  }
});

test('streaming byte report distinguishes sides and read errors without retaining private paths',()=>{
  const report=createCheckReport();
  report.feed('= private/customer-');report.feed('name.pdf\n- deleted-source.pdf\n+ absent-destination.pdf\n* different.bin\n! download-error.jpg\n');
  assert.deepEqual(report.summary(),{identical:1,missingSource:1,missingDestination:1,different:1,readErrors:1});
  const summary=report.summary();summary.identical=999;assert.equal(report.summary().identical,1);
  assert.ok(!JSON.stringify(report.summary()).includes('private'));
  report.feed('x'.repeat(9000));report.feed('\n= another.pdf\n');assert.equal(report.summary().identical,2);
  assert.match(failureCategory('S3: GetObject NoSuchKey status code: 404'),/s3-object-missing/);
  assert.match(failureCategory('googleapi: Error 503: private-content'),/drive-read-error/);
});

test('flat listing stays on source inventories without weakening byte checks or immutable recovery',()=>{
  assert.ok(rcloneArguments(['lsjson','source:fixture','--recursive','--files-only']).includes('--fast-list'));
  assert.ok(!rcloneArguments(['lsjson','destination:fixture','--recursive']).includes('--fast-list'));
  const check=rcloneArguments(['check','source:fixture','destination:fixture','--download']);
  const driveFlag=check.indexOf('--drive-team-drive');assert.ok(driveFlag>=0);assert.equal(check[driveFlag+1],'');
  assert.ok(check.includes('--download'));assert.ok(check.includes('--combined'));
  assert.ok(!check.includes('--fast-list'));
  assert.ok(!check.includes('--size-only'));assert.ok(!check.includes('--one-way'));
  const copy=rcloneArguments(['copy','source:fixture','destination:fixture','--immutable','--ignore-existing','--no-traverse']);
  for(const flag of ['--immutable','--ignore-existing','--no-traverse'])assert.ok(copy.includes(flag));
  assert.ok(!copy.includes('--fast-list'));
  assert.ok(!rcloneArguments(['rcat','destination:marker']).includes('--fast-list'));
});

test('concurrent additions remain outside the initial snapshot and the exact raw selection is checked',async()=>{
  const original=JSON.parse(listing),after=JSON.stringify([...original,{Path:'new/product.pdf',Size:9,ModTime:'2026-01-01T00:00:01Z'}]);
  const calls=[];let reads=0;
  await backup(async(args,input)=>{calls.push({args,input});return args[0]==='lsjson'&&args[1].startsWith('source:')?(++reads===1?listing:after):reply(args);},'files','test');
  for(const call of calls.filter(c=>['copy','check'].includes(c.args[0]))){assert.deepEqual(call.args.slice(-2),['--files-from-raw','-']);assert.equal(call.input,'project/file.pdf\n');}
  const manifest=JSON.parse(calls.find(c=>c.args[1]==='destination:test/manifest.json').input),complete=JSON.parse(calls.at(-1).input);
  assert.deepEqual(manifest.objects,original);assert.equal(manifest.scope,'initial-inventory');assert.equal(manifest.newObjectsAfterInventory,1);
  assert.equal(complete.count,1);assert.equal(complete.newObjectsAfterInventory,1);assert.equal(complete.startedAt,manifest.startedAt);
});

test('selected deletion or timestamp change prevents the complete marker even alongside new files',async()=>{
  for(const change of ['deleted','timestamp']){
    const original=JSON.parse(listing),extra={Path:'new.pdf',Size:1,ModTime:'2026-01-01T00:00:01Z'};
    const after=change==='deleted'?[extra]:[{...original[0],ModTime:'2026-01-02T00:00:00Z'},extra];
    const calls=[];let reads=0;
    await assert.rejects(backup(async args=>{calls.push(args);return args[0]==='lsjson'&&args[1].startsWith('source:')?(++reads===1?listing:JSON.stringify(after)):reply(args);},'files','test'),/Selected source changed/);
    assert.ok(!calls.some(args=>args[0]==='rcat'));
  }
});

test('every selected object needs positive byte coverage; missing on both sides is not success',async()=>{
  for(const report of [null,'',{...checked,identical:0},{...checked,identical:2},{...checked,readErrors:1},{identical:1}]){
    const calls=[];
    await assert.rejects(backup(async args=>{calls.push(args);return args[0]==='check'?report:reply(args);},'files','test'),/Byte comparison/);
    assert.ok(!calls.some(args=>args[0]==='rcat'));
  }
});

test('line injection, traversal and duplicate inventory names fail before copy',async()=>{
  for(const path of ['project/a\nother.pdf','project/a\r.pdf','project/a\0.pdf','../escape.pdf','/absolute.pdf','x/../escape.pdf','x//file.pdf']){
    const calls=[];
    await assert.rejects(backup(async args=>{calls.push(args);return JSON.stringify([{Path:path,Size:4,ModTime:'date'}]);},'files','test'),/Invalid object/);
    assert.deepEqual(calls.map(c=>c[0]),['lsjson']);
  }
  assert.throws(()=>inventory(JSON.stringify([...JSON.parse(listing),...JSON.parse(listing)])),/Invalid object/);
  const named=inventory(JSON.stringify([{Path:'# literal ; lámpara.pdf',Size:0,ModTime:'date'}]));assert.equal(named[0].Path,'# literal ; lámpara.pdf');
});

test('duplicate destination folders or files prevent verification and the complete marker',async()=>{
  for(const path of ['project','project/file.pdf']){
    const calls=[];
    await assert.rejects(backup(async args=>{
      calls.push(args);
      if(args[0]==='lsjson'&&args[1].startsWith('destination:'))return JSON.stringify([{Path:path},{Path:path}]);
      return reply(args);
    },'files','test'),/Ambiguous duplicate path/);
    assert.ok(!calls.some(args=>['check','rcat'].includes(args[0])));
  }
});
