/* Desktop project windows: session-only navigation, never project records or persistence. */
var ModernoProjectWorkspace=(()=>{
 'use strict';
 let enabled=true,owner='',bar=null,moved=[];
 const windows=new Map(),media=window.matchMedia('(min-width:1100px)');
 const $=selector=>document.querySelector(selector),key=id=>String(id);
 const projectViews=['proyecto','estancia'];
 const calculatorIds=['wpAn','wpAl','wpRw','wpRl','wpRp','ptM2','ptCap','ptRen','bdM2','bdCaja','bdMer'];
 const title=p=>[p.num,p.name].filter(Boolean).join(' ')||'Proyecto';
 const identity=()=>JSON.stringify([typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID,state.sessionUser?.id,state.sessionUser?.mail,_accessRole,state.myRole,state.brandFilter]);
 const sessionReady=()=>!_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&Boolean(state.sessionUser?.mail||state.sessionUser?.id)&&canView('proyecto');
 function active(){return enabled&&media.matches&&document.body.classList.contains('desktop-shell')&&sessionReady();}
 function projects(){return byBrand((state.projects||[]).filter(p=>!p.tpl));}
 function sync(){
  const next=identity();if(next!==owner){owner=next;windows.clear();}
  if(!sessionReady()){windows.clear();return [];}
  const pool=projects(),ids=new Set(pool.map(p=>key(p.id)));
  for(const id of windows.keys())if(!ids.has(id))windows.delete(id);
  return pool;
 }
 function current(){return projectViews.includes(state.view)?windows.get(key(state.currentProject)):null;}
 function capture(){
  if(!active())return;
  const item=current();if(!item)return;
  item.section=projectTabKey(state.projTab||'proyecto');item.view=state.view;item.room=state.currentRoom;item.scroll=$('.main')?.scrollTop||0;
  if(state.view==='proyecto'&&item.section==='utilidades')item.calculator=Object.fromEntries(calculatorIds.map(id=>[id,document.getElementById(id)?.value]).filter(([,value])=>value!==undefined));
 }
 function blocked(){
  if($('.overlay.open,dialog[open]')||state._welEdit&&$('#cliWelTa')){toast('Guarda o cancela la edición antes de cambiar de proyecto.');return true;}
  return false;
 }
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function button(label,fn,className=''){const el=node('button',className);el.type='button';el.setAttribute('aria-label',label);el.title=label;el.addEventListener('click',fn);return el;}
 function move(el,target){if(!el)return;const marker=document.createComment('project-workspace: original position');el.before(marker);moved.push({el,marker});target.append(el);}
 function restore(){for(const {el,marker} of moved.splice(0).reverse())if(marker.isConnected)marker.replaceWith(el);bar?.remove();bar=null;document.body.classList.remove('project-windows');}
 function closePicker(focus=false){const picker=bar?.querySelector('.pw-picker');if(!picker)return;picker.hidden=true;const plus=bar.querySelector('.pw-add');plus.setAttribute('aria-expanded','false');if(focus)plus.focus();}
 function focusCurrent(){(bar?.querySelector('[role=tab][aria-selected=true]')||bar?.querySelector('[role=tab]')||$('#projQBox'))?.focus({preventScroll:true});}
 function open(id){
  if(!active())return false;
  const pool=sync(),project=pool.find(p=>key(p.id)===key(id));if(!project||blocked())return false;
  if(projectViews.includes(state.view)&&key(state.currentProject)===key(id)){closePicker();focusCurrent();return true;}
  capture();const saved=windows.has(key(id))?{...windows.get(key(id))}:null;
  go('proyecto',project.id);
  if(state.view!=='proyecto'||key(state.currentProject)!==key(id))return false;
  const section=saved?.section||'proyecto';
  if(saved?.view==='estancia'&&(project.rooms||[]).some(r=>r.id===saved.room)){state.currentRoom=saved.room;go('estancia',project.id);}
  else if(projectTabKey(state.projTab)!==section)projTab(section);
  if(saved?.calculator&&state.view==='proyecto'&&state.projTab==='utilidades'){
   for(const id of calculatorIds){const input=document.getElementById(id);if(input&&saved.calculator[id]!==undefined)input.value=saved.calculator[id];}
   utilCalc();
  }
  const main=$('.main');if(main)main.scrollTop=saved?.scroll||0;
  focusCurrent();return true;
 }
 function close(id){
  if(!active())return false;sync();if(!windows.has(key(id))||blocked())return false;
  const ids=[...windows.keys()],index=ids.indexOf(key(id)),selected=projectViews.includes(state.view)&&key(state.currentProject)===key(id);
  if(selected){
   const next=ids[index+1]||ids[index-1];
   if(next){if(!open(next))return false;}
   else{go('proyectos');if(state.view!=='proyectos')return false;}
  }
  windows.delete(key(id));safeRefresh();focusCurrent();return true;
 }
 function listProjects(){if(blocked())return;capture();go('proyectos');}
 function picker(){
  const popup=node('section','pw-picker');popup.id='project-window-picker';popup.hidden=true;popup.setAttribute('aria-label','Abrir proyecto');
  const label=node('label','pw-search-label','Abrir proyecto');label.htmlFor='project-window-search';popup.append(label);
  const input=node('input');input.id='project-window-search';input.type='search';input.placeholder='Buscar por proyecto o cliente';input.setAttribute('aria-label','Buscar proyecto para abrir');popup.append(input);
  const results=node('div','pw-results');popup.append(results);
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function draw(){
   const q=norm(input.value),pool=sync().filter(p=>norm(title(p)+' '+(p.client||'')).includes(q));results.replaceChildren();
   for(const project of pool.slice(0,50)){
    const b=button('Abrir '+title(project),()=>open(project.id),'pw-project-choice');b.append(node('strong','',title(project)),node('span','',[project.client,project.status==='Archivado'?'Archivado':''].filter(Boolean).join(' · ')));results.append(b);
   }
   if(!pool.length)results.append(node('p','pw-empty','No hay proyectos que coincidan.'));
   if(pool.length>50)results.append(node('p','pw-empty','Hay más proyectos. Escribe para afinar la búsqueda.'));
  }
  input.addEventListener('input',draw);input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}});
  results.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const buttons=[...results.querySelectorAll('button')],index=buttons.indexOf(e.target);buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();});
  popup.draw=draw;return popup;
 }
 function refresh(){
  const pool=sync();restore();
  if(!active()||!['proyectos',...projectViews].includes(state.view))return;
  const project=projectViews.includes(state.view)?pool.find(p=>key(p.id)===key(state.currentProject)):null;
  if(project&&!windows.has(key(project.id)))windows.set(key(project.id),{section:projectTabKey(state.projTab||'proyecto'),view:state.view,room:state.currentRoom,scroll:0});
  const item=current();if(item){item.section=projectTabKey(state.projTab||'proyecto');item.view=state.view;item.room=state.currentRoom;}
  if(!windows.size||projectViews.includes(state.view)&&!project)return;
  bar=node('nav','project-window-bar');bar.id='project-window-bar';bar.setAttribute('aria-label','Proyectos abiertos');
  const all=button('Ver todos los proyectos',listProjects,'pw-all');all.innerHTML=ico('grid');bar.append(all);
  const tabs=node('div','pw-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Proyectos abiertos');bar.append(tabs);
  for(const id of windows.keys()){
   const p=pool.find(p=>key(p.id)===id),selected=project&&key(project.id)===id,wrap=node('div','pw-tab'+(selected?' is-active':''));wrap.setAttribute('role','presentation');
   const b=button(title(p),()=>open(p.id),'pw-tab-select');b.id='project-window-'+id;b.dataset.project=id;b.setAttribute('role','tab');b.setAttribute('aria-controls','view');b.setAttribute('aria-selected',String(Boolean(selected)));b.tabIndex=selected||!project&&id===windows.keys().next().value?0:-1;b.append(node('span','pw-tab-title',title(p)));
   const closeButton=button('Cerrar pestaña de '+title(p),()=>close(p.id),'pw-close');closeButton.dataset.project=id;closeButton.textContent='×';wrap.append(b,closeButton);tabs.append(wrap);
  }
  const plus=button('Abrir otro proyecto',()=>{const popup=bar.querySelector('.pw-picker'),opening=popup.hidden;closePicker();if(opening){popup.hidden=false;plus.setAttribute('aria-expanded','true');popup.draw();popup.querySelector('input').focus();}},'pw-add');plus.textContent='+';plus.setAttribute('aria-expanded','false');plus.setAttribute('aria-controls','project-window-picker');bar.append(plus,picker());
  const tools=node('div','pw-tools');bar.append(tools);
  const head=$('#view .project-detail-head');
  if(head&&project){
   move(head.querySelector('.project-options-control')||head.querySelector('.project-options'),tools);
   const retained=node('div','pw-retained-head');retained.hidden=true;bar.append(retained);move(head,retained);
  }
  document.body.append(bar);document.body.classList.add('project-windows');
  tabs.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 function safeRefresh(){try{refresh();}catch(error){enabled=false;restore();console.warn('Pestañas de proyectos desactivadas; se conserva la navegación anterior.',error);}}
 document.addEventListener('click',e=>{if(bar&&!bar.contains(e.target)){closePicker();bar.querySelectorAll('details[open]').forEach(d=>d.open=false);}});
 document.addEventListener('keydown',e=>{
  if(!bar||!bar.contains(e.target))return;
  if(e.key==='Escape'){if(!bar.querySelector('.pw-picker').hidden){e.preventDefault();closePicker(true);}return;}
  const tab=e.target.closest('[role=tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End','Delete'].includes(e.key))return;e.preventDefault();
  if(e.key==='Delete'){close(tab.dataset.project);return;}
  const buttons=[...bar.querySelectorAll('[role=tab]')],index=buttons.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();
 });
 document.addEventListener('scroll',e=>{if(e.target===$('.main'))capture();},true);
 const originalGo=go;go=function(){capture();return originalGo.apply(this,arguments);};
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 const originalEnable=ModernoDesktopShell.setEnabled;ModernoDesktopShell.setEnabled=function(){const result=originalEnable.apply(this,arguments);safeRefresh();return result;};
 media.addEventListener('change',safeRefresh);safeRefresh();
 return {active,open,close,refresh:safeRefresh,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
