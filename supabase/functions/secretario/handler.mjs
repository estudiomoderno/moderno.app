import {SecretarioError,validateEnvironment,requestPlan,runSecretary} from './core.mjs';

const INPUT_LIMIT=48000,TRANSPORT_LIMIT=131072,SESSION_LIMIT=65536;
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
const cancelled=()=>new SecretarioError('cancelled','La consulta se ha detenido. No se ha creado ningún documento.',408);
function withAbort(value,signal){
 if(signal?.aborted)return Promise.reject(cancelled());
 return new Promise((resolve,reject)=>{
  const onAbort=()=>reject(cancelled());
  signal?.addEventListener('abort',onAbort,{once:true});
  Promise.resolve(value).then(resolve,reject).finally(()=>signal?.removeEventListener('abort',onAbort));
 });
}
async function readBody(request,signal){
 if(Number(request.headers.get('Content-Length'))>TRANSPORT_LIMIT)throw new SecretarioError('body_limit','La solicitud es demasiado grande.',413);
 if(!request.body)throw new SecretarioError('invalid_request','Falta la solicitud.');
 const reader=request.body.getReader(),chunks=[];let size=0;
 const onAbort=()=>{void reader.cancel().catch(()=>{});};
 signal?.addEventListener('abort',onAbort,{once:true});
 try{for(;;){if(signal?.aborted)throw cancelled();const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>TRANSPORT_LIMIT){await reader.cancel();throw new SecretarioError('body_limit','La solicitud es demasiado grande.',413);}chunks.push(value);}if(signal?.aborted)throw cancelled();}
 finally{signal?.removeEventListener('abort',onAbort);reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new SecretarioError('invalid_request','No se ha podido leer la solicitud.');}
 let input=body,privateSession='';
 const envelope=body&&typeof body==='object'&&!Array.isArray(body)&&(Object.hasOwn(body,'session')||Object.hasOwn(body,'payload'));
 if(envelope){
  if(Object.keys(body).length!==2||!Object.hasOwn(body,'session')||!Object.hasOwn(body,'payload')||typeof body.session!=='string'||!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))throw new SecretarioError('invalid_request','La solicitud no tiene un formato válido.');
  privateSession=body.session;input=body.payload;
 }
 if(new TextEncoder().encode(JSON.stringify(input)).byteLength>INPUT_LIMIT)throw new SecretarioError('body_limit','La solicitud es demasiado grande.',413);
 if(privateSession&&(!/^[^\s]{20,65536}$/.test(privateSession)||privateSession.length>SESSION_LIMIT))throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
 return {input,privateSession,inputBytes:new TextEncoder().encode(JSON.stringify(input)).byteLength};
}

/** authenticate must cryptographically validate the token against the project's
 * JWKS and return a user-scoped Supabase client. No admin client or
 * user_metadata authorization. */
export function createSecretaryHandler({env,authenticate,fetchImpl=fetch,now=Date.now,uuid=()=>crypto.randomUUID(),planner,logger,timeoutMs=25000}){
 const rates=new Map();
 return async request=>{
  const requestId=uuid(),origin=request.headers.get('Origin'),started=now();let allowed=[],stage='gateway',inputBytes=0,timedOut=false;
  const controller=new AbortController(),onAbort=()=>controller.abort();
  request.signal.addEventListener('abort',onAbort,{once:true});if(request.signal.aborted)controller.abort();
  const timeout=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  const timings={},quota={};
  const mark=(name,details={})=>{stage=name;timings[name]=Math.max(0,now()-started);for(const key of ['dailyRemaining','monthlyRemaining','globalMonthlyRemaining'])if(Number.isInteger(details[key]))quota[key]=details[key];};
  const report=(status,code)=>{try{logger?.info?.(JSON.stringify({event:'moderno_secretary_request',requestId,status,code,stage,durationMs:Math.max(0,now()-started),inputBytes,model:env.OPENAI_MODEL||'',timings,...quota}));}catch{}};
  const json=(body,status=200)=>new Response(JSON.stringify({...body,requestId}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff','X-Moderno-Secretary-Transport':'body-session-v1',...(origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  try{
   const deployment=validateEnvironment(env);
   allowed=allowedOrigins(env,deployment);
   if((deployment.environment==='production'&&!origin)||(origin&&!allowed.includes(origin)))throw new SecretarioError('origin_forbidden','Este origen no está autorizado para el Secretario.',403);
   if(request.method==='OPTIONS')return json({ok:true});
   if(request.method!=='POST')throw new SecretarioError('method_not_allowed','Utiliza POST para consultar el Secretario.',405);
   if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))throw new SecretarioError('invalid_content_type','La solicitud debe ser JSON.',415);
   // Supabase's hosted gateway rejects this user's large ES256 JWT in the
   // standard Authorization header before this verify_jwt=false function runs.
   // A bounded body envelope avoids proxy header limits. Keep the legacy bearer
   // fallback for rollout, and reject conflicting credentials.
   const body=await readBody(request,controller.signal),{input,privateSession}=body;inputBytes=body.inputBytes;mark('body_validated');
   const auth=request.headers.get('Authorization')||'',legacy=/^Bearer ([^\s]{20,8192})$/.exec(auth)?.[1]||'';
   if(auth&&!legacy||privateSession&&legacy&&legacy!==privateSession)throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
   const token=privateSession||legacy;
   if(!token)throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
   const actor=await withAbort(authenticate(token,controller.signal),controller.signal);mark('authenticated');
   if(!actor?.userId||!actor.client)throw new SecretarioError('unauthorized','Inicia sesión de nuevo para continuar.',401);
   if(deployment.allowedUserIds.length&&!deployment.allowedUserIds.includes(actor.userId))throw new SecretarioError('rollout_forbidden','El Secretario todavía no está habilitado para este usuario.',403);
   // A local-instance burst limit complements the isolated project budget. It
   // is deliberately not described as a distributed or monetary hard cap.
   const minute=Math.floor(now()/60000);for(const [key,value] of rates)if(value.minute!==minute)rates.delete(key);
   const rate=rates.get(actor.userId)||{minute,count:0};if(rate.count>=12||rates.size>=2000&&!rates.has(actor.userId))throw new SecretarioError('rate_limit','Hay varias consultas en curso. Espera un momento y vuelve a intentarlo.',429);rate.count++;rates.set(actor.userId,rate);
   const result=await runSecretary({client:actor.client,input,signal:controller.signal,onStage:mark,planner:planner||(({request:turn,context})=>requestPlan({fetchImpl,apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL,request:turn,context,signal:controller.signal}))});
   if(controller.signal.aborted)throw cancelled();
   mark('completed');report(200,'ok');return json(result);
  }catch(error){
   const safe=error instanceof SecretarioError?error:timedOut||request.signal.aborted?new SecretarioError('cancelled','La consulta se ha detenido. No se ha creado ningún documento.',408):new SecretarioError('unavailable','No he podido completar la consulta. Tus documentos siguen intactos.',503);
   // Do not log prompts, amounts, tokens, document content, or raw provider errors.
   report(safe.status,safe.code);return json({error:{code:safe.code,message:safe.message}},safe.status);
  }finally{clearTimeout(timeout);request.signal.removeEventListener('abort',onAbort);}
 };
}
