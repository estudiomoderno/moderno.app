import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { privateDestination, diagnoseDestinations } from './prepare-backup-destination.mjs';

const route = { version: 1, folder_id: 'selected-folder', team_drive: 'selected-drive' };
const hash = value => createHash('sha256').update(value).digest('hex');
const expected = { folder: hash(route.folder_id), drive: hash(route.team_drive) };
const listing = { files: [{ id: 'private-config', mimeType: 'application/json', size: '100' }] };
const metadata = { id: route.folder_id, driveId: route.team_drive, mimeType: 'application/vnd.google-apps.folder', trashed: false, capabilities: { canAddChildren: true } };
const environment = { GOOGLE_CONFIG: JSON.stringify({ folder_id: 'original-root' }), GOOGLE_ACCESS_TOKEN: 'synthetic-token' };
function exercise(responses, env = environment) {
  const calls = [];
  return { calls, result: privateDestination({ environment: env, expected, fetcher: async (url, options) => {
    calls.push({ url: new URL(url), options });
    const value = responses.shift();
    if (value?.http) return { ok: false, status: value.http };
    return { ok: true, json: async () => value, text: async () => typeof value === 'string' ? value : JSON.stringify(value) };
  } }) };
}
test('authorized private route is read narrowly and checked against actual Google metadata', async () => {
  const { result, calls } = exercise([listing, route, metadata]);
  assert.deepEqual(await result, { folder_id: route.folder_id, team_drive: route.team_drive });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url.searchParams.get('q'), "'original-root' in parents and name = 'backup-destination.json' and trashed = false");
  for (const call of calls) {
    assert.equal(call.url.origin, 'https://www.googleapis.com');
    assert.equal(call.options.headers.Authorization, 'Bearer synthetic-token');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.credentials, 'omit');
    assert.equal(call.options.method, undefined); // GET only, never changes permissions or files.
  }
});
test('missing private route preserves legacy configuration without listing other folders', async () => {
  const { result, calls } = exercise([{ files: [] }]);
  assert.equal(await result, null); assert.equal(calls.length, 1);
});
test('duplicate or paginated configuration is rejected without reading arbitrary files', async () => {
  for (const value of [{ files: [...listing.files, ...listing.files] }, { files: listing.files, nextPageToken: 'more' }, {}]) {
    const { result, calls } = exercise([value]);
    await assert.rejects(result, /ambiguous/); assert.equal(calls.length, 1);
  }
});
test('configuration type, unsafe ID and size limits are enforced before file content access', async () => {
  for (const file of [{ ...listing.files[0], mimeType: 'text/html' }, { ...listing.files[0], id: '../escape' }, { ...listing.files[0], size: '4097' }, { ...listing.files[0], size: 'bad' }]) {
    const { result, calls } = exercise([{ files: [file] }]);
    await assert.rejects(result, /invalid/); assert.equal(calls.length, 1);
  }
  await assert.rejects(exercise([listing, 'x'.repeat(4097)]).result, /limit/);
});
test('malformed, unrelated or modified routes cannot redirect backups', async () => {
  for (const value of ['not-json', { ...route, version: 2 }, { ...route, folder_id: '../other' }, { ...route, folder_id: 'unapproved-folder' }, { ...route, team_drive: 'unapproved-drive' }]) {
    const { result, calls } = exercise([listing, value]);
    await assert.rejects(result); assert.equal(calls.length, 2);
  }
});
test('actual folder, shared drive, trash status and write capability must match', async () => {
  for (const value of [{ ...metadata, id: 'other' }, { ...metadata, driveId: 'other' }, { ...metadata, trashed: true }, { ...metadata, mimeType: 'text/plain' }, { ...metadata, capabilities: { canAddChildren: false } }, { ...metadata, capabilities: {} }]) {
    await assert.rejects(exercise([listing, route, value]).result);
  }
});
test('Google permission failures expose only status, never token or private provider messages', async () => {
  const { result } = exercise([listing, route, { http: 404, message: 'private-provider-payload' }]);
  await assert.rejects(result, error => error.message.includes('404') && !error.message.includes('private-provider') && !error.message.includes(environment.GOOGLE_ACCESS_TOKEN));
});
test('invalid original identity or missing Google token prevents all network access', async () => {
  for (const env of [{ ...environment, GOOGLE_ACCESS_TOKEN: '' }, { ...environment, GOOGLE_CONFIG: '{"folder_id":"../bad"}' }]) {
    const { result, calls } = exercise([], env);
    await assert.rejects(result); assert.equal(calls.length, 0);
  }
});

