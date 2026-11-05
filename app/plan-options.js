/* Edit only the selected plan's display name; original file and storage references stay intact. */
var ModernoPlanOptions=(()=>{
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let context=null;
 const allowed=()=>!_accessLoading&&!state.portalAnon&&['admin','miembro','colaborador'].includes(_accessRole)&&canView('proyecto');
 function button(pid,index,collection='obraPlanos',name='Plano'){
  return `<button type="button" class="plan-options-button" aria-label="Opciones de ${E(name)}" title="Opciones del plano" onclick="ModernoPlanOptions.open(${Number(pid)},${Number(index)},'${collection==='files'?'files':'obraPlanos'}')">⋯</button>`;
 }
 function current(){
  const c=context;
  if(!c||!allowed()||state.view!=='proyecto'||String(state.currentProject)!==String(c.project.id)||c.identity!==fileViewIdentity()||document.getElementById('plan-options-name')!==c.input||!c.input.isConnected||!state.projects.includes(c.project)||!c.project[c.collection]?.includes(c.file)||JSON.stringify(c.file)!==c.original){toast('El plano ha cambiado. Cierra las opciones y vuelve a abrirlo.');return null;}
  return c;
 }
 function open(pid,index,collection='obraPlanos'){
  if(!allowed()||state.view!=='proyecto'||String(state.currentProject)!==String(pid)||!['files','obraPlanos'].includes(collection))return;
  const project=state.projects.find(p=>p.id===pid),file=project?.[collection]?.[index];
  if(!file||typeof file!=='object'||(collection==='files'&&ModernoProjectDocuments.category(file)!=='planos'))return;
  const name=String(file.name||'Plano'),ext=name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0]||'',base=ext?name.slice(0,-ext.length):name;
  modal(`<form class="shopping-product-editor plan-options-editor" onsubmit="event.preventDefault();ModernoPlanOptions.save()"><header class="product-editor-header"><h3>Editar plano</h3><p>Nombre y gestión del plano.</p><button type="button" class="product-editor-close" aria-label="Cerrar opciones del plano" onclick="closeModal()">×</button></header><div class="product-editor-body plan-options-body"><div class="product-editor-column"><section class="product-editor-section"><label for="plan-options-name">Nombre del plano</label><input id="plan-options-name" type="text" required maxlength="240" value="${E(base)}" aria-describedby="plan-options-extension"><p class="product-editor-help" id="plan-options-extension">${ext?'Formato del archivo: '+E(ext):'El archivo original se conserva.'}</p><p class="plan-options-warning" id="plan-options-confirm" hidden>¿Eliminar este plano del proyecto?</p></section></div></div><footer class="modal-foot product-editor-footer"><button type="button" class="btn shopping-editor-delete" id="plan-options-delete" onclick="ModernoPlanOptions.remove()">Eliminar</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-dark" id="plan-options-save">Guardar</button></footer></form>`);
  context={project,file,collection,ext,original:JSON.stringify(file),identity:fileViewIdentity(),input:document.getElementById('plan-options-name'),confirm:false};
  context.input.focus();context.input.select();
 }
 function save(){
  const c=current();if(!c||c.confirm)return;
  const value=c.input.value.trim();if(!value){c.input.setCustomValidity('Escribe un nombre para el plano.');c.input.reportValidity();c.input.oninput=()=>c.input.setCustomValidity('');return;}
  const name=value+c.ext;
  if(name!==c.file.name){c.file.name=name;persistSoon();}
  context=null;closeModal();render();toast('Nombre del plano guardado');
 }
 function remove(){
  const c=current();if(!c)return;
  if(!c.confirm){c.confirm=true;document.getElementById('plan-options-confirm').hidden=false;document.getElementById('plan-options-delete').textContent='Confirmar eliminación';document.getElementById('plan-options-save').hidden=true;c.input.disabled=true;return;}
  const index=c.project[c.collection].indexOf(c.file);context=null;
  closeModal();
  if(c.collection==='files')trashFile(c.project.id,index);else obraPlanoDel(c.project.id,index);
  persistSoon();
 }
 return {button,open,save,remove};
})();
