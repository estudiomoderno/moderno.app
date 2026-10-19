function projectCurrencySymbol(){return (CURR[state.account?.currency]||CURR.EUR).s;}
/* Uiverse.io by vinodjangid07: supplied button design, scoped to the shopping overview. */
function shoppingListActions(pid){
 const paths={create:'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',export:'M11 3h2v11l4-4 1.4 1.4-6.4 6.4-6.4-6.4L7 10l4 4z',print:'M6 3h12v5H6zM5 9h14a3 3 0 0 1 3 3v6h-4v4H6v-4H2v-6a3 3 0 0 1 3-3zm3 7v4h8v-4zm10-4v2h2v-2z'};
 const actions=[['create','Crear',`newRoom(${pid},'estancia')`],['export','Exportar',`shoppingListExport(${pid})`],['print','Imprimir',`exportListsModal(${pid},'pdf',true)`]];
 return `<div class="shopping-actions" role="group" aria-label="Acciones de listas de compra">${actions.map(([key,label,action])=>`<button type="button" class="shopping-action" data-shopping-action="${key}" aria-label="${label}" title="${label}" onclick="${action}"><svg class="shopping-action-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${paths[key]}"/></svg></button>`).join('')}</div>`;
}
function shoppingListExport(pid){
 modal(`<h3>Exportar listas</h3><div class="shopping-export-formats"><button type="button" class="btn btn-ghost" onclick="exportListsModal(${pid},'pdf')">${ico('pdf')} PDF</button><button type="button" class="btn btn-ghost" onclick="exportListsModal(${pid},'xlsx')">${ico('xlsx')} Hoja de cálculo (CSV)</button></div><div class="modal-foot"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button></div>`);
}
/* Project presentation. Existing editors and persistence remain the source of truth. */
function projectTabKey(key){return key==='resumen'?'proyecto':key==='chat'?'cliente':key;}
function projectMoreIcon(){return '<svg class="svgi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';}
function projectClientAvatar(p){
 if(!p.client)return '';
 const E=ModernoDaily.escape,initials=String(p.client).trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase();
 return `<span class="project-client-avatar" tabindex="0" aria-label="Cliente: ${E(p.client)}" data-client="${E(p.client)}" title="${E(p.client)}"><span aria-hidden="true">${E(initials)}</span><span class="project-avatar-tooltip" role="tooltip">${E(p.client)}</span></span>`;
}
function projectOpen(id){if(typeof ModernoProjectWorkspace==='object'&&ModernoProjectWorkspace.active())return ModernoProjectWorkspace.open(id);go('proyecto',id);if(state.projTab!=='proyecto')projTab('proyecto');}
function projectsArchivedToggle(){state.showArchived=!state.showArchived;render();projectsFadeRows();}
function projectFinanceIcon(){return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svgi" aria-hidden="true"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M17.1 8.648a.568 .568 0 0 1 -.761 .011a5.682 5.682 0 0 0 -3.659 -1.34c-1.102 0 -2.205 .363 -2.205 1.374c0 1.023 1.182 1.364 2.546 1.875c2.386 .796 4.363 1.796 4.363 4.137c0 2.545 -1.977 4.295 -5.204 4.488l-.295 1.364a.557 .557 0 0 1 -.546 .443h-2.034l-.102 -.011a.568 .568 0 0 1 -.432 -.67l.318 -1.444a7.432 7.432 0 0 1 -3.273 -1.784v-.011a.545 .545 0 0 1 0 -.773l1.137 -1.102c.214 -.2 .547 -.2 .761 0a5.495 5.495 0 0 0 3.852 1.5c1.478 0 2.466 -.625 2.466 -1.614c0 -.989 -1 -1.25 -2.886 -1.954c-2 -.716 -3.898 -1.728 -3.898 -4.091c0 -2.75 2.284 -4.091 4.989 -4.216l.284 -1.398a.545 .545 0 0 1 .545 -.432h2.023l.114 .012a.544 .544 0 0 1 .42 .647l-.307 1.557a8.528 8.528 0 0 1 2.818 1.58l.023 .022c.216 .228 .216 .569 0 .773l-1.057 1.057" /></svg>';}
function projectTabsHtml(current){
 const groups=[
  [['proyecto','Inicio','home']],
  [['planos','Planos','planos'],['obra','Obra','tab_obra']],
  [['tareas','Tareas','tab_tareas'],['listas','Compras','tab_listas']],
  [['fin','Economía','finanzas'],['archivos','Documentos','tab_archivos']],
  [['ai','AI','ai'],['conversaciones','Conversaciones','tab_chat']],
  [['utilidades','Utilidades','tools']]
 ].map(group=>group.filter(([key])=>(key!=='fin'||myAccessLevel()!=='colab')&&(!['utilidades','conversaciones'].includes(key)||canView(key)))).filter(group=>group.length);
 const first=groups.flat()[0][0],selected=groups.flat().some(([key])=>key===current)?current:first;
 const special={planos:'<path d="M3 3h18v18H3zM3 10h8V3m0 7v5h10M8 21v-6H3"/>',ai:'<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6ZM20 3v4m-2-2h4"/>'};
 return `<div class="project-tabs" role="tablist" aria-label="Secciones del proyecto">${groups.map(group=>group.map(([key,label,icon])=>`<button type="button" role="tab" id="project-tab-${key}" aria-controls="project-tab-panel" aria-selected="${current===key}" tabindex="${selected===key?0:-1}" class="${current===key?'on':''}" aria-label="${label}" onclick="projTab('${key}')">${key==='fin'?projectFinanceIcon():special[key]?`<svg class="svgi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${special[key]}</svg>`:ico(icon)}<span class="project-tab-label" aria-hidden="true">${label}</span></button>`).join('')).join('<span class="project-tab-separator" role="separator" aria-orientation="vertical"></span>')}</div>`;
}
function projectDrawerOpen(){
 mb.classList.add('project-drawer');ov.classList.add('project-drawer-overlay');
}
function projectClientCard(name){
 clientCard(name);if(!state.clients.some(c=>c.name===name))return;
 projectDrawerOpen();
 const close=document.createElement('button');close.type='button';close.className='btn btn-ghost project-drawer-close';close.setAttribute('aria-label','Cerrar ficha del cliente');close.textContent='×';close.onclick=closeModal;mb.prepend(close);
}
function projectClientSearch(query){
 if(!cz)return;
 const box=document.getElementById('czClientMatches');if(!box)return;
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),q=norm(query),E=ModernoDaily.escape;
 const matches=(state.clients||[]).filter(c=>c.type==='Cliente'&&norm(c.name).includes(q));
 box.innerHTML=`<button type="button" class="project-client-choice" data-name="" onclick="projectClientChoose(this.dataset.name)">Sin cliente</button>`+matches.map(c=>`<button type="button" class="project-client-choice ${cz.client===c.name?'is-selected':''}" data-name="${E(c.name)}" onclick="projectClientChoose(this.dataset.name)">${E(c.name)}</button>`).join('')+(matches.length?'':'<p>No hay clientes que coincidan.</p>');
}
function projectClientChoose(name){
 if(!cz)return;cz.client=name;
 const input=document.getElementById('czClient');if(input)input.value=name;
 projectClientSearch(name);
}
function projectClientValidate(){
 const input=document.getElementById('czClient');if(!input)return true;
 const name=input.value.trim();
 if(!name){cz.client='';return true;}
 // An unchanged historical contact is retained even if no longer in the agenda.
 if(name===cz.client)return true;
 const found=state.clients.find(c=>c.type==='Cliente'&&c.name===name);
 if(found){cz.client=found.name;return true;}
 toast('Selecciona un cliente de la lista o crea uno nuevo.');input.focus();return false;
}
let projectClientDraft=null;
function projectClientCreate(id){
 const draft={...cz,folderPhotos:[...(cz.folderPhotos||[])]},query=document.getElementById('czClient')?.value.trim()||'';
 projectClientDraft={id,draft};state.afterClient='projectedit';clientModal(-1,'Cliente');
 const name=document.getElementById('clName');if(name)name.value=query;
 // Keep the existing contact form and validation; return explicitly to the project draft.
 const cancel=mb.querySelector('.modal-foot .btn-ghost');if(cancel)cancel.onclick=()=>projectClientCreateReturn();
}
function projectClientCreateReturn(name){
 const saved=projectClientDraft;projectClientDraft=null;state.afterClient=null;
 if(!saved)return;
 if(name)saved.draft.client=name;
 customizeModal(saved.id,saved.draft.mode,saved.draft);
}
if(typeof document!=='undefined'){
 document.addEventListener('keydown',event=>{
  const tab=event.target.closest?.('.project-tabs [role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const buttons=[...tab.parentElement.querySelectorAll('[role="tab"]')],index=buttons.indexOf(tab);
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  const id=buttons[next].id;buttons[next].click();document.getElementById(id)?.focus();
 });
}
