import {pathToFileURL} from 'node:url';
const origin='https://app.moderno.app';
export async function appHealth(fetcher=fetch,now=()=>performance.now()){
  const checks=[];
  async function get(label,url,options={}){
    const start=now();
    const response=await fetcher(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(15000),...options});
    checks.push({check:label,status:response.status,ms:Math.round(now()-start)});return response;
  }
  const page=await get('app',origin+'/?health=1');
  if(!page.ok)throw Error('La entrada de la app no responde correctamente');
  const html=await page.text();
  if(!/const MODERNO_VER="v[\d.]+"/.test(html)||!html.includes('/save-efficiency.js?'))throw Error('La entrada no contiene la versión esperada');
  const asset=await get('guardado',origin+'/save-efficiency.js?health=1');
  if(!asset.ok||!(await asset.text()).includes('ModernoEfficiency'))throw Error('El recurso de guardado no está disponible');
  const publicKey=/const SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/.exec(html)?.[1];
  const backend=/const SUPABASE_URL\s*=\s*"([^"]+)"/.exec(html)?.[1];
  // Read-only unauthenticated request. An explicit authorization rejection
  // proves the RPC and database answered without exposing any studio records.
  if(backend!=='https://auth.moderno.app'||!publicKey?.startsWith('sb_publishable_'))throw Error('Configuración pública no reconocida');
  const rpc=await get('base-de-datos',backend+'/rest/v1/rpc/app_leer_versiones',{method:'POST',headers:{apikey:publicKey,'Content-Type':'application/json'},body:JSON.stringify({p_estudio:'00000000-0000-0000-0000-000000000000',p_bloques:[]})});
  const denial=await rpc.json();
  if(![401,403].includes(rpc.status)||denial?.code!=='42501')throw Error('La comprobación de acceso anónimo de la base de datos no respondió como se esperaba');
  return {ok:true,checks,slow:checks.some(c=>c.ms>5000)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const report=await appHealth();console.log(JSON.stringify(report));if(report.slow)process.exitCode=1;}
  catch(error){console.error(error.message);process.exitCode=1;}
}
