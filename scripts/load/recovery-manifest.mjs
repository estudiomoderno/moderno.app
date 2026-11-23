import {readFile,writeFile,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {assertIsolatedTarget,deterministicUuid,requireSecret,safeFixturePath} from './safety.mjs';

const here=dirname(fileURLToPath(import.meta.url));

function sizeForStudy(config,index){
  let cursor=0;
  for(const group of config.documents){
    if(index<cursor+group.studies)return {label:group.label,bytes:group.bytes};
    cursor+=group.studies;
  }
  throw Error('Distribucion documental incompleta');
}

export async function loadFixturePlan(runId,projectRef,{createdAt=new Date().toISOString()}={}){
  const config=JSON.parse(await readFile(resolve(here,'config-1000.json'),'utf8'));
  if(config.identities!==1000||config.studies!==250||config.membersPerStudy!==4)throw Error('El fixture aprobado debe mantener 1.000 identidades, 250 estudios y 4 miembros');
  if(config.documents.reduce((sum,row)=>sum+row.studies,0)!==config.studies)throw Error('La distribucion documental no suma 250 estudios');
  const studies=Array.from({length:config.studies},(_,index)=>{
    const size=sizeForStudy(config,index);
    return {id:deterministicUuid(runId,'study',index),projectId:deterministicUuid(runId,'project',index),itemIds:Array.from({length:3},(_,item)=>deterministicUuid(runId,`item-${index}`,item)),name:`LOAD:${runId}:${index}`,size:size.label,bytes:size.bytes,index};
  });
  const identities=Array.from({length:config.identities},(_,index)=>{
    const study=studies[Math.floor(index/config.membersPerStudy)];
    return {index,email:`load.${runId}.${String(index).padStart(4,'0')}@example.invalid`,studyId:study.id,projectId:study.projectId,itemIds:study.itemIds,role:index%config.membersPerStudy===0?'admin':'colaborador',size:study.size};
  });
  const manifest={version:2,runId,projectRef,createdAt,hotStudyId:studies[0].id,
    studies:studies.map(({id,projectId,itemIds,name,size,bytes})=>({id,projectId,itemIds,name,size,bytes})),
    expectedEmails:identities.map(identity=>identity.email),users:[]};
  return {config,studies,identities,manifest};
}

export async function reconstructRecoveryManifest(env=process.env){
  const url=requireSecret('LOAD_SUPABASE_URL',env.LOAD_SUPABASE_URL).replace(/\/$/,'');
  const output=safeFixturePath(requireSecret('LOAD_USERS_FILE',env.LOAD_USERS_FILE));
  const runId=requireSecret('LOAD_RUN_ID',env.LOAD_RUN_ID);
  const {ref}=assertIsolatedTarget({url,allowedRef:env.LOAD_ALLOWED_PROJECT_REF,ack:env.LOAD_ISOLATION_ACK,runId});
  const {manifest}=await loadFixturePlan(runId,ref);
  await writeFile(output,JSON.stringify(manifest,null,2),{mode:0o600});
  await chmod(output,0o600);
  return {output,runId,studies:manifest.studies.length,expectedUsers:manifest.expectedEmails.length};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  reconstructRecoveryManifest().then(result=>console.log(JSON.stringify({ok:true,...result}))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
