import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {MailInputError,connectionId,passwordConnection,publicConnection,safeErrorCode,safeErrorMessage,serializeSecret,studyId} from './core.mjs';
import {verifyPasswordAccount} from './network.ts';

const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=['https://app.moderno.app',...(Deno.env.get('MAIL_TEST_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean)];
const googleClientId=()=>Deno.env.get('GOOGLE_MAIL_CLIENT_ID')||'';
const googleClientSecret=()=>Deno.env.get('GOOGLE_MAIL_CLIENT_SECRET')||'';
const googleRedirect=()=>Deno.env.get('GOOGLE_MAIL_REDIRECT_URI')||'';
const appReturn=()=>Deno.env.get('MAIL_APP_RETURN_URL')||'https://app.moderno.app/';

function headers(origin:string|null){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',...(origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};}
function json(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
function redirect(status:string){const target=new URL(appReturn());target.searchParams.set('mail_oauth',status);target.hash='/mail';return Response.redirect(target.toString(),303);}
function base64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function sha256(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function challenge(value:string){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
function randomToken(size=48){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return base64url(bytes);}

async function actor(req:Request){
 const authorization=req.headers.get('Authorization')||'';if(!authorization.startsWith('Bearer '))throw Object.assign(new Error('Inicia sesión de nuevo'),{status:401});
 const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(authorization.slice(7));if(error||!data.user)throw Object.assign(new Error('Inicia sesión de nuevo'),{status:401});
 return {user:data.user,client};
}
async function requireAdmin(subject:Awaited<ReturnType<typeof actor>>,study:string){const {data,error}=await subject.client.rpc('app_rol',{p_estudio:study});if(error||data!=='admin')throw Object.assign(new Error('Solo un administrador puede conectar el correo'),{status:403});}
async function googleAccess(refreshToken:string){
 if(!googleClientId()||!googleClientSecret()||!googleRedirect())throw Object.assign(new Error('gmail not configured'),{code:'not_configured'});
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:googleClientId(),client_secret:googleClientSecret(),refresh_token:refreshToken,grant_type:'refresh_token'})});
 const body=await response.json().catch(()=>({}));if(!response.ok||!body.access_token)throw Object.assign(new Error('gmail refresh'),{code:'gmail_auth'});return body;
}
async function gmailProfile(accessToken:string){const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:'Bearer '+accessToken}});const body=await response.json().catch(()=>({}));if(!response.ok||!body.emailAddress)throw Object.assign(new Error('gmail profile'),{code:'gmail_auth'});return {email:String(body.emailAddress).toLowerCase(),messages:Number(body.messagesTotal)||0};}
async function store(userId:string,study:string,provider:string,email:string,displayName:string,secretValue:string){const {data,error}=await admin.rpc('mail_connection_admin_store',{p_user:userId,p_estudio:study,p_provider:provider,p_email:email,p_display_name:displayName,p_secret:secretValue});if(error)throw error;return data;}

async function callback(req:Request){
 const requestUrl=new URL(req.url),state=requestUrl.searchParams.get('state')||'';if(!/^[A-Za-z0-9_-]{40,200}$/.test(state))return redirect('invalid_state');
 let claim:any;try{const {data,error}=await admin.rpc('mail_oauth_admin_claim',{p_state_hash:await sha256(state)});if(error||!data)throw error;claim=data;}catch{return redirect('expired');}
 if(requestUrl.searchParams.get('error'))return redirect('cancelled');
 const code=requestUrl.searchParams.get('code')||'';if(!code)return redirect('failed');
 try{
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:googleClientId(),client_secret:googleClientSecret(),code,code_verifier:claim.codeVerifier,redirect_uri:googleRedirect(),grant_type:'authorization_code'})});
  const tokens=await response.json().catch(()=>({}));if(!response.ok||!tokens.access_token||!tokens.refresh_token)throw Error('token');
  const profile=await gmailProfile(tokens.access_token);
  await store(claim.userId,claim.studyId,'gmail',profile.email,profile.email,JSON.stringify({version:1,provider:'gmail',refreshToken:tokens.refresh_token,scope:tokens.scope||'',tokenType:'oauth2'}));
  return redirect('connected');
 }catch{return redirect('failed');}
}

Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('Origin');
 if(req.method==='GET')return callback(req);
 if(req.method==='OPTIONS')return origins.includes(origin||'')?new Response(null,{status:204,headers:headers(origin)}):new Response(null,{status:403});
 if(req.method!=='POST'||(origin&&!origins.includes(origin)))return json(origin,{ok:false,error:'Solicitud no permitida'},403);
 try{
  const subject=await actor(req);const body=await req.json();const study=studyId(body?.studyId);await requireAdmin(subject,study);
  if(body.action==='status'){const {data,error}=await subject.client.rpc('mail_connection_status',{p_estudio:study});if(error)throw error;return json(origin,{ok:true,connections:(data||[]).map(publicConnection)});}
  if(body.action==='gmail_begin'){
   if(!googleClientId()||!googleClientSecret()||!googleRedirect())throw Object.assign(new Error('gmail not configured'),{code:'not_configured'});
   const state=randomToken(),verifier=randomToken();const {error}=await admin.rpc('mail_oauth_admin_begin',{p_user:subject.user.id,p_estudio:study,p_state_hash:await sha256(state),p_code_verifier:verifier});if(error)throw error;
   const params=new URLSearchParams({client_id:googleClientId(),redirect_uri:googleRedirect(),response_type:'code',scope:'openid email https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',include_granted_scopes:'true',state,code_challenge:await challenge(verifier),code_challenge_method:'S256'});if(subject.user.email)params.set('login_hint',subject.user.email);
   return json(origin,{ok:true,url:'https://accounts.google.com/o/oauth2/v2/auth?'+params});
  }
  if(body.action==='connect_password'){
   const account=passwordConnection(body);await verifyPasswordAccount(account);const id=await store(subject.user.id,study,account.provider,account.email,account.displayName,serializeSecret(account));return json(origin,{ok:true,id});
  }
  if(body.action==='disconnect'){const id=connectionId(body.connectionId);const {data,error}=await subject.client.rpc('mail_connection_delete',{p_estudio:study,p_connection:id});if(error)throw error;return json(origin,{ok:true,deleted:!!data});}
  if(body.action==='recheck'){
   const id=connectionId(body.connectionId);const {data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');const secretData=JSON.parse(data.secret);
   try{if(data.provider==='gmail'){const token=await googleAccess(secretData.refreshToken);await gmailProfile(token.access_token);}else await verifyPasswordAccount(secretData);await admin.rpc('mail_connection_admin_touch',{p_user:subject.user.id,p_estudio:study,p_connection:id,p_status:'connected',p_error:null});}
   catch(error){const code=safeErrorCode(error);await admin.rpc('mail_connection_admin_touch',{p_user:subject.user.id,p_estudio:study,p_connection:id,p_status:'error',p_error:code});throw error;}
   return json(origin,{ok:true});
  }
  throw new MailInputError('Acción no válida');
 }catch(error){const code=safeErrorCode(error),status=error instanceof MailInputError?400:Number((error as any)?.status)||((error as any)?.code==='42501'?403:502);return json(origin,{ok:false,code,error:error instanceof MailInputError?error.message:safeErrorMessage(code)},status);}
});
