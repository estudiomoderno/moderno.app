import {readFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {assertIsolatedTarget,requireSecret,safeFixturePath} from './safety.mjs';

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function chunks(rows,size){const result=[];for(let i=0;i<rows.length;i+=size)result.push(rows.slice(i,i+size));return result;}

export async function teardownLoadFixture(env=process.env,fetcher=fetch){
  const url=requireSecret('LOAD_SUPABASE_URL',env.LOAD_SUPABASE_URL).replace(/\/$/,'');
  const serviceKey=requireSecret('LOAD_SUPABASE_SERVICE_ROLE_KEY',env.LOAD_SUPABASE_SERVICE_ROLE_KEY);
  const path=safeFixturePath(requireSecret('LOAD_USERS_FILE',env.LOAD_USERS_FILE));
  const runId=requireSecret('LOAD_RUN_ID',env.LOAD_RUN_ID);
  const {ref}=assertIsolatedTarget({url,allowedRef:env.LOAD_ALLOWED_PROJECT_REF,ack:env.LOAD_ISOLATION_ACK,runId});
  const manifest=JSON.parse(await readFile(path,'utf8'));
  if(manifest.runId!==runId||manifest.projectRef!==ref)throw Error('El manifiesto no coincide con la ejecucion aislada');
  if(!Array.isArray(manifest.studies)||!Array.isArray(manifest.users))throw Error('Manifiesto de carga no valido');
  if(manifest.studies.some(study=>!String(study.name||'').startsWith(`LOAD:${runId}:`)))throw Error('El manifiesto contiene estudios ajenos a la ejecucion');
  const headers={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json',Prefer:'return=minimal'};
  const failures=[];
  async function remove(path,label){
    let status=0;
    for(let attempt=0;attempt<4;attempt++){
      try{const response=await fetcher(url+path,{method:'DELETE',headers,signal:AbortSignal.timeout(60000)});status=response.status;if(response.ok)return;}catch{}
      if(status&&status!==429&&status<500)break;await sleep(500*2**attempt);
    }
    failures.push(`${label} (${status||'sin respuesta'})`);
  }
  async function verifyEmpty(path,label){
    let status=0;
    for(let attempt=0;attempt<4;attempt++){
      try{
        const response=await fetcher(url+path,{method:'GET',headers:{...headers,Prefer:'count=exact'},signal:AbortSignal.timeout(60000)});status=response.status;
        if(response.ok){const rows=await response.json();if(Array.isArray(rows)&&rows.length===0)return;if(Array.isArray(rows))break;}
      }catch{}
      if(status&&status!==429&&status<500)break;await sleep(500*2**attempt);
    }
    failures.push(`${label} aun contiene registros (${status||'sin respuesta'})`);
  }
  async function runUsers(){
    const found=[];
    for(let page=1;page<=50;page++){
      let response;
      try{response=await fetcher(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`,{method:'GET',headers,signal:AbortSignal.timeout(60000)});}catch{failures.push('auth.users (sin respuesta al inventario)');break;}
      if(!response.ok){failures.push(`auth.users (inventario ${response.status})`);break;}
      const body=await response.json(),rows=Array.isArray(body?.users)?body.users:[];
      for(const user of rows)if(String(user.email||'').startsWith(`load.${runId}.`)&&user.user_metadata?.load_run===runId)found.push(user);
      if(rows.length<1000)break;
    }
    return found;
  }
  const studyIds=manifest.studies.map(study=>study.id);
  const recoveredUsers=await runUsers(),usersById=new Map([...manifest.users,...recoveredUsers].map(user=>[user.id,user]));
  const users=[...usersById.values()],userIds=users.map(user=>user.id);
  // El historial no tiene FK con estudios: se borra de forma explicita y
  // acotada por los UUID del manifiesto antes de retirar el resto del fixture.
  for(const ids of chunks(studyIds,50))await remove(`/rest/v1/datos_estudio_hist?estudio_id=in.(${ids.join(',')})`,'datos_estudio_hist');
  for(const ids of chunks(studyIds,50))await remove(`/rest/v1/datos_estudio?estudio_id=in.(${ids.join(',')})`,'datos_estudio');
  for(const ids of chunks(userIds,50))await remove(`/rest/v1/miembros?user_id=in.(${ids.join(',')})`,'miembros');
  for(const ids of chunks(studyIds,50))await remove(`/rest/v1/estudios?id=in.(${ids.join(',')})`,'estudios');
  for(const user of users)await remove(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`,'auth.users');
  for(const ids of chunks(studyIds,50))await verifyEmpty(`/rest/v1/datos_estudio_hist?select=id&limit=1&estudio_id=in.(${ids.join(',')})`,'datos_estudio_hist');
  for(const ids of chunks(studyIds,50))await verifyEmpty(`/rest/v1/datos_estudio?select=estudio_id&limit=1&estudio_id=in.(${ids.join(',')})`,'datos_estudio');
  for(const ids of chunks(userIds,50))await verifyEmpty(`/rest/v1/miembros?select=user_id&limit=1&user_id=in.(${ids.join(',')})`,'miembros');
  for(const ids of chunks(studyIds,50))await verifyEmpty(`/rest/v1/estudios?select=id&limit=1&id=in.(${ids.join(',')})`,'estudios');
  if((await runUsers()).length)failures.push('auth.users aun contiene usuarios del run');
  if(failures.length)throw Error(`La limpieza aislada no termino: ${failures.slice(0,5).join(', ')}`);
  await unlink(path);
  return {runId,studies:studyIds.length,users:userIds.length};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  teardownLoadFixture().then(result=>console.log(JSON.stringify({ok:true,...result}))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
