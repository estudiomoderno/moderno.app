const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const capturePath=new RegExp(`^(${uuid})/clipper/(${uuid})/[a-f0-9]{64}\\.(?:jpg|png|webp|avif)$`,'i');

async function authorizeCapturePath(actor,path,{processing=false}={}){
 const match=capturePath.exec(path);
 if(!match)throw Object.assign(new Error('Ruta de imagen no válida'),{code:'invalid_storage_path'});
 const [,studyId,captureId]=match;
 let query=actor.client.from('productos_entrantes').select('id').eq('id',captureId).eq('estudio_id',studyId).eq('actor',actor.id);
 if(processing)query=query.eq('estado','procesando');
 const {data:row,error:accessError}=await query.maybeSingle();
 if(accessError)throw accessError;
 if(!row)throw Object.assign(new Error('Captura no autorizada'),{code:'42501'});
}

export async function uploadCaptureImage({actor,server,path,bytes,contentType}){
 // Keep authorization user-scoped. The actual binary upload uses the server
 // client because unusually large user JWTs can exceed Storage header limits.
 await authorizeCapturePath(actor,path,{processing:true});
 const bucket=server.storage.from('archivos');
 const {error}=await bucket.upload(path,bytes,{contentType,upsert:false,cacheControl:'31536000'});
 if(error)throw error;
 return bucket.getPublicUrl(path).data.publicUrl;
}

export async function signCaptureImage({actor,server,path,expiresIn=60}){
 await authorizeCapturePath(actor,path);
 const {data,error}=await server.storage.from('archivos').createSignedUrl(path,expiresIn);
 if(error)throw error;
 return data.signedUrl;
}
