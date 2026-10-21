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

export async function backup(run, bucket, id, { verifyOnly = false } = {}) {
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(bucket) || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid backup parameters');
  const source = `source:${bucket}`;
  const root = `destination:${id}`;
  const before = inventory(await run(['lsjson', source, '--recursive', '--files-only']));
  // Recovery targets only an incomplete same-day snapshot selected below.
  // Existing objects stay untouched; only absent files may be added.
  await run(['copy', source, `${root}/objects`, '--immutable', ...(verifyOnly ? ['--ignore-existing', '--no-traverse'] : [])]);
  // Read back and compare bytes, rather than relying on filenames or timestamps.
  await run(['check', source, `${root}/objects`, '--download']);
  const after = inventory(await run(['lsjson', source, '--recursive', '--files-only']));
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during backup; retry in a new snapshot');
  await run(['rcat', `${root}/manifest.json`], JSON.stringify({ version: 1, objects: after }));
  // A partial run is never labelled complete. No delete, sync or source writes.
  await run(['rcat', `${root}/COMPLETE.json`], JSON.stringify({ version: 1, verifiedAt: new Date().toISOString(), count: after.length }));
}

export async function incompleteSnapshot(run, now = new Date()) {
  const day = now.toISOString().slice(0,10).replaceAll('-','');
  const names = (await run(['lsf','destination:','--dirs-only'])).split('\n')
    .filter(name => /^\d{8}T\d{9}Z-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/$/.test(name) && name.startsWith(day+'T')).sort().reverse();
  for (const name of names.slice(0,5)) {
    const id = name.slice(0,-1);
    const files = (await run(['lsf',`destination:${id}`,'--files-only','--max-depth','1'])).split('\n');
    // Never rewrite a completed or partially written historical manifest.
    if (!files.includes('COMPLETE.json') && !files.includes('manifest.json')) return id;
  }
  throw Error('No incomplete same-day snapshot available for verification');
}

export function failureCategory(diagnostic) {
  const known = diagnostic.match(/accessNotConfigured|insufficientFilePermissions|teamDriveMembershipRequired|notFound|invalid_grant|unauthorized_client|insufficientPermissions|rateLimitExceeded|storageQuotaExceeded|directory not found|couldn't find root directory|empty token|failed to get token|didn't find section in config file/i)?.[0];
  if (known) return known;
  const patterns = [
    ['s3-object-missing', /NoSuchKey/i],
    ['s3-read-error', /(?:S3: )?(?:GetObject|HeadObject)/i],
    ['drive-read-error', /googleapi: Error/i],
    ['content-mismatch', /corrupted on transfer|hashes differ|contents differ|sizes differ|files differ|\b[1-9]\d* differences found/i],
    ['missing-file', /file not in|not found in|missing on (source|destination)|\b404\b/i],
    ['download-error', /failed to (open|read|download)|error (reading|downloading)|failed to check/i],
    ['permission-denied', /permission denied|access denied|\b403\b/i],
    ['rate-limit', /too many requests|\b429\b/i],
    ['timeout', /timed? ?out|deadline exceeded|context canceled/i],
    ['hash-unavailable', /no (common|matching) hash|hash (type )?not supported/i],
  ];
  return patterns.filter(([,pattern])=>pattern.test(diagnostic)).map(([category])=>category).join(',') || 'unclassified';
}

// Stream the documented --combined report. Keep counts only; paths never leave
// this process, enter logs or become a reason to accept a failed byte check.
export function createCheckReport() {
  let pending='';
  const counts={identical:0,missingSource:0,missingDestination:0,different:0,readErrors:0};
  const keys={'=':'identical','-':'missingSource','+':'missingDestination','*':'different','!':'readErrors'};
  return {
    feed(chunk){
      pending+=String(chunk);let end;
      while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line[1]===' '&&keys[line[0]])counts[keys[line[0]]]++;}
      if(pending.length>8192)pending='';
    },
    summary(){return {...counts};}
  };
}

export function rcloneArguments(args) {
  // ListR avoids one S3 query per virtual directory. This changes traversal,
  // never byte verification, source permissions or destination immutability.
  return [...args, ...(['lsjson','copy','check'].includes(args[0]) ? ['--fast-list'] : []), ...(args[0]==='check'?['--combined','-']:[]), '--log-level','ERROR','--stats','0'];
}

export function rclone(args, input) {
  return new Promise((resolve, reject) => {
    const isCheck=args[0]==='check',report=createCheckReport();
    const child = spawn('rclone', rcloneArguments(args), { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { if(isCheck)report.feed(data);else output += data; });
    // Publish only known error categories, never object names or provider payloads.
    let diagnostic = '';
    child.stderr.on('data', data => { diagnostic = (diagnostic + data).slice(-8192); });
    child.on('error', () => reject(new Error('Cannot start rclone')));
    child.on('close', code => {
      const category = failureCategory(diagnostic);
      if(isCheck){report.feed('\n');console.log('Backup byte comparison: '+JSON.stringify(report.summary()));}
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
    try {
      const verifyOnly = process.env.BACKUP_VERIFY_ONLY === '1';
      const id = verifyOnly ? await incompleteSnapshot(rclone) : new Date().toISOString().replace(/[^0-9TZ]/g, '') + '-' + randomUUID();
      await backup(rclone, process.env.BACKUP_BUCKET, id, { verifyOnly }); console.log('Copy verified.');
    }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
