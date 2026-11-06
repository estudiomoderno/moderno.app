/* Document navigation and authorized plan saving through the existing private upload flow. */
var ModernoProjectDocuments = (() => {
  const E = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const types = {pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',dxf:'application/dxf',dwg:'application/vnd.dwg'};
  function type(file) {
    if(!file || typeof file !== 'object' || file.docRef || file.body) return '';
    if(Object.values(types).includes(file.type)) return file.type;
    return types[String(file.name || '').split('.').pop().toLowerCase()] || '';
  }
  function category(file){return file&&typeof file==='object'&&!file.docRef&&!file.docKind&&file.cat==='plano'?'planos':'archivos';}
  function plans(project) {
    return (project.files || []).map((file,index)=>({file,index,type:type(file)})).filter(x=>category(x.file)==='planos');
  }
  function heading(section) {
    const title=section==='planos'?'Planos':section==='archivos'?'Documentos':'Planos y Archivos';
    return `<h2 class="sec" id="pj-espacio" style="margin-top:0">${title}</h2>`;
  }
  function action(project,index) {
    const file=(project.files||[])[index];
    if(!type(file))return '';
    const label=['application/dxf','application/vnd.dwg'].includes(type(file))?'Abrir visor':'Ver y anotar';
    return `<button type="button" class="btn btn-ghost project-plan-open" ${file.subiendo||!(file.url||file.data)?'disabled title="Archivo pendiente de subida o sin contenido"':''} data-project="${E(project.id)}" data-index="${index}" onclick="event.stopPropagation();projectPlanOpen(Number(this.dataset.project),Number(this.dataset.index),'files')">${label}</button>`;
  }
  function card(project,index,{available,clientVisible,actions=true,selection=false}={}) {
    const stored=(project.files||[])[index],file=typeof stored==='string'?{name:stored}:stored||{},name=String(file.name||'Archivo');
    if(available===undefined)available=Boolean(file.url||file.data||file.body||file.docRef);
    if(clientVisible===undefined)clientVisible=file.cli!==false;
    const ext=name.includes('.')?name.split('.').pop().slice(0,5).toUpperCase():'DOC',id=E(project.id),label=E(name);
    const data=`data-project="${id}" data-index="${index}"`;
    const visibility=!available?'<span class="project-file-status is-missing" title="Solo se guardó el nombre. Vuelve a subirlo para abrir el archivo.">Solo nombre</span>':`<span class="project-file-status">${clientVisible?'Lo ve el cliente':'Oculto al cliente'}</span>`;
    const open=category(file)==='planos'?`projectPlanOpen(Number(this.dataset.project),Number(this.dataset.index),'files')`:`fileView(Number(this.dataset.project),Number(this.dataset.index))`;
    return `<article class="project-file-card">${selection?`<label class="project-file-selection"><input type="checkbox" aria-label="Compartir ${label}" ${data} ${clientVisible?'checked':''} ${available?'':'disabled'} onchange="fileCliToggle(Number(this.dataset.project),Number(this.dataset.index))"><span>Compartir</span></label>`:''}<button type="button" class="project-file-open" ${data} aria-label="Abrir ${label}" onclick="${open}">${category(file)==='planos'?ModernoPlanGallery.preview(project.id,index,'files'):`<span class="project-file-sheet" aria-hidden="true"><span class="project-file-fold"></span><span class="project-file-extension">${E(ext)}</span><span class="project-file-lines"></span></span>`}<strong class="project-document-name">${label}</strong></button><div class="project-file-meta">${file.signed?'<span class="project-file-status is-signed">Firmado</span>':''}${visibility}</div>${actions?`<div class="project-file-actions">${action(project,index)}${!file.docRef&&!file.docKind?`<button type="button" class="btn btn-ghost project-file-category" ${data} onclick="projectFileMove(Number(this.dataset.project),Number(this.dataset.index))">Mover a ${category(file)==='planos'?'Documentos':'Planos'}</button>`:''}${category(file)==='planos'?ModernoPlanOptions.button(project.id,index,'files',name):`<button type="button" class="project-file-delete" ${data} aria-label="Eliminar archivo ${label}" title="Eliminar archivo" onclick="trashFile(Number(this.dataset.project),Number(this.dataset.index))">×</button>`}</div>`:''}</article>`;
  }
  function uploadCard(project,section='archivos'){const accept=section==='planos'?'.pdf,.dxf,.dwg,image/png,image/jpeg,image/webp':'';return `<label class="project-file-card project-file-add" role="button" tabindex="0" aria-label="${section==='planos'?'Subir o arrastrar plano':'Subir o arrastrar archivos'}" data-project="${E(project.id)}" data-section="${section==='planos'?'planos':'archivos'}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.querySelector('input').click()}" ondragover="ModernoProjectDocuments.dragFiles(event)" ondragleave="if(!this.contains(event.relatedTarget))this.classList.remove('is-dragover')" ondrop="ModernoProjectDocuments.dropFiles(event,Number(this.dataset.project),this.dataset.section)"><img class="project-upload-illustration" src="/brand/illustrations/subir-planos.webp?v=36573" width="640" height="427" alt="" aria-hidden="true" draggable="false" decoding="async" onerror="this.hidden=true"><strong>${section==='planos'?'Subir o arrastrar plano':'<span class="project-file-plus" aria-hidden="true">+</span> Subir o arrastrar archivos'}</strong><input type="file" ${accept?`accept="${accept}"`:''} multiple hidden onchange="addFiles(Number(this.closest('[data-project]').dataset.project),this.files,this.closest('[data-project]').dataset.section);this.value='' "></label>`;}
  function dragFiles(event){if(!Array.from(event.dataTransfer?.types||[]).includes('Files'))return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='copy';event.currentTarget.classList.add('is-dragover');}
  function dropFiles(event,pid,section='archivos'){event.preventDefault();event.stopPropagation();event.currentTarget.classList.remove('is-dragover');const files=event.dataTransfer?.files;if(files?.length)addFiles(pid,files,section);}
  async function readBlob(source,type,signal) {
    const response=await fetch(source,{signal,credentials:'omit'});
    if(!response.ok) throw Error('No se pudo descargar el plano. Puedes abrir el original desde Documentos.');
    const max=50*1024*1024;
    if(Number(response.headers.get('content-length'))>max)throw Error('Límite de archivo: 50 MB');
    const reader=response.body?.getReader();
    if(!reader)throw Error('No se pudo leer el archivo');
    let size=0;const chunks=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('Límite de archivo: 50 MB');chunks.push(value);}}
    catch(error){await reader.cancel().catch(()=>{});throw error;}
    finally{reader.releaseLock();}
    return new Blob(chunks,{type});
  }
  return {category,uploadCard,dragFiles,dropFiles,type,plans,heading,action,card,readBlob};
})();

