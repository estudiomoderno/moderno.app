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
function shoppingProductRowLink(item){
 try{const url=new URL(item.url);if(!['https:','http:'].includes(url.protocol))return '';const E=ModernoDaily.escape;return `<a class="shopping-product-link" href="${E(url.href)}" target="_blank" rel="noopener noreferrer" title="${E(url.href)}"><span>${E(url.hostname.replace(/^www\./,'')+url.pathname)}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg></a>`;}catch{return '';}
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
 const fields=[['label','Etiqueta',rf.label],['supplier','Proveedor',rf.supplier],['color','Color',rf.color],['min','Desde',rf.min],['max','Hasta',rf.max]].filter(([, ,value])=>value!==''&&value!=null);
 const open=shoppingRoomSearchState.open;
 return `<div class="dl-bar shopping-room-tools">
  <details class="shopping-filter-control" ontoggle="this.querySelector('summary').setAttribute('aria-expanded',String(this.open))">
   <summary role="button" class="shopping-tool-button ${fields.length?'has-filters':''}" title="Filtrar productos" aria-label="Filtrar productos" aria-controls="shopping-filter-panel" aria-expanded="false">${shoppingRoomToolIcon('filter')}${fields.length?'<span class="shopping-filter-dot" aria-hidden="true"></span>':''}</summary>
   <form id="shopping-filter-panel" class="shopping-filter-panel" aria-label="Filtros de productos" onsubmit="event.preventDefault();shoppingRoomFilterApply(this)">
    <strong>Filtrar productos</strong>
    <label>Etiqueta<select name="label" aria-label="Etiqueta"><option value="">Todas</option><option value="none" ${rf.label==='none'?'selected':''}>Sin etiqueta</option>${shoppingRoomLabels(room).map(name=>`<option value="label:${E(name)}" ${shoppingLabelKey(rf.label)===shoppingLabelKey('label:'+name)?'selected':''}>${E(name)}</option>`).join('')}</select></label>
    <label>Proveedor<select name="supplier" aria-label="Proveedor">${options([...new Set(items.map(i=>i.supplier).filter(Boolean))],rf.supplier)}</select></label>
    <label>Color<select name="color" aria-label="Color">${options([...new Set(items.map(i=>i.color).filter(Boolean))],rf.color)}</select></label>
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
 state.rf=Object.fromEntries(['label','supplier','color','min','max'].map(key=>[key,form.elements.namedItem(key).value]));render();document.querySelector('.shopping-filter-control summary')?.focus();
}
function shoppingRoomFilterClear(){state.rf=null;render();document.querySelector('.shopping-filter-control summary')?.focus();}
function shoppingRoomFilterRemove(key){if(!['label','supplier','color','min','max'].includes(key))return;if(state.rf)state.rf[key]='';render();document.querySelector('.shopping-filter-control summary')?.focus();}
function shoppingRoomDelete(pid,rid){
 const project=state.projects.find(p=>p.id===pid),room=project?.rooms?.find(r=>r.id===rid);if(!room)return;
 askConfirm(`¿Eliminar «${ModernoDaily.escape(room.name)}» y todos sus productos?`,'Eliminar lista',()=>{
  const current=state.projects.find(p=>p.id===pid);if(!current?.rooms?.some(r=>r.id===rid))return;
  current.rooms=current.rooms.filter(r=>r.id!==rid);
  if(state.view==='estancia'&&state.currentProject===pid&&state.currentRoom===rid){state.projTab='listas';state.roomSearch='';state.rf=null;go('proyecto',pid);}else render();
  toast('Lista eliminada');
 });
 shoppingRoomEnhanceDelete(room.name);
}
function projectTabsHtml(current){
 const groups=[
  [['proyecto','Inicio','home']],
  [['planos','Planos','planos'],['obra','Obra','tab_obra']],
  [['tareas','Tareas','tab_tareas'],['listas','Compras','tab_listas']],
  [['fin','Economía','finanzas'],['archivos','Documentos','tab_archivos']],
  [['ai','AI','ai'],['conversaciones','Conversaciones','tab_chat']],
  [['cliente','Portal del cliente','portal']],
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
 return `<section class="product-editor-section shopping-editor-actions" aria-labelledby="shopping-editor-actions-title"><h4 id="shopping-editor-actions-title">Acciones del producto</h4>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('visibility',${si},${ii})">${getRoom().r.sections[si].items[ii].hidden?'Mostrar al cliente':'Ocultar al cliente'}</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('duplicate',${si},${ii})">Duplicar producto</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('copy',${si},${ii})">Copiar a otra lista</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('alternative',${si},${ii})">Añadir opción alternativa</button>
  <button type="button" class="btn btn-ghost" onclick="shoppingProductEditorAction('url',${si},${ii})">Actualizar desde URL</button>
  <button type="button" class="btn btn-ghost shopping-editor-delete" onclick="shoppingProductDelete(${si},${ii})">Eliminar producto</button>
 </section>`;
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
 if(_accessRole==='colaborador'){toast('Un administrador debe eliminar este producto');return;}
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
