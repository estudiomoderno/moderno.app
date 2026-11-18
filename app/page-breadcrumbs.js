/* Route presentation only. Existing router, permissions and draft guards remain authoritative. */
var ModernoPageBreadcrumbs=(()=>{
 'use strict';
 let enabled=true,bar=null,component=null,original=true,nativeFinance=null,pendingFocus=false;
 const media=window.matchMedia('(min-width:1100px)');
 const finance=[{view:'informes',label:'Resumen'},{view:'presupuestos',label:'Presupuestos'},{view:'facturas',label:'Facturas'}];
 const financeViews=['informes','presupuestos','facturas','contabilidad','prevision'];
 const allowed=()=>finance.filter(item=>canView(item.view)&&document.querySelector('aside.sidebar .nav-item[data-view="'+item.view+'"]'));
 const financial=()=>financeViews.includes(state.view);
 function clear(){component?.unmount();component=null;bar?.remove();bar=null;}
 function navigate(view){
  if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de cambiar de sección.');return false;}
  if(canView(view)){pendingFocus=!!bar?.contains(document.activeElement);go(view);pendingFocus=false;setTimeout(safeRefresh,0);return state.view===view;}
  return false;
 }
 function search(value){state.financeSearch=String(value||'');render();setTimeout(safeRefresh,0);}
 function newQuote(){
  if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de crear un presupuesto.');return false;}
  if(draftEditing()&&draftDirty()){draftExitModal('presupuestos');return false;}
  if(state.view==='presupuestos'&&state.qView==='nuevo')return true;
  state.qView='nuevo';state.draft=null;
  if(state.view==='presupuestos')render();else go('presupuestos');setTimeout(safeRefresh,0);return state.view==='presupuestos';
 }
 async function share(){
  const data={title:'Finanzas · Moderno.app',text:'Finanzas de Moderno.app',url:location.href};
  if(navigator.share){try{await navigator.share(data);return;}catch(error){if(error?.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(data.url);toast('Enlace de Finanzas copiado');}catch{toast('No se ha podido compartir el enlace');}
 }
 function syncNative(active){
  const head=document.querySelector('#ngFin>.nav-head');if(!head)return;
  if(active&&!nativeFinance){
   const label=head.querySelector('.nav-group-label'),chevron=head.querySelector('.chev');
   nativeFinance={head,label,chevron,text:label.textContent,hidden:chevron.hidden,expanded:head.getAttribute('aria-expanded'),onclick:head.onclick};
   label.textContent='Finanzas';chevron.hidden=true;head.removeAttribute('aria-expanded');
   head.onclick=()=>{const first=allowed()[0];if(first){navigate(first.view);if(financial())document.body.classList.remove('sbopen');}};
  }else if(!active&&nativeFinance){
   const saved=nativeFinance;saved.head.onclick=saved.onclick;saved.label.textContent=saved.text;saved.chevron.hidden=saved.hidden;
   if(saved.expanded===null)saved.head.removeAttribute('aria-expanded');else saved.head.setAttribute('aria-expanded',saved.expanded);nativeFinance=null;
  }
  document.body.classList.toggle('finance-navigation',active);
 }
 function fallback(items,sections){
  bar.replaceChildren();
  if(sections){
   const toolbar=document.createElement('div');toolbar.className='finance-fallback-toolbar';
   const tabs=document.createElement('nav');tabs.className='finance-fallback';tabs.setAttribute('aria-label','Secciones de Finanzas');toolbar.append(tabs);
   sections.forEach(item=>{const b=document.createElement('button');b.type='button';b.dataset.financeView=item.view;b.textContent=item.label;if(state.view===item.view)b.setAttribute('aria-current','page');b.addEventListener('click',()=>navigate(item.view));tabs.append(b);});
   const finder=document.createElement('div');finder.className='finance-fallback-search';finder.setAttribute('role','search');finder.setAttribute('aria-label','Buscar en Finanzas');
   const label=document.createElement('button');label.type='button';label.textContent='Buscar';
   const input=document.createElement('input');input.type='search';input.value=state.financeSearch||'';input.placeholder='Presupuesto, factura o cliente';input.setAttribute('aria-label','Buscar en Finanzas');label.addEventListener('click',()=>input.focus());input.addEventListener('input',()=>search(input.value));finder.append(label,input);toolbar.append(finder);
   const create=document.createElement('button');create.type='button';create.className='finance-fallback-new';create.textContent='+ Nuevo presupuesto';create.addEventListener('click',newQuote);toolbar.append(create);
   const send=document.createElement('button');send.type='button';send.className='finance-fallback-share';send.setAttribute('aria-label','Compartir Finanzas');send.title='Compartir';send.textContent='↗';send.addEventListener('click',share);toolbar.append(send);bar.append(toolbar);return;
  }
  const nav=document.createElement('nav');nav.className='route-fallback';nav.setAttribute('aria-label','Ruta de navegación');bar.append(nav);
  items.forEach((item,index)=>{
   if(index){const separator=document.createElement('span');separator.textContent=' › ';separator.setAttribute('aria-hidden','true');nav.append(separator);}
   const el=document.createElement(item.view?'button':'span');el.textContent=item.label;
   if(item.view){el.type='button';el.addEventListener('click',()=>navigate(item.view));}else if(index===items.length-1)el.setAttribute('aria-current','page');nav.append(el);
  });
 }
 const props=(items,sections)=>({items,finance:sections,current:state.view,search:state.financeSearch||'',onNavigate:navigate,onSearch:search,onNewQuote:newQuote,onShare:share});
 function refresh(){
  const restoreFocus=pendingFocus||bar?.contains(document.activeElement);
  const active=enabled&&(!media.matches||document.body.classList.contains('desktop-shell'))&&!_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&!['ajustes','admin','presedit','portalcli','portalobra'].includes(state.view);
  syncNative(active);
  if(!active||!canView(state.view)||['home','proyectos','proyecto','estancia'].includes(state.view)){clear();return;}
  const sections=financial()?allowed():null;
  if(!sections&&(!media.matches||!document.body.classList.contains('desktop-shell'))){clear();return;}
  const source=document.querySelector('aside.sidebar .nav-item[data-view="'+state.view+'"]');if(!source){clear();return;}
  const name=state.view==='agenda'?'Agenda':source.textContent.trim();
  const items=sections?[{label:'Proyectos',view:'proyectos'},{label:'Finanzas'}]:[{label:'Proyectos',view:'proyectos'},{label:name}];
  if(sections&&bar?.classList.contains('is-finance')&&component&&original){
   if(media.matches){if(bar.parentElement!==document.body)document.body.append(bar);}else if(bar.nextElementSibling!==document.querySelector('#view'))document.querySelector('#view').before(bar);
   component.update(props(items,sections));return;
  }
  clear();
  bar=document.createElement('div');bar.id='page-route-bar';if(sections)bar.classList.add('is-finance');
  if(media.matches)document.body.append(bar);else document.querySelector('#view').before(bar);
  const focus=()=>{if(restoreFocus&&sections)bar?.querySelector('.route-component-host')?.shadowRoot?.querySelector('[data-finance-view="'+state.view+'"]')?.focus();};
  if(original&&window.ModernoProfileComponent?.mountBreadcrumbs){
   const host=document.createElement('span');host.className='route-component-host';bar.append(host);
   component=ModernoProfileComponent.mountBreadcrumbs(host,()=>{original=false;queueMicrotask(safeRefresh);},focus);component.update(props(items,sections));
  }else{fallback(items,sections);if(restoreFocus&&sections)bar.querySelector('[data-finance-view="'+state.view+'"]').focus();}
 }
 function safeRefresh(){try{refresh();}catch(error){clear();syncNative(false);enabled=false;if(document.body.classList.contains('desktop-shell'))ModernoDesktopShell.setEnabled(false);console.warn('Ruta superior desactivada; se conserva la navegación original.',error);}}
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 const originalEnable=ModernoDesktopShell.setEnabled;ModernoDesktopShell.setEnabled=function(){const result=originalEnable.apply(this,arguments);safeRefresh();return result;};
 media.addEventListener('change',safeRefresh);safeRefresh();
 return {refresh:safeRefresh,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
