import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,realpath} from 'node:fs/promises';
import {join,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {verifyRecoveryFiles} from './verify-recovery-files.mjs';
async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'moderno-recovery-'));
 t.after(async()=>{const target=await realpath(dir);assert.equal(dirname(target),await realpath(tmpdir()));assert.ok(basename(target).startsWith('moderno-recovery-'));await rm(target,{recursive:true,force:true});});
 const a=join(dir,'backup'),b=join(dir,'recovered');
 for(const d of [a,b]){await mkdir(join(d,'objects','study'),{recursive:true});await writeFile(join(d,'objects','study','file.pdf'),Buffer.from([0,1,2,255]));}
 const manifest={version:1,objects:[{Path:'study/file.pdf',Size:4}]};
 await writeFile(join(a,'manifest.json'),JSON.stringify(manifest));await writeFile(join(a,'COMPLETE.json'),JSON.stringify({version:1,count:1}));
 return {a,b,manifest};
}
test('recovery compares complete binary content',async t=>{const {a,b}=await fixture(t);const r=await verifyRecoveryFiles(a,b);assert.equal(r.count,1);assert.equal(r.bytes,4);assert.equal(r.byteComparison,true);});
test('equal size with different bytes is rejected',async t=>{const {a,b}=await fixture(t);await writeFile(join(b,'objects','study','file.pdf'),Buffer.from([0,1,3,255]));await assert.rejects(verifyRecoveryFiles(a,b),/contenido distinto/);});
test('extra restored file is rejected',async t=>{const {a,b}=await fixture(t);await writeFile(join(b,'objects','extra'),Buffer.from([1]));await assert.rejects(verifyRecoveryFiles(a,b),/adicionales/);});
test('incomplete marker is rejected',async t=>{const {a,b}=await fixture(t);await writeFile(join(a,'COMPLETE.json'),JSON.stringify({version:1,count:2}));await assert.rejects(verifyRecoveryFiles(a,b),/coherente/);});
test('traversal is rejected before reading outside the copy',async t=>{const {a,b,manifest}=await fixture(t);manifest.objects[0].Path='../secret';await writeFile(join(a,'manifest.json'),JSON.stringify(manifest));await assert.rejects(verifyRecoveryFiles(a,b),/no segura/);});
test('case-folded duplicate paths are rejected',async t=>{const {a,b,manifest}=await fixture(t);manifest.objects.push({Path:'Study/FILE.pdf',Size:4});await writeFile(join(a,'manifest.json'),JSON.stringify(manifest));await writeFile(join(a,'COMPLETE.json'),JSON.stringify({version:1,count:2}));await assert.rejects(verifyRecoveryFiles(a,b),/duplicado/);});
