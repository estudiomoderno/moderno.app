import {SecretarioError,validateEnvironment,requestPlan,runSecretary} from './core.mjs';

const LIMIT=48000;
function allowedOrigins(env,deployment){
 const values=String(env.SECRETARY_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!values.length)throw new SecretarioError('not_configured','Falta configurar el origen del Secretario.',503);
 if(new Set(values).size!==values.length)throw new SecretarioError('not_configured','El origen del Secretario no es válido.',503);
 for(const origin of values){let url;try{url=new URL(origin);}catch{throw new SecretarioError('not_configured','El origen del Secretario no es válido.',503);}
  const valid=deployment.environment==='production'
   ? origin==='https://app.moderno.app'
   : url.origin===origin&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(url.origin!==origin||!valid)throw new SecretarioError('not_configured','El origen del Secretario no es válido.',503);
 }
 if(deployment.environment==='production'&&(values.length!==1||values[0]!=='https://app.moderno.app'))throw new SecretarioError('not_configured','El origen de producción del Secretario no es válido.',503);
 return values;
}
async function readBody(request){
 if(Number(request.headers.get('Content-Length'))>LIMIT)throw new SecretarioError('body_limit','La solicitud es demasiado grande.',413);
 if(!request.body)throw new SecretarioError('invalid_request','Falta la solicitud.');
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>LIMIT){await reader.cancel();throw new SecretarioError('body_limit','La solicitud es demasiado grande.',413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new SecretarioError('invalid_request','No se ha podido leer la solicitud.');}
}

/** authenticate must validate the bearer token remotely and return a user-scoped
 * Supabase client. No admin client, body token or user_metadata authorization. */
export function createSecretaryHandler({env,authenticate,fetchImpl=fetch,now=Date.now,uuid=()=>crypto.randomUUID(),planner}){
 const rates=new Map();
 return async request=>{
  const requestId=uuid(),origin=request.headers.get('Origin');let allowed=[];
  const json=(body,status=200)=>new Response(JSON.stringify({...body,requestId}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff',...(origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  try{
   const deployment=validateEnvironment(env);
   allowed=allowedOrigins(env,deployment);
   if((deployment.environment==='production'&&!origin)||(origin&&!allowed.includes(origin)))throw new SecretarioError('origin_forbidden','Este origen no está autorizado para el Secretario.',403);
   if(request.method==='OPTIONS')return json({ok:true});
   if(request.method!=='POST')throw new SecretarioError('method_not_allowed','Utiliza POST para consultar el Secretario.',405);
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))throw new SecretarioError('invalid_content_type','La solicitud debe ser JSON.',415);
   const auth=request.headers.get('Authorization')||'';
   if(!/^Bearer [^\s]{20,8192}$/.test(auth))throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
   const actor=await authenticate(auth.slice(7));
   if(!actor?.userId||!actor.client)throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
   if(deployment.allowedUserIds.length&&!deployment.allowedUserIds.includes(actor.userId))throw new SecretarioError('rollout_forbidden','El Secretario todavía no está habilitado para este usuario.',403);
   // A local-instance burst limit complements the isolated project budget. It
   // is deliberately not described as a distributed or monetary hard cap.
   const minute=Math.floor(now()/60000);for(const [key,value] of rates)if(value.minute!==minute)rates.delete(key);
   const rate=rates.get(actor.userId)||{minute,count:0};if(rate.count>=12||rates.size>=2000&&!rates.has(actor.userId))throw new SecretarioError('rate_limit','Hay varias consultas en curso. Espera un momento y vuelve a intentarlo.',429);rate.count++;rates.set(actor.userId,rate);
   const input=await readBody(request),controller=new AbortController(),onAbort=()=>controller.abort();
   request.signal.addEventListener('abort',onAbort,{once:true});if(request.signal.aborted)controller.abort();
   const timeout=setTimeout(()=>controller.abort(),25000);
   try{
    const result=await runSecretary({client:actor.client,input,planner:planner||(({request:turn,context})=>requestPlan({fetchImpl,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL,request:turn,context,signal:controller.signal}))});
    if(controller.signal.aborted)throw new SecretarioError('cancelled','La consulta se ha detenido. No se ha creado ningún documento.',408);
    return json(result);
   }finally{clearTimeout(timeout);request.signal.removeEventListener('abort',onAbort);}
  }catch(error){
   const safe=error instanceof SecretarioError?error:new SecretarioError('unavailable','No he podido completar la consulta. Tus documentos siguen intactos.',503);
   // Do not log prompts, amounts, tokens, document content, or raw provider errors.
   return json({error:{code:safe.code,message:safe.message}},safe.status);
  }
 };
}
