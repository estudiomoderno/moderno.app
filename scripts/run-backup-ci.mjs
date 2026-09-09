import { spawnSync } from 'node:child_process';
try {
  const google = JSON.parse(process.env.GOOGLE_CONFIG);
  const env = { ...process.env,
    RCLONE_CONFIG_DESTINATION_TOKEN: JSON.stringify({ access_token: process.env.GOOGLE_ACCESS_TOKEN, token_type: 'Bearer', expiry: new Date(Date.now() + 3500_000).toISOString() }),
    RCLONE_CONFIG_DESTINATION_ROOT_FOLDER_ID: google.folder_id,
    RCLONE_CONFIG_DESTINATION_TEAM_DRIVE: google.team_drive,
  };
  const test = process.env.BACKUP_MODE === 'test-drive';
  if (!test && process.env.BACKUP_MODE !== 'backup') throw new Error('Invalid mode');
  if (!test) {
    const source = JSON.parse(process.env.SOURCE_CONFIG);
    Object.assign(env, {
      BACKUP_BUCKET: source.bucket,
      RCLONE_CONFIG_SOURCE_ENDPOINT: source.endpoint,
      RCLONE_CONFIG_SOURCE_REGION: source.region,
      RCLONE_CONFIG_SOURCE_ACCESS_KEY_ID: source.access_key_id,
      RCLONE_CONFIG_SOURCE_SECRET_ACCESS_KEY: source.secret_access_key,
    });
  }
  delete env.GOOGLE_CONFIG;
  delete env.SOURCE_CONFIG;
  delete env.GOOGLE_ACCESS_TOKEN;
  const result = spawnSync(process.execPath, [test ? 'scripts/verify-backup-drive.mjs' : 'scripts/backup-storage.mjs'], { env, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} catch {
  console.error('Invalid backup configuration. No copy started.');
  process.exitCode = 1;
}
