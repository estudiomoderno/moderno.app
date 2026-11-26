import {safeFetch,publicURL,verifyImage,CaptureError} from './network.mjs';
import {extractProduct} from './extract.mjs';
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const recordId=s=>typeof s==='string'&&/^[a-z0-9_-]{1,120}$/i.test(s);
const unique=(rows,id)=>{
 const matches=Array.isArray(rows)?rows.filter(row=>row?.id!=null&&String(row.id)===id):[];
 return matches.length===1?matches[0]:null;
};

async function readProductPage(url,fetchPage,signal){
 const page=await fetchPage(url,{signal});
 if(!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(page.headers['content-type']||''))throw new CaptureError('not_html','La URL no devuelve una ficha web.');
 const capture=extractProduct(new TextDecoder().decode(page.bytes),page.url);
 capture.requestedUrl=url;
 const original=new URL(url),final=new URL(page.url);
 const selection=[...original.searchParams].filter(([k])=>!/^utm_|^(gclid|fbclid|msockid|ref|ref_)$/i.test(k));
 if(selection.some(([k,v])=>final.searchParams.get(k)!==v)){
  capture.variant.verified=false;capture.variant.originalQuery=selection;
  capture.fields.price={value:null,status:'not_found',source:null};capture.warnings.push('redirect_lost_variant');capture.missing.push('price');
 }
 return capture;
}

const fieldValue=(capture,key)=>capture?.fields?.[key]?.value??null;
const comparisonText=value=>typeof value==='string'?value.trim().toLowerCase():'';
const productUnit=value=>{
 const unit=comparisonText(value);
 if(['ud','unidad','unidades','ea','c62','h87','piece'].includes(unit))return 'ud';
 if(['m2','m²','mtk'].includes(unit))return 'm2';
 if(['m3','m³','mtq'].includes(unit))return 'm3';
 return unit;
};
const comparablePrice=value=>typeof value==='string'&&/^\d+(?:\.\d{1,2}0*)?$/.test(value)&&Number(value)<=100000000?Number(value):null;

async function listPrices(actor,body,loadProjects,fetchPage,signal){
 const {studyId,projectId,roomId,ids}=body;
 if(!uuid(studyId)||!recordId(projectId)||!recordId(roomId)||!Array.isArray(ids)||!ids.length||ids.length>3||
  !ids.every(recordId)||new Set(ids).size!==ids.length)throw new CaptureError('invalid_request','Solicitud de precios no válida.');
 const projects=await loadProjects(actor,studyId,signal);
 const room=unique(unique(projects,projectId)?.rooms,roomId);
 if(!room||!Array.isArray(room.sections))throw new CaptureError('PT409','La lista cambió. Vuelve a abrirla y consulta de nuevo.');
 const items=room.sections.flatMap(section=>Array.isArray(section?.items)?section.items:[]);
 const pages=new Map();
 return Promise.all(ids.map(async id=>{
  const item=unique(items,id),source=item?.capture;
  const unavailable=code=>({id,status:'unavailable',code});
  if(!item||!uuid(item.captureId)||!source||!item.url)return unavailable('source_missing');
  try{
   const url=publicURL(item.url).href;
   if(url!==publicURL(source.requestedUrl||source.url).href)return unavailable('source_changed');
   if(!pages.has(url))pages.set(url,readProductPage(url,fetchPage,signal));
   const latest=await pages.get(url);
   const sameProduct=publicURL(latest.url).hostname===publicURL(source.url||url).hostname&&
    (['ean','sku'].some(key=>fieldValue(source,key)&&fieldValue(source,key)===fieldValue(latest,key))||
     publicURL(latest.canonicalUrl).href===publicURL(source.canonicalUrl||source.url||url).href);
   const variantMatches=latest.variant?.verified===true&&source.variant?.verified===true&&sameProduct&&
    ['sku','ean','color'].every(key=>!fieldValue(source,key)||comparisonText(fieldValue(source,key))===comparisonText(fieldValue(latest,key)))&&
    (!comparisonText(item.sku)||comparisonText(item.sku)===comparisonText(fieldValue(latest,'sku')));
   if(!variantMatches)return unavailable('variant');
   const nextUnit=productUnit(fieldValue(latest,'unit'));
   if(nextUnit&&nextUnit!==productUnit(item.unit||'ud'))return unavailable('unit');
   if(fieldValue(latest,'currency')!=='EUR')return unavailable('currency');
   if(latest.tax?.status!=='included')return unavailable('tax');
   const price=comparablePrice(fieldValue(latest,'price'));
   if(price===null)return unavailable('price');
   return {id,status:'verified',price,previous:item.price??null,captureId:item.captureId,url:item.url,sku:item.sku??null,unit:item.unit??null};
  }catch{return unavailable('unavailable');}
 }));
}

