import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {MailInputError,connectionId,passwordConnection,publicConnection,safeErrorCode,safeErrorMessage,serializeSecret,studyId} from './core.mjs';
import {readImapMailbox,readImapMessage,trashImapMessages,verifyPasswordAccount} from './network.ts';

const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=['https://app.moderno.app',...(Deno.env.get('MAIL_TEST_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean)];
const googleClientId=()=>Deno.env.get('GOOGLE_MAIL_CLIENT_ID')||'';
const googleClientSecret=()=>Deno.env.get('GOOGLE_MAIL_CLIENT_SECRET')||'';
const googleRedirect=()=>'https://auth.moderno.app/functions/v1/mail-connect';
const appReturn=()=>Deno.env.get('MAIL_APP_RETURN_URL')||'https://app.moderno.app/';

function headers(origin:string|null){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',...(origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};}
function json(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
function redirect(status:string){const target=new URL(appReturn());target.searchParams.set('mail_oauth',status);target.hash='/mail';return Response.redirect(target.toString(),303);}
function base64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function sha256(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function challenge(value:string){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
function randomToken(size=48){const bytes=new Uint8Array(size);crypto.getRandomValues(bytes);return base64url(bytes);}

async function actor(req:Request,bodyToken:unknown){
 const privateToken=typeof bodyToken==='string'?bodyToken:'';
 const authorization=req.headers.get('Authorization')||'';
 const token=privateToken||(authorization.startsWith('Bearer ')?authorization.slice(7):'');if(!token)throw Object.assign(new Error('Inicia sesión de nuevo'),{status:401});
 const bearer='Bearer '+token;
 const client=createClient(url,anon,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw Object.assign(new Error('Inicia sesión de nuevo'),{status:401});
 return {user:data.user,client};
}
async function requireAdmin(subject:Awaited<ReturnType<typeof actor>>,study:string){const {data,error}=await subject.client.rpc('app_rol',{p_estudio:study});if(error||data!=='admin')throw Object.assign(new Error('Solo un administrador puede conectar el correo'),{status:403});}
async function googleAccess(refreshToken:string){
 if(!googleClientId()||!googleClientSecret()||!googleRedirect())throw Object.assign(new Error('gmail not configured'),{code:'not_configured'});
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:googleClientId(),client_secret:googleClientSecret(),refresh_token:refreshToken,grant_type:'refresh_token'})});
 const body=await response.json().catch(()=>({}));if(!response.ok||!body.access_token)throw Object.assign(new Error('gmail refresh'),{code:'gmail_auth'});return body;
}
async function gmailProfile(accessToken:string){const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:'Bearer '+accessToken}});const body=await response.json().catch(()=>({}));if(!response.ok||!body.emailAddress)throw Object.assign(new Error('gmail profile'),{code:'gmail_auth'});return {email:String(body.emailAddress).toLowerCase(),messages:Number(body.messagesTotal)||0};}
function gmailHeader(message:any,name:string){return String((message?.payload?.headers||[]).find((item:any)=>String(item?.name||'').toLowerCase()===name.toLowerCase())?.value||'');}
function requestedMessageId(value:unknown){const id=String(value||'');if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new MailInputError('Correo no válido');return id;}
function requestedMessageIds(value:unknown){if(!Array.isArray(value)||!value.length||value.length>30)throw new MailInputError('Selecciona entre 1 y 30 correos');return [...new Set(value.map(requestedMessageId))];}
function gmailDecode(value:unknown){try{const raw=String(value||'').replace(/-/g,'+').replace(/_/g,'/'),encoded=raw.padEnd(Math.ceil(raw.length/4)*4,'=');return new TextDecoder().decode(Uint8Array.from(atob(encoded),char=>char.charCodeAt(0)));}catch{return '';}}
function gmailPlainText(part:any):{plain:string;html:string}{
 const own=gmailDecode(part?.body?.data),type=String(part?.mimeType||'').toLowerCase();let plain=type==='text/plain'?own:'',html=type==='text/html'?own:'';
 for(const child of Array.isArray(part?.parts)?part.parts:[]){const nested=gmailPlainText(child);if(!plain&&nested.plain)plain=nested.plain;if(!html&&nested.html)html=nested.html;}return {plain,html};
}
function htmlText(value:string){return value.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
const gmailFolders={inbox:'INBOX',sent:'SENT',drafts:'DRAFT',spam:'SPAM',trash:'TRASH'} as const;
type GmailFolder=keyof typeof gmailFolders;
function gmailFolder(value:unknown):GmailFolder{return typeof value==='string'&&value in gmailFolders?value as GmailFolder:'inbox';}
async function gmailInbox(refreshToken:string,folderValue:unknown){
 const token=await googleAccess(refreshToken),authorization={Authorization:'Bearer '+token.access_token};
 const folder=gmailFolder(folderValue),labelId=gmailFolders[folder],listUrl=new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');listUrl.searchParams.set('maxResults','30');listUrl.searchParams.append('labelIds',labelId);if(folder==='spam'||folder==='trash')listUrl.searchParams.set('includeSpamTrash','true');
 const labelEntries=Object.entries(gmailFolders) as [GmailFolder,string][];
 const [listResponse,...labelResponses]=await Promise.all([fetch(listUrl,{headers:authorization}),...labelEntries.map(([,id])=>fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${encodeURIComponent(id)}`,{headers:authorization}))]);
 const list=await listResponse.json().catch(()=>({})),labelBodies=await Promise.all(labelResponses.map(response=>response.json().catch(()=>({}))));if(!listResponse.ok||labelResponses.some(response=>!response.ok))throw Object.assign(new Error('gmail inbox'),{code:'gmail_auth'});
 const rows=await Promise.all((Array.isArray(list.messages)?list.messages:[]).slice(0,30).map(async(item:any)=>{
  const detailUrl=new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(String(item.id||''))}`);detailUrl.searchParams.set('format','metadata');for(const header of ['From','To','Subject','Date'])detailUrl.searchParams.append('metadataHeaders',header);
  const response=await fetch(detailUrl,{headers:authorization});const message=await response.json().catch(()=>({}));if(!response.ok)return null;
  return {id:String(message.id||''),threadId:String(message.threadId||''),from:gmailHeader(message,'From'),to:gmailHeader(message,'To'),subject:gmailHeader(message,'Subject')||'(Sin asunto)',date:gmailHeader(message,'Date'),timestamp:Number(message.internalDate)||0,snippet:String(message.snippet||'').slice(0,500),unread:Array.isArray(message.labelIds)&&message.labelIds.includes('UNREAD')};
 }));
 const folderCounts=Object.fromEntries(labelEntries.map(([key],index)=>[key,Math.max(0,Number(labelBodies[index]?.messagesTotal)||0)]));
 return {folder,messages:rows.filter(Boolean),folderCounts,unreadCount:Math.max(0,Number(labelBodies[0]?.messagesUnread)||0),nextPageToken:String(list.nextPageToken||'')};
}
async function gmailMessage(refreshToken:string,messageId:unknown){
 const token=await googleAccess(refreshToken),id=requestedMessageId(messageId),response=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,{headers:{Authorization:'Bearer '+token.access_token}}),message=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error('gmail message'),{code:'gmail_auth'});
 const content=gmailPlainText(message.payload),bodyText=(content.plain||htmlText(content.html)||String(message.snippet||'')).slice(0,131072);return {id,threadId:String(message.threadId||''),from:gmailHeader(message,'From'),to:gmailHeader(message,'To'),subject:gmailHeader(message,'Subject')||'(Sin asunto)',date:gmailHeader(message,'Date'),timestamp:Number(message.internalDate)||0,bodyText};
}
async function gmailTrash(refreshToken:string,messageIds:unknown){
 const token=await googleAccess(refreshToken),ids=requestedMessageIds(messageIds),responses=await Promise.all(ids.map(id=>fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}/trash`,{method:'POST',headers:{Authorization:'Bearer '+token.access_token}})));if(responses.some(response=>!response.ok))throw Object.assign(new Error('gmail trash'),{code:'gmail_auth'});return {moved:ids.length};
}
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
  const body=await req.json();const subject=await actor(req,body?.authToken);const study=studyId(body?.studyId);await requireAdmin(subject,study);
  if(body.action==='status'){const {data,error}=await subject.client.rpc('mail_connection_status',{p_estudio:study});if(error)throw error;return json(origin,{ok:true,connections:(data||[]).map(publicConnection)});}
  if(body.action==='inbox'){
   const id=connectionId(body.connectionId),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');
   const secretData=JSON.parse(data.secret),inbox=data.provider==='gmail'?await gmailInbox(secretData.refreshToken,body.folder):await readImapMailbox(secretData,body.folder);await admin.rpc('mail_connection_admin_touch',{p_user:subject.user.id,p_estudio:study,p_connection:id,p_status:'connected',p_error:null});return json(origin,{ok:true,...inbox});
  }
  if(body.action==='message'){
   const id=connectionId(body.connectionId),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');const secretData=JSON.parse(data.secret),message=data.provider==='gmail'?await gmailMessage(secretData.refreshToken,body.messageId):await readImapMessage(secretData,body.folder,body.messageId);return json(origin,{ok:true,message});
  }
  if(body.action==='trash_messages'){
   if(body.folder==='trash')throw new MailInputError('Estos correos ya están en la papelera');const id=connectionId(body.connectionId),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');const secretData=JSON.parse(data.secret),result=data.provider==='gmail'?await gmailTrash(secretData.refreshToken,body.messageIds):await trashImapMessages(secretData,body.folder,requestedMessageIds(body.messageIds));return json(origin,{ok:true,...result});
  }
  if(body.action==='gmail_begin'){
   if(!googleClientId()||!googleClientSecret()||!googleRedirect())throw Object.assign(new Error('gmail not configured'),{code:'not_configured'});
   const state=randomToken(),verifier=randomToken();const {error}=await admin.rpc('mail_oauth_admin_begin',{p_user:subject.user.id,p_estudio:study,p_state_hash:await sha256(state),p_code_verifier:verifier});if(error)throw error;
   const params=new URLSearchParams({client_id:googleClientId(),redirect_uri:googleRedirect(),response_type:'code',scope:'openid email https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',state,code_challenge:await challenge(verifier),code_challenge_method:'S256'});if(subject.user.email)params.set('login_hint',subject.user.email);
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
