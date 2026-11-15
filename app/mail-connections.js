(function(global){
 'use strict';
 const providers={
  gmail:{title:'Conectar Gmail',name:'Gmail',description:'Autoriza Moderno.app desde Google para consultar, organizar y enviar correo con tu cuenta.',kind:'gmail',file:'gmail.svg'},
  icloud:{title:'Conectar iCloud Mail',name:'iCloud Mail',description:'Utiliza tu dirección de iCloud y una contraseña específica para aplicaciones.',kind:'icloud',file:'icloud.svg'},
  server:{title:'Configurar servidor externo',name:'Servidor externo',description:'Añade una cuenta mediante los datos IMAP y SMTP de tu proveedor de correo.',kind:'server',file:'external-mail.svg'}
 };
 const folders={
  inbox:{label:'Recibidos',icon:'inbox.svg'},
  sent:{label:'Enviados',icon:'sent.svg'},
  drafts:{label:'Borradores',icon:'drafts.svg'},
  spam:{label:'Spam',icon:'spam.svg'},
  trash:{label:'Papelera',icon:'trash.svg'}
 };
 const emptyFolderCounts=()=>({inbox:0,sent:0,drafts:0,spam:0,trash:0});
 const state={surface:'',provider:'',connections:[],activeConnectionId:'',messages:[],unreadCount:0,folderCounts:emptyFolderCounts(),activeFolder:'inbox',mailboxLoaded:false,identity:'',loading:false,loaded:false,busy:false,error:''};
 let context=()=>({}),rerender=()=>{},notify=()=>{},confirmAction=(_m,_l,action)=>action();
 const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const ctx=()=>context()||{};
 const identity=()=>{const c=ctx();return [c.studyId,c.userId,c.role].join('|');};
 const mark=provider=>{const data=providers[provider];return `<span class="mail-provider-mark mail-provider-mark--${data.kind}" aria-hidden="true"><img src="/brand/mail-icons/${data.file}?v=36706" width="24" height="24" alt=""></span>`;};
 function configure(options){context=options.context;rerender=options.render;notify=options.toast;confirmAction=options.confirm||confirmAction;handleOAuthResult();if(!document.documentElement.dataset.mailSearchReady){document.documentElement.dataset.mailSearchReady='1';document.addEventListener('pointerdown',event=>{if(!event.target.closest('.mail-search-combobox'))closeSearch();});}}
 function resetIfChanged(){const next=identity();if(state.identity===next)return;state.identity=next;state.connections=[];state.activeConnectionId='';state.messages=[];state.unreadCount=0;state.folderCounts=emptyFolderCounts();state.activeFolder='inbox';state.mailboxLoaded=false;state.loaded=false;state.loading=false;state.error='';}
 const connectedAccounts=()=>state.connections.filter(row=>row.status==='connected');
 function selectedConnection(){const rows=connectedAccounts();return rows.find(row=>row.id===state.activeConnectionId)||rows[0]||null;}
 async function invoke(body){
  const c=ctx();if(!c.sb||!c.studyId||!c.mailFunctionUrl||!c.mailFunctionAnonKey)throw Error('Disponible con una cuenta del estudio');
  const {data:sessionData,error:sessionError}=await c.sb.auth.getSession();
  const accessToken=sessionData?.session?.access_token;if(sessionError||!accessToken)throw Error('Inicia sesión de nuevo');
  let response;try{response=await fetch(c.mailFunctionUrl,{method:'POST',headers:{'Content-Type':'application/json','apikey':c.mailFunctionAnonKey},body:JSON.stringify({...body,studyId:c.studyId,authToken:accessToken})});}
  catch{throw Error('No se ha podido contactar con el servicio de correo');}
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}
  if(!response.ok)throw Error(data?.error||`El servicio de correo ha rechazado la solicitud (${response.status})`);
  if(!data?.ok)throw Error(data?.error||'No se ha podido conectar');return data;
 }
 function applyMailbox(data){
  state.messages=Array.isArray(data.messages)?data.messages:[];
  state.unreadCount=Math.max(0,Number(data.unreadCount)||0);
  state.folderCounts={...emptyFolderCounts(),...(data.folderCounts||{})};
  state.mailboxLoaded=true;
  ctx().setMailUnread?.(state.unreadCount);
 }
 async function loadMailbox(connection){
  const connectionId=connection.id,folder=state.activeFolder,mailbox=await invoke({action:'inbox',connectionId,folder});
  if(identity()!==state.identity||state.activeConnectionId!==connectionId||state.activeFolder!==folder)return;
  applyMailbox(mailbox);
 }
 async function load(force=false){
  resetIfChanged();const c=ctx();if(!c.sb||!c.studyId||c.role!=='admin'){state.loaded=true;state.connections=[];state.messages=[];state.mailboxLoaded=true;rerender();return;}
  if(state.loading||(!force&&state.loaded))return;state.loading=true;state.error='';rerender();
  try{
   const data=await invoke({action:'status'});if(identity()!==state.identity)return;
   state.connections=Array.isArray(data.connections)?data.connections:[];state.loaded=true;
   const connection=selectedConnection()||connectedAccounts()[0];state.activeConnectionId=connection?.id||'';
   if(connection){rerender();await loadMailbox(connection);}
   else{state.messages=[];state.unreadCount=0;state.folderCounts=emptyFolderCounts();state.mailboxLoaded=true;ctx().setMailUnread?.(0);}
  }catch(error){state.error=error.message;state.loaded=true;state.mailboxLoaded=true;}finally{state.loading=false;rerender();}
 }
 function ensure(){resetIfChanged();if(!state.loaded&&!state.loading)queueMicrotask(()=>load());}
 function open(provider,surface){if(!providers[provider])return;state.provider=provider;state.surface=surface||'mail';state.error='';rerender();queueMicrotask(()=>document.querySelector('.mail-setup-back')?.focus());}
 function back(){state.provider='';state.error='';rerender();}
 function onNavigate(view){if((state.surface==='mail'&&view!=='mail')||(state.surface==='integrations'&&view!=='integraciones')){state.provider='';state.error='';}}
 function setupFor(surface){return state.provider&&state.surface===surface?renderSetup(state.provider):'';}
 async function submit(event){
  event.preventDefault();if(state.busy)return;const provider=state.provider,form=event.currentTarget;state.busy=true;state.error='';rerender();
  try{
   if(provider==='gmail'){const data=await invoke({action:'gmail_begin'});location.assign(data.url);return;}
   const formData=new FormData(form);const payload={action:'connect_password',provider,email:formData.get('email'),password:formData.get('password')};
   if(provider==='server')Object.assign(payload,{displayName:formData.get('displayName'),user:formData.get('user'),imapHost:formData.get('imapHost'),imapPort:Number(formData.get('imapPort')),imapSecurity:formData.get('imapSecurity'),smtpHost:formData.get('smtpHost'),smtpPort:Number(formData.get('smtpPort')),smtpSecurity:formData.get('smtpSecurity')});
   await invoke(payload);await load(true);state.provider='';notify('✓ Cuenta de correo conectada y comprobada');
  }catch(error){state.error=error.message;}finally{state.busy=false;rerender();}
 }
 function handleOAuthResult(){
  const result=new URLSearchParams(location.search).get('mail_oauth');if(!result)return;
  try{const url=new URL(location.href);url.searchParams.delete('mail_oauth');history.replaceState(null,'',url.pathname+(url.search?url.search:'')+(url.hash||'#/mail'));}catch{}
  state.provider='';state.surface='mail';state.loaded=false;
  queueMicrotask(async()=>{if(result==='connected'){notify('✓ Gmail conectado y comprobado');await load(true);}else notify(result==='cancelled'?'Conexión con Gmail cancelada':'No se ha podido completar la autorización de Gmail');});
 }
 async function recheck(id){if(state.busy)return;state.busy=true;state.error='';rerender();try{await invoke({action:'recheck',connectionId:id});await load(true);notify('✓ Conexión comprobada');}catch(error){state.error=error.message;await load(true);}finally{state.busy=false;rerender();}}
 async function refreshInbox(){
  if(state.loading)return;const connection=selectedConnection();if(!connection)return;
  state.loading=true;state.mailboxLoaded=false;state.error='';rerender();
  try{await loadMailbox(connection);}catch(error){state.error=error.message;state.mailboxLoaded=true;}finally{state.loading=false;rerender();}
 }
 async function switchFolder(folder){
  if(!folders[folder]||folder===state.activeFolder||state.loading)return;
  const connection=selectedConnection();if(!connection)return;
  state.activeFolder=folder;state.messages=[];state.mailboxLoaded=false;state.error='';state.loading=true;rerender();
  try{await loadMailbox(connection);}catch(error){state.error=error.message;state.mailboxLoaded=true;}finally{state.loading=false;rerender();}
 }
 async function selectAccount(id){
  if(state.loading)return;const connection=connectedAccounts().find(row=>row.id===id);if(!connection)return;
  if(connection.id===state.activeConnectionId)return;
  state.activeConnectionId=connection.id;state.activeFolder='inbox';state.messages=[];state.unreadCount=0;state.folderCounts=emptyFolderCounts();state.mailboxLoaded=false;state.error='';state.loading=true;ctx().setMailUnread?.(0);rerender();
  try{await loadMailbox(connection);}catch(error){state.error=error.message;state.mailboxLoaded=true;}finally{state.loading=false;rerender();}
 }
 function closeSearch(){document.querySelector('.mail-search-combobox')?.classList.remove('is-open');}
 function filterMessages(value){
  const query=String(value||'').trim().toLocaleLowerCase('es'),box=document.querySelector('.mail-search-combobox'),list=document.querySelector('.mail-search-options');
  const matches=[];document.querySelectorAll('.mail-message-row').forEach(row=>{const visible=!query||String(row.dataset.search||'').includes(query);row.hidden=!visible;if(query&&visible&&matches.length<5)matches.push(row);});
  if(!box||!list)return;if(!query){box.classList.remove('is-open');list.innerHTML='';return;}
  list.innerHTML=matches.length?matches.map(row=>`<button type="button" role="option" data-value="${escape(row.dataset.subject||'')}" onclick="ModernoMail.chooseSearch(this.dataset.value)"><strong>${escape(row.dataset.subject||'(Sin asunto)')}</strong><span>${escape(row.dataset.sender||'')}</span></button>`).join(''):'<p>No se han encontrado correos.</p>';
  box.classList.add('is-open');
 }
 function chooseSearch(value){const input=document.querySelector('.mail-search-combobox input');if(input){input.value=value;filterMessages(value);input.focus();}closeSearch();}
 function searchKey(event){if(event.key==='Escape'){closeSearch();event.currentTarget.blur();}}
 function compose(){notify('La pantalla de Redactar se diseñará en el siguiente paso');}
 function openSettings(){if(typeof global.go==='function')global.go('integraciones');}
 function disconnect(id){const row=state.connections.find(item=>item.id===id);if(!row)return;confirmAction(`¿Desconectar ${row.email}? Moderno dejará de acceder a esta cuenta y eliminará sus credenciales guardadas.`,'Desconectar',async()=>{state.busy=true;rerender();try{await invoke({action:'disconnect',connectionId:id});await load(true);notify('Cuenta de correo desconectada');}catch(error){state.error=error.message;}finally{state.busy=false;rerender();}});}
 function setupNotice(){return `<div class="mail-setup-notice mail-setup-notice--secure" role="note"><strong>Conexión segura</strong><span>La cuenta se comprobará antes de guardarla. Los tokens y contraseñas se cifran en el servidor y no se guardan en este navegador.</span></div>`;}
 function renderSetup(provider){
  const data=providers[provider];let body='';
  if(provider==='gmail')body=`${setupNotice()}<div class="mail-google-permissions"><h3>Continuar con Google</h3><p>Se abrirá la autorización segura de Google. Moderno.app solicitará únicamente los permisos de Gmail necesarios.</p><ul><li>Leer y organizar mensajes</li><li>Enviar correo desde tu cuenta</li><li>Sincronizar remitentes y destinatarios</li></ul></div>`;
  if(provider==='icloud')body=`${setupNotice()}<div class="mail-setup-grid mail-setup-grid--single"><label>Correo de iCloud<input type="email" name="email" autocomplete="username" placeholder="nombre@icloud.com" required></label><label>Contraseña específica para aplicaciones<input type="password" name="password" autocomplete="new-password" placeholder="xxxx-xxxx-xxxx-xxxx" required></label></div><p class="mail-setup-help">Crea esta contraseña en account.apple.com. Nunca introduzcas aquí la contraseña habitual de tu Apple ID.</p>`;
  if(provider==='server')body=`${setupNotice()}<div class="mail-setup-grid"><label class="mail-setup-span">Nombre del remitente<input type="text" name="displayName" autocomplete="name" placeholder="Estudio Moderno" required></label><label class="mail-setup-span">Dirección de correo<input type="email" name="email" autocomplete="username" placeholder="hola@tuestudio.com" required></label><label class="mail-setup-host">Servidor IMAP<input type="text" name="imapHost" autocomplete="off" placeholder="imap.tuservidor.com" required></label><label class="mail-setup-port">Puerto IMAP<input type="number" name="imapPort" inputmode="numeric" value="993" min="1" max="65535" required></label><label class="mail-setup-half">Seguridad IMAP<select name="imapSecurity"><option value="tls">SSL / TLS</option><option value="starttls">STARTTLS</option></select></label><span class="mail-setup-half" aria-hidden="true"></span><label class="mail-setup-host">Servidor SMTP<input type="text" name="smtpHost" autocomplete="off" placeholder="smtp.tuservidor.com" required></label><label class="mail-setup-port">Puerto SMTP<input type="number" name="smtpPort" inputmode="numeric" value="465" min="1" max="65535" required></label><label class="mail-setup-half">Seguridad SMTP<select name="smtpSecurity"><option value="tls">SSL / TLS</option><option value="starttls">STARTTLS</option></select></label><span class="mail-setup-half" aria-hidden="true"></span><label class="mail-setup-half">Usuario<input type="text" name="user" autocomplete="username" placeholder="hola@tuestudio.com" required></label><label class="mail-setup-half">Contraseña<input type="password" name="password" autocomplete="new-password" placeholder="Contraseña del correo" required></label></div>`;
  return `<section class="mail-connect-page mail-connect-page--setup" aria-labelledby="mail-setup-title"><form class="mail-setup-card" onsubmit="ModernoMail.submit(event)" autocomplete="off"><header class="mail-setup-header"><button type="button" class="mail-setup-back" onclick="ModernoMail.back()" aria-label="Volver"><img src="/brand/mail-icons/back.svg?v=36706" width="18" height="18" alt=""></button>${mark(provider)}<div><h2 id="mail-setup-title">${data.title}</h2><p>${data.description}</p></div></header><div class="mail-setup-body">${body}${state.error?`<p class="mail-setup-error" role="alert">${escape(state.error)}</p>`:''}</div><footer class="mail-setup-footer"><button type="button" class="mail-connect-button" onclick="ModernoMail.back()" ${state.busy?'disabled':''}>Cancelar</button><button type="submit" class="mail-connect-button mail-connect-button--primary" ${state.busy?'disabled':''}>${state.busy?'<span class="lg-spin"></span> Comprobando…':provider==='gmail'?'Continuar con Google':'Comprobar y conectar'}</button></footer></form></section>`;
 }
 function accountCard(row){const data=providers[row.provider]||providers.server;const checked=row.lastCheckedAt?new Date(row.lastCheckedAt).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';return `<article class="mail-account-card">${mark(row.provider)}<div class="mail-account-copy"><div><h3>${escape(data.name)}</h3><span class="mail-status mail-status--${row.status}">${row.status==='error'?'Revisar':'Conectado'}</span></div><p>${escape(row.email)}</p>${checked?`<small>Comprobado ${escape(checked)}</small>`:''}</div><div class="mail-account-actions"><button class="mail-connect-button" onclick="ModernoMail.recheck('${escape(row.id)}')" ${state.busy?'disabled':''}>Comprobar</button><button class="mail-connect-button mail-connect-button--danger" onclick="ModernoMail.disconnect('${escape(row.id)}')" ${state.busy?'disabled':''}>Desconectar</button></div></article>`;}
 function chooser(compact=false){return `<div class="mail-connect-actions${compact?' mail-connect-actions--left':''}" aria-label="Servicios de correo"><button type="button" class="mail-connect-button mail-connect-button--primary" onclick="ModernoMail.open('gmail','mail')">Conectar Gmail</button><button type="button" class="mail-connect-button" onclick="ModernoMail.open('icloud','mail')">Conectar iCloud Mail</button><button type="button" class="mail-connect-button" onclick="ModernoMail.open('server','mail')">Configurar servidor externo</button></div>`;}
 function messageDate(row){const date=new Date(Number(row.timestamp)||row.date||0);if(Number.isNaN(date.getTime()))return '';const today=new Date(),same=date.toDateString()===today.toDateString();return same?date.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString('es-ES',{day:'2-digit',month:'short'});}
 const searchIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.7-3.7"></path></svg>';
 const arrowIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>';
 function messageRow(row){
  const correspondent=['sent','drafts'].includes(state.activeFolder)?row.to:row.from,search=[row.from,row.to,row.subject,row.snippet].join(' ').toLocaleLowerCase('es');
  return `<article class="mail-message-row${row.unread?' is-unread':''}" data-search="${escape(search)}" data-subject="${escape(row.subject||'(Sin asunto)')}" data-sender="${escape(correspondent||'Sin remitente')}"><span class="mail-message-unread" aria-label="${row.unread?'No leído':'Leído'}"></span><div class="mail-message-from">${escape(correspondent||'Sin remitente')}</div><div class="mail-message-content"><div><strong>${escape(row.subject||'(Sin asunto)')}</strong><span>${escape(row.snippet||'')}</span></div></div><time>${escape(messageDate(row))}</time></article>`;
 }
 function folderButton(key){const item=folders[key],count=Math.max(0,Number(state.folderCounts[key])||0),active=key===state.activeFolder;return `<button type="button" class="mail-folder-button${active?' is-active':''}" aria-current="${active?'page':'false'}" aria-label="${escape(item.label)} (${count})" onclick="ModernoMail.switchFolder('${key}')" ${state.loading?'disabled':''}><span><img src="/brand/mail-icons/${item.icon}?v=36711" width="18" height="18" alt="">${escape(item.label)}</span><span class="mail-folder-badge" aria-hidden="true">${count}</span></button>`;}
 function searchBox(){return `<div class="mail-search-combobox"><label class="mail-search-field">${searchIcon}<input type="search" placeholder="Buscar correo" aria-label="Buscar correo" aria-autocomplete="list" aria-controls="mail-search-options" oninput="ModernoMail.filterMessages(this.value)" onkeydown="ModernoMail.searchKey(event)"></label><div class="mail-search-options" id="mail-search-options" role="listbox"></div></div>`;}
 function accountSwitcher(){
  const rows=connectedAccounts(),account=selectedConnection();if(!account)return '';
  const identity=`${mark(account.provider)}<span class="mail-account-details"><strong>${escape(account.email)}</strong><small>${escape((providers[account.provider]||providers.server).name)}</small></span>`;
  if(rows.length<2)return `<div class="mail-account-switcher"><div class="mail-account-identity">${identity}</div></div>`;
  const options=rows.filter(row=>row.id!==account.id).map(row=>{const data=providers[row.provider]||providers.server;return `<button type="button" class="mail-account-option" onclick="ModernoMail.selectAccount('${escape(row.id)}')">${mark(row.provider)}<span><strong>${escape(row.email)}</strong><small>${escape(data.name)}</small></span></button>`;}).join('');
  return `<div class="mail-account-switcher"><div class="mail-account-menu" aria-label="Otras cuentas de correo">${options}</div><div class="mail-account-identity" aria-label="Cuenta seleccionada: ${escape(account.email)}">${identity}<span class="mail-account-current" aria-hidden="true">✓</span></div></div>`;
 }
 function inboxView(){
  const folder=folders[state.activeFolder]||folders.inbox;
  const body=!state.mailboxLoaded?'<div class="mail-inbox-skeleton" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>':state.messages.length?state.messages.map(messageRow).join(''):`<div class="mail-inbox-empty"><strong>No hay correos en ${escape(folder.label.toLowerCase())}</strong><span>Los mensajes de esta carpeta aparecerán aquí.</span></div>`;
  return `<section class="mail-workspace" aria-label="Bandeja de ${escape(folder.label.toLowerCase())}"><aside class="mail-folders"><button type="button" class="mail-compose-button" onclick="ModernoMail.compose()"><span><img src="/brand/mail-icons/compose.svg?v=36711" width="18" height="18" alt="">Redactar</span>${arrowIcon}</button><nav aria-label="Carpetas de correo">${Object.keys(folders).map(folderButton).join('')}</nav>${accountSwitcher()}</aside><main class="mail-inbox-panel"><header class="mail-inbox-toolbar">${searchBox()}<div class="mail-toolbar-actions"><button type="button" class="mail-icon-button" onclick="ModernoMail.refreshInbox()" ${state.loading?'disabled':''} aria-label="Actualizar ${escape(folder.label.toLowerCase())}" title="Actualizar"><img src="/brand/mail-icons/refresh.svg?v=36711" width="18" height="18" alt=""></button><button type="button" class="mail-icon-button" onclick="ModernoMail.openSettings()" aria-label="Ajustes" title="Ajustes"><img src="/brand/mail-icons/settings.svg?v=36711" width="18" height="18" alt=""></button></div></header><div class="mail-inbox-content">${state.error?`<p class="mail-setup-error" role="alert">${escape(state.error)}</p>`:''}<div class="mail-message-list">${body}</div></div></main></section>`;
 }
 function renderMail(){
  ensure();if(state.provider&&state.surface==='mail')return renderSetup(state.provider);
  if(connectedAccounts().length)return inboxView();
  if(!state.loaded)return '<section class="mail-connect-page" aria-busy="true"><span class="mail-visually-hidden">Cargando correo</span></section>';
  return `<section class="mail-connect-page" aria-labelledby="mail-connect-title"><div class="mail-connect-empty"><header class="mail-connect-header"><div class="mail-connect-media" aria-hidden="true"><svg width="200" height="120" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg"><g class="mail-node-lines" stroke-width="1.5" stroke-dasharray="4 3"><line x1="100" y1="60" x2="44" y2="30"></line><line x1="100" y1="60" x2="44" y2="90"></line><line x1="100" y1="60" x2="156" y2="30"></line><line x1="100" y1="60" x2="156" y2="90"></line></g><circle cx="100" cy="60" r="18" class="mail-node-center" stroke-width="1.5"></circle><circle cx="100" cy="60" r="6" class="mail-node-center-ring"></circle><circle cx="100" cy="60" r="2.5" class="mail-node-center-dot"></circle>${[[44,30],[44,90],[156,30],[156,90]].map(([x,y])=>`<g class="mail-node-remote"><circle cx="${x}" cy="${y}" r="14" stroke-width="1.5"></circle><rect x="${x-7}" y="${y-4}" width="14" height="3" rx="1.5"></rect><rect x="${x-4}" y="${y+2}" width="8" height="2" rx="1"></rect></g>`).join('')}<circle cx="72" cy="40" r="2" class="mail-node-float-primary"></circle><circle cx="128" cy="80" r="2" class="mail-node-float-primary"></circle><circle cx="72" cy="80" r="1.5" class="mail-node-float-muted"></circle><circle cx="128" cy="40" r="1.5" class="mail-node-float-muted"></circle></svg></div><h2 id="mail-connect-title">Conecta tu correo</h2><p>Aún no hay ninguna cuenta conectada. Elige un servicio para comprobarlo y empezar a usarlo en Moderno.app.</p></header>${chooser()}${state.error?`<p class="mail-setup-error" role="alert">${escape(state.error)}</p>`:'<p class="mail-connect-note">Puedes conectar más de una cuenta y desconectarla cuando quieras.</p>'}</div></section>`;
 }
 function integrationCards(){ensure();return ['gmail','icloud'].map(provider=>{const data=providers[provider],rows=state.connections.filter(row=>row.provider===provider),row=rows[0];return `<article class="connection-card connection-card--mail"><div class="connection-card-provider">${mark(provider)}<div><h3>${data.name}</h3><p>${provider==='gmail'?'Consulta, organiza y envía correo con Google.':'Consulta y envía correo mediante tu cuenta de iCloud.'}</p></div></div>${row?`<span class="chip">Conectado · ${escape(row.email)}</span><div class="connection-card-actions"><button class="btn btn-ghost" onclick="ModernoMail.recheck('${escape(row.id)}')">Comprobar</button><button class="btn btn-ghost" onclick="ModernoMail.disconnect('${escape(row.id)}')">Desconectar</button></div>`:`<button class="btn btn-ghost" onclick="ModernoMail.open('${provider}','integrations')">Conectar</button>`}</article>`;}).join('');}
 global.ModernoMail={configure,load,open,back,onNavigate,submit,recheck,disconnect,refreshInbox,switchFolder,selectAccount,filterMessages,chooseSearch,searchKey,compose,openSettings,renderMail,setupFor,integrationCards,handleOAuthResult};
})(globalThis);
