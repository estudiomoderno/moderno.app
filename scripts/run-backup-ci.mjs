import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function runBackup({ environment = process.env, run = spawnSync, report = console.error } = {}) {
  try {
    const google = JSON.parse(environment.GOOGLE_CONFIG);
    const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
    if (!validId(google.folder_id) || !validId(google.team_drive) || !environment.GOOGLE_ACCESS_TOKEN) throw Error('Invalid configuration');
    const test = environment.BACKUP_MODE === 'test-drive';
    if (!test && !['backup','verify-copy'].includes(environment.BACKUP_MODE)) throw Error('Invalid mode');
    const folder = environment.BACKUP_STORAGE_FOLDER_ID || '';
    const drive = environment.BACKUP_STORAGE_TEAM_DRIVE || '';
    const overridden = Boolean(folder || drive);
    const validOverride = validId(folder) && validId(drive);
    const env = { ...environment,
      RCLONE_CONFIG_DESTINATION_TOKEN: JSON.stringify({ access_token: environment.GOOGLE_ACCESS_TOKEN, token_type: 'Bearer', expiry: new Date(Date.now() + 3500_000).toISOString() }),
      RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID: google.folder_id,
      RCLONE_CONFIG_DESTINATION_TEAM_DRIVE: google.team_drive,
      BACKUP_VERIFY_ONLY: environment.BACKUP_MODE === 'verify-copy' ? '1' : environment.BACKUP_VERIFY_ONLY || '0',
    };
    // The synthetic destination check never receives Storage credentials.
    for (const key of Object.keys(env)) {
      if (['GOOGLE_CONFIG', 'SOURCE_CONFIG', 'GOOGLE_ACCESS_TOKEN', 'BACKUP_BUCKET', 'BACKUP_STORAGE_FOLDER_ID', 'BACKUP_STORAGE_TEAM_DRIVE'].includes(key) || key.startsWith('RCLONE_CONFIG_SOURCE_')) delete env[key];
    }
    let destinationFailed = overridden && !validOverride;
    if (overridden && validOverride) {
      env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID = folder;
      env.RCLONE_CONFIG_DESTINATION_TEAM_DRIVE = drive;
    }
    const execute = script => run(process.execPath, [script], { env: { ...env }, stdio: 'inherit' }).status === 0;
    if (!destinationFailed && (test || overridden)) destinationFailed = !execute('scripts/verify-backup-drive.mjs');
    if (test) {
      if (destinationFailed) report('Destination not verified. No Storage copy started.');
      return destinationFailed ? 1 : 0;
    }
    if (destinationFailed) {
      // Keep making backups in the established destination if a proposed route fails.
      env.RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID = google.folder_id;
      env.RCLONE_CONFIG_DESTINATION_TEAM_DRIVE = google.team_drive;
      report('New destination not verified. Keeping this backup in the original destination.');
    }
    const source = JSON.parse(environment.SOURCE_CONFIG);
    Object.assign(env, {
      BACKUP_BUCKET: source.bucket,
      RCLONE_CONFIG_SOURCE_ENDPOINT: source.endpoint,
      RCLONE_CONFIG_SOURCE_REGION: source.region,
      RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID: source.access_key_id,
      RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY: source.secret_access_key,
    });
    const copied = execute('scripts/backup-storage.mjs');
    // Report the route failure even when the fallback backup succeeded.
    return copied && !destinationFailed ? 0 : 1;
  } catch {
    report('Invalid backup configuration or failed process. Copy not confirmed.');
    return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = runBackup();
