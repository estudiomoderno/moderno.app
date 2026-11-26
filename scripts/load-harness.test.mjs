import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {assertIsolatedTarget,deterministicUuid,REQUIRED_ACK} from './load/safety.mjs';
import {pseudoRandomText} from './load/seed.mjs';
import {loadFixturePlan,reconstructRecoveryManifest} from './load/recovery-manifest.mjs';
import {stableRequestUuid} from './load/request-id.mjs';

const isolated={url:'https://abcdefghijklmnopqrst.supabase.co',allowedRef:'abcdefghijklmnopqrst',ack:REQUIRED_ACK,runId:'load-20261123-smoke'};

test('la proteccion acepta solo un proyecto Supabase aislado y coincidente',()=>{
  assert.equal(assertIsolatedTarget(isolated).ref,isolated.allowedRef);
});

test('la proteccion rechaza todos los identificadores conocidos de produccion',()=>{
  for(const change of [
    {url:'https://auth.moderno.app'},
    {url:'https://cgqtylvaapwbuwqvpjtb.supabase.co',allowedRef:'cgqtylvaapwbuwqvpjtb'},
    {url:'https://abcdefghijklmnopqrst.supabase.co',allowedRef:'zzzzzzzzzzzzzzzzzzzz'},
    {ack:'si'},
  ])assert.throws(()=>assertIsolatedTarget({...isolated,...change}));
});

