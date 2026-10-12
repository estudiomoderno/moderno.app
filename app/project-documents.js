/* Document navigation and temporary annotation/export. No database or Storage writes. */
var ModernoProjectDocuments = (() => {
  const E = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const types = {pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
  function type(file) {
    if(!file || typeof file !== 'object' || file.docRef || file.body) return '';
    if(Object.values(types).includes(file.type)) return file.type;
    return types[String(file.name || '').split('.').pop().toLowerCase()] || '';
  }
  function plans(project) {
    return (project.files || []).map((file,index)=>({file,index,type:type(file)})).filter(x=>x.type);
  }
  function heading() {
    return '<h2 class="sec" id="pj-espacio" style="margin-top:0">Planos y Archivos</h2>';
  }
  function action(project,index) {
    const file=(project.files||[])[index];
    if(!type(file))return '';
    return `<button type="button" class="btn btn-ghost project-plan-open" ${file.subiendo||!(file.url||file.data)?'disabled title="Archivo pendiente de subida o sin contenido"':''} data-project="${E(project.id)}" data-index="${index}" onclick="event.stopPropagation();projectPlanOpen(Number(this.dataset.project),Number(this.dataset.index))">Ver y anotar</button>`;
  }
  function card(project,index,{available,clientVisible}={}) {
    const stored=(project.files||[])[index],file=typeof stored==='string'?{name:stored}:stored||{},name=String(file.name||'Archivo');
    if(available===undefined)available=Boolean(file.url||file.data||file.body||file.docRef);
    if(clientVisible===undefined)clientVisible=file.cli!==false;
    const ext=name.includes('.')?name.split('.').pop().slice(0,5).toUpperCase():'DOC',id=E(project.id),label=E(name);
    const data=`data-project="${id}" data-index="${index}"`;
    const visibility=!available?'<span class="project-file-status is-missing" title="Solo se guardó el nombre. Vuelve a subirlo para abrir el archivo.">Solo nombre</span>':`<span class="project-file-status">${clientVisible?'Lo ve el cliente':'Oculto al cliente'}</span>`;
    return `<article class="project-file-card"><button type="button" class="project-file-open" ${data} aria-label="Abrir ${label}" onclick="fileView(Number(this.dataset.project),Number(this.dataset.index))"><span class="project-file-sheet" aria-hidden="true"><span class="project-file-fold"></span><span class="project-file-extension">${E(ext)}</span><span class="project-file-lines"></span></span><strong class="project-document-name">${label}</strong></button><div class="project-file-meta">${file.signed?'<span class="project-file-status is-signed">Firmado</span>':''}${visibility}</div><div class="project-file-actions">${action(project,index)}<button type="button" class="project-file-delete" ${data} aria-label="Eliminar archivo ${label}" title="Eliminar archivo" onclick="trashFile(Number(this.dataset.project),Number(this.dataset.index))">×</button></div></article>`;
  }
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
  return {type,plans,heading,action,card,readBlob};
})();

let projectPlanDialog=null;
function projectPlanIdentity(){return fileViewIdentity()+'|'+(state.sessionUser?.mail||state.sessionUser?.id||'');}
async function projectPlanOpen(pid,index){
  if(projectPlanDialog)return;
  const project=state.projects.find(p=>p.id===pid),file=project?.files?.[index],kind=ModernoProjectDocuments.type(file);
  if(!kind){toast('Este archivo no admite anotaciones');return;}
  const identity=projectPlanIdentity(),source=fileSrc(file);
  const allowed=()=>{
    const current=state.projects.find(p=>p.id===pid)?.files?.[index];
    return !_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&!state.portalAnon&&Boolean(state.sessionUser?.mail||state.sessionUser?.id)&&identity===projectPlanIdentity()&&current&&fileSrc(current)===source&&String(current.id??index)===String(file.id??index)&&ModernoProjectDocuments.type(current)===kind;
  };
  if(!allowed()){toast('Comprueba tu sesión y tu acceso al proyecto');return;}
  const controller=new AbortController(),dialog=document.createElement('dialog');dialog.className='project-plan-dialog';dialog.setAttribute('aria-label','Plano del proyecto');
  const header=document.createElement('header'),title=document.createElement('strong'),close=document.createElement('button'),root=document.createElement('section');
  title.textContent=file.name;close.type='button';close.className='btn btn-ghost';close.textContent='Cerrar';header.append(title,close);root.textContent='Abriendo plano…';dialog.append(header,root);document.body.append(dialog);dialog.showModal();close.focus();
  let editor=null,doc=null,closed=false,closing=false;
  async function dismiss(force=false){
    if(closed||closing)return;closing=true;
    try{
      if(editor&&!force){try{await editor.close();}catch{if(!window.confirm('Las anotaciones no se han guardado en la nube. ¿Descartarlas y cerrar?'))return;await editor.discard();}}
      else if(editor)await editor.discard();else await doc?.close?.();
      closed=true;controller.abort();clearInterval(timer);dialog.close();dialog.remove();projectPlanDialog=null;
    }finally{closing=false;}
  }
  const timer=setInterval(()=>{if(!allowed())dismiss(true);},250);
  projectPlanDialog={dismiss};close.onclick=()=>dismiss();dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  try{
    const resolved=await fileResolveForView(file);
    if(!resolved)throw Error('Archivo no disponible; comprueba tu acceso o vuelve a subirlo desde Archivos.');
    if(closed||!allowed())return;
    const blob=await ModernoProjectDocuments.readBlob(resolved,kind,controller.signal);
    const pdfjs=kind==='application/pdf'?await loadPdfJs():undefined;
    if(closed||!allowed())return;
    doc=await ModernoPlanEditor.openFile(blob,{pdfjs});
    if(closed||!allowed()){await doc.close?.();return;}
    const model=new ModernoPlanAnnotations.Model({reference:{studyId:ESTUDIO_ID,projectId:String(pid),fileId:String(file.id??index),revisionId:'original'},pages:doc.pages,authorize:()=>!closed&&allowed()});
    editor=await ModernoPlanEditor.mount(root,{document:doc,model});
    if(closed){await editor.discard();return;}
    root.querySelector('h2').textContent=file.name;
  }catch(error){if(!closed){root.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.name==='AbortError'?'Lectura cancelada':error.message;root.append(message);}}
}
if(typeof module!=='undefined')module.exports=ModernoProjectDocuments;
