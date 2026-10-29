function projectCurrencySymbol(){return (CURR[state.account?.currency]||CURR.EUR).s;}
/* Uiverse.io by vinodjangid07: supplied button design, scoped to the shopping overview. */
function shoppingListActions(pid){
 const paths={create:'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',export:'M11 3h2v11l4-4 1.4 1.4-6.4 6.4-6.4-6.4L7 10l4 4z',print:'M6 3h12v5H6zM5 9h14a3 3 0 0 1 3 3v6h-4v4H6v-4H2v-6a3 3 0 0 1 3-3zm3 7v4h8v-4zm10-4v2h2v-2z'};
 const actions=[['create','Crear',`newRoom(${pid},'estancia')`],['export','Exportar',`shoppingListExport(${pid})`],['print','Imprimir',`exportListsModal(${pid},'pdf',true)`]];
 return `<div class="shopping-actions" role="group" aria-label="Acciones de listas de compra">${actions.map(([key,label,action])=>`<button type="button" class="shopping-action" data-shopping-action="${key}" aria-label="${label}" title="${label}" onclick="${action}"><svg class="shopping-action-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${paths[key]}"/></svg></button>`).join('')}</div>`;
}
function shoppingListExport(pid){exportListsModal(pid);}
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
function shoppingRoomActions(pid,rid){
 const actions=[['settings','Ajustes de la lista',`roomMenu(${pid},${rid})`,'<path d="m9 3-.6 2.4-2.1 1.2L4 6l-2 3.5 1.7 1.8v2.4L2 15.5 4 19l2.3-.6 2.1 1.2L9 22h4l.6-2.4 2.1-1.2 2.3.6 2-3.5-1.7-1.8v-2.4L20 9.5 18 6l-2.3.6-2.1-1.2L13 3Z"/><circle cx="11" cy="12.5" r="3"/>'],['delete','Eliminar lista',`shoppingRoomDelete(${pid},${rid})`,'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>']];
 actions.splice(1,0,['export','Exportar lista','exportRoomModal()','<path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/>']);
 return `<div class="shopping-actions" role="group" aria-label="Acciones de la lista">${actions.map(([key,label,action,svg])=>`<button type="button" class="shopping-action shopping-room-${key}" title="${label}" aria-label="${label}" onclick="${action}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg></button>`).join('')}</div>`;
}
function shoppingRoomPickerHtml(project,current){
 const E=ModernoDaily.escape;
 return `<div class="shopping-room-picker">
  <h2 class="sec"><button type="button" id="shopping-room-trigger" class="shopping-room-trigger" aria-label="Cambiar lista: ${E(current.name)}" aria-haspopup="menu" aria-expanded="false" aria-controls="shopping-room-menu" onclick="shoppingRoomPickerToggle()">
   <span class="shopping-room-current-icon" aria-hidden="true">${rico(current.icon)}</span><span class="shopping-room-current-name">${E(current.name)}</span><svg class="shopping-room-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
  </button></h2>
  <div id="shopping-room-menu" class="shopping-room-menu" role="menu" aria-label="Listas de compra del proyecto" hidden>${(project.rooms||[]).map((room,index)=>`<button type="button" role="menuitemradio" aria-checked="${room.id===current.id}" tabindex="-1" data-room-index="${index}" onclick="shoppingRoomChoose(Number(this.dataset.roomIndex))" title="${E(room.name)}"><span class="shopping-room-choice-icon" aria-hidden="true">${rico(room.icon)}</span><span class="shopping-room-choice-name">${E(room.name)}</span><span class="shopping-room-choice-check" aria-hidden="true">${room.id===current.id?'✓':''}</span></button>`).join('')}</div>
 </div>`;
}
var shoppingDeleteUi=null;
function shoppingRoomDeleteCleanup(){
 const entry=shoppingDeleteUi;shoppingDeleteUi=null;if(entry){entry.component?.unmount();entry.host.remove();}
 document.getElementById('overlay')?.classList.remove('shopping-delete-overlay');document.getElementById('modalBox')?.classList.remove('shopping-reui-confirm');
}
function shoppingRoomEnhanceDelete(name){
 if(!window.ModernoProfileComponent?.mountShoppingDelete)return;
 const host=document.createElement('span');host.className='shopping-delete-host';document.body.append(host);const entry={host,component:null};shoppingDeleteUi=entry;
 const recover=()=>queueMicrotask(()=>{if(shoppingDeleteUi===entry){shoppingRoomDeleteCleanup();document.getElementById('modalBox')?.focus();}});
 const confirm=_askOk,cancel=_askCancel,current=()=>shoppingDeleteUi===entry&&_askOk===confirm&&_askCancel===cancel;
 const props={name,onCancel:()=>{if(current())askCancelGo();},onConfirm:()=>{if(current())askConfirmGo();}};
 const ready=()=>{if(shoppingDeleteUi!==entry)return;document.getElementById('overlay')?.classList.add('shopping-delete-overlay');document.getElementById('modalBox')?.classList.add('shopping-reui-confirm');entry.component.update(props);};
 try{entry.component=ModernoProfileComponent.mountShoppingDelete(host,recover,ready);}catch(error){recover();}
}
function shoppingRoomsMoveAllowed(){return !_accessLoading&&myAccessLevel()==='owner'&&canView('proyecto');}
function shoppingRoomsMoveContext(index){
 if(!shoppingRoomsMoveAllowed()||state.view!=='proyecto'||projectTabKey(state.projTab)!=='listas'||document.querySelector('.overlay.open,dialog[open]'))return null;
 const p=state.projects.find(p=>p.id===state.currentProject),room=p?.rooms?.[index];
 return room?{p,room,owner:shoppingProductIdentity(),snapshot:p.rooms.slice(),kind:room.kind||'estancia'}:null;
}
function shoppingRoomsMoveCommit(ctx,target,after){
 if(!ctx||!shoppingRoomsMoveAllowed()||shoppingProductIdentity()!==ctx.owner||state.view!=='proyecto'||state.currentProject!==ctx.p.id||projectTabKey(state.projTab)!=='listas'||state.projects.find(p=>p.id===ctx.p.id)!==ctx.p||document.querySelector('.overlay.open,dialog[open]'))return false;
 const rooms=ctx.p.rooms;
 if(rooms.length!==ctx.snapshot.length||rooms.some((r,i)=>r!==ctx.snapshot[i]))return false;
 const group=rooms.filter(r=>(r.kind||'estancia')===ctx.kind),from=group.indexOf(ctx.room),to=group.indexOf(target);
 if(from<0||to<0||from===to)return false;
 const at=to+(after?1:0)-(from<to?1:0);if(at===from)return false;
 group.splice(from,1);group.splice(at,0,ctx.room);
 let i=0;rooms.forEach((r,index)=>{if((r.kind||'estancia')===ctx.kind)rooms[index]=group[i++];});
 render();document.querySelector(`[data-shopping-room-index="${rooms.indexOf(ctx.room)}"] .shopping-room-grip`)?.focus();return true;
}
function shoppingRoomsMoveKey(event,index){
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
 event.preventDefault();event.stopPropagation();const ctx=shoppingRoomsMoveContext(index);if(!ctx)return;
 const group=ctx.snapshot.filter(r=>(r.kind||'estancia')===ctx.kind),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1,target=group[group.indexOf(ctx.room)+delta];
 if(target)shoppingRoomsMoveCommit(ctx,target,delta>0);
}
function shoppingRoomsMoveStart(event,index){
 if(event.button!==0)return;event.preventDefault();event.stopPropagation();
 const ctx=shoppingRoomsMoveContext(index),button=event.currentTarget,source=button.closest('.dl-card');if(!ctx||!source)return;
 const grid=source.parentElement,box=source.getBoundingClientRect(),ghost=source.cloneNode(true),gap=document.createElement('div');
 ghost.classList.add('shopping-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.style.width=box.width+'px';ghost.style.height=box.height+'px';
 gap.className='shopping-room-gap';gap.style.height=box.height+'px';gap.textContent='Colocar estancia aquí';
 let destination=null,active=false;const x=event.clientX,y=event.clientY,offsetX=x-box.left,offsetY=y-box.top;
 const move=e=>{
  if(!active&&Math.hypot(e.clientX-x,e.clientY-y)<6)return;
  if(!active){active=true;document.body.append(ghost);source.classList.add('shopping-drag-source');}
  ghost.style.left=e.clientX-offsetX+'px';ghost.style.top=e.clientY-offsetY+'px';
  const hit=document.elementFromPoint(e.clientX,e.clientY);if(hit===gap)return;
  const card=hit?.closest('[data-shopping-room-index]');
  if(card&&card!==source&&card.parentElement===grid){
   const rect=card.getBoundingClientRect(),sameRow=Math.abs(rect.top-box.top)<box.height/2,after=sameRow?e.clientX>rect.left+rect.width/2:e.clientY>rect.top+rect.height/2;
   destination={room:ctx.snapshot[Number(card.dataset.shoppingRoomIndex)],after};card[after?'after':'before'](gap);
  }else if(hit?.closest('.dl-add')?.parentElement===grid){
   destination={room:ctx.snapshot.filter(r=>(r.kind||'estancia')===ctx.kind).at(-1),after:true};grid.insertBefore(gap,grid.querySelector('.dl-add'));
  }else if(hit?.closest('.dl-grid')!==grid){destination=null;gap.remove();}
  const scroll=document.querySelector('.main');if(scroll){if(e.clientY<70)scroll.scrollBy(0,-18);else if(e.clientY>innerHeight-70)scroll.scrollBy(0,18);}
 };
 const stop=e=>{
  button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',stop);button.removeEventListener('pointercancel',stop);button.removeEventListener('lostpointercapture',stop);document.removeEventListener('keydown',cancel);
  ghost.remove();gap.remove();source.classList.remove('shopping-drag-source');
  if(e.type==='pointerup'&&active&&destination)shoppingRoomsMoveCommit(ctx,destination.room,destination.after);
 };
 const cancel=e=>{if(e.key==='Escape'){e.preventDefault();stop(e);}};
 button.setPointerCapture(event.pointerId);button.addEventListener('pointermove',move);button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop);document.addEventListener('keydown',cancel);
}
function shoppingRoomPickerClose(focus=false){
 const menu=document.getElementById('shopping-room-menu'),trigger=document.getElementById('shopping-room-trigger');if(menu)menu.hidden=true;
 trigger?.setAttribute('aria-expanded','false');if(focus)trigger?.focus();
}
function shoppingRoomPickerToggle(force){
 const menu=document.getElementById('shopping-room-menu'),trigger=document.getElementById('shopping-room-trigger');if(!menu||!trigger)return;
 const open=force??menu.hidden;if(!open){shoppingRoomPickerClose(true);return;}
 menu.hidden=false;trigger.setAttribute('aria-expanded','true');
 const box=trigger.getBoundingClientRect(),below=innerHeight-box.bottom-16,above=box.top-16,up=below<180&&above>below;
 const available=Math.max(120,innerWidth-box.left-12);menu.style.maxWidth=Math.min(360,available)+'px';menu.style.minWidth=Math.min(200,available)+'px';
 menu.style.top=up?'auto':'calc(100% + 8px)';menu.style.bottom=up?'calc(100% + 8px)':'auto';menu.style.maxHeight=Math.max(80,Math.min(360,up?above:below))+'px';
 (menu.querySelector('[aria-checked="true"]')||menu.querySelector('button'))?.focus();
}
function shoppingRoomChoose(index){
 if(state.view!=='estancia'||!canView('proyecto')||!Number.isInteger(index))return false;
 const {p,r}=getRoom(),target=p?.rooms?.[index];if(!target)return false;
 if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de cambiar de lista.');return false;}
 shoppingRoomPickerClose();
 if(target.id!==r?.id){state.roomSearch='';state.rf=null;shoppingRoomSearchState={scope:'',open:false};openRoom(p.id,target.id);}
 document.getElementById('shopping-room-trigger')?.focus();return true;
}
function shoppingRoomPickerKey(event){
 const picker=event.target.closest?.('.shopping-room-picker');if(!picker)return;
 const menu=picker.querySelector('[role=menu]');if(!menu)return;
 if(event.key==='Escape'&&!menu.hidden){event.preventDefault();shoppingRoomPickerClose(true);return;}
 if(event.key==='Tab'&&!menu.hidden){shoppingRoomPickerClose(true);return;}
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
 event.preventDefault();if(menu.hidden){shoppingRoomPickerToggle(true);if(['ArrowDown','ArrowUp'].includes(event.key))return;}
 const items=[...menu.querySelectorAll('[role=menuitemradio]')],index=items.indexOf(document.activeElement);
 const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();
}
/* Adapt the supplied filter example to existing shopping fields, not demo task data. */
var shoppingRoomSearchState={scope:'',open:false};
function shoppingLabelKey(value){return String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function shoppingRoomLabel(section){const name=String(section?.name||'').trim();return shoppingLabelKey(name)==='general'?'':name;}
function shoppingRoomRows(room){return (room.sections||[]).flatMap((section,si)=>(section.items||[]).map((it,ii)=>({it,si,ii,label:shoppingRoomLabel(section)})));}
function shoppingRoomLabels(room){const seen=new Set();return (room.sections||[]).map(shoppingRoomLabel).filter(label=>{const key=shoppingLabelKey(label);if(!key||seen.has(key))return false;seen.add(key);return true;});}
function shoppingRoomLabelMatches(label,filter){return !filter||(filter==='none'?!label:shoppingLabelKey(label)===shoppingLabelKey(filter.slice(6)));}
function shoppingRoomLabelFilter(label){state.rf={...(state.rf||{}),label:'label:'+label};render();document.querySelector('.shopping-filter-control summary')?.focus();}
function shoppingRoomLabelChip(label){const E=ModernoDaily.escape;return label?`<button type="button" class="shopping-product-label" data-label="${E(label)}" aria-label="Filtrar etiqueta ${E(label)}" onclick="shoppingRoomLabelFilter(this.dataset.label)">${E(label)}</button>`:'';}
var shoppingProductContext=null;
function shoppingProductIdentity(){return [typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID,state.sessionUser?.id||state.sessionUser?.mail||'',typeof _accessRole==='undefined'?'':_accessRole].join('|');}
function shoppingProductCurrent(){
 const ctx=shoppingProductContext;if(!ctx||state.view!=='estancia'||(typeof _accessLoading!=='undefined'&&_accessLoading)||!canView('proyecto')||ctx.owner!==shoppingProductIdentity())return null;
 const {p,r}=getRoom();return p&&r&&String(p.id)===ctx.project&&String(r.id)===ctx.room?{ctx,p,r}:null;
}
function shoppingRoomAddProduct(){
 if(state.view!=='estancia'||(typeof _accessLoading!=='undefined'&&_accessLoading)||!canView('proyecto')||document.querySelector('#overlay.open'))return;
 const {p,r}=getRoom();shoppingProductContext={project:String(p.id),room:String(r.id),owner:shoppingProductIdentity(),label:state.rf?.label?.startsWith('label:')?state.rf.label.slice(6):''};shoppingProductSources();
}
function shoppingProductSources(){
 if(!shoppingProductCurrent())return;
 const icons={manual:'<path d="m15 5 4 4M4 20l4-1 12-12a3 3 0 0 0-4-4L4 15Z"/>',url:'<path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4m12 0 2-2a4 4 0 0 1 6 6l-4 4"/>',library:'<path d="M5 3h14v18l-7-4-7 4Z"/>'};
 const entries=[['manual','Manualmente','Completa la ficha del producto.'],['url','Desde URL','Importa los datos desde la web de la tienda.'],['library','Desde la biblioteca','Utiliza un producto que ya tienes guardado.']];
 modal(`<div class="shopping-product-source"><h3>Añadir producto</h3><p>¿Cómo quieres añadirlo?</p><div class="shopping-product-methods">${entries.map(([mode,title,description])=>`<button type="button" class="shopping-product-method ${mode==='url'?'is-ai':''}" data-product-method="${mode}" onclick="shoppingProductMode(this.dataset.productMethod)"><span class="shopping-method-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[mode]}</svg></span><span><strong>${title}${mode==='url'?'<span class="shopping-ai-badge">✦ IA</span>':''}</strong><small>${description}</small></span><span class="shopping-method-arrow" aria-hidden="true">›</span></button>`).join('')}</div><div class="modal-foot"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button></div></div>`);
}
function shoppingProductMode(mode){
 const current=shoppingProductCurrent();if(!current||!document.querySelector('#modalBox .shopping-product-source'))return;const {ctx,r}=current,index=shoppingRoomLabelTarget(r,ctx.label),si=index<0?0:index;
 if(mode==='manual'){shoppingProductContext=null;itemModal(si,-1);return;}
 if(mode==='url'){shoppingProductContext=null;closeModal();ProductClipper.open('lista',si);return;}
 if(mode==='library')shoppingProductLibrary();
}
function shoppingProductLibrary(){
 if(!shoppingProductCurrent())return;
 modal(`<div class="shopping-product-source shopping-product-library"><h3>Biblioteca de productos</h3><label for="shopping-library-search" class="shopping-library-search-label">Buscar en la biblioteca</label><input id="shopping-library-search" type="search" placeholder="Buscar por nombre, proveedor o referencia" oninput="shoppingProductLibrarySearch(this)"><div id="shopping-library-results"></div><div class="modal-foot"><button type="button" class="btn btn-ghost" onclick="shoppingProductSources()">Volver</button><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button></div></div>`);shoppingProductLibrarySearch(document.getElementById('shopping-library-search'));
}
function shoppingProductLibrarySearch(input){
 if(!input?.isConnected||!shoppingProductCurrent())return;const E=ModernoDaily.escape,q=shoppingLabelKey(input.value),box=document.getElementById('shopping-library-results');
 const items=(state.library||[]).map((item,index)=>({item,index})).filter(({item})=>!q||shoppingLabelKey([item.name,item.supplier,item.sku,item.cat].join(' ')).includes(q));
 shoppingProductContext.libraryOptions=new Map(items.map(({item,index})=>[index,item]));
 box.innerHTML=items.length?`<div class="shopping-library-grid">${items.map(({item,index})=>`<button type="button" class="shopping-library-product" data-library-index="${index}" onclick="shoppingProductLibraryAdd(Number(this.dataset.libraryIndex))" aria-label="Añadir ${E(item.name||'Producto')}">${item.img?`<img ${fileImageAttrs(item.img)} alt="" loading="lazy">`:'<span class="shopping-library-placeholder" aria-hidden="true">＋</span>'}<strong>${E(item.name||'Producto')}</strong><small>${E(item.supplier||'')}</small><span>${item.price==null?'Sin precio':fmt(item.price)}</span></button>`).join('')}</div>`:`<div class="shopping-library-empty"><span aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h14v18l-7-4-7 4Z"/></svg></span><strong>${q?'No hay productos que coincidan':'Aún no tienes productos en la biblioteca'}</strong><p>${q?'Prueba con otro nombre, proveedor o referencia.':'Empieza añadiendo tu primer producto a la biblioteca.'}</p></div>`;
}
function shoppingProductLibraryAdd(index){
 const current=shoppingProductCurrent();if(!current||!Number.isInteger(index)||!document.getElementById('shopping-library-results'))return false;
 const source=state.library?.[index];if(!source||current.ctx.libraryOptions?.get(index)!==source)return false;const {ctx,r}=current,item=ModernoSpec.fromProduct(source);let target=shoppingRoomLabelTarget(r,ctx.label);
 if(target<0){r.sections.push({id:crypto.randomUUID(),name:ctx.label||'General',items:[]});target=r.sections.length-1;}
 r.sections[target].items.push(item);shoppingProductContext=null;closeModal();render();toast('Producto añadido desde la biblioteca');return true;
}
function shoppingRoomLabelEditor(si,ii){
 const {r}=getRoom(),E=ModernoDaily.escape,label=ii>=0?shoppingRoomLabel(r.sections[si]):state.rf?.label?.startsWith('label:')?state.rf.label.slice(6):'';
 return `<label for="itLabel">Etiqueta (opcional)</label><input id="itLabel" list="shopping-label-options" placeholder="Sin etiqueta" value="${E(label)}" ${_accessRole==='colaborador'?'readonly':''}><datalist id="shopping-label-options">${shoppingRoomLabels(r).map(name=>`<option value="${E(name)}"></option>`).join('')}</datalist>`;
}
function shoppingRoomLabelTarget(room,label){const key=shoppingLabelKey(label)||'general';return (room.sections||[]).findIndex(section=>(shoppingLabelKey(shoppingRoomLabel(section))||'general')===key);}
function shoppingRoomReorderAllowed(si,toSi){
 if(shoppingRoomSort!=='manual'){toast('Elige Orden manual para mover productos.');return false;}
 const {r}=getRoom();if(shoppingLabelKey(shoppingRoomLabel(r.sections[si]))===shoppingLabelKey(shoppingRoomLabel(r.sections[toSi])))return true;
 toast('Para cambiar la etiqueta, abre la ficha del producto.');return false;
}
function shoppingRoomDropEnd(event){
 event.preventDefault();if(!dragIt)return;const {r}=getRoom(),source=dragIt.si;dropItemRow(event,source,r.sections[source].items.length);
}
function shoppingRoomToolIcon(name){
 const paths={sort:'<path d="M8 4v16m-4-4 4 4 4-4M14 4h7M14 9h5M14 14h3"/>',back:'<path d="m12 5-7 7 7 7M5 12h14"/>',filter:'<path d="M4 4h16l-6 7v8l-4 2V11Z"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',rows:'<rect x="3" y="4" width="4" height="6" rx="1"/><rect x="3" y="14" width="4" height="6" rx="1"/><path d="M11 5h10M11 9h7M11 15h10M11 19h7"/>',cards:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'};
 return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
}
/* Presentation preference only; no product or project record is changed. */
var shoppingRoomViewMode='cards';
function shoppingRoomViewToggle(){
 if(state.view!=='estancia'||document.querySelector('#overlay.open,dialog[open]'))return;
 shoppingRoomViewMode=shoppingRoomViewMode==='rows'?'cards':'rows';render();document.getElementById('shopping-view-toggle')?.focus();
}
/* Sort copies of the display rows; keep source section/item indices for actions. */
var shoppingRoomSort='manual';
const shoppingSortOptions=[['manual','Orden manual'],['date-desc','Más recientes primero'],['date-asc','Más antiguos primero'],['price-asc','Precio: menor a mayor'],['price-desc','Precio: mayor a menor']];
function shoppingProductAddedTime(item){
 for(const value of [item.addedAt,item.createdAt])if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)){const time=Date.parse(value);if(Number.isFinite(time))return time;}
 return null;
}
function shoppingRoomSortedRows(room,order=shoppingRoomSort){
 const rows=shoppingRoomRows(room);if(order==='manual'||!shoppingSortOptions.some(([key])=>key===order))return rows;
 const date=order.startsWith('date-'),direction=order.endsWith('desc')?-1:1;
 const value=item=>date?shoppingProductAddedTime(item):(item.price==null||String(item.price).trim()===''||!['number','string'].includes(typeof item.price)||!Number.isFinite(Number(item.price))?null:Number(item.price));
 return rows.map((row,index)=>({row,index,value:value(row.it)})).sort((a,b)=>a.value===null?(b.value===null?a.index-b.index:1):b.value===null?-1:direction*(a.value-b.value)||a.index-b.index).map(entry=>entry.row);
}
function shoppingRoomSortSet(order){
 if(state.view!=='estancia'||document.querySelector('#overlay.open,dialog[open]')||!shoppingSortOptions.some(([key])=>key===order))return;
 shoppingRoomSort=order;render();document.getElementById('shopping-sort-toggle')?.focus();
}
function shoppingRoomSortClose(focus){const control=document.querySelector('.shopping-sort-control');if(control){control.open=false;if(focus)control.querySelector('summary')?.focus();}}
function shoppingRoomSortKey(event){
 const control=event.target.closest?.('.shopping-sort-control');if(!control)return;
 if(event.key==='Escape'){event.preventDefault();shoppingRoomSortClose(true);return;}
 if(event.key==='Tab'){shoppingRoomSortClose(false);return;}
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
 event.preventDefault();const items=[...control.querySelectorAll('[role=menuitemradio]')],index=items.indexOf(document.activeElement);
 if(!control.open){control.open=true;(event.key==='ArrowUp'||event.key==='End'?items.at(-1):items[0])?.focus();return;}
 const next=event.key==='Home'?0:event.key==='End'?items.length-1:index<0?(event.key==='ArrowUp'?items.length-1:0):(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();
}
function shoppingRoomSortHtml(){
 return `<details class="shopping-sort-control" ontoggle="this.querySelector('summary').setAttribute('aria-expanded',String(this.open))" onkeydown="shoppingRoomSortKey(event)"><summary id="shopping-sort-toggle" role="button" class="shopping-tool-button ${shoppingRoomSort!=='manual'?'has-sort':''}" title="Ordenar productos" aria-label="Ordenar productos" aria-haspopup="menu" aria-expanded="false" aria-controls="shopping-sort-menu">${shoppingRoomToolIcon('sort')}</summary><div id="shopping-sort-menu" class="shopping-sort-menu" role="menu" aria-label="Orden de productos"><strong>Ordenar productos</strong>${shoppingSortOptions.map(([key,label])=>`<button type="button" role="menuitemradio" aria-checked="${shoppingRoomSort===key}" onclick="shoppingRoomSortSet('${key}')"><span>${label}</span><span class="shopping-sort-check" aria-hidden="true">${shoppingRoomSort===key?'✓':''}</span></button>`).join('')}</div></details>`;
}
function shoppingProductRowLink(item,iconOnly=false){
 try{const url=new URL(item.url);if(!['https:','http:'].includes(url.protocol))return '';const E=ModernoDaily.escape;if(iconOnly)return `<a class="shopping-product-quick-link" href="${E(url.href)}" target="_blank" rel="noopener noreferrer" draggable="false" aria-label="Abrir web de ${E(item.name||'producto')} (nueva pestaña)" title="Abrir web del producto" onclick="event.stopPropagation()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></a>`;return `<a class="shopping-product-link" href="${E(url.href)}" target="_blank" rel="noopener noreferrer" title="${E(url.href)}"><span>${E(url.hostname.replace(/^www\./,'')+url.pathname)}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg></a>`;}catch{return '';}
}
function shoppingProductRowDetails(item){
 const E=ModernoDaily.escape,amount=value=>value==null||value===''?'Por confirmar':fmt(value),unit=({ud:'ud',m2:'m²',m3:'m³'})[item.unit]||item.unit||'ud';
 const fields=[['Dimensiones',item.dims],['Color',item.color],['Plazo de entrega',item.plazo],['Precio unitario',amount(item.price)],['Coste profesional',amount(item.cost)],['Material',item.material],['Proveedor',item.supplier],['Referencia / SKU',item.sku],['Cantidad',String(item.qty??1)+' '+unit],['Precio total',amount(item.price==null||item.price===''?null:item.price*(item.qty??1))]];
 return `<dl class="shopping-product-details">${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${E(value||'—')}</dd></div>`).join('')}<div class="shopping-product-note"><dt>Nota interna</dt><dd>${E(item.note||'—')}</dd></div></dl>`;
}
function shoppingRoomTools(room){
 const E=ModernoDaily.escape,rf=state.rf||{},items=room.sections.flatMap(s=>s.items);
 const scope=String(state.currentProject)+':'+String(room.id);
 if(shoppingRoomSearchState.scope!==scope)shoppingRoomSearchState={scope,open:Boolean(state.roomSearch)};
 const options=(values,current)=>'<option value="">Todos</option>'+values.map(v=>`<option value="${E(v)}" ${v===current?'selected':''}>${E(v)}</option>`).join('');
 const fields=[['label','Etiqueta',rf.label],['supplier','Proveedor',rf.supplier],['min','Desde',rf.min],['max','Hasta',rf.max]].filter(([, ,value])=>value!==''&&value!=null);
 const open=shoppingRoomSearchState.open;
 return `<div class="dl-bar shopping-room-tools">
  <details class="shopping-filter-control" ontoggle="this.querySelector('summary').setAttribute('aria-expanded',String(this.open))">
   <summary role="button" class="shopping-tool-button ${fields.length?'has-filters':''}" title="Filtrar productos" aria-label="Filtrar productos" aria-controls="shopping-filter-panel" aria-expanded="false">${shoppingRoomToolIcon('filter')}${fields.length?'<span class="shopping-filter-dot" aria-hidden="true"></span>':''}</summary>
   <form id="shopping-filter-panel" class="shopping-filter-panel" aria-label="Filtros de productos" onsubmit="event.preventDefault();shoppingRoomFilterApply(this)">
    <strong>Filtrar productos</strong>
    <label>Etiqueta<select name="label" aria-label="Etiqueta"><option value="">Todas</option><option value="none" ${rf.label==='none'?'selected':''}>Sin etiqueta</option>${shoppingRoomLabels(room).map(name=>`<option value="label:${E(name)}" ${shoppingLabelKey(rf.label)===shoppingLabelKey('label:'+name)?'selected':''}>${E(name)}</option>`).join('')}</select></label>
    <label>Proveedor<select name="supplier" aria-label="Proveedor">${options([...new Set(items.map(i=>i.supplier).filter(Boolean))],rf.supplier)}</select></label>
    <fieldset><legend>Precio (${E(projectCurrencySymbol())})</legend><div class="shopping-filter-range"><label>Desde<input name="min" type="number" step="any" value="${E(rf.min||'')}" placeholder="Desde"></label><label>Hasta<input name="max" type="number" step="any" value="${E(rf.max||'')}" placeholder="Hasta"></label></div></fieldset>
    <div class="shopping-filter-actions"><button type="button" onclick="shoppingRoomFilterClear()">Restablecer</button><button type="button" onclick="shoppingRoomFilterClose(true)">Cancelar</button><button type="submit">Aplicar</button></div>
   </form>
  </details>
  <button type="button" id="shopping-view-toggle" class="shopping-tool-button" title="${shoppingRoomViewMode==='rows'?'Ver como tarjetas':'Ver como filas'}" aria-label="Vista en filas" aria-pressed="${shoppingRoomViewMode==='rows'}" onclick="shoppingRoomViewToggle()">${shoppingRoomToolIcon(shoppingRoomViewMode==='rows'?'cards':'rows')}</button>
  ${shoppingRoomSortHtml()}
  <div class="shopping-search-group">
   <button type="button" id="shopping-search-toggle" class="shopping-tool-button" title="Buscar producto" aria-label="Buscar producto" aria-expanded="${open}" aria-controls="shopping-product-search" onclick="shoppingRoomSearchToggle()">${shoppingRoomToolIcon('search')}</button>
   <div id="shopping-product-search" class="shopping-search-collapse" data-open="${open}" ${open?'':'inert'}><div class="shopping-search-inner"><input id="rsearch" type="search" aria-label="Buscar producto por nombre, SKU o proveedor" placeholder="Buscar producto" value="${E(state.roomSearch||'')}" oninput="shoppingRoomSearchInput(this)" onkeydown="if(event.key==='Escape'){event.preventDefault();shoppingRoomSearchToggle(false)}"></div></div>
  </div>
  <span class="shopping-add-toolbar"><button type="button" class="shopping-add-top" aria-label="Añadir producto a esta lista" onclick="shoppingRoomAddProduct()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Añadir producto</button></span>
 </div>${fields.length?`<div class="shopping-filter-chips" aria-label="Filtros activos">${fields.map(([key,label,value])=>`<button type="button" aria-label="Quitar filtro ${label}" onclick="shoppingRoomFilterRemove('${key}')">${label}: ${E(key==='label'?(value==='none'?'Sin etiqueta':value.slice(6)):value)} <span aria-hidden="true">×</span></button>`).join('')}</div>`:''}`;
}
function shoppingRoomSearchToggle(force){
 const open=force??!shoppingRoomSearchState.open;shoppingRoomSearchState.open=open;
 if(!open){state.roomSearch='';render();document.getElementById('shopping-search-toggle')?.focus();return;}
 const field=document.getElementById('shopping-product-search');if(!field)return;
 field.inert=false;field.dataset.open='true';document.getElementById('shopping-search-toggle')?.setAttribute('aria-expanded','true');document.getElementById('rsearch')?.focus();
}
function shoppingRoomSearchInput(input){
 const start=input.selectionStart,end=input.selectionEnd;state.roomSearch=input.value;render();const next=document.getElementById('rsearch');if(next){next.focus();if(start!==null)next.setSelectionRange(start,end);}
}
function shoppingRoomFilterClose(focus){const control=document.querySelector('.shopping-filter-control');if(control){control.open=false;control.querySelector('form')?.reset();if(focus)control.querySelector('summary')?.focus();}}
function shoppingRoomFilterApply(form){
 state.rf=Object.fromEntries(['label','supplier','min','max'].map(key=>[key,form.elements.namedItem(key).value]));render();document.querySelector('.shopping-filter-control summary')?.focus();
}
function shoppingRoomFilterClear(){state.rf=null;render();document.querySelector('.shopping-filter-control summary')?.focus();}
function shoppingRoomFilterRemove(key){if(!['label','supplier','min','max'].includes(key))return;if(state.rf)state.rf[key]='';render();document.querySelector('.shopping-filter-control summary')?.focus();}
function shoppingRoomDelete(pid,rid,onCancel,guard){
 const project=state.projects.find(p=>p.id===pid),room=project?.rooms?.find(r=>r.id===rid);if(!room)return;
 askConfirm(`¿Eliminar «${ModernoDaily.escape(room.name)}» y todos sus productos?`,'Eliminar lista',()=>{
  if(guard&&!guard()){toast('La lista o la sesión ha cambiado. Vuelve a abrir sus ajustes.');return;}
  const current=state.projects.find(p=>p.id===pid);if(!current?.rooms?.some(r=>r.id===rid))return;
  current.rooms=current.rooms.filter(r=>r.id!==rid);
  if(state.view==='estancia'&&state.currentProject===pid&&state.currentRoom===rid){state.projTab='listas';state.roomSearch='';state.rf=null;go('proyecto',pid);}else render();
  toast('Lista eliminada');
 },onCancel);
 shoppingRoomEnhanceDelete(room.name);
}
function projectTabsHtml(current){
 const groups=[
  [['proyecto','Inicio','home']],
  [['planos','Planos','planos'],['obra','Obra','tab_obra'],['diario','Diario de obra','tab_archivos'],['calobra','Calendario de obra','calendario']],
  [['tareas','Tareas','tab_tareas'],['listas','Compras','tab_listas']],
  [['fin','Economía','finanzas'],['archivos','Documentos','tab_archivos']],
  [['ai','AI','ai'],['conversaciones','Conversaciones','tab_chat']],
  [['cliente','Portal del cliente','portal']],
  [['utilidades','Utilidades','tools']]
 ].map(group=>group.filter(([key])=>(key!=='fin'||myAccessLevel()!=='colab')&&(!['utilidades','conversaciones'].includes(key)||canView(key)))).filter(group=>group.length);
 const first=groups.flat()[0][0],selected=groups.flat().some(([key])=>key===current)?current:first;
 const special={diario:'<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h4M3 7h4M3 12h4M3 17h4"/>',planos:'<path d="M3 3h18v18H3zM3 10h8V3m0 7v5h10M8 21v-6H3"/>',ai:'<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6ZM20 3v4m-2-2h4"/>'};
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
 toast('Selecciona un cliente existente de la lista.');input.focus();return false;
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
 document.addEventListener('click',event=>{const picker=document.querySelector('.shopping-room-picker');if(picker&&!picker.contains(event.target))shoppingRoomPickerClose();});
 document.addEventListener('keydown',shoppingRoomPickerKey);
 document.addEventListener('click',event=>{const control=document.querySelector('.shopping-sort-control[open]');if(control&&!control.contains(event.target))shoppingRoomSortClose(false);});
 document.addEventListener('click',event=>{const control=document.querySelector('.shopping-filter-control[open]');if(control&&!control.contains(event.target))shoppingRoomFilterClose(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.shopping-filter-control[open]')){event.preventDefault();shoppingRoomFilterClose(true);}});
 document.addEventListener('keydown',event=>{
  const tab=event.target.closest?.('.project-tabs [role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const buttons=[...tab.parentElement.querySelectorAll('[role="tab"]')],index=buttons.indexOf(tab);
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  const id=buttons[next].id;buttons[next].click();document.getElementById(id)?.focus();
 });
}

function shoppingProductDraftSignature(){
 return JSON.stringify([[...document.querySelectorAll('.shopping-product-editor input:not([type=file]),.shopping-product-editor select,.shopping-product-editor textarea')].map(el=>[el.id,el.value]),itImg,itFiles,itLibId]);
}
function shoppingProductEditorTarget(si,ii,allowDirty=false){
 const {p,r}=getRoom(),source=itemUploadDraft?.source,it=r?.sections?.[si]?.items?.[ii];
 if(!source||source.owner!==shoppingProductIdentity()||source.p!==p||source.r!==r||source.section!==r.sections[si]||source.item!==it){toast('La lista ha cambiado. Conserva tus cambios y vuelve a abrir la ficha.');return null;}
 if(!allowDirty&&itemUploadDraft.signature!==shoppingProductDraftSignature()){toast('Guarda los cambios de la ficha antes de usar esta acción.');return null;}
 if(itemUploadDraft.pending){toast('Espera a que terminen los archivos');return null;}
 return {p,r,it};
}
function shoppingProductEditorActions(si,ii){
 return `<details class="product-editor-section product-editor-fold shopping-editor-actions" aria-labelledby="shopping-editor-actions-title"><summary><h4 id="shopping-editor-actions-title">Acciones del producto</h4></summary><div class="product-editor-fold-body">
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('visibility',${si},${ii})">${getRoom().r.sections[si].items[ii].hidden?'Mostrar al cliente':'Ocultar al cliente'}</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('duplicate',${si},${ii})">Duplicar producto</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('copy',${si},${ii})">Copiar a otra lista</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('alternative',${si},${ii})">Añadir opción alternativa</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('url',${si},${ii})">Actualizar desde URL</button>
  <button type="button" class="btn btn-ghost shopping-editor-delete" onclick="shoppingProductDelete(${si},${ii})">Eliminar producto</button>
 </div></details>`;
}
function shoppingProductEditorAction(action,si,ii){
 const current=shoppingProductEditorTarget(si,ii);if(!current)return;
 if(_accessRole==='colaborador'){toast('Un administrador debe realizar esta acción');return;}
 const {p,r,it}=current;
 if(action==='url'){toast('La actualización desde URL aún no está disponible. Puedes editar los datos de la ficha.');return;}
 if(action==='copy'){copyItemModal(si,ii);return;}
 try{
  if(action==='visibility')it.hidden=!it.hidden;
  else if(action==='duplicate'||action==='alternative')ModernoSpec.editItems(p,r,si,ii,action);
  else return;
  closeModal();render();toast(action==='visibility'?(it.hidden?'Producto oculto al cliente':'Producto visible al cliente'):action==='duplicate'?'Producto duplicado':'Opción alternativa creada');
 }catch(e){toast(e.message);}
}
function shoppingProductDelete(si,ii){
 const current=shoppingProductEditorTarget(si,ii,true);if(!current)return;
 if(document.getElementById('shopping-product-delete'))return;
 const dialog=document.createElement('dialog');dialog.id='shopping-product-delete';dialog.className='shopping-product-delete-dialog';
 dialog.setAttribute('aria-labelledby','shopping-product-delete-title');dialog.setAttribute('aria-describedby','shopping-product-delete-description');
 dialog.innerHTML=`<div class="shopping-product-delete-symbol" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></div><h3 id="shopping-product-delete-title">¿Eliminar producto?</h3><p id="shopping-product-delete-description">Se eliminará «${ModernoDaily.escape(current.it.name)}» de esta lista. Los archivos de la biblioteca se conservan.</p><div class="modal-foot"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button><button type="button" class="btn btn-dark" data-confirm>Eliminar producto</button></div>`;
 const trigger=document.activeElement;dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();},{once:true});
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.querySelector('[data-confirm]').onclick=()=>{
  const latest=shoppingProductEditorTarget(si,ii,true);
  if(!latest||latest.it!==current.it||latest.r!==current.r){dialog.close();return;}
  if(delItem(si,ii)){dialog.close();closeModal();toast('Producto eliminado');}
 };
 document.body.appendChild(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
}

var shoppingAddUi=null;
function shoppingRoomAddEnhance(){
 const wrapper=document.querySelector('.shopping-add-toolbar');
 if(shoppingAddUi?.wrapper===wrapper&&wrapper?.isConnected)return;
 if(shoppingAddUi){shoppingAddUi.component?.unmount();shoppingAddUi.host.remove();shoppingAddUi=null;}
 if(!wrapper||!window.ModernoProfileComponent?.mountShoppingAdd)return;
 const fallback=wrapper.querySelector('.shopping-add-top'),host=document.createElement('span');host.style.display='none';wrapper.append(host);
 const entry={wrapper,host,component:null},owner=shoppingProductIdentity(),project=state.currentProject,room=state.currentRoom;shoppingAddUi=entry;
 const recover=()=>queueMicrotask(()=>{if(shoppingAddUi===entry){entry.component?.unmount();host.remove();fallback.hidden=false;shoppingAddUi=null;}});
 try{entry.component=ModernoProfileComponent.mountShoppingAdd(host,recover,()=>{if(shoppingAddUi!==entry||!wrapper.isConnected)return;fallback.hidden=true;host.style.display='';});
  entry.component.update({onAdd:()=>{if(owner===shoppingProductIdentity()&&project===state.currentProject&&room===state.currentRoom)shoppingRoomAddProduct();}});
 }catch(e){recover();}
}

// Only DOM rendering is paged. State, totals, search, exports and cloud saving
// always retain the complete room. Explicit button also works without observers.
var shoppingRoomWindow={scope:'',count:60};
function shoppingRoomVisibleRows(rows,scope){
 if(shoppingRoomWindow.scope!==scope)shoppingRoomWindow={scope,count:60};
 return rows.slice(0,shoppingRoomWindow.count);
}
function shoppingRoomLoadMore(){
 if(state.view!=='estancia')return;
 shoppingRoomWindow.count+=60;render();
}

/* Shopping images and scroll control; presentation only, no persisted state. */
function shoppingImageHtml(source,alt=''){
 const attrs=fileImageAttrs(source).replace(/(?:^|\s)alt="[^"]*"/g,'');
 return `<span class="shopping-image-frame is-loading" data-shopping-image aria-busy="true"><span class="shopping-image-progress" aria-hidden="true"><span class="shopping-rolling-dots"></span></span><img ${attrs} alt="${ModernoDaily.escape(alt)}" loading="lazy" decoding="async"><span class="shopping-image-unavailable" role="img" aria-label="Imagen no disponible"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg></span></span>`;
}
var ModernoShoppingFeedback=(()=>{
 function imageState(img,status){
  const frame=img.closest('[data-shopping-image]');if(!frame?.isConnected)return;
  frame.classList.toggle('is-loading',status==='loading');frame.classList.toggle('is-ready',status==='ready');frame.classList.toggle('is-unavailable',status==='failed');frame.setAttribute('aria-busy',String(status==='loading'));
 }
 function boot(){
  if(document.getElementById('shopping-scroll-up'))return;
  const button=document.createElement('button');button.id='shopping-scroll-up';button.type='button';button.className='shopping-scroll-up';button.hidden=true;button.setAttribute('aria-label','Volver arriba');button.title='Volver arriba';
  button.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v13"/></svg>';document.body.append(button);
  let queued=false,observedSync=null;
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>schedule()):null;
  const main=()=>document.querySelector('.main');
  function update(){
   queued=false;
   const active=typeof state!=='undefined'&&!!state.sessionUser&&typeof _accessLoading!=='undefined'&&!_accessLoading&&!document.body.classList.contains('portalmode')&&!!document.querySelector('#view .shopping-room-view,#view .shopping-list-header')&&!document.querySelector('.overlay.open,dialog[open]');
   button.hidden=!active||Math.max(main()?.scrollTop||0,window.scrollY||0)<=320;
   const sync=document.getElementById('syncTag');
   if(resize&&sync!==observedSync){if(observedSync)resize.unobserve(observedSync);if(sync)resize.observe(sync);observedSync=sync;}
   if(button.hidden)return;
   const r=sync?.getBoundingClientRect();
   const bottom=r&&r.height?Math.max(88,window.innerHeight-r.top+12):88;
   button.style.setProperty('--shopping-scroll-bottom',bottom+'px');
  }
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
  button.onclick=event=>{
   const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
   if(event.detail===0){const target=document.querySelector('#shopping-room-trigger,#view .shopping-list-header h2');if(target){if(target.tagName!=='BUTTON')target.tabIndex=-1;target.focus({preventScroll:true});}}
   main()?.scrollTo({top:0,behavior});if(window.scrollY)window.scrollTo({top:0,behavior});schedule();
  };
  document.addEventListener('scroll',event=>{if(event.target===main()||event.target===document||event.target===document.scrollingElement)schedule();},{capture:true,passive:true});
  document.addEventListener('click',schedule,true);document.addEventListener('focusin',schedule);document.addEventListener('keydown',schedule,true);window.addEventListener('resize',schedule,{passive:true});
  const view=document.getElementById('view');if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(document.body,{childList:true});
  update();
 }
 if(typeof window!=='undefined'&&typeof document!=='undefined')document.addEventListener('DOMContentLoaded',boot);
 return {imageState};
})();

/* Work diary uses the existing project events collection and private file resolver.
   Entries are distinct from agenda events and are never added to client files. */
let projectDiaryDraft=null;
function projectDiaryEntries(p){return (Array.isArray(p.events)?p.events:[]).filter(e=>e?.cat==='diario-obra').slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt).localeCompare(String(a.createdAt)));}
function projectDiaryAccess(){return !_accessLoading&&!state.portalAnon&&['admin','miembro','colaborador'].includes(_accessRole)&&Boolean(state.sessionUser?.mail||state.sessionUser?.id);}
function projectDiaryHtml(p){
 const E=ModernoDaily.escape,entries=projectDiaryEntries(p);
 return `<section class="project-diary"><header class="project-diary-heading"><div><h2 class="sec" style="margin-top:0">Diario de obra</h2><p>Visitas, observaciones y fotos de la obra, por fecha.</p></div><button type="button" class="btn btn-dark" onclick="projectDiaryOpen(${Number(p.id)})">${ico('mas')} Nueva visita</button></header>${entries.length?entries.map(e=>`<article class="project-diary-entry"><header><time datetime="${E(e.date)}">${E(String(e.date||'').split('-').reverse().join('/'))}</time><button type="button" class="btn btn-ghost" data-entry="${E(e.id)}" onclick="projectDiaryOpen(${Number(p.id)},this.dataset.entry)">Editar visita</button></header><p class="project-diary-notes">${E(e.txt)}</p><small>${E(e.createdBy||'Equipo')}</small><div class="project-diary-photos">${(e.files||[]).map((f,index)=>`<button type="button" data-entry="${E(e.id)}" onclick="projectDiaryPhoto(${Number(p.id)},this.dataset.entry,${index})" aria-label="Abrir foto ${index+1}"><img ${fileImageAttrs(f.data)} alt="${E(f.name)}" loading="lazy"></button>`).join('')}</div></article>`).join(''):'<div class="empty">Todavía no hay visitas registradas. Añade la primera visita con sus notas y fotos.</div>'}</section>`;
}
function projectDiaryOpen(pid,id=null){
 if(!projectDiaryAccess())return;
 const p=state.projects.find(p=>p.id===pid),entry=id?(p?.events||[]).find(e=>e.id===id&&e.cat==='diario-obra'):null;if(!p||id&&!entry)return;
 const E=ModernoDaily.escape,now=new Date(),date=entry?.date||[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 projectDiaryDraft={pid,id,identity:fileViewIdentity(),base:entry?JSON.stringify(entry):null,files:structuredClone(entry?.files||[]),busy:false};
 modal(`<h3>${id?'Editar visita':'Nueva visita'}</h3><form id="project-diary-form" onsubmit="event.preventDefault();projectDiarySave(this)"><label class="field">Fecha de la visita<input name="date" type="date" required value="${E(date)}"></label><label class="field">Notas<textarea name="notes" required maxlength="20000" rows="7" placeholder="Qué se ha revisado, incidencias y próximos pasos">${E(entry?.txt||'')}</textarea></label><label class="field">Fotos<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple><small>Hasta 6 fotos por visita · 8 MB por foto.</small></label><p>${projectDiaryDraft.files.length} foto(s) guardada(s). Las nuevas se añadirán a esta visita.</p><p id="project-diary-error" role="alert"></p><div class="btn-row"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-dark">Guardar visita</button></div></form>`);
}
async function projectDiarySave(form){
 const draft=projectDiaryDraft;if(!draft||draft.busy||!projectDiaryAccess())return false;
 const p=state.projects.find(p=>p.id===draft.pid),files=Array.from(form.elements.photos.files||[]),date=form.elements.date.value,txt=form.elements.notes.value.trim();
 const report=text=>{const el=form.querySelector('[role=alert]');if(el)el.textContent=text;};
 if(!p||draft.identity!==fileViewIdentity())return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!txt){report('Indica la fecha y las notas de la visita.');return false;}
 if(draft.files.length+files.length>6||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)){report('Elige hasta 6 imágenes JPG, PNG o WebP, de un máximo de 8 MB cada una.');return false;}
 const current=()=>state.projects.find(x=>x.id===draft.pid);
 const valid=()=>projectDiaryDraft===draft&&draft.identity===fileViewIdentity()&&projectDiaryAccess()&&current()===p&&form.isConnected;
 draft.busy=true;form.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);report('Preparando visita…');
 try{
   for(const file of files){
     const data=await fileUp(file);if(!valid())throw Error('La sesión o el proyecto han cambiado.');
     if(!data||(sb&&/^data:/.test(data)))throw Error('No se pudo subir la foto a la nube. Conserva esta ventana y vuelve a intentarlo.');
     draft.files.push({id:crypto.randomUUID(),name:file.name,type:file.type,data});
   }
   if(!valid())throw Error('La sesión o el proyecto han cambiado.');
   const old=draft.id?(p.events||[]).find(e=>e.id===draft.id):null;
   if(draft.id&&JSON.stringify(old)!==draft.base)throw Error('Otra persona ha cambiado esta visita. Copia tus notas y vuelve a abrirla antes de guardar.');
   const entry={...(old||{}),id:draft.id||'diario-'+crypto.randomUUID(),cat:'diario-obra',date,txt,files:draft.files,createdBy:old?.createdBy||state.sessionUser.name||'Equipo',createdAt:old?.createdAt||new Date().toISOString()};
   p.events=Array.isArray(p.events)?p.events:[];if(old)p.events[p.events.indexOf(old)]=entry;else p.events.push(entry);
   persistSoon();projectDiaryDraft=null;closeModal();render();toast('Visita preparada; consulta el indicador de guardado.');return true;
 }catch(error){report(error.message);return false;}
 finally{draft.busy=false;if(form.isConnected){form.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false);if(draft.files.length)form.elements.photos.value='';}}
}
async function projectDiaryPhoto(pid,id,index){
 if(!projectDiaryAccess())return;
 const identity=fileViewIdentity(),p=state.projects.find(p=>p.id===pid),entry=(p?.events||[]).find(e=>e.id===id&&e.cat==='diario-obra'),file=entry?.files?.[index];if(!file)return;
 const source=await fileResolveForView(file);if(!source||identity!==fileViewIdentity()||!projectDiaryAccess())return;
 const current=state.projects.find(p=>p.id===pid)?.events?.find(e=>e.id===id&&e.cat==='diario-obra')?.files?.[index];if(current?.data!==file.data)return;
 modal(`<h3>Foto de la visita</h3><img ${fileImageAttrs(file.data)} alt="${ModernoDaily.escape(file.name)}" style="display:block;width:100%;max-height:70vh;object-fit:contain"><div class="btn-row"><button class="btn btn-dark" onclick="closeModal()">Cerrar</button></div>`,true);
}

