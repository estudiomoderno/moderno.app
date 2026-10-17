(function prototypeScript(){
"use strict";
const iconPaths={
grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
check:'<path d="m5 12 4 4L19 6"/>',
checks:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 10 2 2 4-4M15 10h3M7 16h11"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
contacts:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 9h4M17 13h4"/>',
wallet:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18M16 16h2"/>',
mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
box:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/>',
chevron:'<path d="m6 9 6 6 6-6"/>',
collapse:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 9l-3 3 3 3"/>',
expand:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m3 5 3 3-3 3"/>',
home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/>',
plan:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/>',
hammer:'<path d="m14 6 4-4 4 4-4 4M13 7 2 18l4 4L17 11M14 6l4 4"/>',
shopping:'<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 4h2l3 12h13l2-9H5"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-8M22 20V7M2 21h21"/>',
folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z"/>',
spark:'<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2ZM20 17l.6 1.5L22 19l-1.4.5L20 21l-.6-1.5L18 19l1.4-.5L20 17Z"/>',
tools:'<path d="m14 7 3-3 3 3-3 3M14 7l-9 9a3 3 0 0 0 4 4l9-9M3 3l5 5"/>',
message:'<path d="M4 4h16v13H8l-4 4V4Z"/><path d="M8 9h8M8 13h6"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
file:'<path d="M6 2h9l5 5v15H6V2ZM15 2v6h5M9 13h8M9 17h8"/>',
image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
history:'<path d="M3 11a9 9 0 1 1 2 6M3 3v8h8M12 7v5l4 3"/>',
search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
layers:'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
link:'<path d="M10 13a5 5 0 0 0 7.6.5l2-2a5 5 0 1 0-7.1-7.1l-2 2M14 11a5 5 0 0 0-7.6-.5l-2 2a5 5 0 1 0 7.1 7.1l2-2"/>'
};
function icon(name,size=20){return `<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.grid}</svg>`;}
const general=[
{id:"proyectos",label:"Proyectos",glyph:"grid"},
{id:"tareas",label:"Tareas",glyph:"checks"},
{id:"calendario",label:"Calendario",glyph:"calendar"},
{id:"agenda",label:"Agenda",glyph:"contacts"},
{id:"finanzas",label:"Finanzas",glyph:"wallet"},
{id:"mail",label:"Mail",glyph:"mail"},
{id:"productos",label:"Productos y servicios",glyph:"box"}
];
const groups=[
[{id:"inicio",label:"Inicio",glyph:"home"},{id:"planos",label:"Planos",glyph:"plan"},{id:"obra",label:"Obra",glyph:"hammer"}],
[{id:"tareas",label:"Tareas",glyph:"checks"},{id:"compras",label:"Compras",glyph:"shopping"},{id:"economia",label:"Economía",glyph:"chart"}],
[{id:"documentos",label:"Documentos",glyph:"folder"},{id:"ia",label:"IA",glyph:"spark"},{id:"utilidades",label:"Utilidades",glyph:"tools"},{id:"comentarios",label:"Comentarios",glyph:"message"}]
];
const demoTasks=[
{title:"Revisar distribución de cocina",team:"Equipo de diseño",when:"Hoy",done:false},
{title:"Seleccionar revestimiento de baños",team:"Interiorismo",when:"Mañana",done:false},
{title:"Preparar propuesta de iluminación",team:"Equipo de diseño",when:"21 oct",done:true},
{title:"Comprobar medidas de carpintería",team:"Dirección de obra",when:"23 oct",done:false}
];
const state={top:"proyectos",tool:"inicio",collapsed:false,docTab:"planos",taskFilter:"todas"};
const $=id=>document.getElementById(id);
const shell=$("app-shell"),nav=$("global-nav"),dock=$("tool-dock"),view=$("view"),breadcrumbs=$("breadcrumbs"),menu=$("profile-menu"),profile=$("profile-button"),collapse=$("collapse-header");
const labelMap=Object.fromEntries([...general,...groups.flat()].map(x=>[x.id,x.label]));
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){
 const el=$("toast");el.textContent=message;el.hidden=false;
 if(toast.timer)clearTimeout(toast.timer);
 toast.timer=setTimeout(()=>{el.hidden=true;},3500);
}
function closeMenu(){menu.hidden=true;profile.setAttribute("aria-expanded","false");}
function renderNavigation(){
 nav.innerHTML=general.map(item=>`<button class="global-link ${state.top===item.id?"is-current":""}" type="button" data-top="${item.id}" aria-label="${item.label}" aria-current="${state.top===item.id?"page":"false"}" title="${item.label}">${icon(item.glyph,17)}<span class="nav-label">${item.label}</span></button>`).join("");
 dock.innerHTML=groups.map((items,i)=>`<div class="dock-group" role="group" aria-label="${["Espacios","Gestión","Colaboración"][i]}">${items.map(item=>`<button class="dock-button ${state.top==="proyectos"&&state.tool===item.id?"is-active":""}" type="button" data-tool="${item.id}" aria-label="${item.label}" title="${item.label}" aria-pressed="${state.top==="proyectos"&&state.tool===item.id}">${icon(item.glyph,21)}<span class="dock-tooltip" aria-hidden="true">${item.label}</span></button>`).join("")}</div>`).join('<span class="dock-divider" aria-hidden="true"></span>');
 breadcrumbs.innerHTML=state.top==="proyectos"?`<span>Proyectos</span><span class="crumb-separator">/</span><span>Casa Oliva · Reforma integral</span><span class="crumb-separator">/</span><strong>${labelMap[state.tool]}</strong>`:`<span>Moderno.app</span><span class="crumb-separator">/</span><strong>${general.find(x=>x.id===state.top)?.label}</strong>`;
}
function viewHeading(title,sub,eyebrow="CASA OLIVA / PROYECTO DEMO"){
 return `<div class="view-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtitle">${sub}</p></div><span class="status-chip">${icon("check",14)} Datos ficticios</span></div>`;
}
function card(title,sub,inner,className=""){
 return `<section class="surface-card ${className}"><div class="card-heading"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:""}</div></div>${inner}</section>`;
}
function initial(){
 const recent=demoTasks.slice(0,3).map((t,i)=>`<div class="task-line"><span class="task-dot ${t.done?"finished":""}">${t.done?icon("check",12):""}</span><div><strong>${t.title}</strong><small>${t.team}</small></div><span class="task-date">${t.when}</span></div>`).join("");
 return `${viewHeading("Casa Oliva", "Reforma integral · Vivienda · Sevilla")}
  <section class="project-hero"><div class="hero-copy"><div class="hero-topline"><span class="hero-symbol">${icon("layers",19)}</span><span>PROYECTO EN CURSO</span></div><h2>Todo tu proyecto,<br>en un solo lugar.</h2><p>Organiza planos, tareas, compras y equipo desde un mismo espacio de trabajo.</p><button type="button" class="primary-button" data-tool="planos">Abrir planos ${icon("arrow",17)}</button></div>
   <div class="hero-illustration" aria-hidden="true"><div class="hero-sheet hero-sheet-back"></div><div class="hero-sheet hero-sheet-front"><div class="sheet-room sheet-one"></div><div class="sheet-room sheet-two"></div><div class="sheet-room sheet-three"></div><div class="sheet-room sheet-four"></div><div class="sheet-label">PLANTA BAJA · 01</div></div><div class="hero-stamp">M<span>·</span></div></div></section>
   <div class="stat-grid"><div class="stat"><span>Estado del proyecto</span><strong>En desarrollo</strong><small><i class="green-dot"></i> Avanzando según lo previsto</small></div><div class="stat"><span>Tareas pendientes</span><strong>03 <small>de 04</small></strong><small>Organiza las próximas acciones</small></div><div class="stat"><span>Progreso estimado</span><strong>68%</strong><div class="progress"><span style="width:68%"></span></div></div></div>
   <div class="two-column">${card("Próximas tareas","Lo que requiere tu atención",`<div class="task-lines">${recent}</div><button class="text-link" type="button" data-tool="tareas">Ver todas las tareas ${icon("arrow",15)}</button>`)}
   ${card("Tu espacio de proyecto","Accesos más utilizados",`<div class="quick-grid"><button data-tool="planos" type="button">${icon("plan",21)}<span>Planos</span>${icon("arrow",15)}</button><button data-tool="compras" type="button">${icon("shopping",21)}<span>Compras</span>${icon("arrow",15)}</button><button data-tool="documentos" type="button">${icon("folder",21)}<span>Documentos</span>${icon("arrow",15)}</button><button data-tool="obra" type="button">${icon("hammer",21)}<span>Obra</span>${icon("arrow",15)}</button></div>`)}</div>`;
}
const planSVG=`<svg class="plan-svg" viewBox="0 0 680 390" role="img" aria-label="Esquema ficticio de plano de planta con estancias">
 <rect x="28" y="22" width="615" height="342" rx="2" fill="#fff" stroke="#8b9aa6" stroke-width="5"/>
 <path d="M237 22V366M435 22V252M237 255H643M28 166H237M435 165H643" fill="none" stroke="#9aa9b5" stroke-width="4"/>
 <path d="M238 67c42 0 70 27 70 71M237 295c0 42 28 67 68 67M435 197c40 0 65 25 65 58" fill="none" stroke="#afbcc5" stroke-width="2" stroke-dasharray="5 5"/>
 <rect x="70" y="45" width="124" height="76" rx="4" fill="#eff3f5" stroke="#c5d1d8"/><rect x="68" y="205" width="112" height="79" rx="3" fill="#f1f4f6" stroke="#c5d1d8"/>
 <rect x="278" y="57" width="120" height="65" rx="4" fill="#f3f5f4" stroke="#c5d1d8"/><rect x="483" y="290" width="112" height="37" rx="2" fill="#f3f5f4" stroke="#c5d1d8"/>
 <circle cx="345" cy="192" r="40" fill="#eff3f4" stroke="#c5d1d8"/>
 <text x="87" y="154" font-size="12" letter-spacing="2" fill="#718091">ESTUDIO</text><text x="293" y="160" font-size="12" letter-spacing="2" fill="#718091">SALÓN</text><text x="479" y="150" font-size="12" letter-spacing="2" fill="#718091">COCINA</text><text x="483" y="352" font-size="12" letter-spacing="2" fill="#718091">DORMITORIO</text>
 </svg>`;
function plans(){
 return `${viewHeading("Planos","Explora y organiza los planos del proyecto.")}
  <section class="viewer-shell"><div class="viewer-toolbar"><div><span class="viewer-file">${icon("file",18)} Planta baja · distribución.pdf</span><span class="pill">Ejemplo</span></div><div class="viewer-controls"><span>01 / 02</span><button type="button" class="mini-button" data-demo="El zoom todavía es una simulación">−</button><span>100%</span><button type="button" class="mini-button" data-demo="El zoom todavía es una simulación">+</button><button type="button" class="secondary-button" data-demo="La edición de planos llegará en una fase posterior">Anotar plano</button></div></div>
  <div class="plan-canvas">${planSVG}<div class="canvas-tag">PLANO FICTICIO · SOLO PREVISUALIZACIÓN</div></div></section><p class="hint-line">Esta pantalla enseña la futura ubicación de los planos. No permite editar ni guardar documentos reales.</p>`;
}
function tasks(){
 const items=demoTasks.map((t,i)=>({...t,i})).filter(t=>state.taskFilter==="todas"||!t.done);
 return `${viewHeading("Tareas","Todo lo que necesita atención en este proyecto.")}
 <div class="list-toolbar"><div class="segmented"><button type="button" class="${state.taskFilter==="todas"?"selected":""}" data-filter="todas">Todas</button><button type="button" class="${state.taskFilter==="pendientes"?"selected":""}" data-filter="pendientes">Pendientes</button></div><button class="secondary-button" type="button" data-demo="Crear tareas está simulado">${icon("plus",16)} Nueva tarea</button></div>
 ${card("Tareas del proyecto",`${items.length} tareas visibles`,`<div class="table-list">${items.map(t=>`<label class="table-row"><input type="checkbox" data-task-check="${t.i}" ${t.done?"checked":""} aria-label="Completar ${escapeHTML(t.title)}"><span class="row-title ${t.done?"struck":""}">${escapeHTML(t.title)}</span><span class="row-assignee">${escapeHTML(t.team)}</span><span class="row-date">${escapeHTML(t.when)}</span></label>`).join("")}</div><p class="card-footnote">Puedes marcar tareas de ejemplo. Los cambios desaparecen al recargar.</p>`)}`;
}
function shopping(){
 const items=[["Lámpara de techo","Iluminación","Pendiente"],["Grifería lavabo","Baños","Seleccionado"],["Revestimiento porcelánico","Materiales","Pendiente"],["Silla tapizada","Mobiliario","Aprobado"]];
 return `${viewHeading("Listas de compra","Selecciones, materiales y productos organizados.")}
 <div class="list-toolbar"><span class="section-label">Selección de materiales</span><button class="secondary-button" type="button" data-demo="Añadir productos está simulado">${icon("plus",16)} Añadir producto</button></div>
 ${card("Artículos", "Lista de compra · Proyecto ficticio",`<div class="table-list">${items.map(([name,cat,status],i)=>`<div class="table-row"><span class="row-product-icon">${icon(["spark","tools","layers","box"][i],19)}</span><span class="row-title">${name}</span><span class="row-assignee">${cat}</span><span class="row-badge">${status}</span></div>`).join("")}</div>`)}`;
}
function work(){
 return `${viewHeading("Seguimiento de obra","Una vista clara de las etapas del proyecto.")}${card("Fases de obra","Estado ilustrativo de ejecución",`<div class="milestones">${[["Demoliciones",100],["Instalaciones",100],["Revestimientos",65],["Carpintería",25],["Entrega",0]].map(([n,v])=>`<div class="milestone"><div><strong>${n}</strong><span>${v}%</span></div><div class="progress"><span style="width:${v}%"></span></div></div>`).join("")}</div>`)}`;
}
function economy(){
 return `${viewHeading("Economía","Control económico del proyecto, en un solo vistazo.")}
 <div class="stat-grid"><div class="stat"><span>Presupuesto ficticio</span><strong>84.000 €</strong><small>Valor ilustrativo</small></div><div class="stat"><span>Comprometido</span><strong>46.500 €</strong><small>55% del presupuesto</small></div><div class="stat"><span>Disponible</span><strong>37.500 €</strong><small>Sin transacciones reales</small></div></div>
 ${card("Distribución estimada","Importes inventados, sin integración financiera",`<div class="bar-chart">${[["Materiales","44%",44],["Mano de obra","32%",32],["Mobiliario","18%",18],["Otros","6%",6]].map(([label,v,w])=>`<div class="bar-line"><span>${label}</span><div class="progress"><span style="width:${w}%"></span></div><strong>${v}</strong></div>`).join("")}</div>`)}`;
}
function docs(){
 const tabs=[["planos","Planos","plan"],["archivos","Archivos","file"],["referencias","Referencias","image"],["revisiones","Revisiones","history"]];
 const lists={planos:[["Planta baja · distribución.pdf","PDF · Ejemplo"],["Planta primera.pdf","PDF · Ejemplo"]],archivos:[["Memoria de materiales.pdf","PDF · Ejemplo"],["Presupuesto inicial.xlsx","Hoja de cálculo · Ejemplo"]],referencias:[["Concepto salón.jpg","Imagen · Ejemplo"],["Paleta de acabados.png","Imagen · Ejemplo"]],revisiones:[["Revisión de planos · v.02","Sincronización simulada"],["Propuesta inicial · v.01","Sincronización simulada"]]};
 return `${viewHeading("Documentos","Un lugar para toda la documentación del proyecto.")}
 <div class="subtabs" role="tablist" aria-label="Tipos de documentos">${tabs.map(([id,label,glyph])=>`<button type="button" role="tab" aria-selected="${state.docTab===id}" data-doc-tab="${id}" class="${state.docTab===id?"active":""}">${icon(glyph,17)}${label}</button>`).join("")}</div>
 ${card(tabs.find(t=>t[0]===state.docTab)[1],"Archivos completamente inventados",`<div class="document-grid">${lists[state.docTab].map(([name,caption])=>`<button type="button" class="document-tile" data-demo="Este archivo es ficticio y no se puede abrir">${icon(state.docTab==="referencias"?"image":"file",24)}<span><strong>${name}</strong><small>${caption}</small></span>${icon("arrow",17)}</button>`).join("")}</div>`)}`;
}
function ideas(){
 return `${viewHeading("Asistente IA","Un espacio para futuras ayudas al proyecto.")}
 ${card("Ideas para Casa Oliva","Solo demostración, sin modelos ni servicios conectados",`<div class="assistant-sample"><span class="assistant-icon">${icon("spark",27)}</span><p>En esta zona podremos explorar sugerencias de planificación y diseño sin abandonar el proyecto.</p><button type="button" class="primary-button" data-demo="La IA todavía no está conectada">Explorar ejemplo ${icon("arrow",16)}</button></div>`)}`;
}
function utilities(){
 return `${viewHeading("Utilidades","Herramientas de apoyo siempre a mano.")}
 <div class="feature-grid">${[["Mediciones","plan"],["Calculadora","chart"],["Enlaces útiles","link"],["Historial","history"]].map(([name,glyph])=>`<button type="button" class="feature-tile" data-demo="Esta herramienta está simulada">${icon(glyph,26)}<strong>${name}</strong><span>Próximamente</span></button>`).join("")}</div>`;
}
function comments(){
 return `${viewHeading("Comentarios","Conversaciones vinculadas al proyecto.")}
 ${card("Actividad reciente","Mensajes de demostración",`<div class="comment-list"><div><span class="avatar small">DL</span><div><strong>Equipo de diseño</strong><small>Hoy · 10:30</small><p>Revisar la posición de la isla de cocina.</p></div></div><div><span class="avatar small alt">AO</span><div><strong>Dirección de obra</strong><small>Ayer · 16:45</small><p>Mediciones actualizadas en el plano ficticio.</p></div></div></div><button type="button" class="secondary-button" data-demo="Los comentarios son ficticios">${icon("plus",16)} Añadir comentario</button>`)}`;
}
function globalPage(){
 const active=general.find(x=>x.id===state.top);
 return `${viewHeading(active.label,`Vista general simulada de ${active.label.toLowerCase()}.`,"ESPACIO DE DEMOSTRACIÓN")}
 <div class="global-placeholder">${icon(active.glyph,38)}<h2>${active.label}, con una experiencia más sencilla.</h2><p>Esta sección es una muestra de navegación. No conecta con ningún dato o servicio real.</p><button type="button" class="primary-button" data-open-project="yes">Abrir proyecto ficticio ${icon("arrow",16)}</button></div>`;
}
function render(){
 renderNavigation();
 const fn={inicio:initial,planos:plans,obra:work,tareas:tasks,compras:shopping,economia:economy,documentos:docs,ia:ideas,utilidades,comentarios};
 view.innerHTML=state.top==="proyectos"?(fn[state.tool]||initial)():globalPage();
}
function navigateTool(tool){
 if(!groups.flat().some(t=>t.id===tool))return;
 state.top="proyectos";state.tool=tool;closeMenu();render();
 window.scrollTo({top:0,behavior:"instant"});
}
nav.addEventListener("click",e=>{const btn=e.target.closest("[data-top]");if(!btn)return;state.top=btn.dataset.top;closeMenu();render();});
dock.addEventListener("click",e=>{const btn=e.target.closest("[data-tool]");if(btn)navigateTool(btn.dataset.tool);});
$("brand-button").addEventListener("click",()=>navigateTool("inicio"));
$("profile-chevron").innerHTML=icon("chevron",15);
collapse.innerHTML=icon("collapse",19);
collapse.addEventListener("click",()=>{
 state.collapsed=!state.collapsed;shell.classList.toggle("header-collapsed",state.collapsed);
 collapse.innerHTML=icon(state.collapsed?"expand":"collapse",19);
 collapse.setAttribute("aria-expanded",String(!state.collapsed));
 collapse.setAttribute("aria-label",state.collapsed?"Expandir menú superior":"Comprimir menú superior");
 collapse.title=state.collapsed?"Expandir menú superior":"Comprimir menú superior";
});
profile.addEventListener("click",()=>{menu.hidden=!menu.hidden;profile.setAttribute("aria-expanded",String(!menu.hidden));});
document.addEventListener("click",e=>{
 const tool=e.target.closest("#view [data-tool]");if(tool){navigateTool(tool.dataset.tool);return;}
 const top=e.target.closest("#view [data-open-project]");if(top){navigateTool("inicio");return;}
 const d=e.target.closest("[data-doc-tab]");if(d){state.docTab=d.dataset.docTab;render();return;}
 const f=e.target.closest("[data-filter]");if(f){state.taskFilter=f.dataset.filter;render();return;}
 const btn=e.target.closest("[data-demo]");if(btn){toast(btn.dataset.demo);return;}
 const p=e.target.closest("[data-profile]");if(p){toast(`${p.dataset.profile}: opción ilustrativa, sin conexión`);closeMenu();return;}
 if(!e.target.closest(".profile-wrap"))closeMenu();
});
document.addEventListener("change",e=>{if(e.target.matches("[data-task-check]")){const n=Number(e.target.dataset.taskCheck);if(Number.isInteger(n)&&demoTasks[n]){demoTasks[n].done=e.target.checked;render();toast("Cambio realizado únicamente en esta demostración");}}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeMenu();$("profile-button").focus();}});
render();
})();
