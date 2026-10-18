/* Desktop route presentation only. Labels, access and navigation use the existing sidebar/router. */
var ModernoPageBreadcrumbs=(()=>{
 'use strict';
 let enabled=true,bar=null,component=null,original=true;
 const media=window.matchMedia('(min-width:1100px)');
 const finance=['facturas','presupuestos','contabilidad','informes','prevision'];
 function clear(){component?.unmount();component=null;bar?.remove();bar=null;}
 function navigate(view){
  if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de cambiar de sección.');return;}
  if(canView(view))go(view);
 }
 function fallback(items){
  bar.replaceChildren();const nav=document.createElement('nav');nav.setAttribute('aria-label','Ruta de navegación');bar.append(nav);
  items.forEach((item,index)=>{
   if(index){const separator=document.createElement('span');separator.textContent=' › ';separator.setAttribute('aria-hidden','true');nav.append(separator);}
   const el=document.createElement(item.view?'button':'span');el.textContent=item.label;
   if(item.view){el.type='button';el.addEventListener('click',()=>navigate(item.view));}else if(index===items.length-1)el.setAttribute('aria-current','page');nav.append(el);
  });
 }
 function refresh(){
  clear();
  if(!enabled||!media.matches||!document.body.classList.contains('desktop-shell')||_accessLoading||!['admin','miembro','colaborador'].includes(_accessRole)||!canView(state.view)||['proyectos','proyecto','estancia'].includes(state.view))return;
  const source=document.querySelector('aside.sidebar .nav-item[data-view="'+state.view+'"]');if(!source)return;
  const name=state.view==='agenda'?'Agenda':source.textContent.trim();
  const items=state.view==='home'?[{label:'Inicio'}]:[{label:'Inicio',view:'home'},...(finance.includes(state.view)?[{label:'Finanzas'}]:['biblioteca','catalogo'].includes(state.view)?[{label:'Productos y servicios'}]:[]),{label:name}];
  bar=document.createElement('div');bar.id='page-route-bar';document.body.append(bar);
  if(original&&window.ModernoProfileComponent?.mountBreadcrumbs){
   const host=document.createElement('span');host.className='route-component-host';bar.append(host);
   component=ModernoProfileComponent.mountBreadcrumbs(host,()=>{original=false;queueMicrotask(safeRefresh);});component.update({items,onNavigate:navigate});
  }else fallback(items);
 }
 function safeRefresh(){try{refresh();}catch(error){clear();enabled=false;console.warn('Ruta de escritorio desactivada; se conserva la navegación original.',error);}}
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 const originalEnable=ModernoDesktopShell.setEnabled;ModernoDesktopShell.setEnabled=function(){const result=originalEnable.apply(this,arguments);safeRefresh();return result;};
 media.addEventListener('change',safeRefresh);safeRefresh();
 return {refresh:safeRefresh,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
