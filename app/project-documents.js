/* Document navigation and temporary annotation/export. No database or Storage writes. */
var ModernoDocuments = (() => {
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
  function tabs(projectId,current='planos') {
    return '<nav class="project-document-tabs" aria-label="Documentos del proyecto">'+[['planos','Planos'],['archivos','Archivos'],['referencias','Referencias'],['revisiones','Revisiones']].map(([key,label])=>
      `<button type="button" class="btn btn-ghost ${current===key?'on':''}" ${['referencias','revisiones'].includes(key)?'disabled title="Pendiente de implementación"':`aria-pressed="${current===key}" data-project="${E(projectId)}" data-section="${key}" onclick="projectDocumentTab(Number(this.dataset.project),this.dataset.section)"`}>${label}</button>`).join('')+'</nav>';
  }
  function list(project) {
    const items=plans(project);
    return '<h2 class="sec" style="margin-top:0">Planos</h2><p class="project-plan-notice">Dibuja y exporta sobre PDF o imágenes. Las anotaciones son temporales; el guardado en la nube está pendiente.</p><div class="entry-col">'+(items.map(({file,index})=>
      `<div class="entry project-plan-row"><span class="project-plan-name">${E(file.name)}</span><button type="button" class="btn btn-ghost" ${file.subiendo||!(file.url||file.data)?'disabled title="Archivo pendiente de subida o sin contenido"':''} data-project="${E(project.id)}" data-index="${index}" onclick="projectPlanOpen(Number(this.dataset.project),Number(this.dataset.index))">Ver y anotar</button><button type="button" class="btn btn-ghost" data-project="${E(project.id)}" data-index="${index}" onclick="fileView(Number(this.dataset.project),Number(this.dataset.index))">Ver original</button></div>`).join('') || '<p class="empty">No hay PDF ni imágenes. Puedes subirlos desde Archivos.</p>')+'</div>';
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
  return {type,plans,tabs,list,readBlob};
})();

const projectDocumentSections=new Map();
function projectDocumentSection(pid){return projectDocumentSections.get(pid)||'planos';}
function projectDocumentTab(pid,section){
  if(!['planos','archivos'].includes(section)||!state.projects.some(p=>p.id===pid))return;
  projectDocumentSections.set(pid,section);render();
}
let projectPlanDialog=null;
function projectPlanIdentity(){return fileViewIdentity()+'|'+(state.sessionUser?.mail||state.sessionUser?.id||'');}
async function projectPlanOpen(pid,index){
  if(projectPlanDialog)return;
  const project=state.projects.find(p=>p.id===pid),file=project?.files?.[index],kind=ModernoDocuments.type(file);
  if(!kind){toast('Este archivo no admite anotaciones');return;}
  const identity=projectPlanIdentity(),source=fileSrc(file);
  const allowed=()=>{
    const current=state.projects.find(p=>p.id===pid)?.files?.[index];
    return !_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&!state.portalAnon&&Boolean(state.sessionUser?.mail||state.sessionUser?.id)&&identity===projectPlanIdentity()&&current&&fileSrc(current)===source&&String(current.id??index)===String(file.id??index)&&ModernoDocuments.type(current)===kind;
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
    const blob=await ModernoDocuments.readBlob(resolved,kind,controller.signal);
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
if(typeof module!=='undefined')module.exports=ModernoDocuments;
