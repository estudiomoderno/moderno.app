/* Read-only previews. Original files, permissions and viewer actions stay authoritative. */
var ModernoPlanGallery=(()=>{
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function preview(pid,index,collection='obraPlanos'){
  return `<span class="plan-preview" data-plan-preview data-project="${escape(pid)}" data-index="${index}" data-collection="${collection}" aria-hidden="true"><span>Vista previa</span></span>`;
 }
 function html(project){
  const plans=project.obraPlanos||[],id=Number(project.id);
  return `<section class="plan-gallery" aria-label="Planos definitivos"><header><h2 class="sec">Planos definitivos</h2><span>${plans.length} ${plans.length===1?'plano':'planos'}</span></header><div class="plan-gallery-grid">${plans.map((file,index)=>`<article class="plan-gallery-card"><button type="button" class="plan-gallery-open" aria-label="Abrir ${escape(file.name||'Plano')}" onclick="obraPlanoView(${id},${index})">${preview(id,index)}<strong>${escape(file.name||'Plano')}</strong></button><button type="button" class="plan-gallery-remove" aria-label="Quitar plano ${escape(file.name||'Plano')}" title="Quitar plano" onclick="obraPlanoDel(${id},${index})">×</button></article>`).join('')}<button type="button" class="plan-gallery-add" onclick="obraPlanoPick(${id})"><span aria-hidden="true">+</span><strong>Subir plano</strong><small>PDF o imagen</small></button></div></section>`;
 }
 const active=new Map();let queue=Promise.resolve(),observer;
 function valid(node,file,identity){const project=state.projects?.find(p=>String(p.id)===node.dataset.project);return node.isConnected&&fileViewIdentity()===identity&&project?.[node.dataset.collection]?.[Number(node.dataset.index)]===file;}
 async function load(node){
  const project=state.projects?.find(p=>String(p.id)===node.dataset.project),file=project?.[node.dataset.collection]?.[Number(node.dataset.index)];
  if(!node.isConnected||!file||typeof file!=='object')return;
  const identity=fileViewIdentity(),controller=new AbortController();active.set(node,controller);let task,doc;
  try{
   const source=await fileResolveForView(file);if(!source||!valid(node,file,identity))throw Error('No disponible');
   const kind=ModernoProjectDocuments.type(file);
   if(kind==='application/pdf'){
    const blob=await ModernoProjectDocuments.readBlob(source,kind,controller.signal);
    if(!valid(node,file,identity))return;
    const lib=await loadPdfJs();if(!valid(node,file,identity))return;
    task=lib.getDocument({data:await blob.arrayBuffer(),isEvalSupported:false});doc=await task.promise;
    const page=await doc.getPage(1),size=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(480/size.width,320/size.height)}),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.ceil(viewport.width));canvas.height=Math.max(1,Math.ceil(viewport.height));
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    if(valid(node,file,identity))node.replaceChildren(canvas);
   }else if(kind.startsWith('image/')||file.type?.startsWith('image/')){
    const img=document.createElement('img');img.alt='';img.decoding='async';img.src=source;
    await img.decode();if(valid(node,file,identity))node.replaceChildren(img);
   }else throw Error('Formato sin vista previa');
  }catch{if(valid(node,file,identity))node.textContent='Vista previa no disponible';}
  finally{try{if(doc)await doc.destroy();else if(task)await task.destroy();}catch{}active.delete(node);}
 }
 function scan(){
  for(const [node,controller] of active)if(!node.isConnected)controller.abort();
  document.querySelectorAll('[data-plan-preview]:not([data-preview-observed])').forEach(node=>{node.dataset.previewObserved='true';observer.observe(node);});
 }
 function start(){
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue=queue.then(()=>load(entry.target)).catch(()=>{});}},{rootMargin:'100px'});
  new MutationObserver(scan).observe(document.getElementById('view'),{childList:true,subtree:true});scan();
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 }
 return {preview,html};
})();
