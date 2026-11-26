// Ten identical clients against one explicitly named disposable PostgreSQL DB.
import {spawn,spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const container=process.argv[2],database=process.argv[3];
if(!container||!/^moderno-idempotent-(fictional|final)$|^[a-f0-9]{64}$/.test(container))throw Error('Pass the explicitly created disposable PostgreSQL container');
if(database!=='moderno_idempotent_concurrency')throw Error('Pass the dedicated disposable database name');
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const prefix=['--host=unix:///var/run/docker.sock','exec','-i',container,'psql','-U','postgres','-d',database,'-X','-At','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate'];
function run(sql){return new Promise(resolve=>{const process=spawn('docker',prefix,{env,stdio:['pipe','pipe','pipe']});let out='',error='';process.stdout.on('data',chunk=>out+=chunk);process.stderr.on('data',chunk=>error+=chunk);process.on('error',()=>resolve({code:-1,out:'',error:'docker unavailable'}));process.on('close',code=>resolve({code,out:out.trim(),error}));process.stdin.end(sql);});}
const image=spawnSync('docker',['--host=unix:///var/run/docker.sock','inspect','--format','{{.Config.Image}}',container],{env,encoding:'utf8'});
const declaredImage=image.stdout.trim();
if(image.status!==0||!(declaredImage.startsWith('postgres:17-alpine')||/^[a-f0-9]{12,64}$/.test(declaredImage)))throw Error('Expected local disposable PostgreSQL image');

const study='00000000-0000-4000-8000-000000000001',actor='00000000-0000-4000-8000-000000000011';
const version=await run('show server_version_num;');
if(version.code||!/^17[0-9]{4}$/.test(version.out))throw Error('Expected PostgreSQL 17');
const guard=await run(`select (select count(*)=1 from auth.users where id='${actor}') and (select count(*)=1 from public.miembros where estudio_id='${study}' and user_id='${actor}') and (select count(*)=1 from public.datos_estudio where estudio_id='${study}' and bloque='proyectos') and to_regprocedure('public.app_guardar_lote_v2(uuid,jsonb)') is not null;`);
if(guard.code||guard.out!=='t')throw Error('Requires the exact fictional idempotency fixture');
const base=await run(`select updated_at from public.datos_estudio where estudio_id='${study}' and bloque='proyectos';`);
if(base.code||!/^[0-9]{4}-/.test(base.out))throw Error('Invalid fixture baseline');
const request={v:2,requestId:'50000000-0000-4000-8000-000000000001',cambios:[{bloque:'proyectos',base:base.out,cambios:[{op:'set',path:['0','name'],value:'Una sola escritura'}]}]};
const body=JSON.stringify(request).replaceAll("'","''"),started=performance.now();
const results=await Promise.all(Array.from({length:10},()=>run(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);select public.app_guardar_lote_v2('${study}','${body}'::jsonb);commit;`)));
if(results.some(result=>result.code!==0))throw Error('Every identical concurrent retry must succeed: '+results.find(result=>result.code!==0)?.error);
const replies=results.map(result=>{const line=result.out.split('\n').findLast(value=>value.startsWith('{'));if(!line)throw Error('Missing v2 response');return JSON.parse(line);});
if(replies.filter(reply=>reply.replayed===false).length!==1||replies.filter(reply=>reply.replayed===true).length!==9)throw Error('Expected one commit and nine idempotent replays');
const versions=new Set(replies.map(reply=>reply.bloques?.[0]?.updated_at));if(versions.size!==1)throw Error('Concurrent replays returned different versions');
const verified=await run(`select (select count(*)=1 from app_private.save_requests where estudio_id='${study}' and actor_id='${actor}' and request_id='${request.requestId}') and (select contenido#>>'{0,name}'='Una sola escritura' from public.datos_estudio where estudio_id='${study}' and bloque='proyectos');`);
if(verified.code||verified.out!=='t')throw Error('Concurrent replay changed data or ledger more than once');
console.log(JSON.stringify({fictional:true,parallelClients:10,commits:1,replays:9,receipts:1,ms:Math.round(performance.now()-started)}));