test('diagnostics compare actual folder capabilities without leaking identities or changing routing', async () => {
  const env = { GOOGLE_CONFIG: JSON.stringify({folder_id: route.folder_id, team_drive: route.team_drive, service_account: 'private-account'}), GOOGLE_ACCESS_TOKEN: 'secret-token' };
  const original = JSON.stringify(env), lines = [], calls = [];
  await diagnoseDestinations({environment: env, expected, report: line => lines.push(line), fetcher: async (url, options) => {
    calls.push({url: new URL(url), options});return {ok:true,json:async()=>metadata};
  }});
  assert.equal(JSON.stringify(env), original);
  assert.equal(calls.length,1);assert.equal(calls[0].options.method,undefined);
  assert.equal(calls[0].url.origin,'https://www.googleapis.com');
  assert.equal(calls[0].options.redirect,'error');
  assert.ok(lines.some(l=>l.includes('folder/drive: true/true')));
  assert.ok(lines.some(l=>l.includes('canAddChildren=true')));
  for(const secret of ['private-account','secret-token',route.folder_id,route.team_drive])assert.ok(!lines.join('\n').includes(secret));
});
test('diagnostics distinguish inaccessible override and mismatched original without echoing provider body', async () => {
  const env = { GOOGLE_CONFIG: JSON.stringify({folder_id:'old-root',team_drive:'wrong-drive'}), GOOGLE_ACCESS_TOKEN:'secret', BACKUP_STORAGE_FOLDER_ID:route.folder_id,BACKUP_STORAGE_TEAM_DRIVE:route.team_drive };
  const lines=[];let calls=0;
  await diagnoseDestinations({environment:env,expected,report:l=>lines.push(l),fetcher:async()=>++calls===1?{ok:true,json:async()=>({...metadata,driveId:'actual-drive'})}:{ok:false,status:404,json:async()=>{throw Error('must not read private provider payload');}}});
  assert.equal(calls,2);
  assert.ok(lines.some(l=>l.includes('original matches authorized folder/drive: false/false')));
  assert.ok(lines.some(l=>l.includes('drive=false')));
  assert.ok(lines.some(l=>l.includes('override metadata HTTP 404')));
  assert.ok(!lines.join('\n').includes('actual-drive'));
});
test('diagnostic errors and malformed IDs cannot cause writes, arbitrary requests or interrupt backup routing', async () => {
  for(const env of [{GOOGLE_CONFIG:'invalid'}, {GOOGLE_CONFIG:'{}'}, {GOOGLE_CONFIG:JSON.stringify({folder_id:'../escape',team_drive:'drive'}),GOOGLE_ACCESS_TOKEN:'secret'}]){
    let requests=0;
    await diagnoseDestinations({environment:env,report:()=>{},fetcher:async()=>{requests++;throw Error('private');}});
    assert.equal(requests,0);
  }
  const lines=[];
  await diagnoseDestinations({environment:{GOOGLE_CONFIG:JSON.stringify({folder_id:'root',team_drive:'drive'}),GOOGLE_ACCESS_TOKEN:'secret'},report:l=>lines.push(l),fetcher:async()=>{throw Error('private-token-and-path');}});
  assert.ok(lines.some(l=>l.includes('metadata unavailable')));assert.ok(!lines.join('\n').includes('private-token-and-path'));
});
