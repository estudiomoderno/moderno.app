import test from 'node:test';
import assert from 'node:assert/strict';
import { runBackup } from './run-backup-ci.mjs';

const google = { folder_id: 'original-folder', team_drive: 'original-drive' };
const source = { bucket: 'fixture', endpoint: 'https://fixture.invalid', region: 'fixture', access_key_id: 'synthetic-access', secret_access_key: 'synthetic-secret' };
function check(extra = {}, statuses = []) {
  const environment = { GOOGLE_CONFIG: JSON.stringify(google), SOURCE_CONFIG: JSON.stringify(source), GOOGLE_ACCESS_TOKEN: 'synthetic-token', BACKUP_MODE: 'backup', ...extra };
  const calls = [], messages = [];
  const status = runBackup({ environment, report: message => messages.push(message), run: (node, args, options) => { calls.push({ script: args[0], env: options.env }); return { status: statuses.length ? statuses.shift() : 0 }; } });
  return { status, calls, messages };
}
const override = { BACKUP_STORAGE_FOLDER_ID: 'new-folder', BACKUP_STORAGE_TEAM_DRIVE: 'new-drive' };

test('unconfigured route preserves existing destination and backup operation', () => {
  const result = check();
  assert.equal(result.status, 0); assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].script, 'scripts/backup-storage.mjs');
  assert.equal(result.calls[0].env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID, google.folder_id);
  assert.equal(result.calls[0].env.RCLONE_CONFIG_DESTINATION_TEAM_DRIVE, google.team_drive);
  assert.equal(result.calls[0].env.RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY, source.secret_access_key);
});
test('new destination must pass synthetic recovery before receiving a Storage copy', () => {
  const result = check(override);
  assert.equal(result.status, 0);
  assert.deepEqual(result.calls.map(c => c.script), ['scripts/verify-backup-drive.mjs', 'scripts/backup-storage.mjs']);
  for (const call of result.calls) {
    assert.equal(call.env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID, 'new-folder');
    assert.equal(call.env.RCLONE_CONFIG_DESTINATION_TEAM_DRIVE, 'new-drive');
  }
});
test('synthetic checks receive no source secrets, including inherited rclone variables', () => {
  const result = check({ ...override, RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY: 'inherited-secret', BACKUP_BUCKET: 'real-bucket' });
  const env = result.calls[0].env;
  for (const key of ['GOOGLE_CONFIG', 'SOURCE_CONFIG', 'GOOGLE_ACCESS_TOKEN', 'BACKUP_BUCKET', 'BACKUP_STORAGE_FOLDER_ID', 'BACKUP_STORAGE_TEAM_DRIVE']) assert.equal(env[key], undefined);
  assert.ok(!Object.keys(env).some(key => key.startsWith('RCLONE_CONFIG_SOURCE_')));
  assert.equal(JSON.parse(env.RCLONE_CONFIG_DESTINATION_TOKEN).access_token, 'synthetic-token');
});
test('failed route validation preserves the copy in the old destination and reports failure', () => {
  const result = check(override, [1, 0]);
  assert.equal(result.status, 1); assert.equal(result.calls.length, 2);
  assert.equal(result.calls[0].env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID, 'new-folder');
  assert.equal(result.calls[1].env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID, google.folder_id);
  assert.equal(result.calls[1].env.RCLONE_CONFIG_DESTINATION_TEAM_DRIVE, google.team_drive);
  assert.ok(result.messages[0].includes('original destination'));
});
test('partial or malformed overrides never select an accidental folder', () => {
  for (const extra of [{ BACKUP_STORAGE_FOLDER_ID: 'new-folder' }, { BACKUP_STORAGE_TEAM_DRIVE: 'new-drive' }, { ...override, BACKUP_STORAGE_FOLDER_ID: '../bad' }, { ...override, BACKUP_STORAGE_TEAM_DRIVE: ' ' }]) {
    const result = check(extra);
    assert.equal(result.status, 1); assert.equal(result.calls.length, 1);
    assert.equal(result.calls[0].env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID, google.folder_id);
  }
});
test('test-drive only checks destination and does not parse or copy Storage', () => {
  const result = check({ ...override, BACKUP_MODE: 'test-drive', SOURCE_CONFIG: 'invalid-json' });
  assert.equal(result.status, 0); assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].script, 'scripts/verify-backup-drive.mjs');
  const failed = check({ ...override, BACKUP_MODE: 'test-drive' }, [1]);
  assert.equal(failed.status, 1); assert.equal(failed.calls.length, 1);
});
test('incomplete test destination stops before any subprocess or Storage access', () => {
  const result = check({ BACKUP_MODE: 'test-drive', BACKUP_STORAGE_FOLDER_ID: 'new-folder' });
  assert.equal(result.status, 1); assert.equal(result.calls.length, 0);
});
test('invalid identity, mode or missing token prevents all subprocesses', () => {
  for (const extra of [{ BACKUP_MODE: 'unknown' }, { GOOGLE_CONFIG: '{}' }, { GOOGLE_CONFIG: 'bad' }, { GOOGLE_ACCESS_TOKEN: '' }]) {
    const result = check(extra); assert.equal(result.status, 1); assert.equal(result.calls.length, 0);
    assert.ok(!JSON.stringify(result.messages).includes(source.secret_access_key));
  }
});
test('abnormal or failed copy is not reported as successful', () => {
  assert.equal(check({}, [null]).status, 1);
  assert.equal(check({}, [1]).status, 1);
  assert.equal(check(override, [0, 1]).status, 1);
});
