// Read only an explicitly named routing file in the established private backup root.
// IDs stay in Drive/GitHub's masked environment; hashes bind the authorized destination.
import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const authorized = {
  folder: 'a54cd0780affff7d1a0d6c551f40dd3bb470f646e296d907c984cb14efa8bac6',
  drive: '7e337d9ebdfa992cc7cb6f0fa21c7453add7b4acd280d0f12729e20d55172997',
};
export class DestinationError extends Error {}
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
const hash = value => createHash('sha256').update(value).digest('hex');

// Diagnostic only: never changes routing, permissions or credentials. Report
// booleans/status codes instead of private IDs, account names or provider errors.
export async function diagnoseDestinations({ environment = process.env, fetcher = fetch, report = console.log, expected = authorized } = {}) {
  try {
    const config = JSON.parse(environment.GOOGLE_CONFIG);
    if (!environment.GOOGLE_ACCESS_TOKEN) throw Error('missing');
    report('Backup identity matches reviewed account: ' + (typeof config.service_account === 'string' && hash(config.service_account) === '9cd459c00cc7a10e52295ed0e6d87893f0ef8154690770213750629c68ec8689'));
    const roots = [['original', config.folder_id, config.team_drive], ['override', environment.BACKUP_STORAGE_FOLDER_ID, environment.BACKUP_STORAGE_TEAM_DRIVE]];
    for (const [label, folder, drive] of roots) {
      if (!folder && !drive) { report(`Backup ${label}: absent`); continue; }
      if (!validId(folder) || !validId(drive)) { report(`Backup ${label}: invalid configuration`); continue; }
      report(`Backup ${label} matches authorized folder/drive: ${hash(folder) === expected.folder}/${hash(drive) === expected.drive}`);
      try {
        const url = new URL(`https://www.googleapis.com/drive/v3/files/${folder}`);
        url.searchParams.set('supportsAllDrives', 'true');
        url.searchParams.set('fields', 'id,mimeType,driveId,trashed,capabilities(canAddChildren)');
        const response = await fetcher(url, { headers: { Authorization: `Bearer ${environment.GOOGLE_ACCESS_TOKEN}` }, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(20000) });
        if (!response.ok) { report(`Backup ${label} metadata HTTP ${Number(response.status)}`); continue; }
        const metadata = await response.json();
        report(`Backup ${label} metadata: folder=${metadata.id === folder && metadata.mimeType === 'application/vnd.google-apps.folder'}, drive=${metadata.driveId === drive}, trashed=${metadata.trashed === true}, canAddChildren=${metadata.capabilities?.canAddChildren === true}`);
      } catch { report(`Backup ${label} metadata unavailable`); }
    }
  } catch { report('Backup destination diagnostics unavailable'); }
}

export async function privateDestination({ environment = process.env, fetcher = fetch, expected = authorized } = {}) {
  const original = JSON.parse(environment.GOOGLE_CONFIG);
  if (!validId(original.folder_id) || !environment.GOOGLE_ACCESS_TOKEN) throw new DestinationError('Private destination identity unavailable.');
  async function request(url, text = false) {
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${environment.GOOGLE_ACCESS_TOKEN}` }, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new DestinationError(`Private destination lookup denied (HTTP ${Number(response.status)}).`);
    return text ? response.text() : response.json();
  }
  async function verifyRoute(route) {
    if (route.version !== 1 || !validId(route.folder_id) || !validId(route.team_drive)) throw new DestinationError('Private destination fields are invalid.');
    if (hash(route.folder_id) !== expected.folder || hash(route.team_drive) !== expected.drive) throw new DestinationError('Private destination does not match the authorized route.');
    const target = new URL(`https://www.googleapis.com/drive/v3/files/${route.folder_id}`);
    target.searchParams.set('supportsAllDrives', 'true');
    target.searchParams.set('fields', 'id,mimeType,driveId,trashed,capabilities(canAddChildren)');
    const metadata = await request(target);
    if (metadata.id !== route.folder_id || metadata.mimeType !== 'application/vnd.google-apps.folder' || metadata.trashed || metadata.driveId !== route.team_drive) throw new DestinationError('Google reports a different destination folder or shared drive.');
    if (metadata.capabilities?.canAddChildren !== true) throw new DestinationError('The backup account cannot add files to the destination folder.');
    return { folder_id: route.folder_id, team_drive: route.team_drive };
  }
  if(environment.BACKUP_STORAGE_FOLDER_ID||environment.BACKUP_STORAGE_TEAM_DRIVE){
    return verifyRoute({version:1,folder_id:environment.BACKUP_STORAGE_FOLDER_ID,team_drive:environment.BACKUP_STORAGE_TEAM_DRIVE});
  }
  const list = new URL('https://www.googleapis.com/drive/v3/files');
  list.searchParams.set('q', `'${original.folder_id}' in parents and name = 'backup-destination.json' and trashed = false`);
  list.searchParams.set('fields', 'nextPageToken,files(id,mimeType,size)');
  list.searchParams.set('pageSize', '2');
  list.searchParams.set('supportsAllDrives', 'true');
  list.searchParams.set('includeItemsFromAllDrives', 'true');
  const listing = await request(list);
  if (!Array.isArray(listing.files) || listing.nextPageToken || listing.files.length > 1) throw new DestinationError('Private destination file is ambiguous.');
  if (!listing.files.length) return verifyRoute({version:1,folder_id:original.folder_id,team_drive:original.team_drive});
  const file = listing.files[0];
  if (!validId(file.id) || file.mimeType !== 'application/json' || !Number.isFinite(Number(file.size)) || Number(file.size) < 1 || Number(file.size) > 4096) throw new DestinationError('Private destination file is invalid.');
  const raw = await request(new URL(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`), true);
  if (Buffer.byteLength(raw) > 4096) throw new DestinationError('Private destination file exceeds its limit.');
  let route;
  try { route = JSON.parse(raw); } catch { throw new DestinationError('Private destination file is not valid JSON.'); }
  return verifyRoute(route);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await diagnoseDestinations();
  try {
    const route = await privateDestination();
    if (!route) throw new DestinationError('No verified destination available. No Storage copy authorized.');
    else {
      if (!process.env.GITHUB_ENV) throw new DestinationError('Masked workflow environment unavailable.');
      console.log(`::add-mask::${route.folder_id}`);
      console.log(`::add-mask::${route.team_drive}`);
      await appendFile(process.env.GITHUB_ENV, `BACKUP_VERIFIED_FOLDER_ID=${route.folder_id}\nBACKUP_VERIFIED_TEAM_DRIVE=${route.team_drive}\n`);
      console.log('Authorized private destination verified directly with Google.');
      console.log('Repository folder setting agrees: ' + (process.env.BACKUP_STORAGE_FOLDER_ID === route.folder_id));
      console.log('Repository shared-drive setting agrees: ' + (process.env.BACKUP_STORAGE_TEAM_DRIVE === route.team_drive));
    }
  } catch (error) {
    console.error(error instanceof DestinationError ? error.message : 'Private destination lookup unavailable. No identifiers or credentials logged.');
    process.exitCode = 1;
  }
}
