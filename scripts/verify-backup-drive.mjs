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
  // Exercise an upload arriving while the snapshot is already being verified.
  // It belongs to the next snapshot; all initial objects still need byte checks.
  await backup(async(args,input)=>{
    if(args[0]==='check')await writeFile('fixture/added-during-backup.txt','Only in the next snapshot.');
    return rclone(args,input);
  }, 'fixture', id);
  const manifest=JSON.parse(await rclone(['cat',`destination:${id}/manifest.json`]));
  if(manifest.scope!=='initial-inventory'||manifest.objects.length!==2||manifest.newObjectsAfterInventory!==1)throw new Error('Invalid synthetic snapshot scope');
  await rclone(['copy', `destination:${id}/objects`, 'restored', '--immutable','--files-from-raw','-'],manifest.objects.map(object=>object.Path).join('\n')+'\n');
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
