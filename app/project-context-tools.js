/* Contextual project shortcuts reuse the exact dock surface used by the plan editor. */
var ModernoProjectContextTools=(()=>{
 const paths={
  plus:'<path d="M12 5v14M5 12h14"/>',tasks:'<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',import:'<path d="M12 3v12m-4-4 4 4 4-4M5 19h14"/>',export:'<path d="M12 21V9m-4 4 4-4 4 4M5 5h14"/>',cart:'<path d="M3 4h2l2 11h10l3-8H6M9 20h.01M17 20h.01"/>',users:'<path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21v-2a6 6 0 0 1 12 0v2m2-7a5 5 0 0 1 5 5v2"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',share:'<path d="M15 8l5-5m0 0h-5m5 0v5M20 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"/>',book:'<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5Zm0 16a2 2 0 0 1 2-2h14"/>',presentation:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21l4-5 4 5M7 8h10M7 12h6"/>',calculator:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',money:'<path d="M3 6h18v12H3zM7 10h.01M17 14h.01"/><circle cx="12" cy="12" r="2"/>',invoice:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',report:'<path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7"/>',upload:'<path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',phase:'<path d="M4 6h16M4 12h12M4 18h8"/>',timeline:'<path d="M4 6h8M8 6v12M8 12h8M8 18h12"/>'
 };
 let entry=null,token=0,resizeObserver=null;
 const project=()=>state.projects?.find(item=>item.id===state.currentProject);
 const actualTab=()=>state.view==='estancia'?'listas':projectTabKey(state.projTab||'proyecto');
 function focus(selector,message){const node=document.querySelector(selector);if(!node){if(message)toast(message);return;}node.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});node.focus?.();}
 function config(tab,p){
  const pid=p.id,room=state.view==='estancia';
  const all={
   tareas:[[
    ['Nueva tarea','plus',()=>taskModal(pid,-1,'pend')],['Importar tareas','import',()=>taskImportModal(pid)]
   ],[
    ['Mis tareas','tasks',()=>go('tareas')]
   ]],
   listas:[[
    room?['Añadir producto','plus',()=>shoppingRoomAddProduct()]:['Crear nueva lista','plus',()=>newRoom(pid,'estancia')],
    ['Pedidos','cart',()=>ProductOps.open(String(pid))]
   ],[
    ['Proveedores','users',()=>{state.agendaTab='Proveedores';state.agQ='';go('agenda');}],room?['Exportar lista','export',()=>exportRoomModal()]:['Exportar listas','export',()=>shoppingListExport(pid)]
   ]],
   diario:[[
    ['Nueva visita','plus',()=>projectDiaryOpen(pid)]
   ]],
   obra:[[
    ['Nueva fase','phase',()=>focus('#obraNewFase','Abre Seguimiento de obra para crear una fase')],
    ['Cronograma','timeline',()=>obraPlanToggle(pid),()=>Boolean(state.planOpen?.[pid])]
   ],[
    ['Contratistas','users',()=>obraAgendaModal(pid)],['Compartir','share',()=>obraShareModal(pid)]
   ],[
    ['Importar fases','import',()=>obraImportModal(pid)],['Exportar fases','export',()=>obraExportModal(pid)]
   ]],
   calobra:[[
    ['Nuevo evento','calendar',()=>calAddEvent(new Date().toISOString().slice(0,10))],['Exportar calendario','export',()=>obraIcs(pid)]
   ]],
   pres:[[
    ['Nueva presentación','presentation',()=>presNew(pid)]
   ]],
   utilidades:[[
    ['Calculadoras','calculator',()=>focus('#wpAn')]
   ]],
   fin:[[
    ['Nuevo presupuesto','plus',()=>{state.qView='nuevo';go('presupuestos');}],['Gastos','money',()=>go('contabilidad')]
   ],[
    ['Facturas','invoice',()=>go('facturas')],['Informes','report',()=>go('informes')]
   ]],
   archivos:[[
    ['Subir archivo','upload',()=>document.querySelector('.project-file-add[data-section="archivos"] input[type="file"]')?.click()]
   ]],
   cliente:[[
    ['Vista cliente','eye',()=>{persistNow();cloudFlush();window.open(cliLink(project()),'_blank','noopener');}],
    ['Copiar enlace','copy',async()=>{const link=cliLink(project());if(navigator.clipboard)await navigator.clipboard.writeText(link);toast('Enlace copiado ✓');}]
   ]]
  };
  return all[tab]||null;
 }
 function button([label,icon,run,pressed]){
  const node=document.createElement('button');node.type='button';node.className='plan-icon-button';node.title=label;node.setAttribute('aria-label',label);if(pressed)node.setAttribute('aria-pressed',String(Boolean(pressed())));node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[icon]||'')+'</svg>';
  node.addEventListener('click',async()=>{try{await run();sync();}catch(error){console.error(error);toast('No se pudo completar la acción');}});return node;
 }
 function restoreDock(current){if(!current)return;const {dock,originalLeft,originalTransition}=current;if(dock?.isConnected){dock.style.left=originalLeft;dock.style.transition=originalTransition;}}
 function clearClasses(){document.body.classList.remove('project-context-active','project-context-dock-joined');}
 async function remove(current,animate=true){
  if(!current)return;resizeObserver?.disconnect();resizeObserver=null;current.bar.classList.remove('is-mounted');current.bar.classList.add('is-leaving');restoreDock(current);current.surface.hidden=true;clearClasses();
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,220));
  current.bar.remove();current.surface.remove();if(entry===current)entry=null;
 }
 function position(current){
  if(entry!==current||!current.dock?.isConnected||!current.bar.isConnected)return;
  const bounds=(document.querySelector('#project-tab-panel')||document.querySelector('.project-detail')||document.querySelector('.main')).getBoundingClientRect(),dockWidth=current.dock.offsetWidth||0;
  current.bar.style.width='';current.bar.style.maxWidth=Math.max(0,bounds.width-16)+'px';const barWidth=Math.min(current.bar.scrollWidth,bounds.width-16),combined=dockWidth+barWidth;
  if(combined<=bounds.width-16){const start=bounds.left+(bounds.width-combined)/2;current.dock.style.left=start+dockWidth/2+'px';current.bar.style.left=start+dockWidth-1+'px';current.bar.classList.remove('is-detached-compact');current.surface.hidden=false;current.surface.style.left=start+'px';current.surface.style.width=combined+'px';document.body.classList.add('project-context-dock-joined');}
  else{current.dock.style.left=current.originalLeft;current.bar.style.left=bounds.left+8+'px';current.bar.style.width=Math.max(0,bounds.width-16)+'px';current.bar.classList.add('is-detached-compact');current.surface.hidden=true;document.body.classList.remove('project-context-dock-joined');}
 }
 function mount(tab,p,groups){
  const dock=document.querySelector('.project-dock');if(!dock)return;const bar=document.createElement('div');bar.className='plan-viewer-bar project-context-tools';bar.dataset.module=tab;bar.setAttribute('aria-label','Herramientas de '+tab);const toolbox=document.createElement('div');toolbox.className='plan-toolbox';bar.append(toolbox);
  groups.forEach((group,index)=>{if(index){const separator=document.createElement('span');separator.className='plan-tool-separator';separator.setAttribute('role','separator');separator.setAttribute('aria-orientation','vertical');toolbox.append(separator);}const box=document.createElement('div');box.className='plan-tool-group project-context-group';box.style.gridTemplateColumns='repeat('+Math.max(1,Math.ceil(group.length/2))+',32px)';box.setAttribute('role','group');group.forEach(action=>box.append(button(action)));toolbox.append(box);});
  const surface=document.createElement('div');surface.className='plan-dock-unified-surface';surface.hidden=true;document.body.append(surface,bar);const current={key:tab+'|'+p.id+'|'+state.view,dock,bar,surface,originalLeft:dock.style.left||'',originalTransition:dock.style.transition||''};entry=current;document.body.classList.add('project-context-active');dock.style.transition='left .22s ease';position(current);requestAnimationFrame(()=>requestAnimationFrame(()=>bar.classList.add('is-mounted')));resizeObserver=new ResizeObserver(()=>position(current));resizeObserver.observe(document.querySelector('#project-tab-panel')||document.querySelector('.project-detail'));resizeObserver.observe(dock);window.addEventListener('resize',current.onResize=()=>position(current));
  const cleanup=current.cleanup=()=>window.removeEventListener('resize',current.onResize);
  new MutationObserver((records,observer)=>{if(bar.isConnected)return;observer.disconnect();cleanup();if(entry===current){restoreDock(current);current.surface.remove();clearClasses();entry=null;}}).observe(document.body,{childList:true,subtree:true});
 }
 function sync(){
  const run=++token;requestAnimationFrame(async()=>{if(run!==token)return;const p=project(),tab=p?actualTab():null,groups=p&&state.view!=='presedit'&&!document.body.classList.contains('plan-editor-active')?config(tab,p):null,key=groups?tab+'|'+p.id+'|'+state.view:null;
   if(entry?.key===key&&entry.dock?.isConnected){position(entry);return;}const old=entry;if(old){old.cleanup?.();await remove(old,true);}if(run!==token||!groups||!groups.some(group=>group.length))return;mount(tab,p,groups);
  });
 }
 function destroy(){token++;if(entry){entry.cleanup?.();void remove(entry,false);}}
 return {sync,destroy,config:tab=>{const p=project();return p?config(tab,p):null;}};
})();