/* Data editor: original Sheet, existing cz validation and save implementation. */
var ModernoProjectEdit=(()=>{
 let entry=null;
 const ids={name:'czName',status:'czStatus',client:'czClient',addr:'czAddr',tags:'czTags',street:'czStreet',number:'czNumber',address2:'czAddress2',city:'czCity',province:'czProvince',cp:'czCp',country:'czCountry',placeId:'czPlaceId'};
 const identity=()=>JSON.stringify([typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID,state.sessionUser?.id,state.sessionUser?.mail,_accessRole]);
 const allowed=()=>!_accessLoading&&['admin','colaborador','miembro'].includes(_accessRole)&&canView('proyecto');
 const current=()=>entry&&entry.owner===identity()&&entry.draft===cz&&allowed()&&state.projects.some(p=>String(p.id)===String(entry.id));
 function cleanup(){const old=entry;entry=null;if(old){old.component?.unmount();old.host?.remove();}document.getElementById('overlay')?.classList.remove('new-project-enhanced-overlay','new-project-native-overlay');const box=document.getElementById('modalBox');box?.classList.remove('new-project-enhanced','new-project-native');box?.removeAttribute('aria-hidden');}
 function change(key,value){if(!current()||!Object.hasOwn(ids,key))return;value=String(value);if(key!=='client')cz[key]=value;if(['street','number','address2','city','province','cp','country','placeId'].includes(key)){cz.addressChanged=true;if(key!=='placeId')cz.placeId='';cz.addr=ModernoNewProject.formatAddress(cz);}const input=document.getElementById(ids[key]);if(input&&input.value!==value)input.value=value;}
 function save(){if(!current()){toast('La sesión ha cambiado. Vuelve a abrir Editar proyecto.');return;}if(!cz.name.trim()){toast('Escribe el nombre del proyecto.');return;}if(!projectClientValidate()){entry.host?.shadowRoot?.querySelector('#ep-client')?.focus();return;}saveCustomize(entry.id);}
 function open(id,saved){
  if(!allowed())return;const p=state.projects.find(p=>p.id===id);if(!p)return;
  cz={mode:'data',folderPhotos:[...folderPhotoSources(p)],busy:false,color:p.color||null,icon:p.icon||'',tags:(p.tags||[]).join(', '),client:p.client||'',name:p.name||'',status:p.status||'En progreso',addr:p.addr||'',...ModernoNewProject.addressFields(p),addressChanged:false,...saved};cz.mode='data';
  const E=ModernoDaily.escape,clients=[...new Set(state.clients.filter(c=>c.type==='Cliente').map(c=>c.name))];
  const field=(key,label,extra='')=>`<div class="new-project-field"><label for="${ids[key]}">${E(label)}</label><input id="${ids[key]}" name="${key}" autocomplete="off" value="${E(cz[key])}" ${extra}></div>`;
  modal(`<form id="project-edit-native-form" onsubmit="event.preventDefault();ModernoProjectEdit.save()"><header class="edit-project-native-header"><h3 class="sr-only">Editar proyecto</h3><button type="button" class="new-project-close" aria-label="Cerrar edición" onclick="closeModal()">×</button></header><div class="new-project-native-body"><div class="new-project-field"><label for="ep-native-code">PR</label><input id="ep-native-code" value="${E(p.num||'')}" readonly></div>${field('name','Nombre del proyecto','required maxlength="200"')}<div class="new-project-field"><label for="czStatus">Estado</label><select id="czStatus" name="status">${['En progreso','En revisión','Entregado','Archivado'].map(s=>`<option ${cz.status===s?'selected':''}>${E(s)}</option>`).join('')}</select></div>${field('client','Cliente','list="ep-native-clients" placeholder="Buscar cliente"')}<datalist id="ep-native-clients">${clients.map(c=>`<option value="${E(c)}"></option>`).join('')}</datalist><fieldset><legend>Dirección del proyecto</legend>${field('street','Calle')}<div class="new-project-two-col">${field('number','Número')}${field('city','Ciudad')}</div>${field('address2','Dirección 2','placeholder="Portal, piso, puerta…"')}<div class="new-project-two-col">${field('province','Provincia')}${field('cp','Código postal')}</div>${field('country','País')}</fieldset>${field('tags','Etiquetas')}</div><footer class="modal-foot"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn projects-new">Guardar cambios</button></footer></form>`);
  const box=document.getElementById('modalBox'),overlay=document.getElementById('overlay');box.classList.add('new-project-native');overlay.classList.add('new-project-native-overlay');
  const form=document.getElementById('project-edit-native-form');for(const event of ['input','change'])form.addEventListener(event,e=>{if(e.target?.name)change(e.target.name,e.target.value);});
  const active={id,owner:identity(),draft:cz,component:null,host:null};entry=active;
  if(!window.ModernoProfileComponent?.mountEditProject){document.getElementById('czName')?.focus();return;}
  const host=document.createElement('span');host.className='new-project-sheet-host';document.body.append(host);active.host=host;
  const recover=()=>queueMicrotask(()=>{if(entry!==active)return;active.component?.unmount();active.component=null;active.host?.remove();active.host=null;box.classList.remove('new-project-enhanced');box.removeAttribute('aria-hidden');box.setAttribute('aria-modal','true');overlay.classList.remove('new-project-enhanced-overlay');document.getElementById('czName')?.focus();});
  const ready=()=>{if(entry!==active||!active.component)return;box.classList.add('new-project-enhanced');box.removeAttribute('aria-modal');box.setAttribute('aria-hidden','true');overlay.classList.add('new-project-enhanced-overlay');active.component.update({draft:{...cz},code:p.num||'',clients,onChange:(key,value)=>{if(entry===active)change(key,value);},onSave:()=>queueMicrotask(()=>{if(entry===active)save();}),onCancel:()=>queueMicrotask(()=>{if(entry===active)closeModal();})});};
  try{active.component=ModernoProfileComponent.mountEditProject(host,recover,ready);}catch{recover();}
 }
 return {open,cleanup,change,save};
})();

