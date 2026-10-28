/* Study project map. Read-only, scoped to the current session and workspace. */
(function(root){
 'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const activeStatus=p=>!['Entregado','Archivado'].includes(p.status);
 function select(projects,filter='active',query=''){
  const q=norm(query).trim();return projects.filter(p=>(filter==='all'||filter==='active'&&activeStatus(p)||filter==='done'&&p.status==='Entregado'||filter==='archived'&&p.status==='Archivado'||filter==='attention'&&p.attention||filter==='missing'&&!String(p.addr||'').trim())&&(!q||norm([p.code,p.name,p.client,p.addr].join(' ')).includes(q)));
 }
 function summary(projects){const active=projects.filter(activeStatus),total=active.reduce((n,p)=>n+p.total,0),done=active.reduce((n,p)=>n+p.done,0);return {active:active.length,done:projects.filter(p=>p.status==='Entregado').length,attention:active.filter(p=>p.attention).length,progress:total?Math.round(done/total*100):0,total,missing:projects.filter(p=>!p.addr.trim()).length};}
 const icons={map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',panel:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/>',plus:'<path d="M12 5v14M5 12h14"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',arrow:'<path d="m7 17 10-10M7 7h10v10"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
 const icon=k=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]||''}</svg>`;
 function shell(){return `<section class="home-map" aria-label="Mapa de proyectos">
  <header class="hm-toolbar"><div class="hm-title"><strong>Tu estudio</strong><span>Mapa de proyectos</span></div><div class="hm-tools"><div class="hm-switch" role="group" aria-label="Vista de proyectos"><button type="button" data-hm-view="map" aria-label="Mapa" aria-pressed="true">${icon('map')}<span>Mapa</span></button><button type="button" data-hm-view="list" aria-label="Lista" aria-pressed="false">${icon('list')}<span>Lista</span></button></div><label class="hm-search">${icon('search')}<input type="search" aria-label="Buscar proyecto en el mapa" placeholder="Buscar proyecto"></label><select class="hm-filter" aria-label="Filtrar proyectos del mapa"><option value="active">Activos</option><option value="done">Terminados</option><option value="all">Todos</option><option value="archived">Archivados</option><option value="attention">Necesitan atención</option><option value="missing">Sin dirección</option></select><button type="button" data-hm-new aria-label="Nuevo proyecto" title="Nuevo proyecto" class="hm-new">${icon('plus')}<span>Nuevo proyecto</span></button></div></header>
  <div class="hm-workspace"><div class="hm-canvas" role="region" aria-label="Ubicaciones de los proyectos"></div><div class="hm-map-message" role="status">Preparando el mapa…</div><div class="hm-controls"><button type="button" data-hm-fit aria-label="Encuadrar todos los proyectos" title="Encuadrar proyectos">${icon('fit')}</button><button type="button" data-hm-zoom="1" aria-label="Acercar mapa">+</button><button type="button" data-hm-zoom="-1" aria-label="Alejar mapa">−</button></div>
  <button type="button" class="hm-panel-toggle" data-hm-panel aria-expanded="false">${icon('panel')}<span>Resumen del estudio</span></button>
  <aside class="hm-panel" aria-label="Resumen y proyectos"><div class="hm-panel-heading"><strong>Resumen del estudio</strong><button type="button" data-hm-panel aria-label="Ocultar resumen">${icon('close')}</button></div><div class="hm-summary"></div><div class="hm-project-list"></div></aside>
  <section class="hm-detail" aria-label="Proyecto seleccionado" hidden></section></div>
  <footer class="hm-footer"><span class="hm-count" role="status"></span><button type="button" data-hm-retry hidden>Reintentar ubicaciones</button><span>Ubicaciones según la dirección del proyecto</span></footer>
 </section>`;}
 let current=null,cacheOwner='',cache=new Map();
 function unmount(){const old=current;current=null;if(old){old.closed=true;old.engine?.destroy();old.observer?.disconnect();old.abort.abort();}}
 function mount(host,options){
  unmount();if(!host)return;const owner=options.identity();if(cacheOwner!==owner){cache.clear();cacheOwner=owner;}
  const ctx={host,options,owner,closed:false,engine:null,filter:host.querySelector('.hm-filter').value,query:host.querySelector('.hm-search input').value,view:host.classList.contains('hm-list-view')?'list':'map',selected:null,group:null,locations:new Map(),pending:new Set(),failed:new Set(),unresolved:new Set(),abort:new AbortController(),autoFit:true};current=ctx;
  const $=s=>host.querySelector(s),valid=()=>current===ctx&&!ctx.closed&&host.isConnected&&options.identity()===owner&&options.allowed();
  const all=()=>valid()?options.projects():[];
  const visible=()=>select(all(),ctx.filter,ctx.query);
  const position=p=>ctx.locations.get(p.addressQuery||p.addr);
  const hasAddress=p=>!!p.addr.trim();
  const btn=(id,label)=>`<button type="button" data-hm-project="${E(id)}">${label}</button>`;
  function card(p){return `<div class="hm-detail-top"><span>${E(p.code)}</span><button type="button" data-hm-close aria-label="Cerrar ficha">${icon('close')}</button></div><h2>${E(p.name)}</h2><p>${E(p.client||'Sin cliente asignado')}</p><div class="hm-detail-address">${icon('pin')}<span>${E(p.addr||'Sin dirección')}</span></div><span class="hm-status">${E(p.status)}</span><div class="hm-progress-row"><span>Avance del proyecto</span><strong>${p.progress} %</strong></div><progress value="${p.progress}" max="100" aria-label="Avance de ${E(p.name)}">${p.progress} %</progress><small>${p.total?`${p.done} de ${p.total} tareas completadas`:'Sin tareas registradas'}</small>${position(p)?'<small>Ubicación aproximada según la dirección.</small>':'<small>'+(!hasAddress(p)?'Añade una dirección para situarlo en el mapa.':ctx.failed.has(p.addressQuery||p.addr)?'No se pudo consultar esta ubicación.':ctx.unresolved.has(p.addressQuery||p.addr)?'No se ha encontrado una ubicación. Revisa la dirección.':'Ubicación pendiente de consultar.')+'</small>'}<button type="button" class="hm-open" data-hm-open="${E(p.id)}">Abrir proyecto ${icon('arrow')}</button>`;}
  function focus(id){if(!valid())return;const p=visible().find(p=>p.id===id);if(!p)return;ctx.selected=id;ctx.group=null;ctx.autoFit=false;host.classList.remove('hm-panel-open');const point=position(p);if(point&&ctx.engine){ctx.engine.focus(point);}drawDetail();drawList();}
  function choose(ids){if(!valid())return;if(ids.length===1){focus(ids[0]);return;}ctx.group=ids;ctx.selected=null;drawDetail();}
  function drawDetail(){if(ctx.group){const ps=visible().filter(p=>ctx.group.includes(p.id));const detail=$('.hm-detail');detail.hidden=!ps.length;detail.innerHTML='<div class="hm-detail-top"><span>Proyectos en esta zona</span><button type="button" data-hm-close aria-label="Cerrar ficha">'+icon('close')+'</button></div>'+ps.map(p=>'<button type="button" class="hm-open" data-hm-project="'+E(p.id)+'">'+E(p.code+' · '+p.name)+icon('arrow')+'</button>').join('');return;}const p=visible().find(p=>p.id===ctx.selected),detail=$('.hm-detail');detail.hidden=!p;if(p)detail.innerHTML=card(p);}
  function drawList(){const ps=visible();$('.hm-project-list').innerHTML=`<div class="hm-list-heading"><strong>Proyectos</strong><span>${ps.length}</span></div>`+(ps.map(p=>btn(p.id,`<span class="hm-project-glyph ${p.attention?'needs-attention':''}">${icon('pin')}</span><span class="hm-project-label"><strong>${E(p.name)}</strong><small>${E(p.code)} · ${E(p.client||p.status)}</small></span><span class="hm-project-percent">${p.progress} %<small>${position(p)?'En mapa':!hasAddress(p)?'Sin dirección':ctx.failed.has(p.addressQuery||p.addr)?'No disponible':ctx.unresolved.has(p.addressQuery||p.addr)?'Sin ubicar':ctx.mapFailed?'Sin consultar':'Ubicando…'}</small></span>`)).join('')||'<p class="hm-empty">No hay proyectos en esta selección.</p>');}
  function drawSummary(){const s=summary(all());$('.hm-summary').innerHTML=`<section class="hm-progress-card"><div class="hm-ring" style="--hm-progress:${s.progress*3.6}deg"><span><strong>${s.progress}%</strong><small>avance</small></span></div><div class="hm-summary-numbers"><span><i></i>Activos<strong>${s.active}</strong></span><span><i class="done"></i>Terminados<strong>${s.done}</strong></span><span><i class="attention"></i>Con avisos<strong>${s.attention}</strong></span></div><p>${s.total?'Avance de las tareas en proyectos activos':'Todavía no hay tareas en proyectos activos'}</p></section><div class="hm-summary-links"><button type="button" data-hm-filter="attention"><span>Necesitan atención</span><strong>${s.attention}</strong></button><button type="button" data-hm-filter="missing"><span>Sin dirección</span><strong>${s.missing}</strong></button></div>`;}
  function fit(){ctx.autoFit=true;const points=visible().map(position).filter(Boolean);if(points.length)ctx.engine?.fit(points);}
  function drawMap(){const ps=visible();if(ctx.engine)ctx.engine.markers(ps.filter(p=>position(p)).map(p=>({id:p.id,label:p.code||p.name,point:position(p),attention:p.attention})),choose);if(ctx.autoFit)fit();drawDetail();drawList();const located=ps.filter(p=>position(p)).length;$('.hm-count').textContent=`${located} de ${ps.length} proyectos ubicados`+ (ctx.pending.size?' · Buscando ubicaciones…':'');$('.hm-map-message').hidden=!!ctx.engine;$('.hm-controls').hidden=!ctx.engine;$('[data-hm-retry]').hidden=!ctx.failed.size;}
  async function resolveProjects(){
   if(ctx.resolving)return;ctx.resolving=true;const wanted=visible().filter(hasAddress);let cursor=0;
   async function worker(){while(valid()){
    const p=wanted[cursor++];if(!p)break;if(!visible().some(x=>x.id===p.id))continue;const key=p.addressQuery||p.addr;if(ctx.locations.has(key)||ctx.pending.has(key)||ctx.failed.has(key)||ctx.unresolved.has(key))continue;
    let record=cache.get(key);if(record&&Date.now()-record.time>15*60*1000){cache.delete(key);record=null;}
    ctx.pending.add(key);drawMap();
    if(!record){record={time:Date.now(),promise:Promise.resolve().then(()=>options.api().locate(key))};cache.set(key,record);}
    try{const point=await record.promise;if(!valid())return;if(point)ctx.locations.set(key,point);else ctx.unresolved.add(key);}
    catch{if(!valid())return;ctx.failed.add(key);if(cache.get(key)===record)cache.delete(key);}
    finally{ctx.pending.delete(key);if(valid())drawMap();}
   }}
   await Promise.all([worker(),worker()]);ctx.resolving=false;if(valid()&&visible().some(p=>hasAddress(p)&&!ctx.locations.has(p.addressQuery||p.addr)&&!ctx.failed.has(p.addressQuery||p.addr)&&!ctx.unresolved.has(p.addressQuery||p.addr)))resolveProjects();
  }
  function filter(value){ctx.filter=value;ctx.selected=null;ctx.group=null;ctx.autoFit=true;$('.hm-filter').value=value;drawMap();if(ctx.engine)resolveProjects();}
  host.addEventListener('input',e=>{if(!valid())return;if(e.target.matches('.hm-search input')){ctx.query=e.target.value;ctx.selected=null;ctx.group=null;drawMap();if(ctx.engine)resolveProjects();}},{signal:ctx.abort.signal});
  host.addEventListener('change',e=>{if(valid()&&e.target.matches('.hm-filter'))filter(e.target.value);},{signal:ctx.abort.signal});
  host.addEventListener('click',e=>{
   if(!valid())return;const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-hm-project'))focus(b.dataset.hmProject);
   if(b.hasAttribute('data-hm-open')){const p=all().find(p=>p.id===b.dataset.hmOpen);if(p)options.open(p.id);}
   if(b.hasAttribute('data-hm-close')){ctx.selected=null;ctx.group=null;drawDetail();}
   if(b.hasAttribute('data-hm-new'))options.create();
   if(b.hasAttribute('data-hm-fit'))fit();
   if(b.hasAttribute('data-hm-zoom')){ctx.autoFit=false;ctx.engine?.zoom(Number(b.dataset.hmZoom));}
   if(b.hasAttribute('data-hm-panel')){const expanded=host.classList.toggle('hm-panel-open');$('[data-hm-panel].hm-panel-toggle').setAttribute('aria-expanded',String(expanded));}
   if(b.hasAttribute('data-hm-filter'))filter(b.dataset.hmFilter);
   if(b.hasAttribute('data-hm-view')){ctx.view=b.dataset.hmView;host.classList.toggle('hm-list-view',ctx.view==='list');host.querySelectorAll('[data-hm-view]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.hmView===ctx.view)));ctx.engine?.resize();}
   if(b.hasAttribute('data-hm-retry')){ctx.failed.clear();resolveProjects();}
  },{signal:ctx.abort.signal});
  ctx.observer=new MutationObserver(()=>{if(current===ctx&&!host.isConnected)unmount();});ctx.observer.observe(host.parentElement,{childList:true});
  host.classList.remove('hm-map-unavailable');drawSummary();drawMap();
  if(!all().some(hasAddress)){ $('.hm-map-message').innerHTML=`${icon('pin')}<strong>${all().length?'Añade una dirección a tus proyectos':'Tu próximo proyecto empieza aquí'}</strong><span>Los proyectos aparecerán aquí al indicar su ubicación.</span>`;return;}
  (async()=>{try{
   const api=options.api();if(!await api?.available())throw Error('Map unavailable');if(!valid())return;
   const engine=await api.createMap($('.hm-canvas'),()=>{ctx.autoFit=false;});if(!valid()){engine.destroy();return;}ctx.engine=engine;drawMap();await resolveProjects();
  }catch{if(valid()){ctx.mapFailed=true;drawList();$('.hm-map-message').innerHTML=`${icon('map')}<strong>No se pudo cargar el mapa</strong><span>Puedes consultar y abrir los proyectos en la lista.</span><button type="button" data-hm-reload>Reintentar mapa</button>`;host.classList.add('hm-map-unavailable');$('.hm-map-message button').onclick=()=>{if(valid())mount(host,options);};$('.hm-controls').hidden=true;}}})();
 }
 root.ModernoHomeMap={shell,mount,unmount,select,summary};
 if(typeof module!=='undefined')module.exports={select,summary};
})(globalThis);
