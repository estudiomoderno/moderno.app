import http from 'k6/http';
import {check,fail} from 'k6';
import exec from 'k6/execution';
import {Counter,Rate,Trend} from 'k6/metrics';
import {SharedArray} from 'k6/data';
import {stableRequestUuid} from './request-id.mjs';

const config=JSON.parse(open('./config-1000.json'));
const fixturePath=__ENV.LOAD_USERS_FILE||'/fixtures/users.json';
const fixture=(()=>{const document=JSON.parse(open(fixturePath));delete document.users;return document;})();
const users=new SharedArray('usuarios ficticios',()=>JSON.parse(open(fixturePath)).users);
const adminIndexes=new SharedArray('indices administradores',()=>JSON.parse(open(fixturePath)).users.flatMap((user,index)=>user.role==='admin'?[index]:[]));
const largeAdminIndexes=new SharedArray('indices administradores grandes',()=>JSON.parse(open(fixturePath)).users.flatMap((user,index)=>user.role==='admin'&&(user.size==='large'||user.size==='extreme')?[index]:[]));
const hotAdminIndexes=new SharedArray('indices administradores estudio caliente',()=>{const document=JSON.parse(open(fixturePath));return document.users.flatMap((user,index)=>user.role==='admin'&&user.studyId===document.hotStudyId?[index]:[]);});
const profileName=__ENV.LOAD_PROFILE||'smoke';
const profile=config.profiles[profileName];
const saveProtocol=String(__ENV.LOAD_SAVE_PROTOCOL||'v2').toLowerCase();
const baseUrl=String(__ENV.LOAD_SUPABASE_URL||'').replace(/\/$/,'');
const publishableKey=String(__ENV.LOAD_SUPABASE_PUBLISHABLE_KEY||'');
const allowedRef=String(__ENV.LOAD_ALLOWED_PROJECT_REF||'').toLowerCase();
const isolationAck=String(__ENV.LOAD_ISOLATION_ACK||'');
const productionRef='cgqtylvaapwbuwqvpjtb';
const v2OnlyProfiles=new Set(['replay','noop','array-sync','limits','concurrent-1000']);

function guardTarget(){
  const direct=/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(baseUrl.toLowerCase());
  const host=direct?`${direct[1]}.supabase.co`:baseUrl.toLowerCase(),ref=direct?.[1]||'';
  if(!direct||host==='auth.moderno.app'||host==='app.moderno.app'||host.includes(productionRef)||allowedRef===productionRef)throw new Error('Destino de produccion rechazado');
  if(!/^[a-z0-9]{20}$/.test(allowedRef)||ref!==allowedRef)throw new Error('LOAD_ALLOWED_PROJECT_REF no coincide con la URL aislada');
  if(isolationAck!=='CARGA_FICTICIA_EN_MODERNO_PRUEBAS')throw new Error('Falta la confirmacion explicita de aislamiento');
  if(!publishableKey||!profile||!['v2','legacy'].includes(saveProtocol))throw new Error('Configuracion de carga incompleta');
  if(v2OnlyProfiles.has(profileName)&&saveProtocol!=='v2')throw new Error(`El perfil ${profileName} exige app_guardar_lote_v2`);
  if(fixture.runId!==__ENV.LOAD_RUN_ID||!/^load-[a-z0-9][a-z0-9-]{5,47}$/.test(fixture.runId))throw new Error('El manifiesto no pertenece a esta ejecucion');
  if(fixture.projectRef!==allowedRef)throw new Error('El manifiesto pertenece a otro proyecto');
  if(users.length!==config.identities||new Set(users.map(user=>user.studyId)).size!==config.studies)throw new Error('El fixture no contiene exactamente 1.000 identidades y 250 estudios');
  if(users.some(user=>!Array.isArray(user.itemIds)||user.itemIds.length!==3))throw new Error('El fixture no permite comprobar array_sync');
}
guardTarget();