/* Task phases use compact dialog actions and a reversible confirmation step. */
var ModernoTaskPhaseEditor=(()=>{
 let entry=null;
 const E=value=>ModernoDaily.escape(String(value??''));
 const identity=()=>JSON.stringify([ESTUDIO_ID,state.sessionUser?.id,state.sessionUser?.mail,_accessRole]);
 const allowed=p=>!_accessLoading&&['admin','colaborador','miembro'].includes(_accessRole)&&canView('proyecto')&&byBrand([p]).includes(p);
 function valid(ctx){return entry===ctx&&identity()===ctx.owner&&state.projects.find(p=>p.id===ctx.pid)===ctx.project&&allowed(ctx.project)&&Array.isArray(ctx.project.phases)&&(ctx.phase===null||(ctx.project.phases.includes(ctx.phase)&&(typeof ctx.phase==='object'||ctx.project.phases[ctx.index]===ctx.phase)&&JSON.stringify(ctx.phase)===ctx.snapshot));}
 function stale(){toast('La fase o la sesión ha cambiado. Vuelve a abrir Editar fase.');}
 function read(){const form=document.getElementById('task-phase-form');if(!form||!document.getElementById('overlay')?.classList.contains('open')||!document.getElementById('modalBox')?.classList.contains('task-phase-dialog'))return null;return {name:document.getElementById('phN').value,color:form.querySelector('[name=phaseColor]:checked')?.value||'#E2E2E0',start:document.getElementById('phS').value,end:document.getElementById('phE').value};}
 function show(ctx,value){
  if(!valid(ctx)){stale();return;}
  const palette=[['#fdf880','Amarillo'],['#CBBBF2','Lila'],['#F2C4A0','Melocotón'],['#BFD9C8','Verde'],['#F6DBD7','Rosa'],['#D3DDC8','Oliva'],['#E2E2E0','Gris']];
  const color=/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value.color||'')?value.color:'#E2E2E0';
  if(!palette.some(([c])=>c.toLowerCase()===color.toLowerCase()))palette.push([color,'Color actual']);
  modal(`<form id="task-phase-form" onsubmit="event.preventDefault();ModernoTaskPhaseEditor.save()"><header class="task-phase-header"><h3>${ctx.phase===null?'Nueva fase':'Editar fase'} <span>· ${E(ctx.project.num||'')}</span></h3><button type="button" class="task-phase-close" aria-label="Cerrar edición de fase" onclick="closeModal()">${ico('cerrar')||'×'}</button></header>
   <div class="task-phase-body"><label for="phN">Nombre</label><input id="phN" name="name" value="${E(value.name)}" required maxlength="200" autocomplete="off" placeholder="Ej: Diseño, Obra, Licencias…">
   <fieldset class="task-phase-colors"><legend>Color</legend><div>${palette.map(([c,label],i)=>`<label class="task-phase-color" title="${E(label)}"><input class="sr-only" type="radio" name="phaseColor" value="${E(c)}" aria-label="${E(label)}" ${c.toLowerCase()===color.toLowerCase()?'checked':''}><span style="--phase-color:${E(c)}" aria-hidden="true"></span></label>`).join('')}</div></fieldset>
   <div class="task-phase-dates"><div><label for="phS">Inicio</label><input id="phS" type="date" data-range-end="phE" value="${E(value.start||'')}"></div><div><label for="phE">Fin</label><input id="phE" type="date" data-after="phS" min="${E(value.start||'')}" value="${E(value.end||'')}"></div></div><p id="task-phase-error" role="alert"></p></div>
   <footer class="modal-foot">${ctx.phase!==null?'<button type="button" class="btn task-phase-danger" onclick="ModernoTaskPhaseEditor.remove()">Eliminar fase</button>':''}<button type="button" class="btn task-phase-cancel" onclick="closeModal()">Cancelar</button><button type="submit" class="btn task-phase-primary">Guardar</button></footer></form>`);
  document.getElementById('modalBox').classList.add('task-phase-dialog');document.getElementById('phN').focus();
 }
 function open(pid,index){
  const project=state.projects.find(p=>p.id===pid);if(!project||!allowed(project))return;
  ensurePhases(project);const phase=index>=0?project.phases[index]:null;if(index>=0&&!phase)return;
  const value=phase===null?{name:'',color:'#E2E2E0',start:new Date().toISOString().slice(0,10),end:new Date(Date.now()+30*864e5).toISOString().slice(0,10)}:{name:typeof phase==='string'?phase:phase.name||phase.n||'',color:phase.color,start:phase.start,end:phase.end};
  const ctx={pid,index,project,phase,owner:identity(),snapshot:JSON.stringify(phase)};entry=ctx;show(ctx,value);
 }
 function save(){
  const ctx=entry,value=read();if(!ctx||!value)return;if(!valid(ctx)){stale();return;}
  const name=value.name.trim();let error='';
  if(!name||name.length>200)error='Escribe un nombre de hasta 200 caracteres.';
  else if([value.start,value.end].some(d=>d&&!ModernoProjectInsights.validDate(d)))error='Revisa las fechas de la fase.';
  else if(value.start&&value.end&&value.end<value.start)error='La fecha de fin debe ser igual o posterior al inicio.';
  if(error){document.getElementById('task-phase-error').textContent=error;return;}
  const next={...(ctx.phase&&typeof ctx.phase==='object'?ctx.phase:{}),...value,name};
  if(ctx.phase===null)ctx.project.phases.push(next);else ctx.project.phases[typeof ctx.phase==='object'?ctx.project.phases.indexOf(ctx.phase):ctx.index]=next;
  entry=null;persistSoon();closeModal();render();
 }
 function remove(pid,index){
  const ctx=entry,value=read();if(!ctx||!value||ctx.phase===null)return;
  if((pid!=null&&pid!==ctx.pid)||(index!=null&&index!==ctx.index)||!valid(ctx)){stale();return;}
  const name=typeof ctx.phase==='string'?ctx.phase:ctx.phase.name||ctx.phase.n||'Fase';
  askConfirm(`¿Quieres eliminar la fase «${E(name)}» de ${E(ctx.project.num||'este proyecto')}? Las tareas del proyecto se conservarán.`, 'Eliminar fase',()=>{
   if(!valid(ctx)){stale();return;}const at=typeof ctx.phase==='object'?ctx.project.phases.indexOf(ctx.phase):ctx.index;
   ctx.project.phases.splice(at,1);const current=ctx.project.curPhase||0;ctx.project.curPhase=Math.max(0,Math.min(current-(at<current?1:0),ctx.project.phases.length-1));
   entry=null;persistSoon();render();toast('Fase eliminada');
  },()=>show(ctx,value));
  const box=document.getElementById('modalBox');box.classList.add('task-phase-confirm');box.querySelector('h3').textContent='Eliminar fase';box.setAttribute('aria-label','Eliminar fase');box.querySelector('.modal-foot button')?.focus();
 }
 return {open,save,remove};
})();

