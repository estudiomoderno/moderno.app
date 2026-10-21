import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backup, incompleteSnapshot, failureCategory, createCheckReport } from './backup-storage.mjs';
const listing = JSON.stringify([{ Path: 'project/file.pdf', Size: 4, ModTime: '2026-01-01T00:00:00Z' }]);

test('complete marker requires byte verification and stable source; writes only to destination', async () => {
  const calls = [];
  await backup(async args => { calls.push(args); return args[0] === 'lsjson' ? listing : ''; }, 'files', 'test');
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
      if (args[0] === 'lsjson') {
        reads++;
        if (failure === 'empty') return '[]';
        if (failure === 'changed' && reads === 2) return listing.replace('"Size":4', '"Size":5');
        return listing;
      }
      return '';
    }, 'files', 'test'));
    assert.ok(!calls.some(args => args[1]?.endsWith('/COMPLETE.json')));
  });
}

test('verification of an incomplete copy never rewrites its objects and requires bytes and stable source', async()=>{
  const calls=[];
  await backup(async args=>{calls.push(args);return args[0]==='lsjson'?listing:'';},'files','test',{verifyOnly:true});
  assert.ok(!calls.some(args=>args[0]==='copy'));
  assert.ok(calls.some(args=>args[0]==='check'&&args.includes('--download')));
  assert.equal(calls.at(-1)[1],'destination:test/COMPLETE.json');
  for(const failure of ['check','changed']){
    const calls=[];let reads=0;
    await assert.rejects(backup(async args=>{calls.push(args);if(args[0]==='check'&&failure==='check')throw Error('difference');if(args[0]==='lsjson')return ++reads===2&&failure==='changed'?listing.replace('"Size":4','"Size":5'):listing;return '';},'files','test',{verifyOnly:true}));
    assert.ok(!calls.some(args=>args[0]==='copy'||args[0]==='rcat'));
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
