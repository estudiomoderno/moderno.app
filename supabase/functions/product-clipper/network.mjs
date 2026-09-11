import https from 'node:https';
import http from 'node:http';
import {lookup} from 'node:dns/promises';
import {ipaddr,imageSize} from './vendor.mjs';
import {denoRequestPinned} from './deno-transport.mjs';

export class CaptureError extends Error{constructor(code,message){super(message);this.code=code;}}
export function publicAddress(address){
 try{let ip=ipaddr.parse(address);if(ip.kind()==='ipv6'&&ip.isIPv4MappedAddress())ip=ip.toIPv4Address();
 if(ip.range()!=='unicast')return false;
 // Reject transition/documentation/reserved ranges as well as private ranges.
 const blocked=ip.kind()==='ipv4'?['192.0.0.0/24','192.0.2.0/24','198.51.100.0/24','203.0.113.0/24','198.18.0.0/15']:['2001::/23','2001:db8::/32','2002::/16','64:ff9b::/96','64:ff9b:1::/48'];
 return !blocked.some(c=>ip.match(ipaddr.parseCIDR(c)));
 }catch{return false;}
}
export function publicURL(raw){
 let u;try{u=new URL(raw);}catch{throw new CaptureError('invalid_url','Pega una dirección web válida.');}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port)||u.href.length>3000)throw new CaptureError('blocked_url','Esta dirección no está permitida.');
 const h=u.hostname.replace(/^\[|\]$/g,'').toLowerCase();
 if(!h.includes('.')&&!h.includes(':')||/\.(localhost|local|internal|test|invalid|onion)$/.test(h)||h==='localhost'||ipaddr.isValid(h)&&!publicAddress(h))throw new CaptureError('blocked_url','No se permiten direcciones internas.');
 u.hash='';return u;
}
export async function resolvePublic(host,resolver=lookup){
 const h=host.replace(/^\[|\]$/g,'');
 const result=ipaddr.isValid(h)?[{address:h,family:ipaddr.parse(h).kind()==='ipv4'?4:6}]:await resolver(h,{all:true,verbatim:true});
 if(!result.length||result.some(x=>!publicAddress(x.address)))throw new CaptureError('blocked_address','La dirección no es pública.');
 return result[0];
}
async function requestPinned(u,ip,{maxBytes,signal}){
 if(globalThis.Deno?.connect&&globalThis.Deno?.startTls)return denoRequestPinned(u,ip,{maxBytes,signal});
 return new Promise((resolve,reject)=>{
 const transport=u.protocol==='https:'?https:http;
 // Lookup returns the checked address, eliminating a second DNS lookup/rebinding window.
 const req=transport.request(u,{method:'GET',agent:false,signal,
 lookup:(_host,options,cb)=>options?.all?cb(null,[ip]):cb(null,ip.address,ip.family),
 headers:{'User-Agent':'ModernoApp-ProductImporter/1.0','Accept':'text/html,application/xhtml+xml,image/avif,image/webp,image/png,image/jpeg;q=0.9','Accept-Encoding':'identity'}},res=>{
 if(Number(res.headers['content-length']||0)>maxBytes){res.destroy();reject(new CaptureError('too_large','El archivo supera el límite permitido.'));return;}
 if(res.headers['content-encoding']&&!['identity'].includes(res.headers['content-encoding'])){res.destroy();reject(new CaptureError('encoding','La tienda usa una respuesta comprimida no admitida.'));return;}
 let size=0;const parts=[];res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy(new CaptureError('too_large','El archivo supera el límite permitido.'));return;}parts.push(chunk);});
 res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(parts)}));res.on('error',reject);
 });req.on('error',reject);req.end();
 });
}
export async function safeFetch(raw,{maxBytes=3*1024*1024,timeoutMs=15000,resolver=lookup,request=requestPinned,signal}={}){
 let u=publicURL(raw);const timeout=AbortSignal.timeout(timeoutMs);const combined=signal?AbortSignal.any([signal,timeout]):timeout;
 for(let hop=0;hop<5;hop++){
 combined.throwIfAborted();const ip=await Promise.race([resolvePublic(u.hostname,resolver),new Promise((_,reject)=>{if(combined.aborted)reject(combined.reason);else combined.addEventListener('abort',()=>reject(combined.reason),{once:true});})]);
 const response=await request(u,ip,{maxBytes,signal:combined});
 if([301,302,303,307,308].includes(response.status)){if(!response.headers.location)throw new CaptureError('redirect','Redirección incompleta.');u=publicURL(new URL(response.headers.location,u).href);continue;}
 if(response.status!==200)throw new CaptureError('store_http_'+response.status,'La tienda no permite consultar esta ficha (HTTP '+response.status+'). Puedes añadirla manualmente.');
 return {...response,url:u.href};
 }throw new CaptureError('redirect_limit','La tienda redirige demasiadas veces.');
}
export function verifyImage(bytes,mime){
 const allowed={jpg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'};
 let info;try{info=imageSize(bytes);}catch{throw new CaptureError('invalid_image','No es una imagen reconocida.');}
 const contentType=allowed[info.type];
 if(!contentType||String(mime||'').split(';')[0].trim()!==contentType)throw new CaptureError('invalid_image','El contenido de la imagen no coincide con su formato.');
 if(!info.width||!info.height||info.width<120||info.height<120||info.width*info.height>40000000||Math.max(info.width,info.height)>12000)throw new CaptureError('image_dimensions','Dimensiones de imagen no admitidas.');
 return {contentType,extension:info.type,width:info.width,height:info.height,bytes:bytes.length};
}