function projectSettingsHtml(p){return `<div class="project-options-control"><details class="project-options"><summary class="btn btn-ghost project-options-trigger" aria-label="Opciones del proyecto" title="Opciones del proyecto">${projectMoreIcon()}</summary><div class="project-options-body">
      <button class="btn btn-ghost" onclick="customizeModal(${p.id})">${ico('editar')} Editar datos</button>
      <button class="btn btn-ghost" onclick="customizeModal(${p.id},'appearance')">${ico('personalizar')} Personalizar proyecto</button>
      <button id="project-client-access" class="btn btn-ghost" onclick="projTab('cliente')">${ico('portal')} Portal del cliente</button>
      <button class="btn btn-ghost" onclick="duplicateProject(${p.id})">${ico('dup_proyecto')} Duplicar proyecto</button>
      ${_accessRole==='colaborador'?'':`<button class="btn btn-ghost project-delete-action" onclick="deleteProject(${p.id})">${ico('eliminar')} Eliminar proyecto</button>`}
    </div></details></div>`;}

/* Native product accordions keep their contents mounted while opening and closing. */
var ModernoProductFolds=(()=>{
 const pending=new WeakMap();
 if(typeof document==='undefined'||!document.addEventListener)return {};
 document.addEventListener('click',event=>{
  const summary=event.target.closest?.('.shopping-product-editor .product-editor-fold>summary');if(!summary)return;
  event.preventDefault();const details=summary.parentElement,previous=pending.get(details),opening=previous?!previous.opening:!details.open,start=details.getBoundingClientRect().height;
  previous?.animation.cancel();pending.delete(details);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!details.animate){details.open=opening;summary.setAttribute('aria-expanded',String(opening));return;}
  details.open=opening;const end=details.getBoundingClientRect().height;details.open=true;
  const animation=details.animate([{height:start+'px',overflow:'hidden'},{height:end+'px',overflow:'hidden'}],{duration:200,easing:'ease-in-out'}),record={animation,opening};
  pending.set(details,record);summary.setAttribute('aria-expanded',String(opening));
  animation.finished.then(()=>{if(pending.get(details)!==record)return;pending.delete(details);details.open=opening;}).catch(()=>{});
 });
 return {};
})();