test('los UUID del fixture son deterministas y distintos',()=>{
  const first=deterministicUuid(isolated.runId,'study',0);
  assert.match(first,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(first,deterministicUuid(isolated.runId,'study',0));
  assert.notEqual(first,deterministicUuid(isolated.runId,'study',1));
});

test('el requestId v2 permanece estable para el mismo intento y cambia entre operaciones',()=>{
  const args=['load-20261123-smoke','00000000-0000-4000-8000-000000000001','save',7];
  const first=stableRequestUuid(...args);
  assert.match(first,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(first,stableRequestUuid(...args));
  assert.notEqual(first,stableRequestUuid(...args.slice(0,3),8));
  assert.notEqual(first,stableRequestUuid(args[0],args[1],'replay',args[3]));
});

test('el contenido grande es reproducible y no es una cadena compresible uniforme',()=>{
  const a=pseudoRandomText(20261123,65536),b=pseudoRandomText(20261123,65536);
  assert.equal(a,b);assert.equal(a.length,65536);
  assert.ok(new Set(a).size>50);
  assert.notEqual(a.slice(0,1024),a.slice(1024,2048));
});

test('la configuracion fija suma 1.000 identidades y 250 estudios',async()=>{
  const config=JSON.parse(await readFile(new URL('./load/config-1000.json',import.meta.url),'utf8'));
  assert.equal(config.identities,1000);assert.equal(config.studies,250);
  assert.equal(config.studies*config.membersPerStudy,config.identities);
  assert.equal(config.documents.reduce((sum,row)=>sum+row.studies,0),config.studies);
  for(const profile of ['replay','noop','array-sync','limits','concurrent-1000'])assert.ok(config.profiles[profile]);
  assert.equal(config.profiles['concurrent-1000'].vus,1000);assert.equal(config.profiles['concurrent-1000'].iterations,1);
});

test('el manifiesto de recuperacion se reconstruye sin artefacto ni credenciales',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'moderno-load-recovery-')),output=join(directory,'users.json');
  try{
    const result=await reconstructRecoveryManifest({
      LOAD_SUPABASE_URL:isolated.url,LOAD_ALLOWED_PROJECT_REF:isolated.allowedRef,
      LOAD_ISOLATION_ACK:isolated.ack,LOAD_RUN_ID:isolated.runId,LOAD_USERS_FILE:output,
    });
    const manifest=JSON.parse(await readFile(output,'utf8'));
    assert.equal(result.studies,250);assert.equal(result.expectedUsers,1000);
    assert.equal(manifest.runId,isolated.runId);assert.equal(manifest.projectRef,isolated.allowedRef);
    assert.equal(manifest.studies.length,250);assert.equal(manifest.expectedEmails.length,1000);assert.deepEqual(manifest.users,[]);
    assert.equal(manifest.studies[0].id,deterministicUuid(isolated.runId,'study',0));
    assert.doesNotMatch(JSON.stringify(manifest),/accessToken|Bearer |eyJ/);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('la reconstruccion conserva exactamente el plan usado por la siembra',async()=>{
  const first=await loadFixturePlan(isolated.runId,isolated.allowedRef,{createdAt:'2026-11-23T00:00:00.000Z'});
  const second=await loadFixturePlan(isolated.runId,isolated.allowedRef,{createdAt:'2026-11-23T00:00:00.000Z'});
  assert.deepEqual(first.manifest,second.manifest);assert.deepEqual(first.studies,second.studies);assert.deepEqual(first.identities,second.identities);
  assert.equal(first.identities[999].email,`load.${isolated.runId}.0999@example.invalid`);
});

test('el script k6 mantiene las barreras contra produccion y usa tasa constante',async()=>{
  const source=await readFile(new URL('./load/save-path.k6.js',import.meta.url),'utf8');
  assert.match(source,/constant-arrival-rate/);
  assert.match(source,/auth\.moderno\.app/);
  assert.match(source,/cgqtylvaapwbuwqvpjtb/);
  assert.match(source,/LOAD_ALLOWED_PROJECT_REF/);
  assert.match(source,/CARGA_FICTICIA_EN_MODERNO_PRUEBAS/);
  assert.match(source,/app_guardar_lote_v2/);
  assert.match(source,/replayed===true/);
  assert.match(source,/changed===false/);
  assert.match(source,/op:'array_sync'/);
  assert.match(source,/length:64/);
  assert.match(source,/length:65|\.\.\.ops/);
  assert.match(source,/per-vu-iterations[\s\S]*concurrentUserOnce/);assert.match(source,/exec\.vu\.idInTest/);
  assert.match(source,/projects\.length===1[\s\S]*_loadRun===fixture\.runId/);assert.match(source,/cross-study-denied/);
});

test('workflow y metricas usan v2 por defecto y conservan legacy solo como baseline',async()=>{
  const workflow=await readFile(new URL('../.github/workflows/load-save-staging.yml',import.meta.url),'utf8');
  const metrics=await readFile(new URL('./load/server-metrics.sql',import.meta.url),'utf8');
  assert.match(workflow,/default: v2/);assert.match(workflow,/options: \[v2, legacy\]/);
  for(const profile of ['replay','noop','array-sync','limits','concurrent-1000'])assert.match(workflow,new RegExp(profile));
  assert.match(workflow,/actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(workflow,/actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(workflow,/retention-days: 30/);
  const jobEnv=workflow.slice(workflow.indexOf('    env:'),workflow.indexOf('    steps:'));
  assert.doesNotMatch(jobEnv,/secrets\./);assert.match(workflow,/LOAD_RECOVERY_FILE=.*recovery-manifest\.json/);
  assert.match(workflow,/LOAD_USERS_FILE=\$LOAD_RECOVERY_FILE/);assert.match(workflow,/node scripts\/load\/recovery-manifest\.mjs/);
  assert.match(metrics,/app_guardar_lote_v2/);assert.match(metrics,/app_guardar_lote_delta/);
  assert.match(metrics,/app_private\.save_requests/);
  assert.match(metrics,/load_receipts_within_ttl/);
  assert.match(metrics,/interval '30 days'/);
  assert.doesNotMatch(metrics,/max\(per_actor\)<=32/);
});

test('la limpieza elimina primero el historial no enlazado y verifica que no quede fixture',async()=>{
  const source=await readFile(new URL('./load/teardown.mjs',import.meta.url),'utf8');
  const history=source.indexOf("remove(`/rest/v1/datos_estudio_hist?estudio_id=in."),documents=source.indexOf("remove(`/rest/v1/datos_estudio?estudio_id=in.");
  assert.ok(history>=0&&documents>history);
  assert.match(source,/verifyEmpty\(`\/rest\/v1\/datos_estudio_hist\?select=id&limit=1/);
  assert.match(source,/verifyEmpty\(`\/rest\/v1\/datos_estudio\?select=estudio_id&limit=1/);
  assert.match(source,/verifyEmpty\(`\/rest\/v1\/miembros\?select=user_id&limit=1/);
  assert.match(source,/verifyEmpty\(`\/rest\/v1\/estudios\?select=id&limit=1/);
  assert.match(source,/user_metadata\?\.load_run===runId/);assert.match(source,/auth\.users aun contiene usuarios del run/);
});

test('la siembra declara objetivos antes de escribir y recupera respuestas Auth perdidas',async()=>{
  const source=await readFile(new URL('./load/seed.mjs',import.meta.url),'utf8');
  assert.match(source,/loadFixturePlan\(runId,ref,\{createdAt\}\)/);
  assert.ok(source.indexOf('await persist();')<source.indexOf("request('/rest/v1/estudios?on_conflict=id'"));
  assert.match(source,/resolution=ignore-duplicates,return=minimal/);assert.match(source,/async function findCreatedUser/);
  assert.match(source,/user\.user_metadata\?\.load_run===runId/);assert.match(source,/const recovered=await findCreatedUser\(identity\.email\)/);
  assert.match(source,/manifest=\{\.\.\.recoveryManifest,users:\[\]\}/);assert.match(source,/writeFile\(recoveryOutput/);
});
