import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backup } from './backup-storage.mjs';
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
