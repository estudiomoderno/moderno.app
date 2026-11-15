import * as net from 'node:net';
import * as tls from 'node:tls';
import {lookup} from 'node:dns/promises';
import {buildPlainMessage,mimeAttachment,parseMimeMessage} from './mime.mjs';

type Security='tls'|'starttls';
type Endpoint={host:string;port:number;security:Security;user:string};
type Account={password:string;imap:Endpoint;smtp:Endpoint};
type FolderKey='inbox'|'sent'|'drafts'|'spam'|'trash';
type ImapFolder={path:string;attributes:string[]};
class MailNetworkError extends Error{code:string;constructor(code:string,message:string){super(message);this.code=code;}}

function privateIpv4(address:string){
 const p=address.split('.').map(Number);if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return true;
 return p[0]===0||p[0]===10||p[0]===127||p[0]>=224||p[0]>=240||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===192&&p[1]===0)||(p[0]===192&&p[1]===2)||(p[0]===198&&[18,19,51].includes(p[1]))||(p[0]===203&&p[1]===0&&p[2]===113);
}
function privateIpv6(address:string){
 const a=address.toLowerCase();
 if(a==='::'||a==='::1'||a.startsWith('fc')||a.startsWith('fd')||/^fe[89ab]/.test(a)||a.startsWith('ff')||a.startsWith('2001:db8:'))return true;
 const mapped=a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);return mapped?privateIpv4(mapped[1]):false;
}
async function resolvePublic(host:string){
 let rows;try{rows=await lookup(host,{all:true,verbatim:true});}catch{throw new MailNetworkError('dns','dns');}
 const safe=rows.filter(r=>r.family===4?!privateIpv4(r.address):r.family===6?!privateIpv6(r.address):false);
 if(!safe.length||safe.length!==rows.length)throw new MailNetworkError('dns','unsafe address');
 return safe[0].address;
}
function waitEvent(socket:net.Socket|tls.TLSSocket,event:string,timeout=12000){return new Promise<void>((resolve,reject)=>{const done=(error?:Error)=>{clearTimeout(timer);socket.off(event,onOk);socket.off('error',onError);error?reject(error):resolve();};const onOk=()=>done();const onError=(e:Error)=>done(e);const timer=setTimeout(()=>done(new MailNetworkError('timeout','timeout')),timeout);socket.once(event,onOk);socket.once('error',onError);});}
async function plainSocket(address:string,port:number){const socket=net.createConnection({host:address,port});await waitEvent(socket,'connect');return socket;}
async function tlsSocket(address:string,host:string,port:number,socket?:net.Socket){const secure=tls.connect({host:socket?undefined:address,port:socket?undefined:port,socket,servername:host,rejectUnauthorized:true});try{await waitEvent(secure,'secureConnect');return secure;}catch{secure.destroy();throw new MailNetworkError('tls','tls');}}

