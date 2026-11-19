/* Shared route and Finance toolbar presentation. Existing router, permissions and draft guards remain authoritative. */
var ModernoPageBreadcrumbs=(()=>{
 'use strict';
 let enabled=true,routeHost=null,routeMount=null,routeComponent=null,financeBar=null,financeComponent=null,originalRoute=true,originalFinance=true,nativeFinance=null,pendingFocus=false;
 const media=window.matchMedia('(min-width:1100px)');
 const finance=[
  {view:'informes',label:'Resumen'},
  {view:'facturas',label:'Ventas'},
  {view:'contabilidad',label:'Gastos'},
  {view:'presupuestos',label:'Presupuestos'},
  {view:'prevision',label:'Previsión'}
 ];
 const financeViews=['informes','presupuestos','facturas','contabilidad','prevision'];
 const labels={home:'Inicio',proyectos:'Proyectos',proyecto:'Proyecto',estancia:'Estancia',informes:'Resumen',facturas:'Ventas',presupuestos:'Presupuestos',contabilidad:'Gastos',prevision:'Previsión',workspace:'Tareas',agenda:'Agenda',mail:'Mail',calendario:'Calendario',conversaciones:'Conversaciones',biblioteca:'Productos',catalogo:'Servicios',automatizaciones:'Automatizaciones',utilidades:'Utilidades',integraciones:'Integraciones',plugins:'Plugins',plantillas:'Plantillas',tutoriales:'Tutoriales',soporte:'Soporte',ajustes:'Ajustes',admin:'Administración'};
 const allowed=()=>finance.filter(item=>canView(item.view)&&document.querySelector('aside.sidebar .nav-item[data-view="'+item.view+'"]'));
 const financial=()=>financeViews.includes(state.view);
 function routeName(){
  if(['proyecto','estancia'].includes(state.view))return state.projects?.find(project=>String(project.id)===String(state.currentProject))?.name||'Proyecto';
  return labels[state.view]||document.querySelector('aside.sidebar .nav-item[data-view="'+state.view+'"]')?.textContent.trim()||'Moderno.app';
 }
 function routeItems(){return [{label:routeName(),view:state.view}];}
 function clearRoute(){routeComponent?.unmount();routeComponent=null;routeMount?.remove();routeMount=null;routeHost=null;}
 function clearFinance(){financeComponent?.unmount();financeComponent=null;financeBar?.remove();financeBar=null;}
 function navigate(view){
  if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de cambiar de sección.');return false;}
  if(canView(view)){pendingFocus=!!financeBar?.contains(document.activeElement);go(view);pendingFocus=false;setTimeout(safeRefresh,0);return state.view===view;}
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
 function newInvoice(){
  if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de crear una factura.');return false;}
  if(draftEditing()&&draftDirty()){draftExitModal('facturas');return false;}
  if(state.view==='facturas'&&state.fView==='nuevo')return true;
  state.fView='nuevo';state.draft=null;
  if(state.view==='facturas')render();else go('facturas');setTimeout(safeRefresh,0);return state.view==='facturas';
 }
 function newExpense(){
  if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de registrar una factura.');return false;}
  entryModal('out');return true;
 }
 function createDocument(){
  if(state.view==='facturas')return newInvoice();
  if(state.view==='contabilidad')return newExpense();
  if(['informes','presupuestos','prevision'].includes(state.view))return newQuote();
  return false;
 }
 function createLabel(){
  if(state.view==='facturas')return 'Nueva factura';
  if(state.view==='contabilidad')return 'Nueva factura recibida';
  if(['informes','presupuestos','prevision'].includes(state.view))return 'Nuevo presupuesto';
  return '';
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
 function fallbackRoute(items){
  routeHost.replaceChildren();
  const nav=document.createElement('nav');nav.className='route-fallback';nav.setAttribute('aria-label','Ruta de navegación');routeHost.append(nav);
  const symbols={home:'⌂',proyectos:'▦',proyecto:'▦',estancia:'▦',informes:'▦',facturas:'▧',presupuestos:'▤',contabilidad:'▥',prevision:'◷',workspace:'☷',agenda:'♙',mail:'✉',calendario:'□',biblioteca:'▣',catalogo:'◇',plantillas:'▤',tutoriales:'▷',soporte:'○',ajustes:'⚙'};
  items.forEach((item,index)=>{
   if(index){const separator=document.createElement('span');separator.className='route-fallback-separator';separator.textContent='›';separator.setAttribute('aria-hidden','true');nav.append(separator);}
   const el=document.createElement(index===items.length-1?'span':'button');el.className=index===items.length-1?'route-fallback-current':'route-fallback-link';
   const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=symbols[item.view]||'•';el.append(icon,document.createTextNode(item.label));
   if(item.view&&el instanceof HTMLButtonElement){el.type='button';el.addEventListener('click',()=>navigate(item.view));}else if(index===items.length-1)el.setAttribute('aria-current','page');nav.append(el);
  });
 }
 function fallbackFinance(sections){
  financeBar.replaceChildren();
  const toolbar=document.createElement('div');toolbar.className='finance-fallback-toolbar';
  const tabs=document.createElement('nav');tabs.className='finance-fallback';tabs.setAttribute('aria-label','Secciones de Finanzas');toolbar.append(tabs);
  const symbols={informes:'▦',facturas:'▧',presupuestos:'▤',contabilidad:'▥',prevision:'◷'};
  sections.forEach(item=>{const b=document.createElement('button');b.type='button';b.dataset.financeView=item.view;const icon=document.createElement('span');icon.className='finance-fallback-icon';icon.setAttribute('aria-hidden','true');icon.textContent=symbols[item.view]||'•';b.append(icon,document.createTextNode(item.label));if(state.view===item.view)b.setAttribute('aria-current','page');b.addEventListener('click',()=>navigate(item.view));tabs.append(b);});
  const finder=document.createElement('div');finder.className='finance-fallback-search';finder.setAttribute('role','search');finder.setAttribute('aria-label','Buscar en Finanzas');
  const label=document.createElement('button');label.type='button';label.textContent='Buscar';
  const input=document.createElement('input');input.type='search';input.value=state.financeSearch||'';input.placeholder='Factura, presupuesto, cliente o proyecto';input.setAttribute('aria-label','Buscar en Finanzas');label.addEventListener('click',()=>input.focus());input.addEventListener('input',()=>search(input.value));finder.append(label,input);toolbar.append(finder);
  const actionLabel=createLabel();
  if(actionLabel){const create=document.createElement('button');create.type='button';create.className='finance-fallback-new';create.textContent='+ '+actionLabel;create.addEventListener('click',createDocument);toolbar.append(create);}
  const send=document.createElement('button');send.type='button';send.className='finance-fallback-share';send.setAttribute('aria-label','Compartir Finanzas');send.title='Compartir';send.textContent='↗';send.addEventListener('click',share);toolbar.append(send);financeBar.append(toolbar);
 }
 function refreshRoute(){
  const host=document.querySelector('#desktop-header .desktop-inset-breadcrumb');
  const active=enabled&&media.matches&&document.body.classList.contains('desktop-shell')&&!_accessLoading&&!['portalcli','portalobra'].includes(state.view);
  if(!active||!host){clearRoute();if(host){host.replaceChildren();host.hidden=true;host.setAttribute('aria-hidden','true');}return;}
  const items=routeItems();
  host.hidden=false;host.setAttribute('aria-hidden','false');
  if(host!==routeHost||!routeMount?.isConnected){
   clearRoute();routeHost=host;routeHost.replaceChildren();
   if(originalRoute&&window.ModernoProfileComponent?.mountBreadcrumbs){
    routeMount=document.createElement('span');routeMount.className='route-component-host';routeHost.append(routeMount);
    routeComponent=ModernoProfileComponent.mountBreadcrumbs(routeMount,()=>{originalRoute=false;clearRoute();queueMicrotask(safeRefresh);});
   }
  }
  if(routeComponent)routeComponent.update({items,onNavigate:navigate});else fallbackRoute(items);
 }
 function refreshFinance(){
  const availableSections=allowed();
  const navActive=enabled&&availableSections.length>0&&!_accessLoading&&!['portalcli','portalobra'].includes(state.view);
  const sections=navActive&&financial()&&canView(state.view)?availableSections:null;
  syncNative(navActive);
  if(!sections?.length){clearFinance();return;}
  const view=document.querySelector('#view');if(!view){clearFinance();return;}
  const restoreFocus=pendingFocus||financeBar?.contains(document.activeElement);
  if(!financeBar?.isConnected){
   clearFinance();financeBar=document.createElement('div');financeBar.id='page-route-bar';financeBar.className='is-finance';view.prepend(financeBar);
   if(originalFinance&&window.ModernoProfileComponent?.mountFinanceToolbar){
    const host=document.createElement('span');host.className='route-component-host';financeBar.append(host);
    financeComponent=ModernoProfileComponent.mountFinanceToolbar(host,()=>{originalFinance=false;clearFinance();queueMicrotask(safeRefresh);},()=>{if(restoreFocus)host.shadowRoot?.querySelector('[data-finance-view="'+state.view+'"]')?.focus();});
   }
  }else if(financeBar.parentElement!==view)view.prepend(financeBar);
  const props={finance:sections,current:state.view,search:state.financeSearch||'',actionLabel:createLabel(),onNavigate:navigate,onSearch:search,onCreate:createDocument,onShare:share};
  if(financeComponent)financeComponent.update(props);else{fallbackFinance(sections);if(restoreFocus)financeBar.querySelector('[data-finance-view="'+state.view+'"]')?.focus();}
  if(restoreFocus)queueMicrotask(()=>{const host=financeBar?.querySelector('.route-component-host');(host?.shadowRoot||financeBar)?.querySelector('[data-finance-view="'+state.view+'"]')?.focus();});
 }
 function refresh(){refreshRoute();refreshFinance();}
 function safeRefresh(){try{refresh();}catch(error){clearRoute();clearFinance();syncNative(false);enabled=false;if(document.body.classList.contains('desktop-shell'))ModernoDesktopShell.setEnabled(false);console.warn('Ruta superior desactivada; se conserva la navegación original.',error);}}
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 const originalEnable=ModernoDesktopShell.setEnabled;ModernoDesktopShell.setEnabled=function(){const result=originalEnable.apply(this,arguments);safeRefresh();return result;};
 media.addEventListener('change',safeRefresh);safeRefresh();
 return {refresh:safeRefresh,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
