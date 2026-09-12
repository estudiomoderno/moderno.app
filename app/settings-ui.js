/* Settings own a draft; merely opening or leaving a field never mutates a study. */
window.SettingsUI=(()=>{
  'use strict';
  const E=ModernoDaily.escape, C=ModernoSettingsCore;
  const sections=[['cuenta','Mi cuenta','Mi Cuenta.svg'],['estudio','Estudio','Logo estudio ajustes.svg'],['equipo','Equipo','Invitar Usuario.svg'],['facturacion','Facturación','Facturación.svg'],['ordenes','Órdenes','Ordenes.svg'],['impuestos','Impuestos','tax.svg'],['idioma','Idioma y región','Idioma y region.svg'],['notificaciones','Notificaciones','Notificaciones.svg']];
  const personal=new Set(['cuenta','idioma','notificaciones']);
  let section='cuenta', draft=null, base=null, owner='', busy=false, metadata=null, message='', error=false, previous='home', profileRequest='', profileAttempt='';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const icon=name=>'<span class="settings-icon" aria-hidden="true">'+(ModernoSettingsIcons[name]||'')+'</span>';
  const isAdmin=()=>_accessRole==='admin';
  const allowed=k=>personal.has(k)||isAdmin();
  const active=()=>['ajustes','admin'].includes(state.view);
  const dirty=()=>!!draft&&!C.equal(draft,base,section);
  const sessionKey=()=>String(ESTUDIO_ID||'')+'|'+meMail();
  function values(){
    const A=state.account||{},S=A.studioDetails||{},M=metadata||{};
    if(section==='cuenta')return {first:M.given_name??(state.sessionUser?.name||'').split(' ')[0],last:M.family_name??(state.sessionUser?.name||'').split(' ').slice(1).join(' '),email:meMail(),timezone:M.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone,avatar:M.avatar_url||state.sessionUser?.avatar||''};
    if(section==='estudio')return {name:A.name||'',...Object.fromEntries(['type','location','country','about','taxId','web','instagram','facebook','email','phone','address','address2','city','postcode','province','contactCountry','logo'].map(k=>[k,S[k]??'']))};
    if(section==='impuestos')return {...Object.fromEntries(['country','currency','taxName','vat','irpf'].map(k=>[k,A[k]??''])),paymentIban:C.bankConflict(A,state.emitter)?'':C.paymentIban(A,state.emitter),retention:!!state.irpf,margin:state.defMargin??0,fc:serie(true),ps:serie(false),...Object.fromEntries(['name','nif','addr','city','country','phone'].map(k=>['emitter_'+k,state.emitter?.[k]??'']))};
    if(section==='notificaciones')return Object.fromEntries(['assigned','unassigned','status','due','phase','comments'].map(k=>[k,!!M.task_email_preferences?.[k]]));
    return {};
  }
  function start(){owner=sessionKey();base=values();draft=clone(base);message='';error=false;}
  function status(text,bad=false){message=text;error=bad;const n=document.getElementById('settings-status');if(n){n.textContent=text;n.dataset.error=String(bad);}}
  function field(key,label,type='text',opts=''){
    const id='settings-'+key,v=draft[key]??'';
    let input=type==='textarea'?`<textarea id="${id}" data-setting="${key}">${E(v)}</textarea>`:type==='select'?`<select id="${id}" data-setting="${key}">${opts}</select>`:type==='tel'?ModernoPhone.field(v,PAIS_ISO,state.account?.country,`id="${id}" data-setting="${key}"`):`<input id="${id}" data-setting="${key}" type="${type}" ${key==='email'&&section==='cuenta'&&!isAdmin()?'readonly':''} value="${E(v)}" ${type==='number'?'min="0" max="100" step="any"':''} ${key==='first'||key==='name'?'required':''} maxlength="${key==='avatar'?300000:500}">`;
    return `<div class="settings-field"><label for="${id}">${E(label)}</label>${input}</div>`;
  }
  const options=(list,value)=>list.map(v=>`<option value="${E(v)}" ${v===value?'selected':''}>${E(v)}</option>`).join('');
  const box=(title,text,body)=>`<section class="settings-section"><h2>${E(title)}</h2>${text?`<p>${E(text)}</p>`:''}${body||''}</section>`;
  const fields=html=>`<div class="settings-fields">${html}</div>`;
  function photo(key,label){return `<div class="settings-person">${draft[key]?`<img class="settings-photo" ${fileImageAttrs(draft[key])} alt="${E(label)}">`:''}<button class="btn btn-ghost" type="button" data-settings-action="photo">Elegir imagen</button><input hidden style="display:none" type="file" id="settings-photo" accept="image/png,image/jpeg,image/webp" data-photo="${key}"><span>JPG, PNG o WebP · hasta 5 MB</span></div>`;}
  function content(){
    if(section==='historial')return histBody();
    if(section==='cuenta')return box('Perfil personal','Tus datos de acceso a Moderno.app.',photo('avatar','Foto de perfil')+fields(field('first','Nombre')+field('last','Apellidos')+field('email','Correo electrónico','email')+field('timezone','Zona horaria','select',options([...new Set([draft.timezone,...Intl.supportedValuesOf('timeZone')])],draft.timezone)))+'')+box('Apariencia','Elige cómo se muestra la aplicación en este navegador.',`<div class="settings-theme"><button type="button" class="btn btn-ghost" onclick="SettingsUI.theme(false)">${icon('modo no oscuro.svg')}Claro</button><button type="button" class="btn btn-ghost" onclick="SettingsUI.theme(true)">${icon('Modo oscuro.svg')}Oscuro</button></div>`);
    if(section==='estudio')return box('Información del estudio','Los datos de tu estudio.',photo('logo','Logo del estudio')+fields(field('name','Nombre del estudio')+field('type','Tipo de estudio')+field('location','Localización')+field('country','País','select',options(['',...PAISES],draft.country))+field('taxId','Identificación fiscal')+field('web','Página web')+field('instagram','Instagram')+field('facebook','Facebook')+field('about','Sobre el estudio','textarea')))+box('Contacto','Correo, teléfono y dirección del estudio.',fields(field('email','Correo de contacto','email')+field('phone','Teléfono','tel')+field('address','Dirección')+field('address2','Dirección adicional')+field('city','Ciudad')+field('postcode','Código postal')+field('province','Provincia')+field('contactCountry','País de contacto','select',options([...new Set(['',draft.contactCountry,...PAISES])],draft.contactCountry))))+box('Espacios de trabajo','Gestiona las marcas y áreas del estudio.','<div class="settings-workspaces">'+visibleWsOrder().map((k,i)=>`<button type="button" class="btn btn-ghost" data-workspace-edit="${i}">${E(BRAND[k]?.name||'Espacio de trabajo')}${state.brandFilter===k?' · Actual':''}</button>`).join('')+'<button type="button" class="btn btn-ghost" data-settings-action="workspace">+ Añadir espacio de trabajo</button></div>')+box('Dirección de acceso','Tu acceso actual es app.moderno.app. Las direcciones personalizadas todavía no están disponibles.','<p>La incorporación de personas se gestiona mediante invitaciones en Equipo.</p><button type="button" class="btn btn-ghost" data-settings-action="import">Importar datos</button> <button type="button" class="btn btn-ghost" data-settings-action="history">Historial de versiones</button> <button type="button" class="btn btn-ghost" data-settings-action="trash">Papelera</button> <button type="button" class="btn btn-ghost" data-settings-action="sync">Estado de guardado</button>');
    if(section==='impuestos')return box('Configuración fiscal','Impuestos y datos de facturación de tu estudio.',fields(field('country','País fiscal','select',options([...new Set([draft.country,...PAISES])],draft.country))+field('currency','Divisa','select',options([...new Set([draft.currency,...Object.keys(CURR)])],draft.currency))+field('taxName','Nombre del impuesto')+field('vat','Impuesto por defecto (%)','number')+field('irpf','Retención por defecto (%)','number'))+`<label class="settings-check"><input data-setting="retention" type="checkbox" ${draft.retention?'checked':''}> Aplicar retención</label>`)+box('Emisor de documentos','Datos para tus facturas y presupuestos.',fields(field('emitter_name','Razón social')+field('emitter_nif','NIF / CIF')+field('emitter_addr','Dirección')+field('emitter_city','Ciudad')+field('emitter_country','País','select',options([...new Set([draft.emitter_country,...PAISES])],draft.emitter_country))+field('emitter_phone','Teléfono','tel')+field('margin','Margen por defecto (%)','number')+field('fc','Serie de facturas')+field('ps','Serie de presupuestos')))+box('Pagos por transferencia','La cuenta se usará en los nuevos documentos. Los anteriores conservan sus datos.',fields(field('paymentIban','IBAN'))+(C.bankConflict(state.account,state.emitter)?`<p>Hay dos cuentas anteriores distintas. Elige cuál usar para los nuevos documentos o escribe otra arriba.</p><div class="settings-bank-choices"><button type="button" class="btn btn-ghost" data-settings-bank="account">Usar ${E(state.account.iban)}</button><button type="button" class="btn btn-ghost" data-settings-bank="emitter">Usar ${E(state.emitter.iban)}</button></div>`:''));
    if(section==='equipo')return TeamSettings.view();
    if(section==='facturacion')return window.BillingUI?BillingUI.view(false):box('Suscripción de Moderno.app','La contratación de planes todavía no está disponible.','');
    if(section==='ordenes')return window.BillingUI?BillingUI.view(true):box('Historial de la suscripción','Aquí aparecerán las facturas y recibos de tu suscripción a Moderno.app.','<p>El historial de pagos todavía no está disponible.</p>');
    if(section==='idioma')return box('Idioma de la aplicación','Español es el idioma disponible actualmente.','<label for="settings-language">Idioma</label><select id="settings-language" disabled><option>Español</option></select><p>El país fiscal, la moneda y los impuestos se encuentran en Impuestos.</p>');
    return box('Notificaciones en la aplicación','Consulta la actividad que ya recibe tu estudio.','<button type="button" class="btn btn-ghost" data-settings-action="notifications">Ver notificaciones</button>')+box('Preferencias de correo','Los avisos de tareas por correo todavía no están disponibles. Puedes dejar elegidas tus preferencias.',[['assigned','Me asignan una tarea'],['unassigned','Dejan de asignarme una tarea'],['status','Cambia el estado de una tarea'],['due','Se acerca el vencimiento'],['phase','Cambia una fase'],['comments','Hay comentarios nuevos']].map(([k,t])=>`<label class="settings-check"><input data-setting="${k}" type="checkbox" ${draft[k]?'checked':''}>${E(t)}</label>`).join('')+'');
  }
  function view(){
    if(!allowed(section))section='cuenta';
    if(owner!==sessionKey()){try{if((new URLSearchParams(location.search).get('section')==='facturacion'||window.ModernoBillingIntent?.read(sessionStorage))&&isAdmin())section='facturacion';}catch{}metadata=null;profileAttempt='';start();if(window.BillingUI&&['facturacion','ordenes'].includes(section))BillingUI.load(section==='ordenes');}else if(!draft)start();
    const title=sections.find(s=>s[0]===section)?.[1]||'Historial de versiones';
    const save=['cuenta','estudio','impuestos','notificaciones'].includes(section);
    return `<div class="settings-page"><header><h1>${title}</h1><p>Ajustes de Moderno.app</p></header><form id="settings-form"><fieldset class="settings-fieldset" ${busy?'disabled':''}>${content()}</fieldset>${save?`<div class="settings-actions"><span class="settings-status" id="settings-status" role="status" aria-live="polite" data-error="${error}">${E(message||'Los cambios se aplican al guardar.')}</span><button class="btn btn-dark" type="submit" ${busy||(['cuenta','notificaciones'].includes(section)&&!metadata)?'disabled':''}>${busy?'Guardando…':'Guardar cambios'}</button></div>`:''}</form></div>`;
  }
  function discardThen(fn){if(busy){toast('Espera a que termine el guardado.');return;}if(dirty()){askConfirm('Tienes cambios sin guardar en Ajustes. Puedes guardarlos antes de salir o descartarlos.','Guardar cambios',async()=>{if(await save())fn();},null,{label:'Descartar cambios',fn:()=>{draft=null;fn();}});return;}fn();}
  function open(k='cuenta'){if(!allowed(k))return;discardThen(()=>{if(!active())previous=state.view;section=k;draft=null;metadata=null;profileAttempt='';go('ajustes');document.body.classList.remove('sbopen');document.getElementById('settings-switch').open=false;loadPersonal();if(k==='equipo')TeamSettings.load();if(window.BillingUI&&['facturacion','ordenes'].includes(k))BillingUI.load(k==='ordenes');});}
  async function loadPersonal(){
    if(!personal.has(section)||!sb)return;
    const key=sessionKey(),sec=section,request=key+'|'+sec;
    if(profileRequest===request)return;profileRequest=request;profileAttempt=request;
    try{const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data.user)throw C.problem('La sesión ha caducado.');if(key!==sessionKey()||sec!==section||!active())return;
      metadata=data.user.user_metadata||{};if(!dirty()){state.sessionUser=sbUserToSession(data.user);start();render();}else {message='El perfil está listo. Puedes guardar tus cambios.';render();}
    }catch(e){if(key===sessionKey()&&sec===section)status('No hemos podido cargar tus datos. Vuelve a abrir esta sección.',true);}
    finally{if(profileRequest===request)profileRequest='';}
  }
  async function loadInvitations(){
    const key=sessionKey();try{const {data,error}=await sb.from('invitaciones').select('email,rol').eq('estudio_id',ESTUDIO_ID);if(error)throw error;if(key!==sessionKey()||section!=='equipo')return;
      const el=document.getElementById('settings-invitations');if(el)el.textContent=data?.length?'Invitaciones registradas: '+data.map(v=>v.email+' ('+(v.rol==='admin'?'Administrador':'Colaborador')+')').join(' · '):'No hay invitaciones registradas.';
    }catch(e){const el=document.getElementById('settings-invitations');if(el)el.textContent='No se pudieron consultar las invitaciones. Vuelve a abrir Equipo.';}
  }
  async function save(){
    if(busy||!draft||!['cuenta','estudio','impuestos','notificaciones'].includes(section))return;
    if(!allowed(section)||owner!==sessionKey()){status('Tu acceso o estudio ha cambiado. Abre de nuevo Ajustes.',true);return;}
    const form=document.getElementById('settings-form');if(!form.reportValidity())return;
    busy=true;const key=sessionKey(),sec=section;status('Guardando…');form.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=true);
    try{
      if(!sb)throw C.problem('Vuelve a entrar para guardar los cambios.');
      if(personal.has(sec)){
        const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data.user)throw C.problem('La sesión ha caducado.');
        if(key!==sessionKey())throw C.problem('La sesión ha cambiado.');
        const md=data.user.user_metadata||{};let update={};
        if(sec==='cuenta'){
          if(!draft.first.trim())throw C.problem('Escribe tu nombre.');
          if(!Intl.supportedValuesOf('timeZone').includes(draft.timezone)&&draft.timezone!=='UTC')throw C.problem('Zona horaria no válida.');
          const initial={given_name:base.first,family_name:base.last,timezone:base.timezone,avatar_url:base.avatar};
          const current={given_name:md.given_name??base.first,family_name:md.family_name??base.last,timezone:md.timezone??base.timezone,avatar_url:md.avatar_url??base.avatar};
          const merged=C.patch(current,initial,{given_name:draft.first.trim(),family_name:draft.last.trim(),timezone:draft.timezone,avatar_url:draft.avatar});
          update={data:{...md,...merged,full_name:[merged.given_name,merged.family_name].filter(Boolean).join(' ')}};
          if(draft.email.trim().toLowerCase()!==base.email.toLowerCase()){
            if(!isAdmin())throw C.problem('Pide al administrador que te ayude a cambiar el correo.');
            update.email=draft.email.trim().toLowerCase();
          }
        }else update={data:{...md,task_email_preferences:C.patch(md.task_email_preferences||base,base,draft)}};
        const result=await sb.auth.updateUser(update);if(result.error)throw result.error;
        if(key!==sessionKey())throw C.problem('La sesión cambió durante el guardado. Comprueba tu perfil al volver a entrar.');
        metadata=result.data.user.user_metadata||{};state.sessionUser=sbUserToSession(result.data.user);applySessionUI();start();
        message=update.email?'Revisa tu correo para confirmar el cambio.':sec==='notificaciones'?'Preferencias guardadas. Los avisos por correo todavía no están disponibles.':'Perfil guardado.';
      }else{
        if(!isAdmin()||!ESTUDIO_ID)throw C.problem('Solo el administrador puede guardar los ajustes del estudio.');
        // Convert only changed numeric fields, preserving empty and legacy values on unrelated saves.
        if(sec==='impuestos'){
          for(const k of ['vat','irpf','margin'])if(draft[k]!==base[k])draft[k]=C.percent(draft[k]);
          for(const k of ['fc','ps'])if(draft[k]!==base[k])draft[k]=C.series(draft[k]);
        }
        const merged=C.patch(values(),base,draft);
        if(key!==sessionKey()||!isAdmin())throw C.problem('El acceso al estudio ha cambiado.');
        if(sec==='estudio'){
          if(!merged.name.trim())throw C.problem('Escribe el nombre del estudio.');
          for(const [k,v]of Object.entries(merged))if(JSON.stringify(v)!==JSON.stringify(base[k])){
            if(k==='name')state.account={...state.account,name:v};
            else state.account={...state.account,studioDetails:{...state.account.studioDetails,[k]:v}};
          }
        }else{
          for(const [k,v]of Object.entries(merged))if(JSON.stringify(v)!==JSON.stringify(base[k])){
            if(k==='retention')state.irpf=v;
            else if(k==='margin')state.defMargin=v;
            else if(k==='fc'||k==='ps')state.series={...state.series,[k]:v};
            else if(k.startsWith('emitter_'))state.emitter={...state.emitter,[k.slice(8)]:v};
            else state.account={...state.account,[k]:v};
          }
        }
        persistNow();
        for(let n=0;_cloudBusy&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,100));
        if(key!==sessionKey()||!isAdmin())throw C.problem('El acceso al estudio ha cambiado.');
        await cloudFlush();
        for(let n=0;_cloudBusy&&n<100;n++)await new Promise(resolve=>setTimeout(resolve,100));
        if(key!==sessionKey()||!isAdmin()||_cloudBusy||_saveErr||_cloudHash.config!==canon(CLOUD_BLOCKS.config.get()))throw C.problem('No hemos podido confirmar el guardado. Mantén esta pestaña abierta y vuelve a intentarlo.');
        start();message='Cambios guardados en el estudio.';
      }
      error=false;
    }catch(e){message=C.explain(e);error=true;}
    finally{busy=false;render();}
    return !error;
  }
  async function image(file,key){
    if(!file)return;const expectedOwner=owner,expectedDraft=draft;
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw C.problem('Elige un JPG, PNG o WebP de hasta 5 MB.');
      const bitmap=await createImageBitmap(file);const scale=Math.min(1,256/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const value=canvas.toDataURL('image/webp',0.85);if(value.length>180000)throw C.problem('La imagen es demasiado grande. Elige otra.');
      if(owner!==expectedOwner||draft!==expectedDraft)return;draft[key]=value;message='Imagen preparada. Pulsa Guardar cambios.';render();
    }catch(e){status(e.userMessage||'No se ha podido abrir esa imagen. Prueba con otro archivo.',true);}
  }
  function chrome(){
    document.body.classList.toggle('settings-mode',active());
    let switcher=document.getElementById('settings-switch');
    if(!switcher){switcher=document.createElement('details');switcher.id='settings-switch';switcher.className='settings-switch';document.querySelector('.sb-head').after(switcher);}
    const ws=visibleWsOrder(),name=state.account?.name||'Mi estudio',logo=state.account?.studioDetails?.logo;
    const html=`<summary aria-label="Menú del estudio"><span class="settings-initial">${logo?`<img ${fileImageAttrs(logo)} alt="">`:E(name.slice(0,2).toUpperCase())}</span><span class="settings-switch-name">${E(name)}</span>${icon('Flechas Menu.svg')}</summary><div class="settings-popup">${ws.length>1?'<button type="button" data-workspace="all">Todos los espacios</button>':''}${ws.map((k,i)=>`<button type="button" data-workspace="${i}" aria-pressed="${state.brandFilter===k}">${E(BRAND[k]?.name||'Espacio')}</button>`).join('')}<hr><button type="button" data-section="cuenta">${icon('Ajustes.svg')}Ajustes</button>${isAdmin()?`<button type="button" data-section="equipo">${icon('Invitar Usuario.svg')}Invitar al equipo</button>`:''}<button type="button" data-settings-action="notifications">${icon('Notificaciones.svg')}Notificaciones</button><button type="button" data-settings-action="logout">${icon('Cerrar Sesion.svg')}Cerrar sesión</button></div>`;
    if(switcher.dataset.html!==html){switcher.innerHTML=html;switcher.dataset.html=html;}
    let nav=document.getElementById('settings-nav');if(!nav){nav=document.createElement('nav');nav.id='settings-nav';nav.className='settings-nav';nav.setAttribute('aria-label','Ajustes');switcher.after(nav);}
    nav.innerHTML=`<button class="settings-back" type="button" data-settings-action="back" aria-label="Volver a la aplicación">${icon('arrow-back-up.svg')}<span class="settings-nav-label">Ajustes</span></button>`+sections.filter(s=>allowed(s[0])).map(([k,t,i])=>`<button type="button" data-section="${k}" title="${t}" ${k===section?'aria-current="page"':''}>${icon(i)}<span class="settings-nav-label">${t}</span></button>`).join('');
  }
  function theme(dark){if(document.body.classList.contains('dark')!==dark)themeToggle();try{localStorage.setItem('moderno.settings.theme',dark?'dark':'light');}catch{} }
  document.addEventListener('input',e=>{if(e.target.dataset.setting&&e.target.isConnected!==false&&draft&&!busy){const el=e.target;draft[el.dataset.setting]=el.type==='checkbox'?el.checked:el.value;status(dirty()?'Cambios sin guardar.':'Sin cambios pendientes.');}});
  document.addEventListener('change',e=>{if(e.target.dataset.photo)image(e.target.files[0],e.target.dataset.photo);if(e.target.dataset.setting&&e.target.isConnected!==false&&draft&&!busy){const el=e.target;draft[el.dataset.setting]=el.type==='checkbox'?el.checked:el.value;status(dirty()?'Cambios sin guardar.':'Sin cambios pendientes.');}});
  document.addEventListener('submit',e=>{if(e.target.id==='settings-form'){e.preventDefault();save();}});
  document.addEventListener('click',e=>{
    const bank=e.target.closest('[data-settings-bank]');if(bank&&draft&&section==='impuestos'&&!busy){draft.paymentIban=bank.dataset.settingsBank==='account'?state.account.iban:state.emitter.iban;status('Cuenta elegida. Pulsa Guardar cambios.');render();return;}
    const b=e.target.closest('[data-section],[data-settings-action],[data-workspace],[data-workspace-edit]');if(!b)return;
    if(b.dataset.section){open(b.dataset.section);return;}
    if(b.dataset.workspace!==undefined){discardThen(()=>{const k=b.dataset.workspace==='all'?'all':visibleWsOrder()[+b.dataset.workspace];if(k){state.brandFilter=k;render();document.getElementById('settings-switch').open=false;}});return;}
    if(b.dataset.workspaceEdit!==undefined){discardThen(()=>wsEditModal(visibleWsOrder()[+b.dataset.workspaceEdit]));return;}
    const a=b.dataset.settingsAction;
    if(a==='photo')document.getElementById('settings-photo').click();
    if(a==='reset')discardThen(()=>{start();render();});
    if(a==='back')discardThen(()=>{draft=null;go(canView(previous)&&!['admin','ajustes'].includes(previous)?previous:'home');document.body.classList.remove('sbopen');});
    if(a==='notifications')notifModal();
    if(a==='sync')syncDetails();
    if(a==='import')discardThen(()=>importDataModal());
    if(a==='history')open('historial');
    if(a==='trash')discardThen(()=>trashModal());
    if(a==='workspace')discardThen(()=>addWorkspace());
    if(a==='invite'){const input=document.getElementById('invMail');if(input.reportValidity())invEnviar();}
    if(a==='logout')discardThen(async()=>{if(await prepareAppReload())sbLogout();});
  });
  document.addEventListener('click',e=>{const d=document.getElementById('settings-switch');if(d&&!d.contains(e.target))d.open=false;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const d=document.getElementById('settings-switch');if(d?.open){d.open=false;d.querySelector('summary').focus();}}});
  window.addEventListener('beforeunload',e=>{if(dirty()||busy){e.preventDefault();e.returnValue='';}});
  const oldRender=render;render=function(){const result=oldRender.apply(this,arguments);chrome();if(active()&&personal.has(section)&&!metadata&&!_accessLoading&&profileAttempt!==sessionKey()+'|'+section)loadPersonal();return result;};
  const oldGo=go;go=function(v,arg){if(active()&&v!==state.view&&(dirty()||busy)){discardThen(()=>{draft=null;oldGo(v,arg);});return;}const out=oldGo(v,arg);if(active()&&!metadata)loadPersonal();return out;};
  const oldPrepare=prepareAppReload;prepareAppReload=async function(){if(dirty()||busy){toast('Guarda o descarta los cambios de Ajustes antes de actualizar.');return false;}return oldPrepare();};
  vAjustes=view;vAdmin=view;
  try{const t=localStorage.getItem('moderno.settings.theme');if(t)theme(t==='dark');}catch{}
  chrome();if(active()){render();loadPersonal();}
  return {open,view,save,theme,dirty};
})();