class Lines{
 socket:net.Socket|tls.TLSSocket;buffer='';queue:string[]=[];waiters:Array<(line:string)=>void>=[];size=0;onData:(chunk:string)=>void;
 constructor(socket:net.Socket|tls.TLSSocket){this.socket=socket;socket.setEncoding('utf8');this.onData=(chunk:string)=>{this.size+=Buffer.byteLength(chunk);if(this.size>12582912){socket.destroy(new Error('response too large'));return;}this.buffer+=chunk;let pos;while((pos=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,pos+1).replace(/\r?\n$/,'');this.buffer=this.buffer.slice(pos+1);const waiter=this.waiters.shift();waiter?waiter(line):this.queue.push(line);}};socket.on('data',this.onData);}
 line(timeout=12000){if(this.queue.length)return Promise.resolve(this.queue.shift()!);return new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>reject(new MailNetworkError('timeout','timeout')),timeout);this.waiters.push(line=>{clearTimeout(timer);resolve(line);});});}
 write(value:string){this.socket.write(value+'\r\n');}
 detach(){this.socket.off('data',this.onData);}
}
async function imapTagged(lines:Lines,tag:string){let line='';for(let i=0;i<100;i++){line=await lines.line();if(line.toUpperCase().startsWith(tag.toUpperCase()+' '))return line;}throw new MailNetworkError('connection_failed','imap response');}
const imapQuoted=(value:string)=>'"'+value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
async function imapCommand(lines:Lines,tag:string,command:string){
 lines.write(`${tag} ${command}`);const rows:string[]=[];
 for(let i=0;i<5000;i++){const line=await lines.line();if(line.toUpperCase().startsWith(tag.toUpperCase()+' ')){if(!new RegExp(`^${tag} OK\\b`,'i').test(line))throw new MailNetworkError('connection_failed','imap command');return rows;}rows.push(line);}
 throw new MailNetworkError('connection_failed','imap response');
}
async function loginImap(endpoint:Endpoint,password:string){
 const address=await resolvePublic(endpoint.host);let socket=endpoint.security==='tls'?await tlsSocket(address,endpoint.host,endpoint.port):await plainSocket(address,endpoint.port);let lines=new Lines(socket);
 try{
  const greeting=await lines.line();if(!/^\* (OK|PREAUTH)\b/i.test(greeting))throw new MailNetworkError('connection_failed','imap greeting');
  if(endpoint.security==='starttls'){lines.write('m0 STARTTLS');const response=await imapTagged(lines,'m0');if(!/^m0 OK\b/i.test(response))throw new MailNetworkError('tls','starttls');lines.detach();socket=await tlsSocket(address,endpoint.host,endpoint.port,socket as net.Socket);lines=new Lines(socket);}
  lines.write(`m1 LOGIN ${imapQuoted(endpoint.user)} ${imapQuoted(password)}`);const auth=await imapTagged(lines,'m1');if(!/^m1 OK\b/i.test(auth))throw new MailNetworkError('imap_auth','auth');
  return {socket,lines};
 }catch(error){socket.end();socket.destroy();throw error;}
}
async function verifyImap(endpoint:Endpoint,password:string){
 const {socket,lines}=await loginImap(endpoint,password);
 try{lines.write('m2 LOGOUT');}finally{socket.end();socket.destroy();}
}