const readOk=new Rate('read_ok'),writeOk=new Rate('write_ok'),replayOk=new Rate('replay_ok'),noopOk=new Rate('noop_ok'),arraySyncOk=new Rate('array_sync_ok'),limitsOk=new Rate('limits_ok');
const versionsMs=new Trend('versions_ms',true),saveMs=new Trend('save_ms',true),saveMaxMs=new Trend('write_max_ms',true);
const expectedConflicts=new Counter('expected_conflicts'),unexpectedConflicts=new Counter('unexpected_conflicts'),unexpected5xx=new Counter('unexpected_5xx'),sqlTimeouts=new Counter('sql_timeouts'),crossStudy=new Counter('cross_study_responses'),replayedReceipts=new Counter('replayed_receipts'),noopReceipts=new Counter('noop_receipts');
const p95BySize={small:config.slos.smallP95Ms,medium:config.slos.mediumP95Ms,large:config.slos.largeP95Ms,extreme:config.slos.extremeP95Ms};
const thresholds={read_ok:[`rate>${config.slos.readRate}`],write_ok:[`rate>${config.slos.writeRate}`],versions_ms:[`p(95)<${config.slos.versionsP95Ms}`],write_max_ms:[`max<${config.slos.writeMaxMs}`],unexpected_conflicts:['count==0'],unexpected_5xx:['count==0'],sql_timeouts:['count==0'],cross_study_responses:['count==0'],dropped_iterations:['count==0']};
if(profileName==='replay')thresholds.replay_ok=['rate==1'];
if(profileName==='noop')thresholds.noop_ok=['rate==1'];
if(profileName==='array-sync')thresholds.array_sync_ok=['rate==1'];
if(profileName==='limits')thresholds.limits_ok=['rate==1'];
if(profileName==='concurrent-1000')thresholds.noop_ok=['rate==1'];
for(const [size,limit] of Object.entries(p95BySize))thresholds[`save_ms{size:${size}}`]=[`p(95)<${limit}`];

function arrival(rate,fn){return {executor:'constant-arrival-rate',exec:fn,rate,timeUnit:'1s',duration:profile.duration,preAllocatedVUs:profile.preAllocatedVUs,maxVUs:profile.maxVUs,gracefulStop:'30s'};}
function scenarios(){
  if(profileName==='concurrent-1000')return {concurrentUsers:{executor:'per-vu-iterations',exec:'concurrentUserOnce',vus:profile.vus,iterations:profile.iterations,maxDuration:profile.maxDuration}};
  if(profileName==='reconnect')return {reconnect:{executor:'shared-iterations',exec:'reconnectOnce',vus:profile.vus,iterations:profile.iterations,maxDuration:profile.maxDuration}};
  if(profileName==='limits')return {limits:{executor:'shared-iterations',exec:'checkLimits',vus:profile.vus,iterations:profile.iterations,maxDuration:profile.maxDuration}};
  if(profileName==='replay')return {replay:arrival(profile.saveRate,'replayLostAck')};
  if(profileName==='noop')return {noop:arrival(profile.saveRate,'saveNoop')};
  if(profileName==='array-sync')return {arraySync:arrival(profile.saveRate,'saveArraySync')};
  const result={};if(profile.versionRate>0)result.versions=arrival(profile.versionRate,'readVersions');if(profile.saveRate>0)result.saves=arrival(profile.saveRate,'saveDelta');if(profile.fullReadRate>0)result.full=arrival(profile.fullReadRate,'readFullBlock');return result;
}
export const options={discardResponseBodies:false,scenarios:scenarios(),thresholds,summaryTrendStats:['min','med','p(90)','p(95)','p(99)','max','count']};

