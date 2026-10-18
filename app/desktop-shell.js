/* Presentation only. Original navigation handlers, editors and storage remain authoritative. */
var ModernoDesktopShell=(()=>{
 'use strict';
 // #49 recovery gate verified: production physical backup + separate Storage inventory.
 const ENABLED=true;
 let enabled=ENABLED,header=null,section=null,lastView=null;
 const moved=[],decorations=[],media=window.matchMedia('(min-width:1100px)');
 const $=s=>document.querySelector(s);
 const finance=['facturas','presupuestos','contabilidad','informes','prevision'];
 const navigation=['proyectos','workspace','calendario','agenda',['Finanzas',finance,'contabilidad'],'mail',['Productos y servicios',['biblioteca','catalogo'],'catalogo']];
 const originals=()=>[...document.querySelectorAll('aside.sidebar .nav-item[data-view]')];
 const original=view=>originals().find(b=>b.dataset.view===view);
 const available=view=>!_accessLoading&&canView(view)&&!!original(view);
 function icon(view){
  const source=original(view);if(!source)return null;
  const icon=source.querySelector('.ico');if(icon){
   const copy=icon.cloneNode(true);copy.setAttribute('aria-hidden','true');
   if(source.dataset.newIcon==='true'){copy.classList.add('desktop-mask');copy.style.setProperty('--desktop-icon',`url('/brand/menu-icons/${view}.svg')`);}
   return copy;
  }
  return null;
 }
 function label(node,text){const span=document.createElement('span');span.className='desktop-label';span.textContent=text;node.append(span);node.setAttribute('aria-label',text);}
 function button(view,compact=false){
  const source=original(view);if(!source)return null;
  const b=document.createElement('button');b.type='button';b.className='desktop-link'+(compact?' desktop-icon-only':'');b.dataset.desktopView=view;
  const copy=icon(view);if(copy)b.append(copy);
  const label=document.createElement('span');label.className='desktop-label';label.textContent=view==='agenda'?'Agenda':source.textContent.trim();b.append(label);
  b.setAttribute('aria-label',label.textContent);return b;
 }
 function move(node,target){
  if(!node)return;
  const marker=document.createComment('desktop-shell: original position');node.before(marker);moved.push({node,marker});target.append(node);
 }
 function closeMenus(except){header?.querySelectorAll('details[open]').forEach(d=>{if(d!==except&&!(except&&d.contains(except)))d.open=false;});}
 function action(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{closeMenus();fn();});return b;}
 function syncNavigation(){
  if(section==='finanzas'&&!finance.some(available))section=null;
  const expanded=section==='finanzas',trigger=$('#desktop-header [data-desktop-section]');
  $('#desktop-primary').hidden=expanded;$('#desktop-finance-nav').hidden=!expanded;
  trigger.hidden=!finance.some(available);trigger.setAttribute('aria-expanded',String(expanded));
  trigger.classList.toggle('is-current',finance.includes(state.view));
  $('.desktop-nav').setAttribute('aria-label',expanded?'Navegación de Finanzas':'Navegación general');
 }
 function setSection(value,focus=false){
  section=value;closeMenus();syncNavigation();
  if(focus)$('#desktop-header '+(section==='finanzas'?'.desktop-back':'[data-desktop-section]'))?.focus();
 }
 function build(){
  header=document.createElement('header');header.id='desktop-header';header.setAttribute('aria-label','Moderno.app');
  const row=document.createElement('div');row.className='desktop-row';header.append(row);
  const brand=document.createElement('button');brand.type='button';brand.className='desktop-brand';brand.dataset.desktopView='home';brand.title='Inicio';brand.setAttribute('aria-label','Inicio');row.append(brand);move($('aside.sidebar .sb-head'),brand);
  const nav=document.createElement('nav');nav.className='desktop-nav';nav.setAttribute('aria-label','Navegación general');row.append(nav);
  const primary=document.createElement('div');primary.id='desktop-primary';primary.className='desktop-primary';nav.append(primary);
  const financial=document.createElement('div');financial.id='desktop-finance-nav';financial.className='desktop-subnav';financial.hidden=true;nav.append(financial);
  const back=action('',()=>setSection(null,true));back.className='desktop-link desktop-icon-only desktop-back';const arrow=$('.sidebar .sb-arrow-collapse').cloneNode(true);arrow.setAttribute('class','desktop-back-icon');back.append(arrow);label(back,'Volver al menú principal');financial.append(back);
  for(const view of finance){const b=button(view,true);if(b)financial.append(b);}
  for(const item of navigation){
   if(typeof item==='string'){const b=button(item,true);if(b)primary.append(b);continue;}
   const [name,views,symbol]=item;
   if(name==='Finanzas'){
    const b=action('',()=>setSection('finanzas',true));b.className='desktop-link desktop-icon-only desktop-finance';b.dataset.desktopSection='finanzas';b.setAttribute('aria-controls','desktop-finance-nav');b.setAttribute('aria-expanded','false');const copy=icon(symbol);if(copy)b.append(copy);label(b,name);primary.append(b);continue;
   }
   const d=document.createElement('details');d.className='desktop-group';const s=document.createElement('summary');s.className='desktop-icon-only';
   const copy=icon(symbol);if(copy)s.append(copy);
   label(s,name);d.append(s);
   const menu=document.createElement('div');menu.className='desktop-menu';for(const view of views){const b=button(view);if(b)menu.append(b);}d.append(menu);primary.append(d);
  }
  const actions=document.createElement('div');actions.className='desktop-actions';header.append(actions);
  const notifications=$('#nBadge')?.closest('button');move(notifications,actions);
  if(notifications){const label=notifications.getAttribute('aria-label');notifications.setAttribute('aria-label','Notificaciones');decorations.push(()=>{if(label===null)notifications.removeAttribute('aria-label');else notifications.setAttribute('aria-label',label);});}
  const bell=typeof ModernoSettingsIcons==='object'?ModernoSettingsIcons['Notificaciones.svg']:null;
  if(notifications&&bell){const icon=document.createElement('span');icon.className='desktop-bell-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=bell;notifications.prepend(icon);decorations.push(()=>icon.remove());}
  const profile=document.createElement('details');profile.className='desktop-profile';const summary=document.createElement('summary');summary.setAttribute('aria-label','Perfil y ajustes');move($('#topUser'),summary);profile.append(summary);
  const popup=document.createElement('div');popup.className='desktop-menu';popup.append(action('Mi perfil',()=>userModal()),action('Ajustes',()=>SettingsUI.open('cuenta')));
  for(const view of ['automatizaciones','plugins','integraciones']){const b=button(view);if(b)popup.append(b);}
  move($('#sidebarStudy'),popup);profile.append(popup);actions.append(profile);
  document.querySelector('.app').before(header);
  header.addEventListener('click',event=>{
   if(event.target.closest('[data-workspace]'))closeMenus();
   const b=event.target.closest('[data-desktop-view]');if(!b||!available(b.dataset.desktopView))return;
   closeMenus();original(b.dataset.desktopView)?.click();
  });
  header.addEventListener('toggle',event=>{if(event.target.open)closeMenus(event.target);},true);
 }
 function restore(){
  for(const cleanup of decorations.splice(0).reverse())cleanup();
  for(const {node,marker} of moved.splice(0).reverse()){marker.replaceWith(node);}
  header?.remove();header=null;document.body.classList.remove('desktop-shell');
 }
 function refresh(){
  const excluded=['ajustes','admin','presedit','portalcli','portalobra'];
  const active=enabled&&media.matches&&!_accessLoading&&!excluded.includes(state.view)&&!['cliente','contratista','gestoria'].includes(_accessRole);
  if(!active){if(header)restore();return;}
  if(!header)build();document.body.classList.add('desktop-shell');
  if(state.view!==lastView){section=finance.includes(state.view)?'finanzas':null;lastView=state.view;}
  for(const b of header.querySelectorAll('[data-desktop-view]')){
   b.hidden=!available(b.dataset.desktopView);
   const selected=b.dataset.desktopView===state.view||(b.dataset.desktopView==='proyectos'&&['proyecto','estancia'].includes(state.view));
   if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  }
  for(const d of header.querySelectorAll('.desktop-group')){d.hidden=![...d.querySelectorAll('[data-desktop-view]')].some(b=>!b.hidden);d.classList.toggle('is-current',!!d.querySelector('[aria-current="page"]'));}
  syncNavigation();
 }
 function safeRefresh(){try{refresh();}catch(error){enabled=false;restore();console.warn('Navegación de escritorio desactivada; se conserva la interfaz anterior.',error);}}
 document.addEventListener('click',e=>{if(header&&!header.contains(e.target))closeMenus();});
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!header)return;const open=header.querySelector('details[open]');if(open){closeMenus();open.querySelector('summary')?.focus();}else if(section==='finanzas'&&header.contains(e.target))setSection(null,true);});
 media.addEventListener('change',safeRefresh);
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 safeRefresh();
 return {refresh:safeRefresh,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
