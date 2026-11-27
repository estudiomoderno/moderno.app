/* Lectura local y temporal de adjuntos del Secretario.
 *
 * Los archivos nunca se suben desde este modulo. PDF.js y Tesseract se
 * ejecutan en el navegador; hacia el Secretario solo salen fragmentos de
 * texto acotados. El contenido extraido es evidencia no fiable, no una orden.
 */
var ModernoSecretaryAttachments=(()=>{
 const MAX_FILES=3;
 const MAX_FILE_BYTES=20*1024*1024;
 const MAX_PROCESS_PAGES=12;
 const MAX_PAGE_CHARS=6200;
 const MAX_PAYLOAD_BYTES=23800;
 const MAX_RASTER_PIXELS=4200000;
 const OCR_TIMEOUT_MS=60000;
 const FILE_TIMEOUT_MS=180000;
 const ACCEPTED=new Set(['application/pdf','image/png','image/jpeg','image/webp']);
 const SOURCE_KINDS=new Set(['document','invoice','invoice_entry','quote','entry']);
 const encoder=new TextEncoder();
 const moduleUrl=typeof document!=='undefined'&&document.currentScript?.src?document.currentScript.src:'';
 const defaultAssetBase=moduleUrl?new URL('./vendor/tesseract/6.0.1/',moduleUrl).href:'';
 let tesseractLoad=null;

 const text=(value,max=220)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);
 const bytes=value=>encoder.encode(JSON.stringify(value)).byteLength;
 const abortError=()=>new DOMException('Lectura cancelada','AbortError');
 const isAbort=error=>error?.name==='AbortError'||/cancelad|abort/i.test(String(error?.message||error||''));
 const check=signal=>{if(signal?.aborted)throw signal.reason instanceof Error?signal.reason:abortError();};
 const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
 const waitFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const inferMime=name=>({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'})[String(name||'').split('.').pop().toLowerCase()]||'';
 const fileName=(source,fallback='Archivo')=>text(source?.name||source?.filename||source?.label||fallback,220)||fallback;
 const publicError=error=>{
  if(isAbort(error))return 'Lectura cancelada.';
  const value=String(error?.message||error||'No se pudo leer el archivo.');
  if(/timeout|tiempo/i.test(value))return 'La lectura ha tardado demasiado. Puedes reintentarlo.';
  if(/password/i.test(value))return 'El PDF está protegido con contraseña y no se puede leer.';
  if(/invalid pdf|missing pdf|format|formato/i.test(value))return 'El archivo no tiene un formato compatible o está dañado.';
  if(/network|fetch|descarg/i.test(value))return 'No se pudo descargar el archivo privado. Comprueba tu conexión.';
  return text(value,240)||'No se pudo leer el archivo.';
 };

 function normalizeExtracted(value){
  return String(value||'').replace(/\r\n?/g,'\n').replace(/[\t\f\v ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n')
   .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();
 }
 function trimUtf8(value,limit){
  value=String(value||'');
  if(encoder.encode(value).byteLength<=limit)return value;
  let low=0,high=value.length;
  while(low<high){const middle=Math.ceil((low+high)/2);if(encoder.encode(value.slice(0,middle)).byteLength<=limit)low=middle;else high=middle-1;}
  return value.slice(0,low).trimEnd();
 }
 function sourceId(value){
  const raw=typeof value==='string'?value:value?.id??value?.docRef??value?.ref??value?.storageRef??value?.path??'';
  if(!raw)return '';
  const source=String(raw);
  if(!/^(?:https?:|data:)/i.test(source))return text(source,320);
  try{const url=new URL(source);return text(url.pathname,320);}catch{return '';}
 }
 function existingSource(reference,version){
  if(!reference||typeof reference!=='object'&&typeof reference!=='string')return undefined;
  const nested=reference&&typeof reference==='object'&&reference.source&&typeof reference.source==='object'?reference.source:reference;
  const id=sourceId(nested),candidate=typeof nested==='object'?(nested.sourceKind||nested.kind):'';
  const kind=SOURCE_KINDS.has(candidate)?candidate:'document';
  const exactVersion=text(nested?.version||reference?.version||reference?.revision||reference?.updatedAt||version,100);
  if(!id||!exactVersion)return undefined;
  const result={kind,id,version:exactVersion};
  const projectId=text(nested?.projectId??reference?.projectId,160),brand=text(nested?.brand??reference?.brand,40);
  if(projectId)result.projectId=projectId;
  if(brand)result.brand=brand;
  return result;
 }
 async function sha256(blob){
  if(!crypto?.subtle)return '';
  const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash),item=>item.toString(16).padStart(2,'0')).join('');
 }
 function snapshotOf(records){
  const selected=records.filter(record=>record.descriptor&&['ready','partial'].includes(record.state)).slice(0,MAX_FILES);
  const result=selected.map(record=>({
   id:text(record.id,120),name:text(record.name,220),mime:record.mime,totalPages:record.totalPages,
   pages:[],status:record.state==='partial'?'partial':'complete',...(record.descriptor.source?{source:{...record.descriptor.source}}:{})
  }));
  const candidates=[];
  selected.forEach((record,index)=>{
   const pages=(record.descriptor.pages||[]).filter(page=>Number.isSafeInteger(page.page)&&page.page>0&&normalizeExtracted(page.text));
   pages.slice(0,MAX_PROCESS_PAGES).forEach(page=>candidates.push({index,page:page.page,text:normalizeExtracted(page.text)}));
   if(pages.length!==record.totalPages||pages.length>MAX_PROCESS_PAGES)result[index].status='partial';
  });
  const skeletonBytes=bytes(result),available=Math.max(0,MAX_PAYLOAD_BYTES-skeletonBytes-256);
  const share=candidates.length?Math.min(MAX_PAGE_CHARS,Math.floor(available/candidates.length)):0;
  for(const candidate of candidates){
   const clipped=trimUtf8(candidate.text,share);
   if(!clipped){result[candidate.index].status='partial';continue;}
   result[candidate.index].pages.push({page:candidate.page,text:clipped});
   if(clipped!==candidate.text)result[candidate.index].status='partial';
  }
  for(const item of result)if(item.pages.length!==item.totalPages)item.status='partial';
  let measured=bytes(result),guard=0;
  while(measured>MAX_PAYLOAD_BYTES&&guard++<100){
   let target=null,owner=null;
   for(const item of result)for(const page of item.pages)if(!target||page.text.length>target.text.length){target=page;owner=item;}
   if(!target)break;
   if(target.text.length<80)owner.pages.splice(owner.pages.indexOf(target),1);
   else target.text=target.text.slice(0,Math.floor(target.text.length*.85)).trimEnd();
   owner.status='partial';measured=bytes(result);
  }
  return JSON.parse(JSON.stringify(result));
 }

 function mount({host,getExisting=()=>[],resolveExisting,onChange=()=>{},assetBase=defaultAssetBase,pdfLoader}={}){
  if(!(host instanceof HTMLElement))throw new TypeError('Falta el contenedor de adjuntos.');
  if(typeof resolveExisting!=='function')resolveExisting=async value=>value;
  const records=[],byKey=new Map();let queue=[],active=null,generation=0,destroyed=false,existing=[];
  const base=assetBase?new URL(assetBase,location.href):null;
  if(base&&base.origin!==location.origin)throw new Error('Los recursos OCR deben servirse desde Moderno.app.');

  host.classList.add('secretary-attachments');
  host.innerHTML='<div class="secretary-attachments-tools"><label class="secretary-attachments-device"><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" aria-label="Adjuntar desde el dispositivo" multiple><span>Adjuntar PDF o imagen</span></label><div class="secretary-attachments-existing" hidden><select aria-label="Archivo privado existente"></select><button type="button">Adjuntar archivo</button></div></div><div class="secretary-attachments-list" aria-live="polite" aria-label="Archivos adjuntos"></div><p class="secretary-attachments-summary" aria-live="polite"></p>';
  const input=host.querySelector('input[type=file]'),existingBox=host.querySelector('.secretary-attachments-existing');
  const existingSelect=existingBox.querySelector('select'),existingButton=existingBox.querySelector('button');
  const list=host.querySelector('.secretary-attachments-list'),summary=host.querySelector('.secretary-attachments-summary');

  const state=()=>({items:records.map(record=>({id:record.id,name:record.name,mime:record.mime,state:record.state,progress:record.progress,totalPages:record.totalPages||null,processedPages:record.descriptor?.pages?.length||0,message:record.message,error:record.error||null,source:record.kind})),payloadBytes:bytes(snapshotOf(records))});
  const emit=()=>{if(destroyed)return;render();try{onChange(snapshotOf(records),state());}catch(error){console.error('No se pudo notificar el adjunto',error);}};
  function render(){
   if(destroyed)return;
   list.replaceChildren();
   for(const record of records){
    const row=document.createElement('article');row.className='secretary-attachment secretary-attachment-'+record.state;row.dataset.attachmentId=record.id;
    const copy=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span'),actions=document.createElement('div');
    title.textContent=record.name;detail.textContent=record.error||record.message||'Preparando lectura…';copy.append(title,detail);actions.className='secretary-attachment-actions';
    if(['queued','reading','ocr'].includes(record.state)){
     const progress=document.createElement('progress');progress.max=1;progress.value=Math.max(0,Math.min(1,record.progress||0));progress.setAttribute('aria-label','Progreso de '+record.name);copy.append(progress);
     const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.onclick=()=>cancelOne(record.id);actions.append(cancel);
    }else if(['error','cancelled'].includes(record.state)){
     const retryButton=document.createElement('button');retryButton.type='button';retryButton.textContent='Reintentar';retryButton.onclick=()=>retry(record.id);actions.append(retryButton);
    }
    const removeButton=document.createElement('button');removeButton.type='button';removeButton.textContent='Quitar';removeButton.onclick=()=>remove(record.id);actions.append(removeButton);
    row.append(copy,actions);list.append(row);
   }
   const usable=records.filter(record=>['ready','partial'].includes(record.state)).length;
   summary.textContent=records.length?`${usable} de ${records.length} archivos listos para esta consulta.`:'';
  }

  async function refreshExisting(){
   try{
    const values=await getExisting();if(destroyed)return;
    existing=Array.isArray(values)?values.filter(Boolean):[];existingSelect.replaceChildren();
    for(const [index,item] of existing.entries()){const option=document.createElement('option');option.value=String(index);option.textContent=fileName(item,'Archivo privado');existingSelect.append(option);}
    existingBox.hidden=!existing.length;
   }catch(error){if(!destroyed){existingBox.hidden=true;console.warn('No se pudieron listar los archivos privados',error);}}
  }
  async function resolvedBlob(reference,signal){
   check(signal);let resolved=await resolveExisting(reference,{signal,purpose:'secretario-read'});check(signal);
   if(resolved?.blob instanceof Blob)resolved=resolved.blob;
   else if(resolved?.file instanceof Blob)resolved=resolved.file;
   else if(resolved?.body instanceof Blob)resolved=resolved.body;
   if(resolved instanceof Response){if(!resolved.ok)throw new Error('No se pudo descargar el archivo privado.');resolved=await resolved.blob();}
   if(typeof resolved==='string'||resolved instanceof URL){
    const url=new URL(String(resolved),location.href);
    if(!['https:','http:','data:'].includes(url.protocol)||url.protocol==='http:'&&url.origin!==location.origin)throw new Error('Enlace privado no válido.');
    const response=await fetch(url,{signal,cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error('No se pudo descargar el archivo privado.');resolved=await response.blob();
   }
   if(!(resolved instanceof Blob))throw new Error('El archivo privado no está disponible.');
   return resolved;
  }
  function validate(blob,name){
   if(!(blob instanceof Blob))throw new Error('Selecciona un archivo válido.');
   if(blob.size<=0)throw new Error('El archivo está vacío.');
   if(blob.size>MAX_FILE_BYTES)throw new Error('El archivo supera el limite temporal de 20 MB.');
   const mime=ACCEPTED.has(blob.type)?blob.type:inferMime(name);if(!ACCEPTED.has(mime))throw new Error('Formato no compatible. Usa PDF, PNG, JPG o WebP.');
   return mime;
  }
  async function keyFor(input,kind){
   if(kind==='existing')return 'existing:'+sourceId(input?.source||input)+':'+text(input?.source?.version||input?.version||input?.revision||input?.updatedAt,100);
   if(input.size>MAX_FILE_BYTES)return `device:oversize:${input.name}:${input.size}:${input.lastModified||0}:${input.type}`;
   try{return 'device:'+await sha256(input);}catch{return `device:${input.name}:${input.size}:${input.lastModified||0}:${input.type}`;}
  }
  function newRecord(input,kind,key){
   const done=deferred(),record={id:crypto.randomUUID(),key,kind,input,name:fileName(input),mime:'',state:'queued',progress:0,message:'En cola para leer',error:'',descriptor:null,totalPages:0,controller:new AbortController(),worker:null,done};
   records.push(record);byKey.set(key,record);queue.push(record);emit();pump();return record;
  }
  async function addOne(input,kind){
   if(destroyed)throw new Error('El lector de adjuntos esta cerrado.');
   const key=await keyFor(input,kind),prior=byKey.get(key);
   if(prior){
    if(['error','cancelled'].includes(prior.state))return retry(prior.id);
    if(['ready','partial'].includes(prior.state))return {id:prior.id,state:prior.state};
    return prior.done.promise;
   }
   if(records.length>=MAX_FILES)throw new Error('Puedes adjuntar hasta 3 archivos en una consulta.');
   return newRecord(input,kind,key).done.promise;
  }
  async function attachFiles(values){
   const files=(values instanceof Blob?[values]:Array.from(values||[])).filter(value=>value instanceof Blob);return Promise.all(files.map(file=>addOne(file,'device'))).then(()=>snapshotOf(records));
  }
  async function attachExisting(values){
   const refs=Array.isArray(values)?values:[values];return Promise.all(refs.filter(Boolean).map(ref=>addOne(ref,'existing'))).then(()=>snapshotOf(records));
  }
  function attach(values){
   const items=values==null?[]:values instanceof Blob||typeof values==='string'?[values]:typeof values[Symbol.iterator]==='function'?Array.from(values):[values],files=items.filter(item=>item instanceof Blob),refs=items.filter(item=>!(item instanceof Blob));
   return Promise.all([attachFiles(files),attachExisting(refs)]).then(()=>snapshotOf(records));
  }
  function finish(record){record.done.resolve({id:record.id,state:record.state});record.done=deferred();}
  function enqueue(record){record.controller=new AbortController();record.state='queued';record.progress=0;record.error='';record.message='En cola para leer';queue.push(record);emit();pump();return record.done.promise;}
  function retry(id){
   const record=records.find(item=>item.id===id);if(!record||!['error','cancelled'].includes(record.state))return Promise.resolve(snapshotOf(records));
   record.descriptor=null;record.totalPages=0;return enqueue(record).then(()=>snapshotOf(records));
  }
  function cancelOne(id){
   const record=records.find(item=>item.id===id);if(!record||!['queued','reading','ocr'].includes(record.state))return false;
   record.controller.abort();record.worker?.terminate?.().catch(()=>{});record.worker=null;queue=queue.filter(item=>item!==record);
   record.state='cancelled';record.progress=0;record.message='Lectura cancelada';record.error='';finish(record);emit();return true;
  }
  function remove(id){
   const index=records.findIndex(item=>item.id===id);if(index<0)return false;
   const record=records[index];record.controller.abort();record.worker?.terminate?.().catch(()=>{});queue=queue.filter(item=>item!==record);records.splice(index,1);byKey.delete(record.key);finish(record);emit();return true;
  }
  function clear(){
   generation++;for(const record of records){record.controller.abort();record.worker?.terminate?.().catch(()=>{});finish(record);}queue=[];active=null;records.splice(0);byKey.clear();emit();return [];
  }
  const reset=clear;

  async function loadPdf(){
   const loader=pdfLoader||globalThis.loadPdfJs;if(typeof loader!=='function')throw new Error('No está disponible el lector PDF de Moderno.app.');
   const lib=await loader();if(!lib?.getDocument)throw new Error('No está disponible el lector PDF de Moderno.app.');return lib;
  }
  async function loadTesseract(){
   if(globalThis.Tesseract?.createWorker)return globalThis.Tesseract;
   if(!base)throw new Error('No está disponible el lector OCR local.');
   if(!tesseractLoad)tesseractLoad=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('tesseract.min.js',base).href;script.async=true;
    script.onload=()=>globalThis.Tesseract?.createWorker?resolve(globalThis.Tesseract):(tesseractLoad=null,reject(new Error('No se pudo iniciar el OCR local.')));
    script.onerror=()=>{tesseractLoad=null;reject(new Error('No se pudo cargar el OCR local.'));};document.head.append(script);
   });
   return tesseractLoad;
  }
  async function ocr(record,image,signal){
   check(signal);record.state='ocr';record.message='Reconociendo texto en el dispositivo';record.progress=Math.max(record.progress,.08);emit();
   const Tesseract=await loadTesseract();check(signal);
   const logger=message=>{if(signal.aborted||destroyed)return;const progress=Number(message?.progress);if(Number.isFinite(progress)){record.progress=Math.max(record.progress,.15+progress*.8);record.message=message.status==='recognizing text'?'Leyendo la imagen en el dispositivo':'Preparando reconocimiento local';emit();}};
   let worker=record.worker;
   if(!worker){
    worker=await Tesseract.createWorker('spa',1,{workerPath:new URL('worker.min.js',base).href,corePath:new URL('core/',base).href,langPath:new URL('lang/',base).href,cacheMethod:'none',workerBlobURL:false,logger});
    if(signal.aborted){await worker.terminate().catch(()=>{});check(signal);}record.worker=worker;
   }
   let timer;
   try{
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tiempo de OCR agotado.')),OCR_TIMEOUT_MS);});
    const result=await Promise.race([worker.recognize(image),timeout]);check(signal);return normalizeExtracted(result?.data?.text);
   }catch(error){
    if(/tiempo/i.test(String(error?.message||error))){record.worker=null;await worker.terminate().catch(()=>{});}throw error;
   }finally{clearTimeout(timer);}
  }
  async function imageCanvas(blob,signal){
   check(signal);let bitmap,url,image;
   try{
    if(typeof createImageBitmap==='function'){bitmap=await createImageBitmap(blob);image=bitmap;}
    else{url=URL.createObjectURL(blob);image=new Image();image.decoding='async';image.src=url;await image.decode();}
    check(signal);const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;if(!width||!height)throw new Error('La imagen está dañada.');
    const scale=Math.min(1,Math.sqrt(MAX_RASTER_PIXELS/(width*height))),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);return canvas;
   }finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
  }
  function pdfPageText(content){
   const lines=[];let current=[],lastY=null;
   for(const item of content?.items||[]){
    const value=String(item.str||'').trim(),y=Math.round(item.transform?.[5]||0);
    if(lastY!==null&&(Math.abs(y-lastY)>3||item.hasEOL)){if(current.length)lines.push(current.join(' '));current=[];}
    if(value)current.push(value);lastY=y;if(item.hasEOL&&current.length){lines.push(current.join(' '));current=[];lastY=null;}
   }
   if(current.length)lines.push(current.join(' '));return normalizeExtracted(lines.join('\n'));
  }
  async function renderPage(page,signal){
   check(signal);const natural=page.getViewport({scale:1}),scale=Math.min(2,Math.sqrt(MAX_RASTER_PIXELS/(natural.width*natural.height))),viewport=page.getViewport({scale:Math.max(.5,scale)});
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
   const task=page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,background:'white'});const abort=()=>task.cancel();signal.addEventListener('abort',abort,{once:true});
   try{await task.promise;check(signal);return canvas;}finally{signal.removeEventListener('abort',abort);}
  }
  async function readPdf(record,blob,signal){
   const pdfjs=await loadPdf();check(signal);record.message='Abriendo el PDF';record.progress=.04;emit();
   const task=pdfjs.getDocument({data:await blob.arrayBuffer(),isEvalSupported:false});const abort=()=>task.destroy();signal.addEventListener('abort',abort,{once:true});let documentPdf;
   try{
    documentPdf=await task.promise;record.totalPages=documentPdf.numPages||1;const limit=Math.min(record.totalPages,MAX_PROCESS_PAGES),pages=[];let partial=record.totalPages>limit;
    for(let number=1;number<=limit;number++){
     check(signal);record.state='reading';record.message=`Leyendo la página ${number} de ${record.totalPages}`;record.progress=.05+(number-1)/limit*.85;emit();
     const page=await documentPdf.getPage(number);
     try{
      let value=pdfPageText(await page.getTextContent());
      if(value.replace(/[^\p{L}\p{N}]/gu,'').length<8){try{value=await ocr(record,await renderPage(page,signal),signal);}catch(error){if(isAbort(error))throw error;partial=true;value='';record.message=`No se pudo reconocer la página ${number}`;}}
      value=normalizeExtracted(value).slice(0,MAX_PAGE_CHARS);if(value)pages.push({page:number,text:value});else partial=true;
     }finally{page.cleanup?.();}
     await waitFrame();
    }
    return {pages,partial};
   }finally{signal.removeEventListener('abort',abort);try{if(documentPdf)await documentPdf.destroy();else await task.destroy();}catch{}}
  }
  async function processRecord(record,runGeneration){
   const signal=record.controller.signal;record.state='reading';record.message=record.kind==='existing'?'Descargando el archivo privado':'Leyendo el archivo en el dispositivo';record.progress=.01;emit();
   let blob=record.input,version='';if(record.kind==='existing')blob=await resolvedBlob(record.input,signal);check(signal);
   record.name=fileName(record.input,record.name);record.mime=validate(blob,record.name);if(record.kind==='existing')version=await sha256(blob).catch(()=>text(record.input?.version,100));check(signal);
   try{
    let pages,partial=false;
    if(record.mime==='application/pdf')({pages,partial}=await readPdf(record,blob,signal));
    else{record.totalPages=1;record.message='Preparando la imagen';record.progress=.05;emit();const value=await ocr(record,await imageCanvas(blob,signal),signal);pages=value?[{page:1,text:normalizeExtracted(value).slice(0,MAX_PAGE_CHARS)}]:[];partial=!value;}
    check(signal);if(destroyed||runGeneration!==generation)throw abortError();
    const source=record.kind==='existing'?existingSource(record.input,version):undefined;
    record.descriptor={pages,...(source?{source}:{})};record.state=partial?'partial':'ready';record.progress=1;record.message=partial?`${pages.length} de ${record.totalPages} páginas legibles. Revisa las páginas omitidas.`:`${record.totalPages} ${record.totalPages===1?'página lista':'páginas listas'} para consultar`;record.error='';
   }finally{const worker=record.worker;record.worker=null;if(worker)await worker.terminate().catch(()=>{});}
  }
  function pump(){
   if(active||destroyed)return;const record=queue.shift();if(!record)return;active=record;const runGeneration=generation;
   const timeout=setTimeout(()=>record.controller.abort(new Error('Tiempo de lectura agotado.')),FILE_TIMEOUT_MS);
   processRecord(record,runGeneration).catch(error=>{
    if(destroyed||runGeneration!==generation)return;
    const actual=record.controller.signal.reason instanceof Error?record.controller.signal.reason:error;
    record.state=isAbort(actual)?'cancelled':'error';record.progress=0;record.message=record.state==='cancelled'?'Lectura cancelada':'No se pudo leer';record.error=record.state==='cancelled'?'':publicError(actual);
   }).finally(()=>{
    clearTimeout(timeout);if(active===record)active=null;if(!destroyed&&runGeneration===generation){finish(record);emit();pump();}
   });
  }

  input.addEventListener('change',()=>{const files=[...input.files];input.value='';attachFiles(files).catch(error=>{summary.textContent=publicError(error);});});
  existingButton.addEventListener('click',()=>{const item=existing[Number(existingSelect.value)];if(item)attachExisting(item).catch(error=>{summary.textContent=publicError(error);});});
  refreshExisting();render();
  function destroy(){if(destroyed)return;clear();destroyed=true;host.replaceChildren();host.classList.remove('secretary-attachments');}
  return {attach,attachFiles,attachExisting,snapshot:()=>snapshotOf(records),state,cancel:cancelOne,retry,remove,clear,reset,destroy,refreshExisting};
 }

 return {mount,limits:{maxFiles:MAX_FILES,maxFileBytes:MAX_FILE_BYTES,maxPages:MAX_PROCESS_PAGES,maxPayloadBytes:MAX_PAYLOAD_BYTES},_test:{normalizeExtracted,trimUtf8,snapshotOf,existingSource,inferMime}};
})();
if(typeof module!=='undefined')module.exports=ModernoSecretaryAttachments;
