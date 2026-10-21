// Isolated rclone integration. Uses a new temporary directory and local remotes;
// never receives production credentials or contacts an external service.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backup,rclone} from './backup-storage.mjs';

const workspace=await mkdtemp(join(tmpdir(),'backup-snapshot-local-'));
const previous=process.cwd();
const selected={'space in name.txt':'initial one','# literal ; lámpara.txt':'initial two'};
try{
  process.chdir(workspace);
  // Remove inherited provider configuration before creating local remotes.
  for(const key of Object.keys(process.env))if(key.startsWith('RCLONE_')||['GOOGLE_CONFIG','SOURCE_CONFIG','GOOGLE_ACCESS_TOKEN'].includes(key))delete process.env[key];
  Object.assign(process.env,{RCLONE_CONFIG_SOURCE_TYPE:'local',RCLONE_CONFIG_DESTINATION_TYPE:'local'});
  await mkdir('fixture');
  for(const [name,content] of Object.entries(selected))await writeFile(join('fixture',name),content);
  await backup(async(args,input)=>{
    if(args[0]==='check')await writeFile('fixture/late.txt','new upload');
    return rclone(args,input);
  },'fixture','snapshot');
  const manifest=JSON.parse(await readFile('snapshot/manifest.json','utf8'));
  const complete=JSON.parse(await readFile('snapshot/COMPLETE.json','utf8'));
  assert.equal(manifest.objects.length,2);assert.equal(complete.count,2);assert.equal(manifest.newObjectsAfterInventory,1);
  await rclone(['copy','destination:snapshot/objects','restored','--immutable','--files-from-raw','-'],manifest.objects.map(object=>object.Path).join('\n')+'\n');
  assert.deepEqual((await readdir('restored')).sort(),Object.keys(selected).sort());
  for(const [name,content] of Object.entries(selected))assert.equal(await readFile(join('restored',name),'utf8'),content);
  await assert.rejects(backup(async(args,input)=>{
    if(args[0]==='check')await writeFile('fixture/space in name.txt','changed after copy');
    return rclone(args,input);
  },'fixture','changed'));
  await assert.rejects(readFile('changed/COMPLETE.json'));
  console.log('Local snapshot copy and restore verified; concurrent additions excluded, changed content rejected.');
}finally{
  process.chdir(previous);
  await rm(workspace,{recursive:true,force:true});
}
