/* Existing app handlers bridge to the isolated original ReUI profile component. */
var ModernoHeaderActions=(()=>{
 'use strict';
 let enabled=true,standalone=null,host=null,group=null,observer=null,component=null,nativeProfile=null,useOriginal=true,notificationHost=null,notificationComponent=null,nativeNotification=null,projectActions=null,notificationActions=null,secretaryControl=null;
 const $=selector=>document.querySelector(selector);
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const bell=uiIcon('notificaciones');
 const team=uiIcon('equipo');
 const more=uiIcon('mas-opciones');
 const allowed=()=>enabled&&!_accessLoading&&['admin','colaborador','miembro'].includes(_accessRole)&&!!state.sessionUser&&!['portalcli','portalobra'].includes(state.view)&&!document.body.classList.contains('portalmode')&&$('#loginScreen')?.style.display!=='grid';
 function notifications(){
  const n=(state.notifs||[]).filter(item=>!item.read).length;
  for(const button of document.querySelectorAll('.ha-notifications')){
   button.setAttribute('aria-label',n?'Notificaciones ('+n+')':'Notificaciones');button.title=n?'Notificaciones ('+n+')':'Notificaciones';
   const badge=button.querySelector('.ha-badge,#nBadge');if(badge){badge.textContent=n>99?'99+':String(n);badge.hidden=!n;badge.setAttribute('aria-hidden','true');}
  }
  if(notificationComponent)try{notificationComponent.update({count:n,onOpen:()=>nativeNotification?.click()});}catch(error){recover();}
 }
 function action(caption,fn,icon){const b=node('button','desktop-link');b.type='button';if(icon){const glyph=node('span','ha-menu-icon');glyph.style.setProperty('--ha-menu-icon',`url('/brand/sidebar-icons/${icon}.svg?v=36601')`);glyph.setAttribute('aria-hidden','true');b.append(glyph);}b.append(node('span','',caption));b.addEventListener('click',()=>{standalone?.querySelectorAll('details[open]').forEach(d=>d.open=false);fn();});return b;}
 function settingsItems(){return [
  {label:'Ajustes',icon:'/brand/sidebar-icons/ajustes.svg?v=36601',run:()=>SettingsUI.open('cuenta')},
  ...[['automatizaciones','Automatizaciones','automatizacion'],['plugins','Plugins','plugins'],['integraciones','Integraciones','integraciones']].filter(([view])=>canView(view)).map(([view,label,icon])=>({label,icon:'/brand/sidebar-icons/'+icon+'.svg?v=36601',run:()=>go(view)}))
 ];}
 function fallback(){
  const box=node('div','ha-standalone desktop-actions');box.id='app-header-actions';box.setAttribute('aria-label','Equipo y ajustes');
  const notification=node('button','ha-notifications');notification.type='button';notification.innerHTML=bell;notification.append(node('span','ha-badge'));notification.addEventListener('click',()=>notifModal());box.append(notification);
  const profile=node('details','desktop-profile');const summary=node('summary','ha-more');summary.setAttribute('aria-label','Ajustes');summary.title='Ajustes';const dots=node('span','ha-dots');dots.innerHTML=more;summary.append(dots);profile.append(summary);
  const menu=node('div','desktop-menu');for(const item of settingsItems())menu.append(action(item.label,item.run,item.icon.split('/').pop().split('.')[0]));
  profile.append(menu);box.append(profile);document.body.append(box);return box;
 }
 function projectTools(){
  projectActions?.remove();projectActions=null;document.body.classList.remove('has-project-header-actions');
  if(state.view!=='proyectos'||!window.matchMedia('(min-width:1100px)').matches||!host?.isConnected)return;
  const source=$('#view .projects-primary-actions');if(!source)return;
  projectActions=node('div','ha-project-actions');projectActions.setAttribute('aria-label','Acciones de proyectos');
  for(const selector of ['.projects-new','.projects-archive']){const button=source.querySelector(selector);if(button)projectActions.append(button.cloneNode(true));}
  host.insertBefore(projectActions,notificationActions||host.firstChild);document.body.classList.add('has-project-header-actions');
 }
 function setSecretaryControl(control){
  if(secretaryControl!==control){secretaryControl?.remove();secretaryControl=control;}
  if(control&&notificationActions&&control.parentElement!==notificationActions)notificationActions.prepend(control);
  measure();
 }
 function measure(){if(host?.isConnected)document.body.style.setProperty('--header-actions-width',Math.ceil(host.getBoundingClientRect().width)+'px');}
 function recover(){useOriginal=false;queueMicrotask(()=>{clear();refresh();});}
 function decorate(target){
  const notification=target.querySelector('button:has(#nBadge)')||target.querySelector('.ha-notifications');
  if(notification){
   notificationActions=node('div','ha-notification-actions');notification.before(notificationActions);notificationActions.append(notification);
   if(secretaryControl)notificationActions.prepend(secretaryControl);
   if(!notification.classList.contains('ha-notifications')){
    notification.classList.add('ha-notifications');
    if(!notification.querySelector('.desktop-bell-icon')){const icon=node('span','ha-bell');icon.innerHTML=bell;notification.prepend(icon);}
   }
  }
  const summary=target.querySelector('.desktop-profile>summary')||$('#desktop-header .desktop-account>summary');
  if(useOriginal&&window.ModernoProfileComponent){
   try{nativeNotification=target.querySelector('.ha-notifications');
    if(nativeNotification){notificationHost=node('span','ha-notification-host');nativeNotification.before(notificationHost);notificationComponent=ModernoProfileComponent.mountNotifications(notificationHost,recover);nativeNotification.classList.add('ha-original-notification');}
    nativeProfile=summary?.closest('details');
    group=node('span','ha-component-host');target.append(group);component=ModernoProfileComponent.mount(group,recover);return;
   }catch(error){useOriginal=false;notificationComponent?.unmount();notificationComponent=null;notificationHost?.remove();notificationHost=null;nativeNotification?.classList.remove('ha-original-notification');nativeNotification=null;group?.remove();group=null;nativeProfile?.classList.remove('ha-original-profile');nativeProfile=null;}
  }
  if(summary&&!summary.querySelector('.ha-dots')){const icon=node('span','ha-dots');icon.innerHTML=more;summary.append(icon);summary.title='Perfil y ajustes';}
  group=node('div','ha-team-group');
  const label=node('div','ha-team-label');label.innerHTML=team;label.append(node('span','','Equipo'));group.append(label);
  const people=node('div','ha-members');people.setAttribute('aria-label','Personas conectadas');group.append(people);
  const status=node('span','ha-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');group.append(status);
  target.insertBefore(group,summary?.closest('details')||null);
 }
 function paint(){
  if(!allowed()){clear();return;}
  if(!group?.isConnected)return;
  let snapshot=typeof teamPresence!=='undefined'&&teamPresence?.snapshot?teamPresence.snapshot():{status:'idle',members:[]};
  if(snapshot.status==='online'&&(snapshot.study!==ESTUDIO_ID||snapshot.key!==state.sessionUser?.mail))snapshot={status:'connecting',members:[]};
  const online=snapshot.status==='online',me=state.sessionUser||{};
  const members=online?snapshot.members:[{name:me.name||'Tú',avatar:me.avatar||''}];
  if(component){
   const items=settingsItems();
   try{component.update({members:members.map(m=>({...m,avatar:ModernoHeaderPresence.photo(m.avatar),fallback:String(m.name||'?').trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase()})),status:snapshot.status,items,onOpenChange:open=>{if(open&&nativeProfile)nativeProfile.open=false;}});}catch(error){recover();}
   notifications();measure();return;
  }
  const pictures=group.querySelector('.ha-members');pictures.replaceChildren();
  for(const member of members.slice(0,4)){
   const avatar=node('span','ha-avatar',String(member.name||'?').trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase());
   avatar.title=member.name+(online?' · conectado':'');avatar.setAttribute('aria-label',avatar.title);
   const src=ModernoHeaderPresence.photo(member.avatar);
   if(src){const img=node('img','');img.alt='';img.referrerPolicy='no-referrer';img.src=src;img.onerror=()=>img.remove();avatar.append(img);}
   pictures.append(avatar);
  }
  if(online&&members.length>4)pictures.append(node('span','ha-avatar ha-extra','+'+(members.length-4)));
  const status=group.querySelector('.ha-status'),text=online?members.length+' en línea':snapshot.status==='connecting'?'Conectando…':'Sin conexión';
  if(status.textContent!==text)status.textContent=text;
  group.dataset.online=String(online);group.setAttribute('aria-label',online?'Equipo: '+members.length+' personas conectadas':'Equipo: '+text.toLowerCase());
  notifications();measure();
 }
 function clear(){
  projectActions?.remove();projectActions=null;document.body.classList.remove('has-project-header-actions');
  notificationComponent?.unmount();notificationComponent=null;notificationHost?.remove();notificationHost=null;nativeNotification?.classList.remove('ha-original-notification');nativeNotification=null;
  secretaryControl?.remove();
  if(notificationActions){notificationActions.replaceWith(...notificationActions.children);notificationActions=null;}
  component?.unmount();component=null;nativeProfile?.classList.remove('ha-original-profile');nativeProfile=null;
  observer?.disconnect();observer=null;group?.remove();group=null;standalone?.remove();standalone=null;host=null;
  document.querySelectorAll('.ha-dots,.ha-bell').forEach(e=>e.remove());
  document.querySelectorAll('.ha-notifications').forEach(e=>{e.classList.remove('ha-notifications');const badge=e.querySelector('#nBadge');if(badge){badge.removeAttribute('hidden');badge.removeAttribute('aria-hidden');}if(e.closest('#desktop-header')){e.setAttribute('aria-label','Notificaciones');e.title='Notificaciones';}});
  document.body.classList.remove('has-header-actions');document.body.style.removeProperty('--header-actions-width');
 }
 function refresh(){
  if(!allowed()){clear();return;}
  const desktop=$('#desktop-header .desktop-actions');
  const target=desktop||standalone;
  if(!target?.isConnected||host!==target){clear();host=desktop||(standalone=fallback());decorate(host);observer=new ResizeObserver(measure);observer.observe(host);}
  document.body.classList.add('has-header-actions');projectTools();paint();
 }
 document.addEventListener('moderno:team-presence',paint);
 document.addEventListener('click',e=>{if(host&&!host.contains(e.target))host.querySelectorAll('details[open]').forEach(d=>d.open=false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=host?.querySelector('details[open]');if(open){open.open=false;open.querySelector('summary')?.focus();}}});
 window.addEventListener('resize',refresh);
 // DesktopShell can replace its header after the window resize event.
 new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.id==='desktop-header')))refresh();
 }).observe(document.body,{childList:true});
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);refresh();return result;};
 const originalBadge=notifBadge;notifBadge=function(){const result=originalBadge.apply(this,arguments);notifications();return result;};
 refresh();
 setTimeout(()=>presenceTrack(),0);
 return {refresh,refreshNotifications:notifications,setSecretaryControl,isEnabled:()=>enabled,setEnabled(value){enabled=value===true;if(!enabled&&typeof teamPresence!=='undefined')teamPresence?.stop();refresh();presenceTrack();}};
})();
