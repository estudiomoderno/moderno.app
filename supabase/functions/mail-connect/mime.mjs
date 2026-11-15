const MAX_TEXT=524288;
const MAX_INLINE_IMAGE=2097152;

function headerMap(text){
 const result={};for(const line of text.replace(/\r?\n[ \t]+/g,' ').split(/\r?\n/)){const at=line.indexOf(':');if(at<1)continue;const key=line.slice(0,at).trim().toLowerCase(),value=line.slice(at+1).trim();result[key]=result[key]?result[key]+', '+value:value;}return result;
}
function parameter(value,name){const match=String(value||'').match(new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`,'i'));return (match?.[1]||match?.[2]||'').trim();}
function base64(bytes){let binary='';for(let at=0;at<bytes.length;at+=32768)binary+=String.fromCharCode(...bytes.subarray(at,at+32768));return btoa(binary);}
function bytesFromBase64(value){try{const binary=atob(String(value||'').replace(/\s+/g,'')),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}catch{return new Uint8Array();}}
function quotedPrintable(value){const clean=value.replace(/=\r?\n/g,''),bytes=[];for(let i=0;i<clean.length;i++){if(clean[i]==='='&&/^[0-9a-f]{2}$/i.test(clean.slice(i+1,i+3))){bytes.push(parseInt(clean.slice(i+1,i+3),16));i+=2;}else bytes.push(clean.charCodeAt(i)&255);}return new Uint8Array(bytes);}
function transferBytes(value,encoding){if(/base64/i.test(encoding))return bytesFromBase64(value);if(/quoted-printable/i.test(encoding))return quotedPrintable(value);return new TextEncoder().encode(value);}
function decodedText(bytes,contentType){const charset=parameter(contentType,'charset')||'utf-8';try{return new TextDecoder(charset).decode(bytes);}catch{return new TextDecoder().decode(bytes);}}
function decodedWords(value){return String(value||'').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,(_all,charset,mode,data)=>{const bytes=mode.toLowerCase()==='b'?bytesFromBase64(data):quotedPrintable(String(data).replace(/_/g,' '));return decodedText(bytes,`text/plain; charset=${charset}`);});}
function extendedFilename(value){const match=String(value||'').match(/filename\*\s*=\s*(?:UTF-8'')?([^;\s]+)/i);if(!match)return '';try{return decodeURIComponent(match[1].replace(/^"|"$/g,''));}catch{return '';}}
function filename(headers){const disposition=headers['content-disposition']||'',contentType=headers['content-type']||'';return decodedWords(extendedFilename(disposition)||parameter(disposition,'filename')||parameter(contentType,'name'));}
function safeCid(value){return String(value||'').trim().replace(/^<|>$/g,'');}

function parsePart(raw,path='1',depth=0){
 if(depth>12)return [];
 const split=raw.search(/\r?\n\r?\n/),head=split>=0?raw.slice(0,split):'',body=split>=0?raw.slice(split).replace(/^\r?\n\r?\n/,''):raw,headers=headerMap(head),contentType=headers['content-type']||'text/plain',mimeType=contentType.split(';')[0].trim().toLowerCase()||'application/octet-stream',boundary=parameter(contentType,'boundary');
 if(mimeType.startsWith('multipart/')&&boundary){return body.split(`--${boundary}`).slice(1).filter(value=>value.trim()&&value.trim()!=='--').flatMap((value,index)=>parsePart(value.replace(/^\r?\n/,''),`${path}.${index+1}`,depth+1));}
 const bytes=transferBytes(body,headers['content-transfer-encoding']||''),name=filename(headers),contentId=safeCid(headers['content-id']),disposition=String(headers['content-disposition']||'').toLowerCase();
 return [{id:`imap-part-${path}`,mimeType,filename:name,contentId,inline:disposition.startsWith('inline')||!!contentId,size:bytes.byteLength,dataBase64:base64(bytes),text:mimeType.startsWith('text/')?decodedText(bytes,contentType).slice(0,MAX_TEXT):'',headers}];
}
function replaceInline(html,parts){let value=html;for(const part of parts){if(!part.contentId||!part.mimeType.startsWith('image/')||part.size>MAX_INLINE_IMAGE)continue;const source=`data:${part.mimeType};base64,${part.dataBase64}`;value=value.replace(new RegExp(`cid:${part.contentId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'gi'),source);}return value;}

export function parseMimeMessage(raw){
 const split=raw.search(/\r?\n\r?\n/),topHeaders=headerMap(split>=0?raw.slice(0,split):''),parts=parsePart(raw),plain=parts.find(part=>part.mimeType==='text/plain'&&!part.filename),html=parts.find(part=>part.mimeType==='text/html'&&!part.filename),bodyHtml=html?replaceInline(html.text,parts):'',bodyText=(plain?.text||html?.text.replace(/<[^>]+>/g,' ')||'').trim();
 const attachments=parts.filter(part=>!part.inline&&(part.filename||!part.mimeType.startsWith('text/'))).map(part=>({id:part.id,name:part.filename||'archivo',type:part.mimeType,size:part.size,inline:false}));
 return {headers:topHeaders,parts,bodyHtml,bodyText,attachments};
}

export function mimeAttachment(raw,id){const parsed=parseMimeMessage(raw),part=parsed.parts.find(item=>item.id===id);if(!part||part.mimeType.startsWith('text/')&&!part.filename)throw new Error('attachment missing');return {name:part.filename||'archivo',type:part.mimeType,size:part.size,data:part.dataBase64};}

export function encodeMimeHeader(value){const clean=String(value||'').replace(/[\r\n]+/g,' ').trim();return /^[\x20-\x7e]*$/.test(clean)?clean:`=?UTF-8?B?${base64(new TextEncoder().encode(clean))}?=`;}

export function buildPlainMessage({from,to,cc,subject,body,inReplyTo,references}){
 const headers=[`From: ${String(from).replace(/[\r\n]+/g,' ')}`,`To: ${to.join(', ')}`];if(cc.length)headers.push(`Cc: ${cc.join(', ')}`);headers.push(`Subject: ${encodeMimeHeader(subject)}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64');if(inReplyTo)headers.push(`In-Reply-To: ${String(inReplyTo).replace(/[\r\n]+/g,' ')}`);if(references)headers.push(`References: ${String(references).replace(/[\r\n]+/g,' ')}`);return headers.join('\r\n')+'\r\n\r\n'+base64(new TextEncoder().encode(body)).replace(/.{1,76}/g,'$&\r\n');
}
