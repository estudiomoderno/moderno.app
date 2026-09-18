/* Project overview and private study activity; no schema migration. */
(function(root){
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const people=t=>Array.isArray(t.assignees)?t.assignees:(t.assignee?[t.assignee]:[]);
 const events=p=>(Array.isArray(p.comments)?p.comments:[]).filter(x=>String(x.cid||'').startsWith('project-change-'));
 function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v}
 function metrics(p,day=today()){
  const tasks=p.tasks||[],open=tasks.filter(t=>t.col!=='listo'),dated=open.filter(t=>validDate(t.due)).sort((a,b)=>a.due.localeCompare(b.due));
  const dates=[p.createdAt,...events(p).map(e=>e.ts),...(p.chat||[]).map(e=>e.ts),...tasks.flatMap(t=>(t.comments||[]).map(c=>c.ts))].map(x=>typeof x==='number'?x:Date.parse(x)).filter(Number.isFinite);
  const last=dates.length?Math.max(...dates):null;
  return {pending:open.length,total:tasks.length,progress:tasks.length?Math.round((tasks.length-open.length)/tasks.length*100):0,overdue:dated.filter(t=>t.due<day).length,next:dated.find(t=>t.due>=day)||null,last,stale:!!last&&Date.parse(day)-last>=14*86400000&&!['Archivado','Entregado'].includes(p.status)};
 }
 function matches(p,f,attention=false){return (!f.client||p.client===f.client)&&(!f.status||p.status===f.status)&&(!f.person||(p.tasks||[]).some(t=>people(t).includes(f.person)))&&(!f.attention||attention||metrics(p).overdue>0||metrics(p).stale)}
 function snapshot(p){return JSON.parse(JSON.stringify({name:p.name,client:p.client,status:p.status,color:p.color,tags:p.tags,tasks:(p.tasks||[]).map(t=>({id:t.id,title:t.title,col:t.col,due:t.due,assignees:people(t)}))}))}
 function changes(a,b){const out=[],label={name:'Nombre',client:'Cliente',status:'Estado',color:'Color de carpeta',tags:'Etiquetas',title:'Título',col:'Estado',due:'Fecha',assignees:'Participantes'};
 const value=v=>Array.isArray(v)?(v.join(', ')||'Sin definir'):({pend:'Pendiente',prog:'En progreso',rev:'En revisión',listo:'Terminada'}[v]||(validDate(v)?v.split('-').reverse().join('/'):String(v??'Sin definir'))||'Sin definir');
 for(const k of ['name','client','status','color','tags'])if(JSON.stringify(a[k])!==JSON.stringify(b[k]))out.push(`${label[k]}: ${value(a[k])} → ${value(b[k])}`);
 const old=new Map((a.tasks||[]).map((t,i)=>[String(t.id??'index-'+i),t]));
 (b.tasks||[]).forEach((t,i)=>{const key=String(t.id??'index-'+i),prev=old.get(key);if(!prev)out.push('Tarea añadida: '+t.title);else{for(const k of ['title','col','due','assignees'])if(JSON.stringify(prev[k])!==JSON.stringify(t[k]))out.push(`${t.title} · ${label[k]}: ${value(prev[k])} → ${value(t[k])}`);old.delete(key)}});
 old.forEach(t=>out.push('Tarea eliminada: '+t.title));return out;
 }
 root.ModernoProjectInsights={escape,today,people,events,metrics,matches,snapshot,changes,validDate};
})(globalThis);
function projectChangeStart(p){return ModernoProjectInsights.snapshot(p)}
function projectChangeEnd(p,before){if(!p||!before)return;const lines=ModernoProjectInsights.changes(before,ModernoProjectInsights.snapshot(p));if(!lines.length)return;
 p.comments=p.comments||[];p.comments.push({cid:'project-change-'+crypto.randomUUID(),who:meName(),ts:Date.now(),txt:lines.join('\n')});persistSoon();
}
function projectFilterKey(){return 'moderno-project-filters-'+ESTUDIO_ID+'-'+(state.sessionUser?.id||meMail())+'-'+state.brandFilter}
function projectFilters(){try{const f=JSON.parse(localStorage.getItem(projectFilterKey())||'{}');if(!f||typeof f!=='object'||Array.isArray(f))return {};return Object.fromEntries(Object.entries(f).filter(([k,v])=>['client','status','person'].includes(k)?typeof v==='string':k==='attention'&&typeof v==='boolean'))}catch{return {}}}
function projectFilterSet(k,v){const f=projectFilters();if(k==='reset'){for(const key of Object.keys(f))delete f[key]}else f[k]=v;try{localStorage.setItem(projectFilterKey(),JSON.stringify(f))}catch{}render()}
var projectFiltersExpanded=false;
function projectFiltersToggle(button){projectFiltersExpanded=!projectFiltersExpanded;button.setAttribute("aria-expanded",String(projectFiltersExpanded));button.parentElement.classList.toggle("expanded",projectFiltersExpanded)}
function projectFiltersHtml(){const E=ModernoProjectInsights.escape,f=projectFilters(),ps=byBrand(state.projects.filter(p=>!p.tpl));
 const select=(key,label,values)=>`<label>${label}<select onchange="projectFilterSet('${key}',this.value)"><option value="">Todos</option>${[...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${E(v)}" ${f[key]===v?'selected':''}>${E(v)}</option>`).join('')}</select></label>`;
 return `<div class="project-filters-wrap ${projectFiltersExpanded?'expanded':''}"><button class="btn btn-ghost project-filters-toggle" aria-expanded="${projectFiltersExpanded}" onclick="projectFiltersToggle(this)">Filtros${Object.values(f).filter(Boolean).length?' · '+Object.values(f).filter(Boolean).length+(Object.values(f).filter(Boolean).length===1?' activo':' activos'):''}</button><div class="project-filters">${select('person','Responsable de tareas',ps.flatMap(p=>(p.tasks||[]).flatMap(ModernoProjectInsights.people)))}${select('client','Cliente',ps.map(p=>p.client))}${select('status','Estado',ps.map(p=>p.status))}<button class="btn ${f.attention?'btn-dark':'btn-ghost'}" aria-pressed="${!!f.attention}" onclick="projectFilterSet('attention',${!f.attention})">Necesitan atención</button>${Object.values(f).some(Boolean)?`<button class="btn btn-ghost" onclick="projectFilterSet('reset','')">Quitar filtros</button>`:''}</div></div>`;
}
function projectPendingQuotes(p){return _accessRole==='admin'?(state.quotes||[]).filter(q=>q.projectId===p.id&&(q.status||'pend')==='pend'&&!quoteInvoice(q)):[]}
function projectAlerts(p,includeQuotes=true){const m=ModernoProjectInsights.metrics(p),bits=[],qs=includeQuotes?projectPendingQuotes(p):[];if(qs.length)bits.push(qs.length+' presupuesto'+(qs.length===1?' pendiente':'s pendientes'));if(m.overdue)bits.push(m.overdue+' tarea'+(m.overdue===1?' vencida':'s vencidas'));return (bits.length?'<span class="project-alert">'+bits.join(' · ')+'</span>':'')+(m.stale?'<span class="project-alert project-alert-inactivity">Sin actividad registrada en 14 días</span>':'')}
function projectOverview(p){const E=ModernoProjectInsights.escape,m=ModernoProjectInsights.metrics(p),finance=_accessRole==='admin';
 const qs=projectPendingQuotes(p);
 const refs=new Set(finance?(state.invoices||[]).filter(f=>f.projectId===p.id).map(f=>f.ref).filter(Boolean).concat(planHitos(p).map(h=>h.invRef).filter(Boolean)):[]);
 const amount=finance?(state.entries||[]).filter(e=>e.kind==='in'&&(e.pid===p.id||e.link===p.num||refs.has(e.link))).reduce((n,e)=>n+pendienteCobro(e),0):0;
 return `<section class="project-overview" aria-label="Resumen del proyecto"><div><small>Próxima fecha</small><strong>${m.next?E(m.next.due.split('-').reverse().join('/')):'Sin fecha prevista'}</strong><span>${m.next?E(m.next.title):'Asigna una fecha a las tareas pendientes'}</span></div><div><small>Tareas pendientes</small><strong>${m.pending}</strong><button class="btn btn-ghost" onclick="projTab('tareas')">Ver tareas</button></div><div><small>Avance de tareas</small><strong>${m.progress}%</strong><progress max="100" value="${m.progress}" aria-label="Avance de tareas"></progress><span>${m.total?'Calculado sobre '+m.total+' tareas':'Sin tareas todavía'}</span></div>${finance?`<div><small>Pendiente de cobro registrado</small><strong>${fmt(amount)}</strong><button class="btn btn-ghost" onclick="projTab('fin')">Ver finanzas</button></div>`:''}</section><div class="project-attention">${projectAlerts(p,false)}${qs.length?`<button class="btn btn-ghost" onclick="projTab('fin')">${qs.length} presupuesto${qs.length===1?' pendiente':'s pendientes'} de respuesta</button>`:''}<button class="btn btn-ghost" onclick="projectHistory(${Number(p.id)})">Historial de cambios</button></div>`;
}
function projectHistory(id){const p=state.projects.find(x=>x.id===id);if(!p)return;const E=ModernoProjectInsights.escape,ev=ModernoProjectInsights.events(p).slice().sort((a,b)=>b.ts-a.ts);
 modal(`<h3>Historial de ${E(p.num)}</h3><p>Registro informativo de cambios de datos, carpeta y tareas desde esta versión. Los cambios antiguos no se reconstruyen.</p><div class="project-history">${ev.map(e=>`<article><b>${E(e.who||'Usuario')}</b> · <time>${E(new Date(e.ts).toLocaleString())}</time><p>${E(e.txt).replace(/\n/g,'<br>')}</p></article>`).join('')||'<p>Todavía no hay cambios registrados.</p>'}</div><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>`);
}

const projectNoticeCounts=new Map();
function projectFolderNotifications(p){
 const E=ModernoProjectInsights.escape,m=ModernoProjectInsights.metrics(p),qs=projectPendingQuotes(p),count=m.overdue+qs.length+(m.stale?1:0);
 const key=(typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID)+'/'+(state.sessionUser?.id||'')+'/'+p.id,previous=projectNoticeCounts.get(key)||0;projectNoticeCounts.set(key,count);
 if(!count)return '';
 const changed=count!==previous,increased=count>previous;
 const overdue=(p.tasks||[]).filter(t=>t.col!=='listo'&&ModernoProjectInsights.validDate(t.due)&&t.due<ModernoProjectInsights.today());
 const items=overdue.map(t=>'<li><b>Tarea vencida</b><span>'+E(t.title||'Tarea')+' · '+E(t.due.split('-').reverse().join('/'))+'</span></li>');
 if(qs.length)items.push('<li><b>'+qs.length+' presupuesto'+(qs.length===1?' pendiente':'s pendientes')+'</b><span>Pendiente de respuesta del cliente</span></li>');
 if(m.stale)items.push('<li><b>Sin actividad registrada en 14 días</b><span>Revisa el estado del proyecto cuando puedas.</span></li>');
 return `<details class="folio-notifications ${increased?'notice-ring':''} ${changed?'notice-count-change':''}" onclick="event.stopPropagation()" onkeydown="if(event.key==='Escape'){this.open=false;this.querySelector('summary').focus();event.stopPropagation()}"><summary aria-label="Avisos de ${E(p.num)}${count?': '+count:''}" title="Avisos del proyecto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="folio-notice-count" aria-hidden="true"><span>${count>99?'99+':count}</span></span></summary><div class="folio-notice-panel"><strong>Avisos del proyecto</strong>${items.length?'<ul>'+items.join('')+'</ul>':'<p>No hay avisos pendientes.</p>'}</div></details>`;
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{document.querySelectorAll('.folio-notifications[open]').forEach(el=>{if(!el.contains(e.target))el.open=false})},true);
}