function indexFor(list){return exec.scenario.iterationInTest%list.length;}
function pickUser(kind='any'){
  if(kind!=='admin')return users[indexFor(users)];
  const indexes=profileName==='large'?largeAdminIndexes:profileName==='contention'?hotAdminIndexes:adminIndexes;if(!indexes.length)fail(`El fixture no contiene usuarios para ${kind}`);return users[indexes[indexFor(indexes)]];
}
function requestUuid(user,kind,iteration=exec.scenario.iterationInTest){
  return stableRequestUuid(fixture.runId,user.id,kind,iteration);
}
function headers(user){return {apikey:publishableKey,Authorization:`Bearer ${user.accessToken}`,'Content-Type':'application/json','X-Client-Info':'moderno-load/2'};}
function errorCode(response){try{return response.body?JSON.parse(response.body)?.code:'';}catch{return '';}}
function post(user,rpc,body,tag,expectedCodes=[]){
  const protocol=rpc==='app_guardar_lote_v2'?'v2':rpc==='app_guardar_lote_delta'?'legacy':'read';
  const response=http.post(`${baseUrl}/rest/v1/rpc/${rpc}`,JSON.stringify(body),{headers:headers(user),timeout:'60s',tags:{operation:tag,size:user.size||'small',protocol}}),code=errorCode(response);
  if(response.status>=500&&!expectedCodes.includes(code))unexpected5xx.add(1);if(code==='57014'||code==='40P01')sqlTimeouts.add(1);return response;
}
function recordSave(response,user,protocol=saveProtocol){saveMs.add(response.timings.duration,{size:user.size,protocol});saveMaxMs.add(response.timings.duration);}
function versions(user){
  const response=post(user,'app_leer_versiones',{p_estudio:user.studyId,p_bloques:['proyectos']},'versions');versionsMs.add(response.timings.duration);let rows=[];try{rows=response.json();}catch{}
  const valid=response.status===200&&Array.isArray(rows)&&rows.length===1&&rows[0]?.bloque==='proyectos'&&rows[0]?.rol===user.role;readOk.add(valid);check(response,{'version valida y aislada':()=>valid});return valid?rows[0]:null;
}
function fullBlock(user,tag='full-read'){
  const response=post(user,'app_leer_bloques',{p_estudio:user.studyId,p_bloques:['proyectos']},tag);let rows=[];try{rows=response.json();}catch{}
  const projects=rows?.[0]?.contenido,own=Array.isArray(projects)&&projects.length===1&&projects[0]?.id===user.projectId&&projects[0]?._loadRun===fixture.runId,valid=response.status===200&&Array.isArray(rows)&&rows.length===1&&rows[0]?.bloque==='proyectos'&&rows[0]?.rol===user.role&&own;
  if(response.status===200&&!own)crossStudy.add(1);readOk.add(valid);check(response,{'bloque completo contiene solo el proyecto aislado propio':()=>valid});return valid?rows[0]:null;
}
function rejectCrossStudy(){
  const user=users[0],other=users.find(candidate=>candidate.studyId!==user.studyId);if(!other)fail('Falta un segundo estudio para probar aislamiento');
  const response=post(user,'app_leer_bloques',{p_estudio:other.studyId,p_bloques:['proyectos']},'cross-study-denied');let rows=null;try{rows=response.json();}catch{}
  const denied=response.status>=400&&response.status<500||response.status===200&&Array.isArray(rows)&&rows.length===0;
  if(!denied)crossStudy.add(1);check(response,{'otro estudio queda rechazado sin datos':()=>denied});
}
function v2Request(requestId,changes){return {v:2,requestId,cambios:changes};}
function parseV2(response,requestId){let result={};try{result=response.json();}catch{}return {valid:response.status===200&&result?.v===2&&result?.requestId===requestId&&Array.isArray(result?.bloques),result};}
function handleConflict(response){if(response.status!==409)return false;if(profileName==='contention'){expectedConflicts.add(1);writeOk.add(true);}else{unexpectedConflicts.add(1);writeOk.add(false);}return true;}

export function setup(){const row=versions(users[0]);if(!row)fail('El smoke inicial no pudo leer el fixture aislado');rejectCrossStudy();return {runId:fixture.runId,protocol:saveProtocol};}
export function readVersions(){versions(pickUser());}
export function reconnectOnce(){const user=pickUser(),response=post(user,'app_leer_versiones',{p_estudio:user.studyId,p_bloques:null},'reconnect');let rows=[];try{rows=response.json();}catch{}const valid=response.status===200&&Array.isArray(rows)&&rows.every(row=>row?.rol===user.role);readOk.add(valid);check(response,{'reconexion valida':()=>valid});}
export function readFullBlock(){fullBlock(pickUser());}