/* Shopping list settings are a metadata draft; existing transfer and delete flows remain explicit. */
var ModernoRoomSettings=(()=>{
 let entry=null;
 const E=v=>ModernoDaily.escape(String(v??''));
 const allowed=p=>!_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&canView('proyecto')&&byBrand([p]).includes(p);
 function valid(ctx){return entry===ctx&&shoppingProductIdentity()===ctx.owner&&allowed(ctx.p)&&state.currentProject===ctx.p.id&&state.projects.filter(p=>p.id===ctx.p.id).length===1&&state.projects.includes(ctx.p)&&ctx.p.rooms.filter(r=>r.id===ctx.r.id).length===1&&ctx.p.rooms.includes(ctx.r)&&JSON.stringify([ctx.r.name,ctx.r.icon])===ctx.snapshot;}
 function stale(){toast('La lista o la sesión ha cambiado. Vuelve a abrir sus ajustes.');}
 function read(){const ctx=entry,form=document.getElementById('shopping-list-settings-form');if(!ctx||ctx.form!==form||!form?.isConnected||!document.getElementById('overlay').classList.contains('open'))return null;return {name:document.getElementById('rmName').value,icon:ctx.icon};}
 function show(ctx,draft){
  if(!valid(ctx)){stale();return;}ctx.icon=draft.icon;
  modal(`<form id="shopping-list-settings-form" class="shopping-list-settings" onsubmit="event.preventDefault();ModernoRoomSettings.save()"><header><h3>Ajustes de la lista</h3><button type="button" class="product-editor-close" aria-label="Cerrar ajustes de la lista" onclick="closeModal()">×</button></header>
  <div class="shopping-list-settings-body"><label for="rmName">Nombre</label><input id="rmName" value="${E(draft.name)}" required maxlength="200" autocomplete="off">
   <div class="shopping-list-icon-picker"><button type="button" id="rmIconToggle" class="btn btn-ghost" aria-expanded="false" aria-controls="rmIcons" onclick="ModernoRoomSettings.toggleIcons()"><span id="rmIconPreview" aria-hidden="true">${rico(draft.icon)}</span>Cambiar icono</button><div id="rmIcons" hidden>${picker(draft.icon)}</div></div>
   <div class="shopping-list-settings-actions"><button type="button" class="btn btn-ghost" onclick="ModernoRoomSettings.action('export')">${ico('rm_exportar')} Exportar a otro proyecto</button><button type="button" class="btn btn-ghost" onclick="ModernoRoomSettings.action('import')">${ico('rm_importar')} Importar de otro proyecto</button><button type="button" class="btn btn-ghost" onclick="ModernoRoomSettings.action('duplicate')">${ico('copiar')} Duplicar lista</button></div>
  </div><footer><div><p>Eliminar la lista borrará todos sus productos.</p><div class="shopping-list-settings-footer"><button type="button" class="btn room-settings-delete" onclick="ModernoRoomSettings.remove()">Eliminar</button><button type="submit" class="btn room-settings-save">Guardar</button></div></div></footer></form>`);
  ctx.form=document.getElementById('shopping-list-settings-form');document.getElementById('rmName').focus();
 }
 function picker(icon){return `<div class="shopping-list-icon-grid" role="group" aria-label="Iconos de la lista">${Object.keys(RICONS).map(key=>`<button type="button" data-icon="${E(key)}" aria-label="Icono ${E(key)}" aria-pressed="${key===icon}" title="${E(key)}" onclick="ModernoRoomSettings.icon(this.dataset.icon)">${rico(key)}</button>`).join('')}</div>`;}
 function toggleIcons(){if(!read()||!valid(entry))return;const icons=document.getElementById('rmIcons'),opening=icons.hidden;icons.hidden=!opening;document.getElementById('rmIconToggle').setAttribute('aria-expanded',String(opening));}
 function open(pid,rid){const p=state.projects.find(p=>p.id===pid),r=p?.rooms?.find(r=>r.id===rid);if(!p||!r||!allowed(p))return;const ctx={p,r,owner:shoppingProductIdentity(),snapshot:JSON.stringify([r.name,r.icon]),icon:r.icon||''};entry=ctx;show(ctx,{name:r.name||'',icon:r.icon||''});}
 function icon(value){const draft=read(),ctx=entry;if(!draft||!valid(ctx)||!Object.hasOwn(RICONS,value))return;ctx.icon=value;document.getElementById('rmIconPreview').innerHTML=rico(value);document.querySelectorAll('#rmIcons [data-icon]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.icon===value)));}
 function save(){const draft=read(),ctx=entry;if(!draft)return;if(!valid(ctx)){stale();return;}const name=draft.name.trim();if(!name||name.length>200){document.getElementById('rmName').focus();return;}ctx.r.name=name;if((ctx.r.icon||'')!==draft.icon)ctx.r.icon=draft.icon;entry=null;persistSoon();closeModal();render();toast('Lista actualizada');}
 function action(kind){const draft=read(),ctx=entry;if(!draft)return;if(!valid(ctx)){stale();return;}if(draft.name!==String(ctx.r.name||'')||draft.icon!==(ctx.r.icon||'')){toast('Guarda los cambios de nombre o icono antes de usar esta acción.');return;}if(kind==='duplicate')return duplicateShoppingRoom(ctx.p.id,ctx.r.id);if(!['export','import'].includes(kind))return;closeModal();return kind==='export'?roomToProjectModal(ctx.p.id,ctx.r.id):roomFromProjectModal(ctx.p.id,ctx.r.id);}
 function remove(){const draft=read(),ctx=entry;if(!draft)return;if(!valid(ctx)){stale();return;}shoppingRoomDelete(ctx.p.id,ctx.r.id,()=>show(ctx,draft),()=>valid(ctx));}
 return {open,icon,toggleIcons,save,action,remove};
})();
