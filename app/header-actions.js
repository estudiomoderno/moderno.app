/* Existing app handlers bridge to the isolated original ReUI profile component. */
var ModernoHeaderActions=(()=>{
 'use strict';
 let enabled=true,standalone=null,host=null,group=null,observer=null,component=null,nativeProfile=null,useOriginal=true,notificationHost=null,notificationComponent=null,nativeNotification=null;
 const $=selector=>document.querySelector(selector);
 const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const svg=paths=>'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
 const bell=svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>');
 const team=svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>');
 const more=svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>');
 const allowed=()=>enabled&&!_accessLoading&&['admin','colaborador','miembro'].includes(_accessRole)&&!!state.sessionUser&&!['portalcli','portalobra','presedit'].includes(state.view)&&!document.body.classList.contains('portalmode')&&$('#loginScreen')?.style.display!=='grid';
 function notifications(){
  const n=(state.notifs||[]).filter(item=>!item.read).length;
  for(const button of document.querySelectorAll('.ha-notifications')){
   button.setAttribute('aria-label',n?'Notificaciones ('+n+')':'Notificaciones');button.title=n?'Notificaciones ('+n+')':'Notificaciones';
   const badge=button.querySelector('.ha-badge,#nBadge');if(badge){badge.textContent=n>99?'99+':String(n);badge.hidden=!n;badge.setAttribute('aria-hidden','true');}
  }
  if(notificationComponent)try{notificationComponent.update({count:n,onOpen:()=>nativeNotification?.click()});}catch(error){recover();}
 }
 function action(caption,fn){const b=node('button','desktop-link',caption);b.type='button';b.addEventListener('click',()=>{standalone?.querySelectorAll('details[open]').forEach(d=>d.open=false);fn();});return b;}
 function fallback(){
  const box=node('div','ha-standalone desktop-actions');box.id='app-header-actions';box.setAttribute('aria-label','Equipo y ajustes');
  const notification=node('button','ha-notifications');notification.type='button';notification.innerHTML=bell;notification.append(node('span','ha-badge'));notification.addEventListener('click',()=>notifModal());box.append(notification);
  const profile=node('details','desktop-profile');const summary=node('summary','ha-more');summary.setAttribute('aria-label','Perfil y ajustes');summary.title='Perfil y ajustes';const dots=node('span','ha-dots');dots.innerHTML=more;summary.append(dots);profile.append(summary);
  const menu=node('div','desktop-menu');menu.append(action('Mi perfil',()=>userModal()),action('Ajustes',()=>SettingsUI.open('cuenta')));
  for(const [view,caption] of [['automatizaciones','Automatizaciones'],['plugins','Plugins'],['integraciones','Integraciones']])if(canView(view))menu.append(action(caption,()=>go(view)));
  profile.append(menu);box.append(profile);document.body.append(box);return box;
 }
 function measure(){if(host?.isConnected)document.body.style.setProperty('--header-actions-width',Math.ceil(host.getBoundingClientRect().width)+'px');}
 function recover(){useOriginal=false;queueMicrotask(()=>{clear();refresh();});}
 function decorate(target){
  const notification=target.querySelector('button:has(#nBadge)');
  if(notification){notification.classList.add('ha-notifications');if(!notification.querySelector('.desktop-bell-icon')){const icon=node('span','ha-bell');icon.innerHTML=bell;notification.prepend(icon);}}
  const summary=target.querySelector('.desktop-profile>summary');
  if(useOriginal&&window.ModernoProfileComponent){
   try{nativeNotification=target.querySelector('.ha-notifications');
    if(nativeNotification){notificationHost=node('span','ha-notification-host');nativeNotification.before(notificationHost);notificationComponent=ModernoProfileComponent.mountNotifications(notificationHost,recover);nativeNotification.classList.add('ha-original-notification');}
    nativeProfile=summary?.closest('details');nativeProfile?.classList.add('ha-original-profile');
    group=node('span','ha-component-host');target.insertBefore(group,nativeProfile||null);component=ModernoProfileComponent.mount(group,recover);return;
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
   const items=[...nativeProfile.querySelectorAll('.desktop-menu>button')].filter(b=>!b.hidden).map(b=>({label:b.textContent.trim(),run:()=>b.click()}));
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
  notificationComponent?.unmount();notificationComponent=null;notificationHost?.remove();notificationHost=null;nativeNotification?.classList.remove('ha-original-notification');nativeNotification=null;
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
  document.body.classList.add('has-header-actions');paint();
 }
 document.addEventListener('moderno:team-presence',paint);
 document.addEventListener('click',e=>{if(host&&!host.contains(e.target))host.querySelectorAll('details[open]').forEach(d=>d.open=false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=host?.querySelector('details[open]');if(open){open.open=false;open.querySelector('summary')?.focus();}}});
 window.addEventListener('resize',refresh);
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);refresh();return result;};
 const originalBadge=notifBadge;notifBadge=function(){const result=originalBadge.apply(this,arguments);notifications();return result;};
 refresh();
 setTimeout(()=>presenceTrack(),0);
 return {refresh,refreshNotifications:notifications,isEnabled:()=>enabled,setEnabled(value){enabled=value===true;if(!enabled&&typeof teamPresence!=='undefined')teamPresence?.stop();refresh();presenceTrack();}};
})();
