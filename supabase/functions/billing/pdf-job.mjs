// Server orchestration contract. A trusted, validated renderer is required; browser HTML is never accepted.
export async function generatePDF({actor,study,document},deps){
 const source=await deps.readAuthorizedSnapshot(actor,study,document);
 if(!source||!source.key||!source.revision)throw Error('Documento no disponible');
 const receipt=await deps.reserve(actor,study,source.key,source.revision);
 if(receipt.cached)return {url:await deps.sign(study,receipt.path),cached:true};
 const path=study+'/billing-pdf/'+receipt.id+'.pdf';
 try{
  const bytes=await deps.render(source.snapshot,{modernoBrand:receipt.modernoBrand===true});
  if(!(bytes instanceof Uint8Array)||bytes.length<8||bytes.length>50*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'||!new TextDecoder().decode(bytes.slice(-1024)).includes('%%EOF'))throw Error('PDF no generado');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  // Storage adapter must be idempotent for this receipt and reject a different payload.
  await deps.put(study,path,bytes,hash);
  await deps.finish(study,receipt.id,path,hash,true);
  return {url:await deps.sign(study,path),cached:false};
 }catch(e){await deps.fail(study,receipt.id).catch(()=>{});throw e;}
}
