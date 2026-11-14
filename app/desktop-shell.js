/* Presentation only. Original navigation handlers, editors and storage remain authoritative. */
var ModernoDesktopShell=(()=>{
 'use strict';
 // #49 recovery gate verified: production physical backup + separate Storage inventory.
 const ENABLED=true;
 // At every fresh app load, desktop navigation starts as a compact icon rail.
 // The existing toggle stays fully operational for the rest of the session.
 let enabled=ENABLED,header=null,collapsed=true,foldTimer=null;
 const moved=[],decorations=[],media=window.matchMedia('(min-width:1100px)');
 const $=s=>document.querySelector(s);
 const finance=['informes','facturas','presupuestos','contabilidad','prevision'];
 const navigation=[['Finanzas',finance,'contabilidad'],'agenda','mail','calendario','workspace','biblioteca','catalogo'];
 const originals=()=>[...document.querySelectorAll('aside.sidebar .nav-item[data-view]')];
 const original=view=>originals().find(b=>b.dataset.view===view);
 const available=view=>!_accessLoading&&canView(view)&&!!original(view);
 function icon(view){
  const source=original(view);if(!source)return null;
  const icon=source.querySelector('.ico');if(icon){
   const copy=icon.cloneNode(true);copy.setAttribute('aria-hidden','true');
   if(source.dataset.newIcon==='true'){copy.classList.add('desktop-mask');copy.style.setProperty('--desktop-icon',`url('/brand/menu-icons/${view}.svg?v=201')`);}
   return copy;
  }
  return null;
 }
 function label(node,text){const span=document.createElement('span');span.className='desktop-label';span.textContent=text;node.append(span);node.setAttribute('aria-label',text);node.title=text;}
 function button(view,compact=false){
  const source=original(view);if(!source)return null;
  const b=document.createElement('button');b.type='button';b.className='desktop-link'+(compact?' desktop-icon-only':'');b.dataset.desktopView=view;
  const copy=icon(view);if(copy)b.append(copy);
  const label=document.createElement('span');label.className='desktop-label';label.textContent=view==='agenda'?'Agenda':source.textContent.trim();b.append(label);
  b.setAttribute('aria-label',label.textContent);b.title=label.textContent;return b;
 }
 function discoveryButton(){
  const source=document.querySelector('aside.sidebar [data-discover="documentation"]');if(!source)return null;
  const b=source.cloneNode(true);b.className='desktop-link desktop-icon-only';
  for(const child of [...b.childNodes])if(child.nodeType===Node.TEXT_NODE)child.remove();
  const icon=b.querySelector('.ico');if(icon){icon.classList.add('desktop-mask');icon.style.setProperty('--desktop-icon',"url('/brand/menu-icons/documentation.svg?v=200')");}
  label(b,'Documentación');return b;
 }
 function mailCount(){
  const value=state.mailUnread??state.mailCount??state.mails?.filter?.(message=>message?.read!==true).length??0;
  return Math.max(0,Number(value)||0);
 }
 function projectPool(){
  const projects=byBrand((state.projects||[]).filter(project=>!project.tpl&&project.status!=='Archivado'));
  const recent=typeof homeRecent==='function'?homeRecent():[];
  return [...projects].sort((a,b)=>{const ai=recent.indexOf(a.id),bi=recent.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);}).slice(0,4);
 }
 function projectButton(project){
  const b=document.createElement('button');b.type='button';b.className='desktop-link desktop-icon-only desktop-recent-project';b.dataset.projectId=String(project.id);
  const copy=icon('proyectos');if(copy)b.append(copy);
  const text=document.createElement('span');text.className='desktop-label desktop-project-copy';
  const name=document.createElement('strong');name.textContent=project.name||project.num||'Proyecto';text.append(name);
  b.append(text);b.setAttribute('aria-label',project.name||'Proyecto');b.title=b.getAttribute('aria-label');
  b.addEventListener('click',()=>{closeMenus();projectOpen(project.id);});return b;
 }
 function syncProjects(){
  const list=$('#desktop-recent-projects');if(!list)return;
  list.replaceChildren(...projectPool().map(projectButton));
  list.closest('.desktop-projects')?.classList.toggle('is-current',['proyecto','estancia'].includes(state.view));
 }
 function syncAccount(){
  if(!header)return;
  const user=state.sessionUser||{},name=user.name||'Usuario',mail=user.mail||user.email||'';
  const nameNode=header.querySelector('.desktop-account-name'),mailNode=header.querySelector('.desktop-account-mail');
  if(nameNode)nameNode.textContent=name;if(mailNode)mailNode.textContent=mail;
  const summary=header.querySelector('.desktop-profile>summary');if(summary)summary.setAttribute('aria-label',`Cuenta de ${name}`);
  const dot=header.querySelector('#topUserDot'),photo=window.ModernoHeaderPresence?.photo?.(user.avatar)||'';
  if(dot&&photo){
   let img=dot.querySelector('img');if(!img){dot.replaceChildren();img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.remove();dot.textContent=(name[0]||'?').toUpperCase();});dot.append(img);}
   if(img.src!==photo)img.src=photo;
  }else if(dot&&!dot.querySelector('img'))dot.textContent=(name[0]||'?').toUpperCase();
  const badge=header.querySelector('.desktop-mail-badge');if(badge){const count=mailCount();badge.textContent=String(count);badge.setAttribute('aria-label',`${count} correos`);}
 }
 function move(node,target){
  if(!node)return;
  const marker=document.createComment('desktop-shell: original position');node.before(marker);moved.push({node,marker});target.append(node);
 }
 function closeMenus(except){header?.querySelectorAll('details[open]').forEach(d=>{if(d!==except&&!(except&&d.contains(except)))d.open=false;});}
 function action(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{closeMenus();fn();});return b;}
 function syncNavigation(){
  const trigger=$('#desktop-header .desktop-finance');
  trigger.hidden=!finance.some(available);
  trigger.classList.toggle('is-current',finance.includes(state.view));
  $('.desktop-nav').setAttribute('aria-label','Navegación general');
  const nav=$('#desktop-navigation'),toggle=$('#desktop-header .desktop-toggle');
  nav.inert=false;nav.setAttribute('aria-hidden','false');$('.desktop-row').classList.toggle('is-collapsed',collapsed);
  document.body.classList.toggle('desktop-menu-collapsed',collapsed);
  positionMenus();
  toggle.setAttribute('aria-expanded',String(!collapsed));
  const caption=collapsed?'Desplegar menú lateral':'Comprimir menú lateral';toggle.setAttribute('aria-label',caption);toggle.title=caption;toggle.querySelector('.desktop-label').textContent=caption;
 }
 function positionMenus(){
  header?.querySelectorAll('.desktop-group[open]>.desktop-menu').forEach(menu=>{
   const anchor=menu.parentElement.querySelector('summary').getBoundingClientRect();
   menu.style.top=Math.max(12,Math.min(anchor.top,window.innerHeight-12-menu.getBoundingClientRect().height))+'px';
  });
 }
 function finishFold(){
  if(foldTimer!==null){clearTimeout(foldTimer);foldTimer=null;}
  $('#desktop-header .desktop-row')?.classList.remove('is-toggling');
 }
 function toggleFold(){
  finishFold();
  const animate=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  closeMenus();$('.desktop-row').classList.toggle('is-toggling',animate);collapsed=!collapsed;syncNavigation();
  if(animate)foldTimer=setTimeout(finishFold,300);
 }
 function build(){
  header=document.createElement('header');header.id='desktop-header';header.setAttribute('aria-label','Moderno.app');
  const row=document.createElement('div');row.className='desktop-row';row.classList.toggle('is-collapsed',collapsed);header.append(row);
  const brand=document.createElement('div');brand.className='desktop-brand';row.append(brand);move($('aside.sidebar .sb-head'),brand);
  const clip=document.createElement('div');clip.className='desktop-nav-clip';row.append(clip);
  const nav=document.createElement('nav');nav.id='desktop-navigation';nav.className='desktop-nav';nav.setAttribute('aria-label','Navegación general');clip.append(nav);
  clip.addEventListener('scroll',positionMenus);
  row.addEventListener('transitionend',event=>{if(event.target===row&&event.propertyName==='width')finishFold();});
  const primaryTitle=document.createElement('h2');primaryTitle.className='desktop-section-label';primaryTitle.textContent='Workspace';nav.append(primaryTitle);
  const primary=document.createElement('div');primary.id='desktop-primary';primary.className='desktop-primary';nav.append(primary);
  for(const item of navigation){
   if(typeof item==='string'){const b=button(item,true);if(b){if(item==='mail'){const badge=document.createElement('span');badge.className='desktop-mail-badge';b.append(badge);}primary.append(b);}continue;}
   const [name,views,symbol]=item;
   if(name==='Finanzas'){
    const b=action('',()=>{const view=finance.find(available);if(view)original(view).click();});b.className='desktop-link desktop-icon-only desktop-finance';const copy=icon(symbol);if(copy)b.append(copy);label(b,name);primary.append(b);continue;
   }
   const d=document.createElement('details');d.className='desktop-group';const s=document.createElement('summary');s.className='desktop-icon-only';
   const copy=icon(symbol);if(copy)s.append(copy);
   label(s,name);d.append(s);
   const menu=document.createElement('div');menu.className='desktop-menu';for(const view of views){const b=button(view);if(b)menu.append(b);}d.append(menu);primary.append(d);
  }
  const projects=document.createElement('section');projects.className='desktop-projects';projects.setAttribute('aria-labelledby','desktop-projects-title');
  const projectsHeader=document.createElement('div');projectsHeader.className='desktop-projects-header';
  const projectsTitle=document.createElement('h2');projectsTitle.id='desktop-projects-title';projectsTitle.textContent='Proyectos';projectsHeader.append(projectsTitle);
  const add=action('+',()=>newProject());add.className='desktop-project-add';add.setAttribute('aria-label','Crear proyecto');add.title='Crear proyecto';projectsHeader.append(add);projects.append(projectsHeader);
  const all=button('proyectos',true);if(all){all.classList.add('desktop-projects-all');all.querySelector('.desktop-label').textContent='Ver todos';all.setAttribute('aria-label','Ver todos los proyectos');all.title='Ver todos los proyectos';projects.append(all);}
  const recentTitle=document.createElement('h3');recentTitle.className='desktop-recent-title';recentTitle.textContent='Recientes';projects.append(recentTitle);
  const recent=document.createElement('div');recent.id='desktop-recent-projects';recent.className='desktop-recent-projects';projects.append(recent);nav.append(projects);
  const discover=document.createElement('section');discover.className='desktop-discover';discover.setAttribute('aria-labelledby','desktop-discover-title');
  const title=document.createElement('h2');title.id='desktop-discover-title';title.textContent='Discover';discover.append(title);
  for(const view of ['plantillas','tutoriales']){const b=button(view,true);if(b)discover.append(b);}
  const documentation=discoveryButton();if(documentation)discover.append(documentation);nav.append(discover);
  const toggle=action('',toggleFold);toggle.className='desktop-toggle desktop-icon-only';toggle.setAttribute('aria-controls','desktop-navigation');label(toggle,'Comprimir menú lateral');
  for(const name of ['collapse','expand']){const arrow=$('.sidebar .sb-arrow-'+name).cloneNode(true);arrow.setAttribute('class','desktop-arrow-'+name);toggle.append(arrow);}
  const profile=document.createElement('details');profile.className='desktop-profile desktop-account';const summary=document.createElement('summary');summary.setAttribute('aria-label','Perfil y ajustes');move($('#topUser'),summary);
  const accountCopy=document.createElement('span');accountCopy.className='desktop-account-copy';const accountName=document.createElement('strong');accountName.className='desktop-account-name';const accountMail=document.createElement('small');accountMail.className='desktop-account-mail';accountCopy.append(accountName,accountMail);summary.append(accountCopy);
  const more=document.createElement('span');more.className='desktop-account-more';more.textContent='…';more.setAttribute('aria-hidden','true');summary.append(more);profile.append(summary);
  const popup=document.createElement('div');popup.className='desktop-menu';popup.append(action('Mi perfil',()=>userModal()),action('Ajustes',()=>SettingsUI.open('cuenta')));
  for(const view of ['automatizaciones','plugins','integraciones']){const b=button(view);if(b)popup.append(b);}
  move($('#sidebarStudy'),popup);profile.append(popup);row.append(profile);
  row.append(toggle);
  const support=document.createElement('div');support.className='desktop-support';const supportButton=button('soporte',true);if(supportButton)support.append(supportButton);row.append(support);
  const actions=document.createElement('div');actions.className='desktop-actions';header.append(actions);
  const notifications=$('#nBadge')?.closest('button');move(notifications,actions);
  if(notifications){const label=notifications.getAttribute('aria-label');notifications.setAttribute('aria-label','Notificaciones');decorations.push(()=>{if(label===null)notifications.removeAttribute('aria-label');else notifications.setAttribute('aria-label',label);});}
  const bell=typeof ModernoSettingsIcons==='object'?ModernoSettingsIcons['Notificaciones.svg']:null;
  if(notifications&&bell){const icon=document.createElement('span');icon.className='desktop-bell-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=bell;notifications.prepend(icon);decorations.push(()=>icon.remove());}
  document.querySelector('.app').before(header);
  header.addEventListener('click',event=>{
   if(event.target.closest('[data-workspace]'))closeMenus();
   const b=event.target.closest('[data-desktop-view]');if(!b||!available(b.dataset.desktopView))return;
   closeMenus();original(b.dataset.desktopView)?.click();
  });
  header.addEventListener('toggle',event=>{if(event.target.open){closeMenus(event.target);positionMenus();}},true);
 }
 function restore(){
  if(foldTimer!==null){clearTimeout(foldTimer);foldTimer=null;}
  for(const cleanup of decorations.splice(0).reverse())cleanup();
  for(const {node,marker} of moved.splice(0).reverse()){marker.replaceWith(node);}
  header?.remove();header=null;document.body.classList.remove('desktop-shell','desktop-menu-collapsed');
 }
 function refresh(){
  const excluded=['portalcli','portalobra'];
  const active=enabled&&media.matches&&!_accessLoading&&!excluded.includes(state.view)&&!['cliente','contratista','gestoria'].includes(_accessRole);
  if(!active){if(header)restore();return;}
  if(!header)build();document.body.classList.add('desktop-shell');syncProjects();syncAccount();
  const settingsNav=$('#settings-nav');if(settingsNav&&!header.contains(settingsNav))move(settingsNav,$('#desktop-header .desktop-nav-clip'));
  header.classList.toggle('desktop-settings-active',['ajustes','admin'].includes(state.view));
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
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!header)return;const open=header.querySelector('details[open]');if(open){closeMenus();open.querySelector('summary')?.focus();}});
 window.addEventListener('resize',()=>{if(header)syncNavigation();});
 media.addEventListener('change',safeRefresh);
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 safeRefresh();
 return {refresh:safeRefresh,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