export function saveDelta(){
  const user=pickUser('admin'),current=versions(user);if(!current){writeOk.add(false);return;}
  const operation=requestUuid(user,'save'),marker=`${fixture.runId}:${profileName}:${operation}`,changes=[{bloque:'proyectos',base:current.updated_at,cambios:[{op:'set',path:['0','loadProbe'],value:marker}]}];let response,accepted=false,version='';
  if(saveProtocol==='v2'){
    response=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:v2Request(operation,changes)},'save-v2');recordSave(response,user,'v2');if(handleConflict(response))return;
    const parsed=parseV2(response,operation),block=parsed.result?.bloques?.find(row=>row.bloque==='proyectos');accepted=parsed.valid&&block?.changed===true;version=block?.updated_at;
  }else{
    response=post(user,'app_guardar_lote_delta',{p_estudio:user.studyId,p_cambios:changes},'save-legacy');recordSave(response,user,'legacy');if(handleConflict(response))return;
    let result=[];try{result=response.json();}catch{}const block=result.find?.(row=>row?.bloque==='proyectos');accepted=response.status===200&&!!block?.updated_at;version=block?.updated_at;
  }
  if(!accepted){writeOk.add(false);check(response,{'guardado confirmado':()=>false});return;}const confirmed=versions(user),durable=confirmed?.updated_at===version;writeOk.add(durable);check(response,{'acuse coincide con la version releida':()=>durable});
}

export function replayLostAck(){
  const user=pickUser('admin'),current=versions(user);if(!current){writeOk.add(false);replayOk.add(false);return;}
  const requestId=requestUuid(user,'lost-ack'),marker=`acuse-perdido:${requestId}`,request=v2Request(requestId,[{bloque:'proyectos',base:current.updated_at,cambios:[{op:'set',path:['0','loadProbe'],value:marker}]}]);
  const first=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:request},'save-v2-ack-discarded');recordSave(first,user,'v2');if(first.status!==200){writeOk.add(false);replayOk.add(false);return;}
  const replay=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:request},'save-v2-replay');recordSave(replay,user,'v2');const parsed=parseV2(replay,requestId),block=parsed.result?.bloques?.find(row=>row.bloque==='proyectos'),confirmed=versions(user);
  const valid=parsed.valid&&parsed.result.replayed===true&&block?.changed===true&&confirmed?.updated_at===block?.updated_at;if(parsed.result?.replayed===true)replayedReceipts.add(1);replayOk.add(valid);writeOk.add(valid);check(replay,{'reintento devuelve el mismo recibo sin reescribir':()=>valid});
}

export function saveNoop(){
  const user=pickUser('admin'),current=versions(user);if(!current){writeOk.add(false);noopOk.add(false);return;}
  const requestId=requestUuid(user,'noop'),request=v2Request(requestId,[{bloque:'proyectos',base:current.updated_at,cambios:[]}]),response=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:request},'save-v2-noop');recordSave(response,user,'v2');
  const parsed=parseV2(response,requestId),block=parsed.result?.bloques?.find(row=>row.bloque==='proyectos'),confirmed=versions(user),valid=parsed.valid&&parsed.result.replayed===false&&block?.changed===false&&block?.updated_at===current.updated_at&&confirmed?.updated_at===current.updated_at;
  if(block?.changed===false)noopReceipts.add(1);noopOk.add(valid);writeOk.add(valid);check(response,{'no-op conserva la version y queda confirmado':()=>valid});
}

export function concurrentUserOnce(){
  const user=users[(exec.vu.idInTest-1)%users.length],current=versions(user);if(!current){writeOk.add(false);noopOk.add(false);return;}
  const requestId=requestUuid(user,'concurrent-1000',exec.vu.idInTest),request=v2Request(requestId,[{bloque:'proyectos',base:current.updated_at,cambios:[]}]),response=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:request},'save-v2-concurrent-1000');recordSave(response,user,'v2');
  const parsed=parseV2(response,requestId),block=parsed.result?.bloques?.find(row=>row.bloque==='proyectos'),valid=parsed.valid&&parsed.result.replayed===false&&block?.changed===false&&block?.updated_at===current.updated_at;
  noopOk.add(valid);writeOk.add(valid);check(response,{'1.000 identidades autentican y confirman no-op concurrente':()=>valid});
}