let projectPlanDialog=null;
function projectPlanIdentity(){return fileViewIdentity()+'|'+(state.sessionUser?.mail||state.sessionUser?.id||'');}
async function projectPlanOpen(pid,index,collection='files'){
  if(projectPlanDialog)return;
  if(!['files','obraPlanos'].includes(collection))return;
  const project=state.projects.find(p=>p.id===pid),file=project?.[collection]?.[index],kind=ModernoProjectDocuments.type(file);
  if(!kind){toast('Este formato no se puede abrir en el visor');return;}
  const identity=projectPlanIdentity(),source=fileSrc(file);
  const allowed=()=>{
    const current=state.projects.find(p=>p.id===pid)?.[collection]?.[index];
    return !_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&!state.portalAnon&&Boolean(state.sessionUser?.mail||state.sessionUser?.id)&&identity===projectPlanIdentity()&&current&&fileSrc(current)===source&&String(current.id??index)===String(file.id??index)&&ModernoProjectDocuments.type(current)===kind;
  };
  if(!allowed()){toast('Comprueba tu sesión y tu acceso al proyecto');return;}
  const controller=new AbortController(),dialog=document.createElement('section');dialog.className='project-plan-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-label','Plano del proyecto');
  const header=document.createElement('header'),title=document.createElement('strong'),close=document.createElement('button'),root=document.createElement('section');
  const actions=document.createElement('div'),save=document.createElement('button'),saveCopy=document.createElement('button'),remove=document.createElement('button'),edit=document.createElement('button');actions.className='plan-dialog-actions';save.type='button';save.className='btn btn-ghost project-plan-save';save.textContent='Guardar';save.disabled=true;saveCopy.type='button';saveCopy.className='btn btn-ghost';saveCopy.textContent='Guardar como copia';saveCopy.disabled=true;remove.type='button';remove.className='btn btn-ghost project-plan-delete';remove.textContent='Eliminar';edit.type='button';edit.className='btn btn-ghost project-plan-edit';edit.textContent='Editar';close.type='button';close.className='btn btn-ghost project-plan-close';close.textContent='Cerrar';title.textContent=file.name;actions.append(save,saveCopy,remove,edit,close);header.append(title,actions);root.textContent='Abriendo plano…';dialog.append(header,root);const view=document.getElementById('project-tab-panel')||document.getElementById('view');if(!view)throw Error('Vista del proyecto no disponible');view.replaceChildren(dialog);close.focus();
  let editor=null,doc=null,closed=false,closing=false,saving=false,exitAlert=null,pendingNavigation=null;
  function clearExitAlert(){exitAlert?.remove();exitAlert=null;pendingNavigation=null;}
  async function dismiss(force=false,renderView=true){
    if(closed||closing)return;closing=true;
    try{
      if(editor&&!force&&editor.hasChanges()){showExitAlert(renderView?render:()=>{});return false;}
      if(editor&&!force)await editor.close();
      else if(editor)await editor.discard();else await doc?.close?.();
      closed=true;controller.abort();clearInterval(timer);clearExitAlert();dialog.remove();projectPlanDialog=null;if(renderView)render();return true;
    }finally{closing=false;}
  }
  const timer=setInterval(()=>{if(!allowed())dismiss(true);},250);
  // Opaque file scope: URLs, names and document bytes never enter a broadcast.
  crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([pid,String(file.id??index),source]))).then(hash=>{if(!closed){dialog.dataset.cursorFile=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');document.dispatchEvent(new Event('moderno:cursor-context'));}}).catch(()=>{});
  async function store(copy,after=null){
    if(closed||saving||!editor||kind==='application/dxf'||kind==='application/vnd.dwg')return false;saving=true;save.disabled=true;saveCopy.disabled=true;
    try{
      const blob=await editor.exportPdf();if(closed||!allowed())throw Error('El plano ha cambiado mientras se preparaba');
      const base=String(file.name||'Plano').replace(/\.[a-zA-Z0-9]{1,10}$/,'')||'Plano',siblings=project[collection]||[];let name=base+(copy?' - copia':'')+'.pdf';
      if(copy){let n=2;while(siblings.some(item=>String(item?.name||'').toLocaleLowerCase()===name.toLocaleLowerCase()))name=base+' - copia ('+(n++)+').pdf';}
      const data=await fileUp(new File([blob],name,{type:'application/pdf'}));if(!data)throw Error('No se pudo subir el plano');if(closed||!allowed())throw Error('El plano ha cambiado durante la subida');
      const next={...file,id:copy?crypto.randomUUID():(file.id||crypto.randomUUID()),name,type:'application/pdf',data,when:hoyEs()};delete next.url;delete next.subiendo;delete next.signed;
      if(copy)siblings.push(next);else{delete file.url;delete file.subiendo;delete file.signed;Object.assign(file,next);}
      editor.markSaved();persistSoon();
      if(copy)toast('Copia del plano guardada');else{const navigate=typeof after==='function';await dismiss(true,!navigate);toast('Plano guardado');if(navigate)after();}return true;
    }catch(error){if(!closed)toast(error.message||'No se pudo guardar el plano');return false;}
    finally{saving=false;if(!closed){save.disabled=false;saveCopy.disabled=false;}}
  }
  function showExitAlert(action){
    if(exitAlert||closed)return;pendingNavigation=action;
    exitAlert=document.createElement('aside');exitAlert.className='project-plan-exit-alert';exitAlert.setAttribute('role','alertdialog');exitAlert.setAttribute('aria-labelledby','project-plan-exit-title');exitAlert.setAttribute('aria-describedby','project-plan-exit-description');exitAlert.innerHTML=`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></svg><div><h3 id="project-plan-exit-title">¿Guardar los cambios del plano?</h3><p id="project-plan-exit-description">Guarda las anotaciones antes de salir del editor.</p></div><div class="project-plan-exit-actions"><button type="button" class="btn" data-stay>Seguir editando</button><button type="button" class="btn project-plan-exit-discard" data-discard>Salir sin guardar</button><button type="button" class="btn project-plan-exit-save" data-save>Guardar y salir</button></div>`;
    exitAlert.querySelector('[data-stay]').onclick=()=>{clearExitAlert();close.focus();};
    exitAlert.querySelector('[data-discard]').onclick=async()=>{const next=pendingNavigation;clearExitAlert();if(await dismiss(true,false))next?.();};
    exitAlert.querySelector('[data-save]').onclick=async()=>{const next=pendingNavigation,buttons=[...exitAlert.querySelectorAll('button')];buttons.forEach(button=>button.disabled=true);if(!await store(false,next))buttons.forEach(button=>button.disabled=false);};
    document.body.append(exitAlert);exitAlert.querySelector('[data-save]').focus();
  }
  function navigate(action){if(closed){action?.();return;}if(editor?.hasChanges()){showExitAlert(action);return;}dismiss(true,false).then(done=>{if(done)action?.();});}
  function confirmDelete(){
    if(document.getElementById('project-plan-delete-confirm'))return;
    const warning=document.createElement('dialog');warning.id='project-plan-delete-confirm';warning.className='project-plan-alert-dialog';warning.setAttribute('aria-labelledby','project-plan-delete-title');warning.setAttribute('aria-describedby','project-plan-delete-description');warning.innerHTML=`<div class="project-plan-alert-header"><div class="project-plan-alert-media" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></div><div><h3 id="project-plan-delete-title">¿Eliminar plano?</h3><p id="project-plan-delete-description">Se eliminará «${ModernoDaily.escape(file.name||'Plano')}» y se moverá a la Papelera.</p></div></div><div class="project-plan-alert-footer"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button><button type="button" class="btn project-plan-alert-delete" data-confirm>Eliminar</button></div>`;
    warning.querySelector('[data-cancel]').onclick=()=>warning.close();warning.addEventListener('close',()=>{warning.remove();remove.focus();},{once:true});
    warning.querySelector('[data-confirm]').onclick=async()=>{const currentProject=state.projects.find(p=>p.id===pid),currentIndex=(currentProject?.[collection]||[]).findIndex(item=>item===file||(fileSrc(item)===source&&String(item.id??index)===String(file.id??index)));if(currentIndex<0){warning.close();return;}warning.close();await dismiss(true);if(collection==='files'){trashFile(pid,currentIndex);persistSoon();}else{obraSnap(pid);currentProject.obraPlanos.splice(currentIndex,1);persistSoon();render();toast('Plano eliminado');}};
    document.body.append(warning);warning.showModal();warning.querySelector('[data-cancel]').focus();
  }
  const escape=event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){event.preventDefault();dismiss();}};window.addEventListener('keydown',escape,{signal:controller.signal});
  projectPlanDialog={dismiss,navigate};save.onclick=()=>store(false);saveCopy.onclick=()=>store(true);remove.onclick=confirmDelete;edit.onclick=()=>ModernoPlanOptions.open(pid,index,collection,name=>{file.name=name;title.textContent=name;});close.onclick=()=>dismiss();
  try{
    const resolved=await fileResolveForView(file);
    if(!resolved)throw Error('Archivo no disponible; comprueba tu acceso o vuelve a subirlo desde Archivos.');
    if(closed||!allowed())return;
    if(kind==='application/vnd.dwg')throw Error('DWG requiere conversión antes de previsualizarlo.');
    const blob=await ModernoProjectDocuments.readBlob(resolved,kind,controller.signal);
    const pdfjs=kind==='application/pdf'?await loadPdfJs():undefined;
    if(closed||!allowed())return;
    doc=kind==='application/dxf'?await ModernoCadViewer.open(blob):await ModernoPlanEditor.openFile(blob,{pdfjs});
    if(closed||!allowed()){await doc.close?.();return;}
    const model=new ModernoPlanAnnotations.Model({reference:{studyId:ESTUDIO_ID,projectId:String(pid),fileId:String(file.id??index),revisionId:'original'},pages:doc.pages,authorize:()=>!closed&&allowed()});
    const products=(project.rooms||[]).flatMap((room,ri)=>(room.sections||[]).flatMap((section,si)=>(section.items||[]).map((item,ii)=>({id:String(item.instanceId||item.id||`${ri}:${si}:${ii}`),name:String(item.name||'Producto'),room:String(room.name||''),reference:String(item.sku||item.ref||'')}))));
    editor=await ModernoPlanEditor.mount(root,{document:doc,model,filename:file.name,readOnly:kind==='application/dxf',products,onDetached:()=>{if(closed)return;closed=true;controller.abort();clearInterval(timer);clearExitAlert();projectPlanDialog=null;}});save.disabled=kind==='application/dxf';saveCopy.disabled=kind==='application/dxf';
    if(closed){await editor.discard();return;}
    root.querySelector('h2').textContent=file.name;
  }catch(error){if(!closed){root.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.name==='AbortError'?'Lectura cancelada':error.message;root.append(message);}}
}
if(typeof module!=='undefined')module.exports=ModernoProjectDocuments;

function projectFileMove(pid,index){
 const project=state.projects.find(p=>p.id===pid),stored=project?.files?.[index];
 if(stored==null||_accessLoading||state.portalAnon||!['admin','miembro','colaborador'].includes(_accessRole))return;
 const file=typeof stored==='string'?{name:stored}:stored;if(file.docRef||file.docKind)return;
 project.files[index]={...file,cat:ModernoProjectDocuments.category(file)==='planos'?'documento':'plano'};
 persistSoon();render();toast('Archivo movido a '+(ModernoProjectDocuments.category(project.files[index])==='planos'?'Planos':'Documentos'));
}
