// Explicit disposable Docker container only; never accepts a database URL.
import {spawn,spawnSync} from 'node:child_process';import {performance} from 'node:perf_hooks';
const container=process.argv[2];
if(!container||!/^moderno-delta-(fictional|final)$|^[a-f0-9]{64}$/.test(container))throw Error('Pass the explicitly created disposable PostgreSQL container');
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const prefix=['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-U','postgres','-X','-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'];
function run(sql){return new Promise(resolve=>{const p=spawn('docker',prefix,{env,stdio:['pipe','pipe','pipe']});let out='',error='';p.stdout.on('data',c=>out+=c);p.stderr.on('data',c=>error+=c);p.on('error',()=>resolve({code:-1,out:'',error:'docker unavailable'}));p.on('close',code=>resolve({code,out:out.trim(),error}));p.stdin.end(sql);});}
const image=spawnSync('docker',['--host=unix:///var/run/docker.sock','inspect','--format','{{.Config.Image}}',container],{env,encoding:'utf8'});
if(image.status!==0||!image.stdout.trim().startsWith('postgres:17-alpine'))throw Error('Expected local disposable PostgreSQL 17');
const eid='00000000-0000-0000-0000-000000000001';
const guard=await run(`select (select count(*)=0 from auth.users) and (select count(*)=2 and bool_and(estudio_id='${eid}'::uuid and user_id in ('00000000-0000-0000-0000-000000000011'::uuid,'00000000-0000-0000-0000-000000000012'::uuid)) from public.miembros) and (select count(*)=2 and bool_and(estudio_id='${eid}'::uuid) from public.datos_estudio);`);
if(guard.code||guard.out!=='t')throw Error('Requires the exact fictional delta fixture, with no auth users');
const start=performance.now();let successes=0,conflicts=0;
for(let wave=0;wave<5;wave++){
 const base=await run(`select updated_at from public.datos_estudio where estudio_id='${eid}' and bloque='proyectos';`);
 if(base.code||!/^\d{4}-[\d\s:.+\-]+$/.test(base.out))throw Error('Invalid fixture baseline');
 const results=await Promise.all(Array.from({length:10},(_,i)=>run(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);select public.app_guardar_lote_delta('${eid}','${JSON.stringify([{bloque:'proyectos',base:base.out,cambios:[{op:'set',path:['0','rooms','0','sections','0','items','0','qty'],value:wave*10+i+1}]}])}'::jsonb);commit;`)));
 const won=results.filter(r=>r.code===0).length,stale=results.filter(r=>r.code!==0&&r.error.includes('PT409')).length;
 if(won!==1||stale!==9)throw Error('Concurrent requests must produce exactly one confirmed version and nine explicit conflicts');
 successes+=won;conflicts+=stale;
}
console.log(JSON.stringify({fictional:true,waves:5,parallelClients:10,successes,conflicts,ms:Math.round(performance.now()-start)}));
