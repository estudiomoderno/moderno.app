/* New project drawer: session-only draft, existing creation and save contracts. */
(function(root){
 'use strict';
 const types=['Interiorismo','Reforma integral','Reforma parcial','Obra nueva','Decoración','Paisajismo','Otro'];
 const ids={brand:'npBrand',name:'npName',client:'npClient',street:'npStreet',number:'npNumber',address2:'npAddress2',city:'npCity',province:'npProvince',cp:'npCp',country:'npCountry',placeId:'npPlaceId',type:'npType',from:'npFrom',template:'npTpl'};
 let draft=null,owner='',resume=null,ui=null;
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const identity=()=>JSON.stringify([typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID,state.sessionUser?.id,state.sessionUser?.mail,_accessRole]);
 const allowed=()=>!_accessLoading&&['admin','colaborador','miembro'].includes(_accessRole)&&canView('proyecto');
 function nextNumber(brand){let n=Math.max(1,Number(nextProjNum(brand))||1);const taken=new Set(state.projects.filter(p=>!p.tpl&&p.brand===brand).map(p=>p.num));while(taken.has(projPre(brand)+'-'+n))n++;return n;}
 function code(brand){return projPre(brand)+'-'+nextNumber(brand);}
 function formatAddress(value){return [[value.street,value.number].map(x=>String(x||'').trim()).filter(Boolean).join(' '),value.address2,value.city,value.province,value.cp,value.country].map(x=>String(x||'').trim()).filter(Boolean).join(', ');}
 // Recover only the address layout we can identify from existing city/country/CP.
 // Older free text is kept whole, and never reformatted merely by opening/saving.
 function addressFields(project){
  const raw=String(project.addr||''),value={street:raw,number:'',address2:'',city:String(project.city||''),province:'',cp:String(project.cp||''),country:String(project.country||''),placeId:''};
  const parts=raw.split(',').map(s=>s.trim());
  for(const key of ['country','cp'])if(value[key]&&parts.at(-1)===value[key])parts.pop();
  const cityIndex=value.city?(parts.length>=3&&parts.at(-2)===value.city?parts.length-2:parts.lastIndexOf(value.city)):-1;
  if(cityIndex>0&&parts.length-cityIndex<=2){
   value.province=parts[cityIndex+1]||'';
   value.address2=parts.slice(1,cityIndex).join(', ');
   value.street=parts[0];
  }else if(parts.length===1){value.street=parts[0];}
  else return value;
  const number=value.street.match(/^(.*?)\s+(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)$/);
  if(number){value.street=number[1];value.number=number[2];}
  // Lossless decoding is required; ambiguous historical strings stay untouched.
  if(formatAddress(value)!==raw.trim())return {...value,street:raw,number:'',address2:'',province:''};
  return value;
 }
 function data(){return draft&&owner===identity()?{...draft}:null;}
 function props(){const brands=visibleWsOrder().map(key=>({key,name:BRAND[key]?.name||'Mi espacio',code:code(key)}));return {draft:{...draft},brands,types,clients:state.clients.filter(c=>c.type==='Cliente').map(c=>c.name),templates:state.projects.filter(p=>p.tpl).map(p=>({id:String(p.id),name:p.name})),onChange:change,onCreate:()=>queueMicrotask(()=>createProject()),onCancel:()=>queueMicrotask(()=>closeModal()),onNewClient:()=>queueMicrotask(createClient)};}
 function cleanup(){const entry=ui;ui=null;if(entry){entry.component?.unmount();entry.host.remove();}document.getElementById('overlay')?.classList.remove('new-project-enhanced-overlay','new-project-native-overlay');document.getElementById('modalBox')?.classList.remove('new-project-enhanced','new-project-native');document.getElementById('modalBox')?.removeAttribute('aria-hidden');}
 function change(key,value){if(!draft||owner!==identity()||!Object.hasOwn(ids,key))return;if(['street','number','city','province','cp','country'].includes(key))draft.placeId='';draft[key]=String(value);const field=document.getElementById(ids[key]);if(field&&field.value!==String(value))field.value=String(value);const pr=document.getElementById('npCode');if(pr)pr.value=code(draft.brand);const select=document.getElementById('np-template-field');if(select)select.hidden=draft.from!=='tpl';}
 function nativeHtml(){
  const options=(values,value)=>values.map(([v,label])=>`<option value="${E(v)}" ${String(value)===String(v)?'selected':''}>${E(label)}</option>`).join('');
  const field=(key,label,auto='',placeholder='')=>`<div class="new-project-field"><label for="${ids[key]}">${E(label)}</label><input id="${ids[key]}" name="${key}" value="${E(draft[key])}" autocomplete="${auto||'off'}" placeholder="${E(placeholder)}" ${key==='name'?'required maxlength="200"':''}></div>`;
  const brands=visibleWsOrder();return `<form id="new-project-native-form" onsubmit="event.preventDefault();createProject()"><header><h3>Nuevo proyecto</h3><button type="button" class="new-project-close" aria-label="Cerrar" onclick="closeModal()">×</button></header><div class="new-project-native-body">
  ${brands.length>1?`<div class="new-project-field"><label for="npBrand">Serie</label><select id="npBrand" name="brand">${options(brands.map(k=>[k,BRAND[k]?.name||k]),draft.brand)}</select></div>`:''}
  <div class="new-project-field"><label for="npCode">PR</label><input id="npCode" value="${E(code(draft.brand))}" readonly aria-readonly="true"></div>
  ${field('name','Nombre del proyecto','','Ej: Reforma calle Maestra')}
  <div class="new-project-field"><label for="npClient">Cliente</label><div class="new-project-client-row"><input id="npClient" name="client" list="npCliList" autocomplete="off" value="${E(draft.client)}" placeholder="Buscar cliente"><button type="button" class="btn btn-ghost" aria-label="Crear cliente nuevo" onclick="ModernoNewProject.createClient()">+</button></div><datalist id="npCliList">${state.clients.filter(c=>c.type==='Cliente').map(c=>`<option value="${E(c.name)}"></option>`).join('')}</datalist></div>
  <fieldset><legend>Dirección del proyecto</legend>${field('street','Calle','section-project address-line1')}<div class="new-project-two-col">${field('number','Número')}${field('city','Ciudad','section-project address-level2')}</div>${field('address2','Dirección 2','off','Portal, piso, puerta…')}<div class="new-project-two-col">${field('province','Provincia','section-project address-level1')}${field('cp','Código postal','section-project postal-code')}</div>${field('country','País','section-project country-name')}</fieldset>
  <div class="new-project-field"><label for="npType">Tipo de proyecto</label><select id="npType" name="type"><option value="">Seleccionar tipo</option>${options(types.map(t=>[t,t]),draft.type)}</select></div>
  <p id="new-project-error" role="alert"></p></div><footer class="modal-foot"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn projects-new">Crear proyecto</button></footer></form>`;
 }
 function open(preClient,templateId){
  if(!allowed())return;const saved=templateId==null&&resume&&resume.owner===identity()?resume.draft:null;resume=null;
  draft=saved?{...saved}:{brand:visibleWsOrder()[0],name:'',client:'',street:'',number:'',address2:'',city:'',province:'',cp:'',country:'',placeId:'',type:'',from:'blank',template:String(state.projects.find(p=>p.tpl)?.id||'')};
  if(templateId!=null){const template=state.projects.find(p=>p.tpl&&String(p.id)===String(templateId));if(!template){toast('Esta plantilla ya no está disponible.');return;}draft.from='tpl';draft.template=String(template.id);}
  if(preClient!=null)draft.client=String(preClient);owner=identity();
  modal(nativeHtml());const box=document.getElementById('modalBox'),overlay=document.getElementById('overlay');box.classList.add('new-project-native');overlay.classList.add('new-project-native-overlay');
  const form=document.getElementById('new-project-native-form');for(const event of ['input','change'])form.addEventListener(event,e=>{if(e.target?.name)change(e.target.name,e.target.value);});
  if(!root.ModernoProfileComponent?.mountNewProject){document.getElementById('npName')?.focus();return;}
  const host=document.createElement('span');host.className='new-project-sheet-host';document.body.append(host);const entry={host,component:null};ui=entry;
  const recover=()=>queueMicrotask(()=>{if(ui!==entry)return;cleanup();box.classList.add('new-project-native');overlay.classList.add('new-project-native-overlay');document.getElementById('npName')?.focus();});
  const ready=()=>{if(ui!==entry)return;box.classList.add('new-project-enhanced');overlay.classList.add('new-project-enhanced-overlay');box.removeAttribute('aria-modal');box.setAttribute('aria-hidden','true');entry.component.update(props());};
  try{entry.component=ModernoProfileComponent.mountNewProject(host,recover,ready);}catch{recover();}
 }
 function validate(){
  if(!data()||!allowed()){toast('La sesión ha cambiado. Vuelve a abrir Nuevo proyecto.');return false;}
  let error='';if(!visibleWsOrder().includes(draft.brand))error='Selecciona una serie disponible.';else if(!draft.name.trim())error='Escribe el nombre del proyecto.';else if(draft.name.trim().length>200)error='El nombre es demasiado largo.';else if(draft.type&&!types.includes(draft.type))error='Selecciona un tipo de proyecto válido.';
  if(error){toast(error);const field=document.getElementById('new-project-error');if(field)field.textContent=error;return false;}return true;
 }
 function createClient(){if(!data())return;resume={owner,draft:{...draft}};state.afterClient='newproject';closeModal();clientModal(-1,'Cliente');const cancel=document.querySelector('#modalBox .modal-foot .btn-ghost');if(cancel)cancel.onclick=()=>{state.afterClient=null;closeModal();open();};}
 function created(){draft=null;resume=null;}
 root.ModernoNewProject={open,openTemplate:id=>open(undefined,id),cleanup,change,data,validate,code,nextNumber,formatAddress,addressFields,createClient,created,types};
 if(typeof module!=='undefined')module.exports={formatAddress,addressFields,types};
})(typeof globalThis!=='undefined'?globalThis:this);
