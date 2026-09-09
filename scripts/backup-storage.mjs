// rclone remotes: source (read from Storage), destination (private Drive folder).
// Credentials come from environment variables, never from the repository.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function inventory(text) {
  const items = JSON.parse(text);
  if (!Array.isArray(items) || items.length === 0) throw new Error('Empty or invalid source inventory');
  return items.map(({ Path, Size, ModTime }) => {
    if (typeof Path !== 'string' || !Number.isFinite(Size) || typeof ModTime !== 'string') throw new Error('Invalid object metadata');
    return { Path, Size, ModTime };
  }).sort((a, b) => a.Path.localeCompare(b.Path));
}

export async function backup(run, bucket, id) {
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(bucket) || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid backup parameters');
  const source = `source:${bucket}`;
  const root = `destination:${id}`;
  const before = inventory(await run(['lsjson', source, '--recursive', '--files-only']));
  await run(['copy', source, `${root}/objects`, '--immutable']);
  // Read back and compare bytes, rather than relying on filenames or timestamps.
  await run(['check', source, `${root}/objects`, '--download']);
  const after = inventory(await run(['lsjson', source, '--recursive', '--files-only']));
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during backup; retry in a new snapshot');
  await run(['rcat', `${root}/manifest.json`], JSON.stringify({ version: 1, objects: after }));
  // A partial run is never labelled complete. No delete, sync or source writes.
  await run(['rcat', `${root}/COMPLETE.json`], JSON.stringify({ version: 1, verifiedAt: new Date().toISOString(), count: after.length }));
}

export function rclone(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('rclone', [...args, '--log-level', 'ERROR', '--stats', '0'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    // Publish only known error categories, never object names or provider payloads.
    let diagnostic = '';
    child.stderr.on('data', data => { diagnostic = (diagnostic + data).slice(-8192); });
    child.on('error', () => reject(new Error('Cannot start rclone')));
    child.on('close', code => {
      const category = diagnostic.match(/accessNotConfigured|insufficientFilePermissions|teamDriveMembershipRequired|notFound|invalid_grant|unauthorized_client|insufficientPermissions|rateLimitExceeded|storageQuotaExceeded|directory not found|couldn't find root directory|empty token|failed to get token|didn't find section in config file/i)?.[0] ?? 'unclassified';
      code === 0 ? resolve(output) : reject(new Error(`Backup step ${args[0]} failed (${category})`));
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const required = ['BACKUP_BUCKET', 'RCLONE_CONFIG_SOURCE_ENDPOINT', 'RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID', 'RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY', 'RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID', 'RCLONE_CONFIG_DESTINATION_TEAM_DRIVE'];
  if (required.some(key => !process.env[key]) || !(process.env.RCLONE_CONFIG_DESTINATION_TOKEN || process.env.RCLONE_CONFIG_DESTINATION_SERVICE_ACCOUNT_CREDENTIALS)) {
    console.error('Missing backup configuration. No copy started.');
    process.exitCode = 1;
  } else {
    Object.assign(process.env, {
      RCLONE_CONFIG_SOURCE_TYPE: 's3', RCLONE_CONFIG_SOURCE_PROVIDER: 'Other',
      RCLONE_CONFIG_SOURCE_FORCE_PATH_STYLE: 'true', RCLONE_CONFIG_SOURCE_NO_CHECK_BUCKET: 'true',
      RCLONE_CONFIG_DESTINATION_TYPE: 'drive', RCLONE_CONFIG_DESTINATION_SCOPE: 'drive',
    });
    const id = new Date().toISOString().replace(/[^0-9TZ]/g, '') + '-' + randomUUID();
    try { await backup(rclone, process.env.BACKUP_BUCKET, id); console.log('Copy verified.'); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