export function saveArraySync(){
  const user=pickUser('admin'),current=fullBlock(user,'array-sync-read');if(!current){writeOk.add(false);arraySyncOk.add(false);return;}
  const projectIndex=current.contenido.findIndex(project=>project?.id===user.projectId),items=current.contenido[projectIndex]?.items||[],before=items.map(item=>item.id),order=[...before].reverse(),requestId=requestUuid(user,'array-sync');
  if(projectIndex<0||before.length!==3||new Set(before).size!==3){arraySyncOk.add(false);writeOk.add(false);return;}
  const changes=[{bloque:'proyectos',base:current.updated_at,cambios:[{op:'array_sync',path:[String(projectIndex),'items'],order,items:[]}]}],response=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:v2Request(requestId,changes)},'save-v2-array-sync');recordSave(response,user,'v2');
  const parsed=parseV2(response,requestId),block=parsed.result?.bloques?.find(row=>row.bloque==='proyectos'),confirmed=fullBlock(user,'array-sync-confirm'),after=confirmed?.contenido?.find(project=>project?.id===user.projectId)?.items?.map(item=>item.id)||[],valid=parsed.valid&&block?.changed===true&&JSON.stringify(after)===JSON.stringify(order);
  arraySyncOk.add(valid);writeOk.add(valid);check(response,{'array_sync reordena sin duplicar ni perder filas':()=>valid});
}

export function checkLimits(){
  const user=pickUser('admin'),current=versions(user);if(!current){writeOk.add(false);limitsOk.add(false);return;}
  const validId=requestUuid(user,'limit-64'),ops=Array.from({length:64},(_,index)=>({op:'set',path:['0','loadProbe'],value:`limite-64:${validId}:${index}`})),accepted=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:v2Request(validId,[{bloque:'proyectos',base:current.updated_at,cambios:ops}])},'save-v2-limit-64');recordSave(accepted,user,'v2');
  const parsed=parseV2(accepted,validId),block=parsed.result?.bloques?.find(row=>row.bloque==='proyectos');if(!parsed.valid||block?.changed!==true){limitsOk.add(false);writeOk.add(false);return;}
  const tooManyId=requestUuid(user,'limit-65'),tooMany=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:v2Request(tooManyId,[{bloque:'proyectos',base:block.updated_at,cambios:[...ops,{op:'set',path:['0','loadProbe'],value:'rechazar'}]}])},'save-v2-limit-65',['54000']);
  const tenBlocksId=requestUuid(user,'limit-10-blocks'),tenBlocks=post(user,'app_guardar_lote_v2',{p_estudio:user.studyId,p_solicitud:v2Request(tenBlocksId,Array.from({length:10},()=>({bloque:'proyectos',base:block.updated_at,cambios:[]})))},'save-v2-limit-10-blocks',['22023']);
  const confirmed=versions(user),valid=tooMany.status>=400&&errorCode(tooMany)==='54000'&&tenBlocks.status>=400&&errorCode(tenBlocks)==='22023'&&confirmed?.updated_at===block.updated_at;limitsOk.add(valid);writeOk.add(valid);check(accepted,{'64 operaciones pasan, 65 y 10 bloques se rechazan sin mutar':()=>valid});
}

export function handleSummary(data){
  const destination=__ENV.LOAD_SUMMARY_FILE||'/results/summary.json',names=['read_ok','write_ok','replay_ok','noop_ok','array_sync_ok','limits_ok','versions_ms','save_ms','write_max_ms','replayed_receipts','noop_receipts','expected_conflicts','unexpected_conflicts','unexpected_5xx','sql_timeouts','cross_study_responses','dropped_iterations'];
  const compact=Object.fromEntries(names.filter(name=>data.metrics[name]).map(name=>[name,{values:data.metrics[name].values,thresholds:data.metrics[name].thresholds}])),report={runId:fixture.runId,profile:profileName,protocol:saveProtocol,generatedAt:new Date().toISOString(),metrics:data.metrics,rootGroup:data.root_group};
  return {stdout:JSON.stringify({runId:fixture.runId,profile:profileName,protocol:saveProtocol,metrics:compact},null,2)+'\n',[destination]:JSON.stringify(report,null,2)};
}
