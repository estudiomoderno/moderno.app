// Synthetic end-to-end test. No production Storage credentials are required.
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { backup, rclone } from './backup-storage.mjs';

const workspace = await mkdtemp(join(tmpdir(), 'backup-test-'));
const previous = process.cwd();
try {
  process.chdir(workspace);
  Object.assign(process.env, {
    RCLONE_CONFIG_SOURCE_TYPE: 'local',
    RCLONE_CONFIG_DESTINATION_TYPE: 'drive',
    RCLONE_CONFIG_DESTINATION_SCOPE: 'drive',
  });
  await mkdir('fixture/nested', { recursive: true });
  const fixtures = { 'nota.txt': Buffer.from('Prueba sintética de recuperación.\n'), 'nested/archivo.bin': randomBytes(4096) };
  for (const [path, content] of Object.entries(fixtures)) await writeFile(join('fixture', path), content);
  const id = 'prueba-' + randomUUID();
  await backup(rclone, 'fixture', id);
  await rclone(['copy', `destination:${id}/objects`, 'restored', '--immutable']);
  for (const [path, expected] of Object.entries(fixtures)) {
    if (!(await readFile(join('restored', path))).equals(expected)) throw new Error('Synthetic restore verification failed');
  }
  console.log('Synthetic copy and restore verified.');
} catch (error) {
  console.error(error.message);
  console.error('Synthetic copy or restore failed. No production data was changed.');
  process.exitCode = 1;
} finally {
  process.chdir(previous);
  await rm(workspace, { recursive: true, force: true });
}
