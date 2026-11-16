import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {MailInputError,connectionId,passwordConnection,publicConnection,safeErrorCode,safeErrorMessage,serializeSecret,studyId} from './core.mjs';
import {readImapAttachment,readImapMailbox,readImapMessage,sendSmtpMessage,trashImapMessages,verifyPasswordAccount} from './network.ts';
import {buildPlainMessage} from './mime.mjs';

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
function base64url(bytes:Uint8Array){let binary='';for(let at=0;at<bytes.length;at+=32768)binary+=String.fromCharCode(...bytes.subarray(at,at+32768));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
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
function gmailPartHeader(part:any,name:string){return String((part?.headers||[]).find((item:any)=>String(item?.name||'').toLowerCase()===name.toLowerCase())?.value||'');}
function requestedMessageId(value:unknown){const id=String(value||'');if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new MailInputError('Correo no válido');return id;}
function requestedMessageIds(value:unknown){if(!Array.isArray(value)||!value.length||value.length>30)throw new MailInputError('Selecciona entre 1 y 30 correos');return [...new Set(value.map(requestedMessageId))];}
function requestedAttachmentId(value:unknown){const id=String(value||'');if(!/^[A-Za-z0-9_.-]{1,80}$/.test(id))throw new MailInputError('Adjunto no válido');return id;}
function gmailBytes(value:unknown){try{const raw=String(value||'').replace(/-/g,'+').replace(/_/g,'/'),encoded=raw.padEnd(Math.ceil(raw.length/4)*4,'='),binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}catch{return new Uint8Array();}}
function standardBase64(value:unknown){const raw=String(value||'').replace(/-/g,'+').replace(/_/g,'/');return raw.padEnd(Math.ceil(raw.length/4)*4,'=');}
function gmailParts(part:any):any[]{return [part,...(Array.isArray(part?.parts)?part.parts.flatMap(gmailParts):[])];}
async function gmailPartData(token:string,messageId:string,part:any){if(part?.body?.data)return String(part.body.data);const attachmentId=String(part?.body?.attachmentId||'');if(!attachmentId)return '';const response=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,{headers:{Authorization:'Bearer '+token}}),body=await response.json().catch(()=>({}));if(!response.ok||!body.data)throw Object.assign(new Error('gmail attachment'),{code:'gmail_auth'});return String(body.data);}
function gmailText(value:unknown){return new TextDecoder().decode(gmailBytes(value));}
function htmlText(value:string){return value.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
const EMAIL=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
function requestedAddresses(value:unknown,label:string){if(!Array.isArray(value)||value.length>50)throw new MailInputError(`Revisa ${label}`);const rows=[...new Set(value.map(item=>String(item||'').trim().toLowerCase()).filter(Boolean))];if(rows.some(item=>!EMAIL.test(item)))throw new MailInputError(`Revisa ${label}`);return rows;}
function requestedHtml(value:unknown){return String(value||'').slice(0,1048576).replace(/<(script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s(href|src)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi,'');}
function requestedAttachments(value:unknown){if(value==null)return [];if(!Array.isArray(value)||value.length>10)throw new MailInputError('Revisa los archivos adjuntos');let total=0;return value.map((item:any)=>{const name=String(item?.name||'archivo').replace(/[\r\n"\\/]+/g,' ').trim().slice(0,180)||'archivo',type=String(item?.type||'application/octet-stream').toLowerCase().trim().slice(0,120),data=String(item?.data||'').replace(/\s+/g,''),bytes=Math.floor(data.length*3/4);if(!/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(type)||!data||!/^([a-z0-9+/]{4})*([a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i.test(data)||bytes>8*1024*1024)throw new MailInputError('Revisa los archivos adjuntos');total+=bytes;if(total>12*1024*1024)throw new MailInputError('Los adjuntos superan el límite de 12 MB');const inline=Boolean(item?.inline)&&type.startsWith('image/'),contentId=inline&&/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(String(item?.contentId||''))?String(item.contentId).slice(0,200):'';return {name,type,data,size:bytes,inline,contentId};});}
function requestedDraft(body:any){const to=requestedAddresses(body?.to,'los destinatarios'),cc=requestedAddresses(body?.cc||[],'las copias'),bcc=requestedAddresses(body?.bcc||[],'las copias ocultas'),subject=String(body?.subject||'').replace(/[\r\n]+/g,' ').trim().slice(0,500),text=String(body?.body||'').slice(0,524288),bodyHtml=requestedHtml(body?.bodyHtml),attachments=requestedAttachments(body?.attachments);if(!to.length)throw new MailInputError('Añade al menos un destinatario');if(!subject)throw new MailInputError('Escribe un asunto');if(!text.trim()&&!attachments.length)throw new MailInputError('Escribe el mensaje o añade un archivo');const header=(value:unknown)=>String(value||'').replace(/[\r\n]+/g,' ').trim().slice(0,1000);return {to,cc,bcc,subject,body:text,bodyHtml,attachments,inReplyTo:header(body?.inReplyTo),references:header(body?.references),threadId:body?.threadId?requestedMessageId(body.threadId):''};}
const gmailFolders={inbox:'INBOX',sent:'SENT',drafts:'DRAFT',spam:'SPAM',trash:'TRASH'} as const;
type GmailFolder=keyof typeof gmailFolders;
function gmailFolder(value:unknown):GmailFolder{return typeof value==='string'&&value in gmailFolders?value as GmailFolder:'inbox';}
function requestedPaging(value:unknown){const input=value&&typeof value==='object'?value as Record<string,unknown>:{},pageSize=[10,20,30,50,100].includes(Number(input.pageSize))?Number(input.pageSize):10,pageIndex=Math.max(0,Math.min(5000,Number.isInteger(Number(input.pageIndex))?Number(input.pageIndex):0)),pageToken=String(input.pageToken||'');if(pageToken&&!/^[A-Za-z0-9_-]{1,1024}$/.test(pageToken))throw new MailInputError('Página no válida');return {pageSize,pageIndex,pageToken,direction:input.direction==='last'?'last':input.direction==='page'?'page':''};}
async function gmailInbox(refreshToken:string,folderValue:unknown,pageValue?:unknown){
 const token=await googleAccess(refreshToken),authorization={Authorization:'Bearer '+token.access_token};
 const folder=gmailFolder(folderValue),labelId=gmailFolders[folder],page=requestedPaging(pageValue),fetchPage=async(pageToken='')=>{const listUrl=new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');listUrl.searchParams.set('maxResults',String(page.pageSize));listUrl.searchParams.append('labelIds',labelId);if(pageToken)listUrl.searchParams.set('pageToken',pageToken);if(folder==='spam'||folder==='trash')listUrl.searchParams.set('includeSpamTrash','true');const response=await fetch(listUrl,{headers:authorization}),body=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error('gmail inbox'),{code:'gmail_auth'});return body;};
 const labelEntries=Object.entries(gmailFolders) as [GmailFolder,string][];
 const labelsPromise=Promise.all(labelEntries.map(([,id])=>fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${encodeURIComponent(id)}`,{headers:authorization})));let list:any,pageIndex=page.pageIndex,pageTokens:string[]|null=null;
 if(page.direction==='last'){pageTokens=[''];let cursor='';for(let index=0;index<100;index++){list=await fetchPage(cursor);const next=String(list.nextPageToken||'');if(!next)break;pageTokens.push(next);cursor=next;}pageIndex=pageTokens.length-1;}
 else if(page.direction==='page'&&page.pageIndex>0&&!page.pageToken){pageTokens=[''];let cursor='';for(let index=0;index<=page.pageIndex;index++){list=await fetchPage(cursor);pageIndex=index;if(index===page.pageIndex)break;const next=String(list.nextPageToken||'');if(!next)break;pageTokens.push(next);cursor=next;}}
 else list=await fetchPage(page.pageToken);
 const labelResponses=await labelsPromise,labelBodies=await Promise.all(labelResponses.map(response=>response.json().catch(()=>({}))));if(labelResponses.some(response=>!response.ok))throw Object.assign(new Error('gmail inbox'),{code:'gmail_auth'});
 const rows=await Promise.all((Array.isArray(list.messages)?list.messages:[]).slice(0,page.pageSize).map(async(item:any)=>{
  const detailUrl=new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(String(item.id||''))}`);detailUrl.searchParams.set('format','metadata');for(const header of ['From','To','Subject','Date'])detailUrl.searchParams.append('metadataHeaders',header);
  const response=await fetch(detailUrl,{headers:authorization});const message=await response.json().catch(()=>({}));if(!response.ok)return null;
  return {id:String(message.id||''),threadId:String(message.threadId||''),from:gmailHeader(message,'From'),to:gmailHeader(message,'To'),subject:gmailHeader(message,'Subject')||'(Sin asunto)',date:gmailHeader(message,'Date'),timestamp:Number(message.internalDate)||0,snippet:String(message.snippet||'').slice(0,500),unread:Array.isArray(message.labelIds)&&message.labelIds.includes('UNREAD')};
 }));
 const folderCounts=Object.fromEntries(labelEntries.map(([key],index)=>[key,Math.max(0,Number(labelBodies[index]?.messagesTotal)||0)]));
 return {folder,messages:rows.filter(Boolean),folderCounts,unreadCount:Math.max(0,Number(labelBodies[0]?.messagesUnread)||0),nextPageToken:String(list.nextPageToken||''),pageIndex,total:Math.max(0,Number(folderCounts[folder])||0),...(pageTokens?{pageTokens}: {})};
}
async function gmailMessage(refreshToken:string,messageId:unknown){
 const token=await googleAccess(refreshToken),id=requestedMessageId(messageId),response=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,{headers:{Authorization:'Bearer '+token.access_token}}),message=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error('gmail message'),{code:'gmail_auth'});
 const parts=gmailParts(message.payload),plainPart=parts.find(part=>String(part?.mimeType||'').toLowerCase()==='text/plain'&&!part.filename),htmlPart=parts.find(part=>String(part?.mimeType||'').toLowerCase()==='text/html'&&!part.filename),plain=plainPart?gmailText(await gmailPartData(token.access_token,id,plainPart)):'',rawHtml=htmlPart?gmailText(await gmailPartData(token.access_token,id,htmlPart)):'',attachmentParts=parts.filter(part=>part!==message.payload&&!gmailPartHeader(part,'Content-ID')&&!/^inline/i.test(gmailPartHeader(part,'Content-Disposition'))&&(String(part?.filename||'')||/attachment/i.test(gmailPartHeader(part,'Content-Disposition'))));
 let bodyHtml=rawHtml;const inlineParts=parts.filter(part=>String(part?.mimeType||'').toLowerCase().startsWith('image/')&&gmailPartHeader(part,'Content-ID')&&Number(part?.body?.size||0)<=2097152);for(const part of inlineParts.slice(0,20)){const cid=gmailPartHeader(part,'Content-ID').replace(/^<|>$/g,''),data=await gmailPartData(token.access_token,id,part);if(data)bodyHtml=bodyHtml.replace(new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'gi'),`data:${part.mimeType};base64,${standardBase64(data)}`);}
 const bodyText=(plain||htmlText(rawHtml)||String(message.snippet||'')).slice(0,524288),attachments=attachmentParts.map(part=>({id:String(part.partId||''),name:String(part.filename||'archivo'),type:String(part.mimeType||'application/octet-stream'),size:Math.max(0,Number(part?.body?.size)||0)})).filter(item=>item.id);return {id,threadId:String(message.threadId||''),from:gmailHeader(message,'From'),to:gmailHeader(message,'To'),cc:gmailHeader(message,'Cc'),replyTo:gmailHeader(message,'Reply-To'),messageId:gmailHeader(message,'Message-ID'),references:gmailHeader(message,'References'),subject:gmailHeader(message,'Subject')||'(Sin asunto)',date:gmailHeader(message,'Date'),timestamp:Number(message.internalDate)||0,bodyText,bodyHtml,attachments};
}
async function gmailAttachment(refreshToken:string,messageId:unknown,attachmentId:unknown){const token=await googleAccess(refreshToken),id=requestedMessageId(messageId),partId=requestedAttachmentId(attachmentId),response=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,{headers:{Authorization:'Bearer '+token.access_token}}),message=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error('gmail message'),{code:'gmail_auth'});const part=gmailParts(message.payload).find(item=>String(item?.partId||'')===partId);if(!part)throw new MailInputError('No se ha encontrado el adjunto');if(Number(part?.body?.size||0)>10485760)throw new MailInputError('El adjunto supera el límite de descarga de 10 MB');const data=await gmailPartData(token.access_token,id,part);return {name:String(part.filename||'archivo'),type:String(part.mimeType||'application/octet-stream'),size:Math.max(0,Number(part?.body?.size)||gmailBytes(data).length),data:standardBase64(data)};}
async function gmailSend(refreshToken:string,from:string,draft:ReturnType<typeof requestedDraft>){const token=await googleAccess(refreshToken),raw=buildPlainMessage({from,to:draft.to,cc:draft.cc,bcc:draft.bcc,includeBcc:true,subject:draft.subject,body:draft.body,bodyHtml:draft.bodyHtml,attachments:draft.attachments,inReplyTo:draft.inReplyTo,references:draft.references}),payload:any={raw:base64url(new TextEncoder().encode(raw))};if(draft.threadId)payload.threadId=draft.threadId;const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await response.json().catch(()=>({}));if(!response.ok||!result.id)throw Object.assign(new Error('gmail send'),{code:'gmail_auth'});return {sent:true,id:String(result.id)};}
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
 let action='';try{
  const body=await req.json();action=String(body?.action||'');const subject=await actor(req,body?.authToken);const study=studyId(body?.studyId);await requireAdmin(subject,study);
  if(body.action==='status'){const {data,error}=await subject.client.rpc('mail_connection_status',{p_estudio:study});if(error)throw error;return json(origin,{ok:true,connections:(data||[]).map(publicConnection)});}
  if(body.action==='inbox'){
   const id=connectionId(body.connectionId),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');
   const secretData=JSON.parse(data.secret),paging={pageSize:body.pageSize,pageIndex:body.pageIndex,pageToken:body.pageToken,direction:body.direction},inbox=data.provider==='gmail'?await gmailInbox(secretData.refreshToken,body.folder,paging):await readImapMailbox(secretData,body.folder,paging);await admin.rpc('mail_connection_admin_touch',{p_user:subject.user.id,p_estudio:study,p_connection:id,p_status:'connected',p_error:null});return json(origin,{ok:true,...inbox});
  }
  if(body.action==='message'){
   const id=connectionId(body.connectionId),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');const secretData=JSON.parse(data.secret),message=data.provider==='gmail'?await gmailMessage(secretData.refreshToken,body.messageId):await readImapMessage(secretData,body.folder,body.messageId);return json(origin,{ok:true,message});
  }
  if(body.action==='attachment'){
   const id=connectionId(body.connectionId),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');const secretData=JSON.parse(data.secret),attachment=data.provider==='gmail'?await gmailAttachment(secretData.refreshToken,body.messageId,body.attachmentId):await readImapAttachment(secretData,body.folder,body.messageId,body.attachmentId);if(Number(attachment.size)>10485760)throw new MailInputError('El adjunto supera el límite de descarga de 10 MB');return json(origin,{ok:true,attachment});
  }
  if(body.action==='send'){
   const id=connectionId(body.connectionId),draft=requestedDraft(body),{data,error}=await admin.rpc('mail_connection_admin_get',{p_user:subject.user.id,p_estudio:study,p_connection:id});if(error||!data)throw error||Error('missing');const secretData=JSON.parse(data.secret),result=data.provider==='gmail'?await gmailSend(secretData.refreshToken,String(data.email),draft):await sendSmtpMessage(secretData,String(data.email),draft);return json(origin,{ok:true,...result});
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
 }catch(error){const code=safeErrorCode(error),status=error instanceof MailInputError?400:Number((error as any)?.status)||((error as any)?.code==='42501'?403:502),fallback=action==='send'?'No se ha podido enviar el correo.':action==='attachment'?'No se ha podido descargar el adjunto.':action==='message'?'No se ha podido abrir el correo.':safeErrorMessage(code);return json(origin,{ok:false,code,error:error instanceof MailInputError?error.message:fallback},status);}
});