function unquoteMailbox(value:string){const text=value.trim();if(text.startsWith('"')&&text.endsWith('"'))return text.slice(1,-1).replace(/\\([\\"])/g,'$1');return text;}
export function imapFolderMap(rows:string[]):Record<FolderKey,string|null>{
 const folders:ImapFolder[]=rows.flatMap(line=>{const match=line.match(/^\* LIST \(([^)]*)\) (?:"(?:\\.|[^"])*"|NIL) (.+)$/i);return match?[{attributes:match[1].toLowerCase().split(/\s+/).filter(Boolean),path:unquoteMailbox(match[2])}]:[];});
 const result:Record<FolderKey,string|null>={inbox:'INBOX',sent:null,drafts:null,spam:null,trash:null};
 const special:Record<string,FolderKey>={'\\sent':'sent','\\drafts':'drafts','\\junk':'spam','\\trash':'trash'};
 for(const folder of folders)for(const attribute of folder.attributes)if(special[attribute]&&!result[special[attribute]])result[special[attribute]]=folder.path;
 const fallbacks:Record<Exclude<FolderKey,'inbox'>,RegExp[]>={sent:[/(^|[./ ])sent( messages| items)?$/i,/(^|[./ ])enviados$/i],drafts:[/(^|[./ ])drafts?$/i,/(^|[./ ])borradores$/i],spam:[/(^|[./ ])junk( mail)?$/i,/(^|[./ ])spam$/i,/(^|[./ ])correo no deseado$/i],trash:[/(^|[./ ])trash$/i,/(^|[./ ])deleted( messages| items)?$/i,/(^|[./ ])papelera$/i]};
 for(const key of Object.keys(fallbacks) as Array<Exclude<FolderKey,'inbox'>>)if(!result[key])result[key]=folders.find(folder=>fallbacks[key].some(pattern=>pattern.test(folder.path)))?.path||null;
 return result;
}
function decodeHeader(value:string){
 return value.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,(_all,charset,mode,data)=>{try{const bytes=mode.toLowerCase()==='b'?Buffer.from(data,'base64'):Buffer.from(data.replace(/_/g,' ').replace(/=([0-9a-f]{2})/gi,(_m:string,hex:string)=>String.fromCharCode(parseInt(hex,16))),'binary');return new TextDecoder(String(charset).toLowerCase()).decode(bytes);}catch{return data;}}).trim();
}
function headerValue(text:string,name:string){const unfolded=text.replace(/\r?\n[ \t]+/g,' '),match=unfolded.match(new RegExp(`(?:^|\\n)${name}:\\s*([^\\r\\n]*)`,'i'));return decodeHeader(match?.[1]||'');}
function decodeBody(value:string,encoding:string){try{if(/base64/i.test(encoding))return Buffer.from(value.replace(/\s+/g,''),'base64').toString('utf8');if(/quoted-printable/i.test(encoding))return value.replace(/=\r?\n/g,'').replace(/=([0-9a-f]{2})/gi,(_m,hex)=>String.fromCharCode(parseInt(hex,16)));}catch{}return value;}
function textFromHtml(value:string){return value.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
export function parseImapBody(raw:string):string{
 const split=raw.search(/\r?\n\r?\n/),headers=split>=0?raw.slice(0,split):'',body=split>=0?raw.slice(split).replace(/^\r?\n\r?\n/,''):raw,contentType=headerValue(headers,'Content-Type'),encoding=headerValue(headers,'Content-Transfer-Encoding');
 const boundary=contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean);
 if(boundary){const parts=body.split(`--${boundary}`).filter(part=>part.trim()&&part.trim()!=='--'),plain=parts.find(part=>/^Content-Type:\s*text\/plain\b/im.test(part)),html=parts.find(part=>/^Content-Type:\s*text\/html\b/im.test(part)),chosen=plain||html;if(chosen)return parseImapBody(chosen.replace(/^\r?\n/,''));}
 const decoded=decodeBody(body,encoding).slice(0,131072);return /^text\/html\b/i.test(contentType)?textFromHtml(decoded):decoded.replace(/\r\n/g,'\n').trim();
}
export function parseImapMessages(rows:string[]){
 const groups:string[][]=[];for(const line of rows){if(/^\* \d+ FETCH\b/i.test(line))groups.push([line]);else if(groups.length)groups[groups.length-1].push(line);}
 return groups.map(group=>{const first=group[0],uid=first.match(/\bUID (\d+)\b/i)?.[1]||'',flags=first.match(/\bFLAGS \(([^)]*)\)/i)?.[1]||'',internal=first.match(/\bINTERNALDATE "([^"]+)"/i)?.[1]||'',headers=group.slice(1).join('\r\n');return {id:`imap-${uid}`,threadId:'',from:headerValue(headers,'From'),to:headerValue(headers,'To'),subject:headerValue(headers,'Subject')||'(Sin asunto)',date:headerValue(headers,'Date')||internal,timestamp:Date.parse(internal)||Date.parse(headerValue(headers,'Date'))||0,snippet:'',unread:!/(^|\s)\\Seen(\s|$)/i.test(flags)};}).filter(row=>row.id!=='imap-').sort((a,b)=>b.timestamp-a.timestamp);
}
function folderKey(value:unknown):FolderKey{return typeof value==='string'&&['inbox','sent','drafts','spam','trash'].includes(value)?value as FolderKey:'inbox';}
function paging(value:unknown){const input=value&&typeof value==='object'?value as Record<string,unknown>:{},size=[20,30,50,100].includes(Number(input.pageSize))?Number(input.pageSize):20,index=Math.max(0,Math.min(5000,Number.isInteger(Number(input.pageIndex))?Number(input.pageIndex):0));return {size,index,direction:input.direction==='last'?'last':''};}
function messageUid(value:unknown){const match=String(value||'').match(/^imap-(\d{1,20})$/);if(!match)throw new MailNetworkError('connection_failed','message id');return match[1];}
function statusCounts(rows:string[]){const line=rows.find(row=>/^\* STATUS\b/i.test(row))||'';return {total:Math.max(0,Number(line.match(/\bMESSAGES (\d+)/i)?.[1])||0),unread:Math.max(0,Number(line.match(/\bUNSEEN (\d+)/i)?.[1])||0)};}
export async function readImapMailbox(account:Account,folderValue:unknown,pageValue?:unknown){
 const folder=folderKey(folderValue),page=paging(pageValue);
 const {socket,lines}=await loginImap(account.imap,account.password);let tag=2;
 try{
  const paths=imapFolderMap(await imapCommand(lines,`m${tag++}`,'LIST "" "*"')),folderCounts={inbox:0,sent:0,drafts:0,spam:0,trash:0},unreadCounts={...folderCounts};
  for(const key of Object.keys(folderCounts) as FolderKey[]){const path=paths[key];if(!path)continue;const counts=statusCounts(await imapCommand(lines,`m${tag++}`,`STATUS ${imapQuoted(path)} (MESSAGES UNSEEN)`));folderCounts[key]=counts.total;unreadCounts[key]=counts.unread;}
  const path=paths[folder];if(!path)return {folder,messages:[],folderCounts,unreadCount:unreadCounts.inbox,nextPageToken:'',pageIndex:0,total:0};
  const selected=await imapCommand(lines,`m${tag++}`,`EXAMINE ${imapQuoted(path)}`),exists=Math.max(0,Number(selected.find(row=>/^\* \d+ EXISTS$/i.test(row))?.match(/^\* (\d+)/)?.[1])||0);
  if(!exists)return {folder,messages:[],folderCounts,unreadCount:unreadCounts.inbox,nextPageToken:'',pageIndex:0,total:0};
  const lastPage=Math.max(0,Math.ceil(exists/page.size)-1),pageIndex=page.direction==='last'?lastPage:Math.min(page.index,lastPage),upper=Math.max(1,exists-pageIndex*page.size),first=Math.max(1,upper-page.size+1),rows=await imapCommand(lines,`m${tag++}`,`FETCH ${first}:${upper} (UID FLAGS INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`);
  return {folder,messages:parseImapMessages(rows),folderCounts,unreadCount:unreadCounts.inbox,nextPageToken:first>1?String(pageIndex+1):'',pageIndex,total:exists};
 }finally{try{lines.write(`m${tag} LOGOUT`);}catch{}socket.end();socket.destroy();}
}
export async function readImapMessage(account:Account,folderValue:unknown,messageId:unknown){
 const {uid,first,raw}=await readImapRaw(account,folderValue,messageId),parsed=parseMimeMessage(raw);
 return {id:`imap-${uid}`,from:headerValue(raw,'From'),to:headerValue(raw,'To'),cc:headerValue(raw,'Cc'),replyTo:headerValue(raw,'Reply-To'),messageId:headerValue(raw,'Message-ID'),references:headerValue(raw,'References'),subject:headerValue(raw,'Subject')||'(Sin asunto)',date:headerValue(raw,'Date')||first.match(/\bINTERNALDATE "([^"]+)"/i)?.[1]||'',bodyText:parsed.bodyText,bodyHtml:parsed.bodyHtml,attachments:parsed.attachments};
}
async function readImapRaw(account:Account,folderValue:unknown,messageId:unknown){
 const folder=folderKey(folderValue),uid=messageUid(messageId),{socket,lines}=await loginImap(account.imap,account.password);let tag=2;
 try{
  const paths=imapFolderMap(await imapCommand(lines,`m${tag++}`,'LIST "" "*"')),path=paths[folder];if(!path)throw new MailNetworkError('connection_failed','folder');
  await imapCommand(lines,`m${tag++}`,`EXAMINE ${imapQuoted(path)}`);const rows=await imapCommand(lines,`m${tag++}`,`UID FETCH ${uid} (UID FLAGS INTERNALDATE BODY.PEEK[]<0.8388608>)`),start=rows.findIndex(row=>/^\* \d+ FETCH\b/i.test(row));if(start<0)throw new MailNetworkError('connection_failed','message');
  const first=rows[start],raw=rows.slice(start+1).filter((row,index,all)=>!(index===all.length-1&&row.trim()===')')).join('\r\n');
  return {uid,first,raw};
 }finally{try{lines.write(`m${tag} LOGOUT`);}catch{}socket.end();socket.destroy();}
}
export async function readImapAttachment(account:Account,folderValue:unknown,messageId:unknown,attachmentId:unknown){const id=String(attachmentId||'');if(!/^imap-part-[0-9.]{1,60}$/.test(id))throw new MailNetworkError('connection_failed','attachment id');const {raw}=await readImapRaw(account,folderValue,messageId);return mimeAttachment(raw,id);}
export async function trashImapMessages(account:Account,folderValue:unknown,messageIds:unknown[]){
 const folder=folderKey(folderValue);if(folder==='trash')throw new MailNetworkError('connection_failed','already trash');const uids=messageIds.map(messageUid),{socket,lines}=await loginImap(account.imap,account.password);let tag=2;
 try{
  const paths=imapFolderMap(await imapCommand(lines,`m${tag++}`,'LIST "" "*"')),source=paths[folder],trash=paths.trash;if(!source||!trash)throw new MailNetworkError('connection_failed','trash folder');
  await imapCommand(lines,`m${tag++}`,`SELECT ${imapQuoted(source)}`);await imapCommand(lines,`m${tag++}`,`UID MOVE ${uids.join(',')} ${imapQuoted(trash)}`);return {moved:uids.length};
 }finally{try{lines.write(`m${tag} LOGOUT`);}catch{}socket.end();socket.destroy();}
}
async function smtpResponse(lines:Lines){let line=await lines.line();const code=line.slice(0,3);if(!/^\d{3}$/.test(code))throw new MailNetworkError('connection_failed','smtp response');while(line[3]==='-')line=await lines.line();return {code:Number(code),line};}
async function verifySmtp(endpoint:Endpoint,password:string){
 const address=await resolvePublic(endpoint.host);let socket=endpoint.security==='tls'?await tlsSocket(address,endpoint.host,endpoint.port):await plainSocket(address,endpoint.port);let lines=new Lines(socket);
 try{
  if((await smtpResponse(lines)).code!==220)throw new MailNetworkError('connection_failed','smtp greeting');
  lines.write('EHLO app.moderno.app');if((await smtpResponse(lines)).code!==250)throw new MailNetworkError('connection_failed','smtp ehlo');
  if(endpoint.security==='starttls'){lines.write('STARTTLS');if((await smtpResponse(lines)).code!==220)throw new MailNetworkError('tls','starttls');lines.detach();socket=await tlsSocket(address,endpoint.host,endpoint.port,socket as net.Socket);lines=new Lines(socket);lines.write('EHLO app.moderno.app');if((await smtpResponse(lines)).code!==250)throw new MailNetworkError('connection_failed','smtp ehlo tls');}
  const auth=Buffer.from(`\0${endpoint.user}\0${password}`,'utf8').toString('base64');lines.write('AUTH PLAIN '+auth);let response=await smtpResponse(lines);if(response.code===334){lines.write(auth);response=await smtpResponse(lines);}
  if(response.code!==235){lines.write('AUTH LOGIN');response=await smtpResponse(lines);if(response.code!==334)throw new MailNetworkError('smtp_auth','auth');lines.write(Buffer.from(endpoint.user,'utf8').toString('base64'));response=await smtpResponse(lines);if(response.code!==334)throw new MailNetworkError('smtp_auth','user');lines.write(Buffer.from(password,'utf8').toString('base64'));response=await smtpResponse(lines);if(response.code!==235)throw new MailNetworkError('smtp_auth','password');}
  lines.write('QUIT');
 }finally{socket.end();socket.destroy();}
}
function smtpAddress(value:string){const email=String(value||'').trim().toLowerCase();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw new MailNetworkError('connection_failed','recipient');return email;}
export async function sendSmtpMessage(account:Account,fromValue:string,draft:{to:string[];cc:string[];subject:string;body:string;inReplyTo?:string;references?:string}){
 const from=smtpAddress(fromValue),recipients=[...new Set([...draft.to,...draft.cc].map(smtpAddress))],address=await resolvePublic(account.smtp.host);if(!recipients.length)throw new MailNetworkError('connection_failed','recipient');
 let socket=account.smtp.security==='tls'?await tlsSocket(address,account.smtp.host,account.smtp.port):await plainSocket(address,account.smtp.port),lines=new Lines(socket);
 try{
  if((await smtpResponse(lines)).code!==220)throw new MailNetworkError('connection_failed','smtp greeting');lines.write('EHLO app.moderno.app');if((await smtpResponse(lines)).code!==250)throw new MailNetworkError('connection_failed','smtp ehlo');
  if(account.smtp.security==='starttls'){lines.write('STARTTLS');if((await smtpResponse(lines)).code!==220)throw new MailNetworkError('tls','starttls');lines.detach();socket=await tlsSocket(address,account.smtp.host,account.smtp.port,socket as net.Socket);lines=new Lines(socket);lines.write('EHLO app.moderno.app');if((await smtpResponse(lines)).code!==250)throw new MailNetworkError('connection_failed','smtp ehlo tls');}
  const auth=Buffer.from(`\0${account.smtp.user}\0${account.password}`,'utf8').toString('base64');lines.write('AUTH PLAIN '+auth);let response=await smtpResponse(lines);if(response.code===334){lines.write(auth);response=await smtpResponse(lines);}if(response.code!==235){lines.write('AUTH LOGIN');response=await smtpResponse(lines);if(response.code!==334)throw new MailNetworkError('smtp_auth','auth');lines.write(Buffer.from(account.smtp.user,'utf8').toString('base64'));if((await smtpResponse(lines)).code!==334)throw new MailNetworkError('smtp_auth','user');lines.write(Buffer.from(account.password,'utf8').toString('base64'));if((await smtpResponse(lines)).code!==235)throw new MailNetworkError('smtp_auth','password');}
  lines.write(`MAIL FROM:<${from}>`);if((await smtpResponse(lines)).code!==250)throw new MailNetworkError('connection_failed','mail from');for(const recipient of recipients){lines.write(`RCPT TO:<${recipient}>`);const code=(await smtpResponse(lines)).code;if(code!==250&&code!==251)throw new MailNetworkError('connection_failed','recipient rejected');}
  lines.write('DATA');if((await smtpResponse(lines)).code!==354)throw new MailNetworkError('connection_failed','data');const message=buildPlainMessage({from,to:draft.to,cc:draft.cc,subject:draft.subject,body:draft.body,inReplyTo:draft.inReplyTo||'',references:draft.references||''}).replace(/^\./gm,'..');lines.write(message+'\r\n.');if((await smtpResponse(lines)).code!==250)throw new MailNetworkError('connection_failed','send');lines.write('QUIT');return {sent:true};
 }finally{socket.end();socket.destroy();}
}
export async function verifyPasswordAccount(account:Account){await verifyImap(account.imap,account.password);await verifySmtp(account.smtp,account.password);}
