import {writeFile,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {assertIsolatedTarget,requireSecret,safeFixturePath} from './safety.mjs';
import {loadFixturePlan} from './recovery-manifest.mjs';

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function mapLimit(rows,limit,fn){
  let next=0;const workers=Array.from({length:Math.min(limit,rows.length)},async()=>{while(next<rows.length){const index=next++;await fn(rows[index],index);}});await Promise.all(workers);
}

export function pseudoRandomText(seed,length){
  let state=(seed^0x9e3779b9)>>>0,out='';const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  while(out.length<length){let chunk='';const count=Math.min(32768,length-out.length);for(let i=0;i<count;i++){state^=state<<13;state^=state>>>17;state^=state<<5;chunk+=alphabet[state&63];}out+=chunk;}
  return out;
}

export async function seedLoadFixture(env=process.env,fetcher=fetch){
  const url=requireSecret('LOAD_SUPABASE_URL',env.LOAD_SUPABASE_URL).replace(/\/$/,'');
  const serviceKey=requireSecret('LOAD_SUPABASE_SERVICE_ROLE_KEY',env.LOAD_SUPABASE_SERVICE_ROLE_KEY);
  const publicKey=requireSecret('LOAD_SUPABASE_PUBLISHABLE_KEY',env.LOAD_SUPABASE_PUBLISHABLE_KEY);
  const password=requireSecret('LOAD_TEST_PASSWORD',env.LOAD_TEST_PASSWORD);
  const output=safeFixturePath(requireSecret('LOAD_USERS_FILE',env.LOAD_USERS_FILE));
  const recoveryOutput=safeFixturePath(requireSecret('LOAD_RECOVERY_FILE',env.LOAD_RECOVERY_FILE));
  const runId=requireSecret('LOAD_RUN_ID',env.LOAD_RUN_ID);
  const {ref}=assertIsolatedTarget({url,allowedRef:env.LOAD_ALLOWED_PROJECT_REF,ack:env.LOAD_ISOLATION_ACK,runId});
  if(password.length<20)throw Error('LOAD_TEST_PASSWORD debe tener al menos 20 caracteres');
  const createdAt=new Date().toISOString(),{config,studies,identities,manifest:recoveryManifest}=await loadFixturePlan(runId,ref,{createdAt});
  // El manifiesto enumera todos los objetivos antes de la primera escritura. Si
  // el runner cae tras una respuesta perdida, teardown sigue conociendo cada
  // estudio y puede recuperar usuarios por el prefijo y metadata del run.
  const manifest={...recoveryManifest,users:[]};
  let persistChain=Promise.resolve();
  function persist(){const raw=JSON.stringify(manifest);persistChain=persistChain.then(async()=>{await writeFile(output,raw,{mode:0o600});await chmod(output,0o600);});return persistChain;}
  await writeFile(recoveryOutput,JSON.stringify(recoveryManifest,null,2),{mode:0o600});await chmod(recoveryOutput,0o600);
  await persist();

  const serviceHeaders={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'};
  const publicHeaders={apikey:publicKey,'Content-Type':'application/json'};
  async function request(path,{method='POST',body,headers=serviceHeaders,prefer}={}){
    let lastStatus=0;
    for(let attempt=0;attempt<5;attempt++){
      const response=await fetcher(url+path,{method,headers:{...headers,...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
      lastStatus=response.status;
      if(response.ok)return response;
      if(response.status!==429&&response.status<500)throw Error(`La API aislada rechazo ${method} ${path.split('?')[0]} (${response.status})`);
      await sleep(1000*2**attempt);
    }
    throw Error(`La API aislada no respondio a ${method} ${path.split('?')[0]} (${lastStatus})`);
  }
  async function findCreatedUser(email){
    for(let page=1;page<=50;page++){
      const response=await request(`/auth/v1/admin/users?page=${page}&per_page=1000`,{method:'GET'}),body=await response.json(),rows=Array.isArray(body?.users)?body.users:[];
      const found=rows.find(user=>user.email===email&&user.user_metadata?.load_run===runId);if(found)return found;
      if(rows.length<1000)break;
    }
    return null;
  }
  async function createIdentity(identity){
    let lastStatus=0,lastError=null;
    for(let attempt=0;attempt<5;attempt++){
      try{
        const response=await fetcher(url+'/auth/v1/admin/users',{method:'POST',headers:serviceHeaders,body:JSON.stringify({email:identity.email,password,email_confirm:true,user_metadata:{load_run:runId}}),signal:AbortSignal.timeout(90000)});
        lastStatus=response.status;if(response.ok){const created=await response.json();if(created?.id)return created;}
        if(response.status!==409&&response.status!==422&&response.status!==429&&response.status<500)throw Error(`Auth rechazo crear usuario ficticio (${response.status})`);
      }catch(error){lastError=error;if(/^Auth rechazo/.test(String(error?.message||'')))throw error;}
      const recovered=await findCreatedUser(identity.email);if(recovered)return recovered;
      await sleep(1000*2**attempt);
    }
    const recovered=await findCreatedUser(identity.email);if(recovered)return recovered;
    throw Error(`No se pudo crear ni recuperar el usuario ficticio (${lastStatus||lastError?.message||'sin respuesta'})`);
  }

  for(let offset=0;offset<studies.length;offset+=50){
    const batch=studies.slice(offset,offset+50);
    await request('/rest/v1/estudios?on_conflict=id',{body:batch.map(study=>({id:study.id,nombre:study.name})),prefer:'resolution=ignore-duplicates,return=minimal'});
    const response=await request(`/rest/v1/estudios?select=id,nombre&id=in.(${batch.map(study=>study.id).join(',')})`,{method:'GET'}),rows=await response.json(),names=new Map(rows.map(row=>[row.id,row.nombre]));
    if(batch.some(study=>names.get(study.id)!==study.name))throw Error('No se pudo verificar un estudio ficticio idempotente');
  }
  await mapLimit(identities,4,async identity=>{
    const created=await createIdentity(identity);
    identity.id=created.id;manifest.users.push({id:created.id,email:identity.email,studyId:identity.studyId,projectId:identity.projectId,itemIds:identity.itemIds,role:identity.role,size:identity.size});await persist();
  });

  const memberships=identities.map(identity=>({user_id:identity.id,estudio_id:identity.studyId,rol:identity.role}));
  for(let offset=0;offset<memberships.length;offset+=100){await request('/rest/v1/miembros?on_conflict=user_id,estudio_id',{body:memberships.slice(offset,offset+100),prefer:'resolution=ignore-duplicates,return=minimal'});}

  await mapLimit(studies,2,async study=>{
    const overhead=512;const payload=pseudoRandomText(config.seed+study.index,Math.max(1024,study.bytes-overhead));
    const contenido=[{id:study.projectId,_loadRun:runId,name:`Proyecto ficticio ${study.index}`,loadProbe:'seed',items:study.itemIds.map((id,item)=>({id,name:`Producto ficticio ${item}`,qty:item+1})),payload}];
    await request('/rest/v1/datos_estudio?on_conflict=estudio_id,bloque',{body:{estudio_id:study.id,bloque:'proyectos',contenido},prefer:'resolution=ignore-duplicates,return=minimal'});
  });

  const usersById=new Map(manifest.users.map(user=>[user.id,user]));
  await mapLimit(identities,6,async identity=>{
    const response=await request('/auth/v1/token?grant_type=password',{body:{email:identity.email,password},headers:publicHeaders});
    const session=await response.json();if(!session?.access_token)throw Error('Auth no devolvio una sesion ficticia');
    usersById.get(identity.id).accessToken=session.access_token;await persist();
  });
  manifest.users=identities.map(identity=>usersById.get(identity.id));
  manifest.readyAt=new Date().toISOString();await persist();
  return {runId,studies:manifest.studies.length,users:manifest.users.length,output};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  seedLoadFixture().then(result=>console.log(JSON.stringify({ok:true,runId:result.runId,studies:result.studies,users:result.users}))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
