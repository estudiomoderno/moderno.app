import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const APP_ORIGIN='https://app.moderno.app';
const CANONICAL_ENDPOINT='https://cgqtylvaapwbuwqvpjtb.supabase.co/functions/v1/secretario';

function csv(response,name){
  return new Set(String(response.headers?.get(name)||'').toLowerCase().split(',').map(value=>value.trim()).filter(Boolean));
}

export async function checkSecretaryGateway({html,fetcher=fetch,timeout=15000}={}){
  if(typeof html!=='string')html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
  const endpoint=/MODERNO_SECRETARY_CONFIG=Object\.freeze\(\{enabled:true,endpoint:"([^"]+)"/.exec(html)?.[1];
  const publicKey=/const SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(html)?.[1];
  if(endpoint!==CANONICAL_ENDPOINT||!publicKey?.startsWith('sb_publishable_'))throw Error('Configuración pública del Secretario no reconocida');
  const request=async(options)=>fetcher(endpoint,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(timeout),...options});
  const preflight=await request({method:'OPTIONS',headers:{
    Origin:APP_ORIGIN,
    'Access-Control-Request-Method':'POST',
    'Access-Control-Request-Headers':'apikey,content-type'
  }});
  const methods=csv(preflight,'access-control-allow-methods'),allowedHeaders=csv(preflight,'access-control-allow-headers');
  if(!preflight.ok||preflight.headers?.get('access-control-allow-origin')!==APP_ORIGIN||!methods.has('post')||!methods.has('options')||!['apikey','content-type'].every(name=>allowedHeaders.has(name)))throw Error('La comprobación CORS del Secretario no autoriza al navegador');
  // A fictional session matching the real token's size must cross the gateway.
  // It is structurally invalid, so verification stops before quota, DB or OpenAI.
  const gateway=await request({method:'POST',headers:{Origin:APP_ORIGIN,apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({session:'p'.repeat(30000),payload:{}})});
  const payload=await gateway.json().catch(()=>null);
  if(gateway.status!==401||gateway.headers?.get('access-control-allow-origin')!==APP_ORIGIN||gateway.headers?.get('x-moderno-secretary-transport')!=='body-session-v1'||!String(gateway.headers?.get('content-type')||'').toLowerCase().includes('application/json')||payload?.error?.code!=='unauthorized'||typeof payload?.requestId!=='string')throw Error('La pasarela del Secretario no alcanzó el manejador protegido');
  return {ok:true,preflight:preflight.status,gateway:gateway.status};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{console.log(JSON.stringify(await checkSecretaryGateway()));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
