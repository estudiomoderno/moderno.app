import {safeFetch,publicURL,verifyImage,CaptureError} from './network.mjs';
import {extractProduct} from './extract.mjs';
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function createHandler({authenticate,start,finish,read,upload,sign,suggest,fetchPage=safeFetch,allowedOrigins=['https://app.moderno.app']}){
 return async req=>{
  const origin=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&allowedOrigins.includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowedOrigins.includes(origin))return response({error:'Origen no autorizado'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'}});
  if(req.method!=='POST')return response({error:'Método no permitido'},405);
  let actor,id;
  try{
   const authorization=req.headers.get('authorization')||'';if(!authorization.startsWith('Bearer '))return response({error:'Inicia sesión'},401);
   actor=await authenticate(authorization);if(!actor)return response({error:'La sesión ha caducado'},401);
   if(Number(req.headers.get('content-length')||0)>10000)throw new CaptureError('request_size','Solicitud demasiado grande.');
   const reader=req.body?.getReader(),chunks=[];let length=0;
   if(reader)try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>10000){await reader.cancel();throw new CaptureError('request_size','Solicitud demasiado grande.');}chunks.push(value);}}finally{reader.releaseLock();}
   const joined=new Uint8Array(length);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}const bodyText=new TextDecoder().decode(joined);
   const body=JSON.parse(bodyText);id=body.id;if(!uuid(id))throw new CaptureError('invalid_id','Identificador de solicitud no válido.');
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
    const page=await fetchPage(url,{signal});
    if(!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(page.headers['content-type']||''))throw new CaptureError('not_html','La URL no devuelve una ficha web.');
    const html=new TextDecoder().decode(page.bytes);capture=extractProduct(html,page.url);capture.requestedUrl=url;
    const original=new URL(url),final=new URL(page.url);const selection=[...original.searchParams].filter(([k])=>!/^utm_|^(gclid|fbclid|msockid|ref|ref_)$/i.test(k));
    if(selection.some(([k,v])=>final.searchParams.get(k)!==v)){capture.variant.verified=false;capture.variant.originalQuery=selection;capture.fields.price={value:null,status:'not_found',source:null};capture.warnings.push('redirect_lost_variant');capture.missing.push('price');}
    const images=[],digests=new Set();let totalBytes=0;
    for(const candidate of capture.images){
     if(totalBytes>=20*1024*1024){capture.warnings.push('image_total_limit');break;}
     if(signal.aborted){capture.warnings.push('image_time_limit');break;}
     try{
      let chosen=null;
      for(const imageUrl of [candidate.url,...(candidate.alternatives||[])].slice(0,3)){
       try{const r=await fetchPage(imageUrl,{maxBytes:4*1024*1024,timeoutMs:10000,signal});const info=verifyImage(r.bytes,r.headers['content-type']);totalBytes+=r.bytes.length;
        if(totalBytes>20*1024*1024){capture.warnings.push('image_total_limit');break;}
        if(!chosen||info.width*info.height>chosen.info.width*chosen.info.height)chosen={r,info,imageUrl};
       }catch{capture.warnings.push('image_resolution_unavailable');}
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
