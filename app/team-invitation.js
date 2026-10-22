/* Invitation links select a flow, never confer access. The database checks verified email and study. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModernoInvitations=api;})(typeof globalThis==='object'?globalThis:this,()=>{
 const storageKey='moderno_team_invitation';
 const email=value=>String(value||'').trim().toLowerCase();
 function valid(value){return !!value&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value.study)&&typeof value.email==='string'&&value.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email);}
 function parse(location){const p=new URLSearchParams(location.search||'');if(!p.has('invitacion')&&!p.has('correo'))return null;const value={study:p.get('invitacion'),email:email(p.get('correo'))};return valid(value)?value:{invalid:true};}
 function link(origin,value){if(!valid(value))throw Error('Invitación no válida');const url=new URL('/',origin);url.searchParams.set('invitacion',value.study);url.searchParams.set('correo',email(value.email));return url.href;}
 let pending=null,mode='new';
 if(typeof window!=='undefined'){
  pending=parse(window.location);
  if(pending){try{sessionStorage.setItem(storageKey,JSON.stringify(pending));}catch(e){}}
  else{try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(valid(saved))pending=saved;}catch(e){}}
 }
 function context(){return pending;}
 function assertUser(user){if(!pending)return;if(pending.invalid)throw Error('El enlace de invitación no es válido. Pide uno nuevo al administrador.');if(email(user?.email||user?.mail)!==pending.email)throw Error('Has iniciado sesión con otro correo. Cierra esa sesión y entra con la cuenta que recibió la invitación.');}
 function redirect(origin){if(pending)return link(origin,pending);return null;}
 function finish(study){if(!pending||pending.study!==study)return;pending=null;try{sessionStorage.removeItem(storageKey);const url=new URL(location.href);url.searchParams.delete('invitacion');url.searchParams.delete('correo');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch(e){}}
 function configure(){
  if(!pending)return;
  const screen=document.getElementById('loginScreen'),form=document.getElementById('lgAlt'),note=document.getElementById('login-invite-note');if(!screen||!form||!note)return;
  screen.classList.add('studio-login-invited');note.hidden=false;
  if(pending.invalid){note.textContent='El enlace de invitación no es válido. Pide uno nuevo al administrador.';form.hidden=true;document.querySelector('.studio-login-social').hidden=true;return;}
  note.querySelector('strong').textContent=pending.email;
  const field=document.getElementById('lgEmail');field.value=pending.email;field.required=false;field.readOnly=true;field.closest('.studio-login-field').hidden=true;
  document.getElementById('login-signup').hidden=true;document.getElementById('login-forgot').hidden=mode==='new';
  const confirm=document.getElementById('login-invite-confirm');confirm.hidden=mode!=='new';document.getElementById('lgPassConfirm').required=mode==='new';
  document.getElementById('lgPass').autocomplete=mode==='new'?'new-password':'current-password';
  document.getElementById('lgPass').minLength=mode==='new'?8:1;
  document.getElementById('login-invite-existing').textContent=mode==='new'?'Ya tengo cuenta':'Crear mi contraseña';
  const label=document.querySelector('#lg-mail [data-login-copy]');if(label){label.dataset.loginCopy=mode==='new'?'accept':'enter';label.textContent=mode==='new'?'Aceptar invitación':'Entrar';}document.dispatchEvent(new Event('moderno:login-mode'));
  form.onsubmit=event=>{event.preventDefault();if(mode==='new')submit();else sbMailLogin();};
  document.getElementById('login-invite-existing').onclick=()=>{mode=mode==='new'?'existing':'new';configure();};
 }
 async function submit(){
  if(!pending||pending.invalid||!sb){toast('No se pudo comprobar la invitación. Reintenta cuando haya conexión.');return;}
  const password=document.getElementById('lgPass').value,repeat=document.getElementById('lgPassConfirm').value;
  if(password.length<8){toast('La contraseña debe tener al menos 8 caracteres.');return;}
  if(password!==repeat){toast('Las contraseñas no coinciden.');document.getElementById('lgPassConfirm').focus();return;}
  const button=document.getElementById('lg-mail');if(button.disabled)return;button.disabled=true;
  try{
   const result=await sb.auth.signUp({email:pending.email,password,options:{emailRedirectTo:link(location.origin,pending)}});
   if(result.error)throw result.error;
   document.getElementById('lgPass').value='';document.getElementById('lgPassConfirm').value='';
   toast('Revisa el correo de la invitación para confirmar tu cuenta. Si ya tienes cuenta, pulsa «Ya tengo cuenta» o entra con Google.');
  }catch(e){toast('No se pudo completar el acceso. Prueba «Ya tengo cuenta» o solicita un nuevo enlace al administrador.');}
  finally{button.disabled=false;}
 }
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',configure);
 return {valid,parse,link,context,assertUser,redirect,finish,configure,submit};
});
