import * as net from 'node:net';
import * as tls from 'node:tls';
import {lookup} from 'node:dns/promises';

type Security='tls'|'starttls';
type Endpoint={host:string;port:number;security:Security;user:string};
type Account={password:string;imap:Endpoint;smtp:Endpoint};
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
 constructor(socket:net.Socket|tls.TLSSocket){this.socket=socket;socket.setEncoding('utf8');this.onData=(chunk:string)=>{this.size+=Buffer.byteLength(chunk);if(this.size>65536){socket.destroy(new Error('response too large'));return;}this.buffer+=chunk;let pos;while((pos=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,pos+1).replace(/\r?\n$/,'');this.buffer=this.buffer.slice(pos+1);const waiter=this.waiters.shift();waiter?waiter(line):this.queue.push(line);}};socket.on('data',this.onData);}
 line(timeout=12000){if(this.queue.length)return Promise.resolve(this.queue.shift()!);return new Promise<string>((resolve,reject)=>{const timer=setTimeout(()=>reject(new MailNetworkError('timeout','timeout')),timeout);this.waiters.push(line=>{clearTimeout(timer);resolve(line);});});}
 write(value:string){this.socket.write(value+'\r\n');}
 detach(){this.socket.off('data',this.onData);}
}
async function imapTagged(lines:Lines,tag:string){let line='';for(let i=0;i<100;i++){line=await lines.line();if(line.toUpperCase().startsWith(tag.toUpperCase()+' '))return line;}throw new MailNetworkError('connection_failed','imap response');}
const imapQuoted=(value:string)=>'"'+value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
async function verifyImap(endpoint:Endpoint,password:string){
 const address=await resolvePublic(endpoint.host);let socket=endpoint.security==='tls'?await tlsSocket(address,endpoint.host,endpoint.port):await plainSocket(address,endpoint.port);let lines=new Lines(socket);
 try{
  const greeting=await lines.line();if(!/^\* (OK|PREAUTH)\b/i.test(greeting))throw new MailNetworkError('connection_failed','imap greeting');
  if(endpoint.security==='starttls'){lines.write('m0 STARTTLS');const response=await imapTagged(lines,'m0');if(!/^m0 OK\b/i.test(response))throw new MailNetworkError('tls','starttls');lines.detach();socket=await tlsSocket(address,endpoint.host,endpoint.port,socket as net.Socket);lines=new Lines(socket);}
  lines.write(`m1 LOGIN ${imapQuoted(endpoint.user)} ${imapQuoted(password)}`);const auth=await imapTagged(lines,'m1');if(!/^m1 OK\b/i.test(auth))throw new MailNetworkError('imap_auth','auth');
  lines.write('m2 LOGOUT');
 }finally{socket.end();socket.destroy();}
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
export async function verifyPasswordAccount(account:Account){await verifyImap(account.imap,account.password);await verifySmtp(account.smtp,account.password);}

