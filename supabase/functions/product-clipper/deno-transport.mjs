import {Buffer} from 'node:buffer';
const fail=(code)=>Object.assign(new Error('Respuesta de red no admitida'),{code});
function headersOf(bytes){
 const end=bytes.indexOf('\r\n\r\n');if(end<0||end>32768)throw fail('http_headers');
 const lines=bytes.subarray(0,end).toString('latin1').split('\r\n');
 const status=/^HTTP\/1\.[01] ([1-5]\d\d)(?: |$)/.exec(lines.shift());if(!status)throw fail('http_status');
 const headers=Object.create(null);
 for(const line of lines){const match=/^([!#$%&'*+.^_`|~\w-]+):[ \t]*([^\r\n]*)$/.exec(line);if(!match)throw fail('http_headers');const key=match[1].toLowerCase();if(headers[key]!==undefined){if(['content-length','transfer-encoding','content-type','location'].includes(key))throw fail('http_ambiguous');continue;}headers[key]=match[2].trim();}
 if(headers['transfer-encoding']&&headers['content-length'])throw fail('http_ambiguous');
 if(headers['transfer-encoding']&&headers['transfer-encoding'].toLowerCase()!=='chunked')throw fail('http_encoding');
 if(headers['content-encoding']&&headers['content-encoding'].toLowerCase()!=='identity')throw fail('encoding');
 if(headers['content-length']&&!/^\d+$/.test(headers['content-length']))throw fail('http_length');
 return {status:Number(status[1]),headers,bodyOffset:end+4};
}
export function parseHttpResponse(bytes,maxBytes){
 const {status,headers,bodyOffset}=headersOf(bytes);let body=bytes.subarray(bodyOffset);
 if(headers['transfer-encoding']){
  let cursor=0,total=0;const chunks=[];
  while(true){const end=body.indexOf('\r\n',cursor);if(end<0||end-cursor>1024)throw fail('http_chunk');const line=body.subarray(cursor,end).toString('ascii');if(!/^[0-9a-fA-F]+(?:;[^\r\n]*)?$/.test(line))throw fail('http_chunk');const size=parseInt(line.split(';')[0],16);cursor=end+2;
   if(!Number.isSafeInteger(size)||size<0||total+size>maxBytes)throw fail('too_large');
   if(size===0){if(!body.subarray(cursor).equals(Buffer.from('\r\n')))throw fail('http_trailers');break;}
   if(cursor+size+2>body.length||body[cursor+size]!==13||body[cursor+size+1]!==10)throw fail('http_truncated');
   chunks.push(body.subarray(cursor,cursor+size));total+=size;cursor+=size+2;
  }body=Buffer.concat(chunks,total);
 }else if(headers['content-length']!==undefined&&Number(headers['content-length'])!==body.length)throw fail('http_truncated');
 if(body.length>maxBytes)throw fail('too_large');return {status,headers,bytes:body};
}
// Supabase's Node HTTP shim does not implement custom lookup. Connect to the
// already checked IP directly, then verify TLS against the original hostname.
export async function denoRequestPinned(u,ip,{maxBytes,signal},runtime=globalThis.Deno){
 let conn;const close=()=>{try{conn?.close();}catch{}};
 let stop;const aborted=new Promise((_,reject)=>{stop=()=>{close();reject(signal.reason||fail('timeout'));};if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});});
 const work=(async()=>{
  conn=await runtime.connect({hostname:ip.address,port:Number(u.port)||(u.protocol==='https:'?443:80)});signal.throwIfAborted();
  if(u.protocol==='https:'){conn=await runtime.startTls(conn,{hostname:u.hostname.replace(/^\[|\]$/g,''),alpnProtocols:['http/1.1']});signal.throwIfAborted();}
  const request=Buffer.from(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUser-Agent: ModernoApp-ProductImporter/1.0\r\nAccept: text/html,application/xhtml+xml,image/avif,image/webp,image/png,image/jpeg;q=0.9\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`);
  for(let written=0;written<request.length;){signal.throwIfAborted();const n=await conn.write(request.subarray(written));if(!n)throw fail('http_write');written+=n;}
  const chunks=[];let length=0,headerChecked=false;const buffer=new Uint8Array(65536);
  while(true){signal.throwIfAborted();const n=await conn.read(buffer);if(n===null)break;if(!n)continue;length+=n;if(length>maxBytes+131072)throw fail('too_large');chunks.push(Buffer.from(buffer.subarray(0,n)));
   if(!headerChecked){const accumulated=Buffer.concat(chunks,length);const end=accumulated.indexOf('\r\n\r\n');if(end>=0){const h=headersOf(accumulated);if(Number(h.headers['content-length']||0)>maxBytes)throw fail('too_large');headerChecked=true;}else if(length>32768)throw fail('http_headers');}
  }
  return parseHttpResponse(Buffer.concat(chunks,length),maxBytes);
 })();
 try{return await Promise.race([work,aborted]);}finally{signal.removeEventListener('abort',stop);close();work.finally(close).catch(()=>{});}
}
