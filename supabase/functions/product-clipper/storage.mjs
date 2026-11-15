const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const capturePath=new RegExp(`^(${uuid})/clipper/(${uuid})/[a-f0-9]{64}\\.(?:jpg|png|webp|avif)$`,'i');

export async function uploadCaptureImage({actor,server,path,bytes,contentType}){
 const match=capturePath.exec(path);
 if(!match)throw Object.assign(new Error('Ruta de imagen no válida'),{code:'invalid_storage_path'});
 const [,studyId,captureId]=match;
 // Keep authorization user-scoped. The actual binary upload uses the server
 // client because unusually large user JWTs can exceed Storage header limits.
 const {data:row,error:accessError}=await actor.client.from('productos_entrantes').select('id').eq('id',captureId).eq('estudio_id',studyId).eq('actor',actor.id).eq('estado','procesando').maybeSingle();
 if(accessError)throw accessError;
 if(!row)throw Object.assign(new Error('Captura no autorizada'),{code:'42501'});
 const bucket=server.storage.from('archivos');
 const {error}=await bucket.upload(path,bytes,{contentType,upsert:false,cacheControl:'31536000'});
 if(error)throw error;
 return bucket.getPublicUrl(path).data.publicUrl;
}