export function createHandler({authenticate,start,finish,read,upload,sign,file,suggest,loadProjects,fetchPage=safeFetch,allowedOrigins=['https://app.moderno.app']}){
 return async req=>{
  const origin=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&allowedOrigins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowedOrigins.includes(origin))return response({error:'Origen no autorizado'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type,x-moderno-session'}});
  if(req.method!=='POST')return response({error:'Método no permitido'},405);
  let actor,id;
  try{
   // Current user JWTs can exceed intermediary header limits. The same-origin
   // proxy may therefore carry the token inside a bounded JSON envelope.
   if(Number(req.headers.get('content-length')||0)>65536)throw new CaptureError('request_size','Solicitud demasiado grande.');
   const reader=req.body?.getReader(),chunks=[];let length=0;
   if(reader)try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>65536){await reader.cancel();throw new CaptureError('request_size','Solicitud demasiado grande.');}chunks.push(value);}}finally{reader.releaseLock();}
   const joined=new Uint8Array(length);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}const bodyText=new TextDecoder().decode(joined);
   const envelope=JSON.parse(bodyText);let body=envelope,privateSession=(req.headers.get('x-moderno-session')||'').trim();
   if(envelope&&typeof envelope==='object'&&typeof envelope.session64==='string'&&envelope.payload&&typeof envelope.payload==='object'){
    if(envelope.session64.length>50000)throw new CaptureError('request_size','Solicitud demasiado grande.');
    try{privateSession=atob(envelope.session64);}catch{privateSession='';}
    body=envelope.payload;
   }else if(length>10000)throw new CaptureError('request_size','Solicitud demasiado grande.');
   if(new TextEncoder().encode(JSON.stringify(body)).length>10000)throw new CaptureError('request_size','Solicitud demasiado grande.');
   const authorization=req.headers.get('authorization')||(privateSession?(privateSession.startsWith('Bearer ')?privateSession:'Bearer '+privateSession):'');if(!/^Bearer [A-Za-z0-9._-]{20,32768}$/.test(authorization))return response({error:'Inicia sesión'},401);
   actor=await authenticate(authorization);if(!actor)return response({error:'La sesión ha caducado'},401);
   if(body.action==='prices'){
    const signal=AbortSignal.any([req.signal,AbortSignal.timeout(20000)]);
    const prices=await listPrices(actor,body,loadProjects,fetchPage,signal);
    return response({prices});
   }
   if(body.action==='file'){
    const path=body.path;
    if(typeof path!=='string'||path.length>1024||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i.test(path)||path.includes('\\')||/[\x00-\x1f?#%]/.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))throw new CaptureError('invalid_storage_path','Ruta de archivo no válida.');
    const url=await file(actor,path);return response({url,expiresIn:60});
   }
   id=body.id;if(!uuid(id))throw new CaptureError('invalid_id','Identificador de solicitud no válido.');
   if(body.action==='read'){
    const row=await read(actor,id);if(!row)return response({error:'Captura no disponible'},404);
    const data=structuredClone(row);if(data.captura)for(const image of data.captura.images||[])if(image.storagePath)image.previewUrl=await sign(actor,image.storagePath);
    return response(data);
   }
   if(body.action!=='capture'||!uuid(body.studyId))throw new CaptureError('invalid_request','Solicitud no válida.');
   const url=publicURL(body.url).href;
   const initiated=await start(actor,{id,studyId:body.studyId,url,destination:body.destination});
   if(!initiated.start)return response(initiated,200);
   const signal=AbortSignal.timeout(65000);let capture;
   try{
    capture=await readProductPage(url,fetchPage,signal);
    const images=[],digests=new Set();let totalBytes=0;
    for(const candidate of capture.images){
     if(totalBytes>=20*1024*1024){capture.warnings.push('image_total_limit');break;}
     if(signal.aborted){capture.warnings.push('image_time_limit');break;}
     try{
      let chosen=null;
      for(const imageUrl of [candidate.url,...(candidate.alternatives||[])].slice(0,3)){
       try{const r=await fetchPage(imageUrl,{maxBytes:4*1024*1024,timeoutMs:10000,signal,referer:capture.url});const info=verifyImage(r.bytes,r.headers['content-type']);totalBytes+=r.bytes.length;
        if(totalBytes>20*1024*1024){capture.warnings.push('image_total_limit');break;}
        if(!chosen||info.width*info.height>chosen.info.width*chosen.info.height)chosen={r,info,imageUrl};
       }catch(error){capture.warnings.push('image_resolution_'+String(error?.code||'unavailable').replace(/[^a-z0-9_]/gi,'_').toLowerCase());}
      }
      if(!chosen)throw new CaptureError('image_unavailable','Imagen no disponible');
      const {r,info,imageUrl}=chosen;
      const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',r.bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(digests.has(digest))continue;digests.add(digest);
      const storagePath=body.studyId+'/clipper/'+id+'/'+digest+'.'+info.extension;
      const storageUrl=await upload(actor,storagePath,r.bytes,info.contentType);
      images.push({...candidate,url:imageUrl,...info,sha256:digest,storagePath,storageUrl});
     }catch(error){capture.warnings.push('image_unavailable');}
    }
    capture.images=images;capture.gallery.stored=images.length;
    if(!images.length&&!capture.missing.includes('images'))capture.missing.push('images');
    if(capture.warnings.length&&!capture.missing.includes('review'))capture.missing.push('review');
    if(suggest&&!signal.aborted){try{capture.suggestions=await suggest(capture,signal);}catch{capture.suggestions={category:null,room:null,status:'unavailable'};}}
    capture.status=capture.missing.length?'incomplete':'ready';
    await finish(actor,id,capture,null);
    return response({id,estado:capture.missing.length?'incompleto':'listo'});
   }catch(error){await finish(actor,id,null,error.code||'capture_failed');throw error;}
  }catch(error){
   const status=error.code==='42501'?403:error.code==='PT429'?429:error.code==='PT409'?409:400;
   return response({id,error:error instanceof CaptureError?error.message:status===429?'Límite de capturas alcanzado. Espera y vuelve a intentarlo.':status===403?'No tienes permiso para este destino.':'No se pudo completar la captura. Puedes revisar el estado o añadir el producto manualmente.',code:error.code||'capture_failed'},status);
  }
 };
}
