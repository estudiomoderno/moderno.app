/* Shopping exports: shared room/project presentation. Never changes product prices. */
var ModernoShoppingExport=(()=>{
 'use strict';
 const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const defaults={fmt:'pdf',lay:'lista',ori:'portrait',prices:true,alts:true,total:true,supplier:true,dims:true,color:true,material:true,cat:true,sku:true,plazo:true,code:true,links:true,notes:true,logo:true,date:true,sections:true,taxMode:'included',taxRate:21};
 let context=null,busy=false;
 function options(){return Object.assign({},defaults,typeof state==='undefined'?{}:state.exOpts||{});}
 // Decimal ratios prevent binary floating-point halves from losing a cent.
 function decimal(value){const [mantissa,exponent='0']=String(Number(value)).toLowerCase().split('e'),[whole,fraction='']=mantissa.split('.'),power=Number(exponent)-fraction.length,n=BigInt(whole+fraction);return power>=0?{n:n*10n**BigInt(power),d:1n}:{n,d:10n**BigInt(-power)};}
 const rounded=(n,d)=>(2n*n+d)/(2n*d);
 function amounts(price,qty,mode,rate){
  if(price===null||price===undefined||String(price).trim()===''||qty===null||qty===undefined||String(qty).trim()===''||!Number.isFinite(Number(price))||!Number.isFinite(Number(qty))||Number(price)<0||Number(qty)<0)throw Error('Hay productos sin precio o con cantidades inválidas. Completa los datos o exporta sin precios.');
  if(!['included','excluded'].includes(mode)||String(rate).trim()===''||!Number.isFinite(Number(rate))||Number(rate)<0||Number(rate)>100)throw Error('Indica si los precios incluyen IVA y un porcentaje válido entre 0 y 100.');
  const p=decimal(price),q=decimal(qty),r=decimal(rate),quoted=Number(rounded(p.n*q.n*100n,p.d*q.d));
  if(!Number.isSafeInteger(quoted))throw Error('El importe supera el límite de cálculo.');
  const base=mode==='included'?Number(rounded(BigInt(quoted)*100n*r.d,100n*r.d+r.n)):quoted,tax=mode==='included'?quoted-base:Number(rounded(BigInt(base)*r.n,100n*r.d)),total=base+tax;
  if(!Number.isSafeInteger(total))throw Error('El importe supera el límite de cálculo.');
  return {quoted,base,tax,total};
 }
 function collect(project,ids,o){
  if(o.prices)amounts(0,0,o.taxMode,o.taxRate);
  const selected=ids==null?null:new Set(ids.map(String));
  const add=(a,b)=>({quoted:a.quoted+b.quoted,base:a.base+b.base,tax:a.tax+b.tax,total:a.total+b.total});
  const zero=()=>({quoted:0,base:0,tax:0,total:0});
  const rooms=(project.rooms||[]).filter(r=>!selected||selected.has(String(r.id))).map(r=>{
   const sections=(r.sections||[]).map(sec=>({name:String(sec.name||'General'),items:(sec.items||[]).filter(it=>!it.hidden&&(o.alts||!it.alt)).map(it=>{
    const row={};for(const k of ['name','supplier','dims','color','material','cat','sku','plazo','code','url','cliNote','img','unit'])row[k]=String(it[k]??'');
    row.qty=it.qty;row.price=it.price;row.alt=Boolean(it.alt);row.amounts=o.prices?amounts(it.price,it.qty,o.taxMode,o.taxRate):zero();return row;
   })})).filter(sec=>sec.items.length);
   const items=sections.flatMap(sec=>sec.items);return {id:r.id,name:String(r.name||'Lista'),sections,count:items.length,amounts:items.reduce((a,it)=>add(a,it.amounts),zero())};
  });
  const total=rooms.reduce((a,r)=>add(a,r.amounts),zero());if(Object.values(total).some(n=>!Number.isSafeInteger(n)))throw Error('El total supera el límite de cálculo.');
  return {rooms,count:rooms.reduce((a,r)=>a+r.count,0),amounts:total};
 }
 function money(n){return fmt(n/100);}
 function taxLabel(o){return 'Precios aportados: IVA '+(o.taxMode==='included'?'incluido':'no incluido')+' · '+Number(o.taxRate)+' %';}
 function breakdown(a,o,label='Total con IVA'){
  if(!o.prices||!o.total)return '';
  return `<div class="ex-tax-breakdown"><div><span>Base imponible</span><b>${money(a.base)}</b></div><div><span>IVA (${E(Number(o.taxRate))} %)</span><b>${money(a.tax)}</b></div><div class="ex-tax-grand"><span>${label}</span><b>${money(a.total)}</b></div></div>`;
 }
 function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
 function head(p,title,o){
  const logo=state.logos?.[p.brand],name=BRAND[p.brand]?.name||state.account?.name||'';
  return `<header class="ex-export-head"><div>${o.logo?(logo?`<img ${fileImageAttrs(logo)} style="height:44px;max-width:180px;object-fit:contain" alt="">`:`<b>${E(name)}</b>`):''}</div><div>${o.date?`<small>${E(hoyEs())}</small>`:''}<h1>${E(title)}</h1><p>${E(p.num)} · ${E(p.name)}</p>${o.prices?`<small>${E(taxLabel(o))}</small>`:''}</div></header>`;
 }
 function page(p,title,body,o){return `<section class="pdf-page ex-doc"><div class="pdf-body">${head(p,title,o)}${body}</div><div class="pdf-pn">${pdfFoot()}<span>${E(p.num)} · ${E(title)}</span></div></section>`;}
 function roomBody(room,o){
  const metadata=it=>[['supplier','Proveedor'],['dims','Dimensiones'],['color','Color'],['material','Material'],['cat','Categoría'],['sku','SKU'],['plazo','Plazo de entrega'],['code','Código']].filter(([key])=>o[key]&&it[key]).map(([key,label])=>`<span><i>${label}:</i> ${E(it[key])}</span>`).join('');
  const price=it=>o.prices?`<div class="ex-price">${money(it.amounts.quoted)} <small>(${E(it.qty)} × ${fmt(Number(it.price))})</small></div>`:'';
  const image=it=>it.img?`<img ${fileImageAttrs(it.img)} alt="">`:'';
  return room.sections.map(sec=>`<div class="ex-sec"><b>${E(sec.name)}</b><span class="line"></span>${o.prices&&o.sections?`<span class="ex-sum">${money(sec.items.reduce((a,it)=>a+it.amounts.quoted,0))}</span>`:''}</div>`+(o.lay==='grid'?`<div class="ex-grid" style="grid-template-columns:repeat(${o.ori==='landscape'?4:3},minmax(0,1fr))">${sec.items.map(it=>`<article class="ex-cell"><div class="ex-img">${image(it)}</div><div class="ex-cap"><span>${E(it.name)}</span></div>${it.alt?'<span class="ex-alt">alternativa</span>':''}${price(it)}</article>`).join('')}</div>`:sec.items.map(it=>{
   const link=o.links?safeURL(it.url):'';
   return `<article class="ex-item"><div class="ex-th">${image(it)}</div><div class="ex-in"><div class="ex-nm">${E(it.name)}${it.alt?' <span class="ex-alt">alternativa</span>':''}</div>${link?`<a class="ex-url" href="${E(link)}">${E(link)}</a>`:''}<div class="ex-meta">${metadata(it)}</div>${o.notes&&it.cliNote?`<p class="ex-note">${E(it.cliNote)}</p>`:''}<div class="ex-qty">Cantidad: ${E(it.qty)} ${E(({m2:'m²',m3:'m³'})[it.unit]||it.unit||'ud')}</div>${price(it)}</div></article>`;
  }).join(''))).join('')+(room.count?'':'<p>No hay productos incluidos en esta lista.</p>')+breakdown(room.amounts,o);
 }
 function html(p,model,o,summary){
  const opening=summary?page(p,'Resumen de listas de compra',`<table class="ex-summary"><thead><tr><th>Lista</th><th>Productos</th>${o.prices&&o.total?'<th>Base imponible</th><th>IVA</th><th>Total con IVA</th>':''}</tr></thead><tbody>${model.rooms.map(r=>`<tr><td>${E(r.name)}</td><td>${r.count}</td>${o.prices&&o.total?`<td>${money(r.amounts.base)}</td><td>${money(r.amounts.tax)}</td><td>${money(r.amounts.total)}</td>`:''}</tr>`).join('')}</tbody></table>${breakdown(model.amounts,o,'Total de las listas seleccionadas')}`,o):'';
  return opening+model.rooms.map(r=>page(p,r.name,roomBody(r,o),o)).join('');
 }
 function csvCell(value){if(typeof value==='number'&&Number.isFinite(value))return String(value).replace('.',',');let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 function csv(p,model,o,summary){
  const rows=[['Proyecto',p.num,p.name]];
  if(o.prices)rows.push([taxLabel(o)]);
  if(summary){rows.push(['Resumen de listas de compra'],['Lista','Productos',...(o.prices&&o.total?['Base imponible','IVA ('+Number(o.taxRate)+' %)','Total con IVA']:[])]);for(const r of model.rooms)rows.push([r.name,r.count,...(o.prices&&o.total?[r.amounts.base/100,r.amounts.tax/100,r.amounts.total/100]:[])]);if(o.prices&&o.total)rows.push(['TOTAL',model.count,model.amounts.base/100,model.amounts.tax/100,model.amounts.total/100]);rows.push([]);}
  const detail=[['supplier','Proveedor'],['dims','Dimensiones'],['color','Color'],['material','Material'],['cat','Categoría'],['sku','SKU'],['plazo','Plazo de entrega'],['code','Código']].filter(([key])=>o[key]);
  rows.push(['Lista','Sección','Producto','Cantidad','Unidad',...detail.map(x=>x[1]),...(o.links?['URL']:[]),...(o.notes?['Notas para el cliente']:[]),...(o.prices?['Precio unitario aportado','Importe aportado','Base imponible','IVA (%)','Cuota IVA','Total con IVA']:[])]);
  for(const r of model.rooms){for(const sec of r.sections)for(const it of sec.items)rows.push([r.name,sec.name,it.name,it.qty,({m2:'m²',m3:'m³'})[it.unit]||it.unit||'ud',...detail.map(([key])=>it[key]),...(o.links?[safeURL(it.url)]:[]),...(o.notes?[it.cliNote]:[]),...(o.prices?[Number(it.price),it.amounts.quoted/100,it.amounts.base/100,Number(o.taxRate),it.amounts.tax/100,it.amounts.total/100]:[])]);if(o.prices&&o.total)rows.push(['Total '+r.name,'Base imponible',r.amounts.base/100,'IVA ('+Number(o.taxRate)+' %)',r.amounts.tax/100,'Total con IVA',r.amounts.total/100]);}
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
 }
 const owner=()=>fileViewIdentity()+'|'+(state.sessionUser?.mail||'')+'|'+state.brandFilter;
 function allowed(){return !_accessLoading&&!state.portalAnon&&Boolean(state.sessionUser?.id||state.sessionUser?.mail)&&['admin','miembro','colaborador'].includes(_accessRole);}
 function open(pid,ids=null,summary=true,kind=null,printing=false){
  if(!allowed())return;const p=state.projects.find(p=>p.id===pid);if(!p||!byBrand([p]).includes(p))return;
  context={project:p,ids:new Set((ids==null?(p.rooms||[]).map(r=>r.id):ids).map(String)),summary,identity:owner(),printing,step:'design',fresh:true};
  if(kind)state.exOpts={...options(),fmt:kind};draw();
 }
 function valid(){return context&&allowed()&&context.identity===owner()&&state.projects.includes(context.project)&&byBrand([context.project]).includes(context.project);}
 function set(key,value){if(!valid())return;const keys=['fmt','lay','ori','taxMode','taxRate','prices','alts','total','supplier','dims','color','material','cat','sku','plazo','code','links','notes','logo','date','sections'];if(!keys.includes(key))return;state.exOpts={...options(),[key]:value};if(key!=='taxRate'){draw();Array.from(mb.querySelectorAll('[data-key]')).find(el=>el.dataset.key===key&&(!el.dataset.value||el.dataset.value===String(value)))?.focus({preventScroll:true});}}
 function select(input){if(!valid())return;if(input.checked)context.ids.add(input.value);else context.ids.delete(input.value);const button=document.getElementById('shopping-export-go');if(button)button.disabled=!context.ids.size;}
 function selectGroup(group){if(!valid())return;context.ids=new Set((context.project.rooms||[]).filter(r=>group==='all'||(r.kind||'estancia')===group).map(r=>String(r.id)));draw();}
 function draw(step){
  if(!valid())return;const scroll=mb.scrollTop||0,reset=context.fresh||step&&step!==context.step;if(step)context.step=step;const p=context.project,o=options(),details=context.step==='details';
  const label=context.summary?'Exportar listas':'Exportar estancia';
  const card=(key,value,title,sub,art='')=>`<button type="button" aria-pressed="${o[key]===value}" class="ex-card ${o[key]===value?'on':''}" data-key="${key}" data-value="${value}" onclick="ModernoShoppingExport.set(this.dataset.key,this.dataset.value)">${art}<b>${title}</b><small>${sub}</small></button>`;
  const check=(key,title)=>`<label class="ex-chk"><input type="checkbox" ${o[key]?'checked':''} data-key="${key}" onchange="ModernoShoppingExport.set(this.dataset.key,this.checked)"> ${title}</label>`;
  const list='<div class="ex-ill">'+Array.from({length:3},()=>'<div class="ex-row"><i></i><s></s><s></s></div>').join('')+'</div>',grid='<div class="ex-ill grid">'+'<i></i>'.repeat(8)+'</div>';
  const tax=`<fieldset class="ex-tax-options"><legend>IVA de los precios aportados</legend><div class="ex-grid2 small">${card('taxMode','included','IVA incluido','Se extrae el IVA de los precios aportados')}${card('taxMode','excluded','IVA no incluido','Se añade el IVA a los precios aportados')}</div><label class="ex-tax-rate">Tipo de IVA (%)<input id="shopping-export-tax" type="number" min="0" max="100" step="0.01" value="${E(o.taxRate)}" oninput="ModernoShoppingExport.set('taxRate',this.value)"></label><small>Se mostrará el desglose de base imponible, IVA y total. Los precios de tus productos no se modifican.</small></fieldset>`;
  const rooms=context.summary?`<div class="ex-grp">Listas a exportar · resumen inicial incluido</div><div class="opt-pills"><button type="button" onclick="ModernoShoppingExport.selectGroup('all')">Todas</button>${[['estancia','Estancias'],['pav','Pavimentos'],['otra','Otras listas']].filter(([kind])=>(p.rooms||[]).some(r=>(r.kind||'estancia')===kind)).map(([kind,title])=>`<button type="button" onclick="ModernoShoppingExport.selectGroup('${kind}')">${title}</button>`).join('')}</div><div class="ex-room-selection">${(p.rooms||[]).map(r=>`<label class="ex-chk"><input class="expR" type="checkbox" value="${E(r.id)}" ${context.ids.has(String(r.id))?'checked':''} onchange="ModernoShoppingExport.select(this)"> ${E(r.name)}</label>`).join('')||'<p>No hay listas disponibles.</p>'}</div>`:'';
  const content=details?`<h3>Ajustes de exportación</h3><div class="ex-grp">Precios y contenido</div><div class="ex-cols">${check('prices','Mostrar precios')}${check('total','Mostrar totales y desglose')}${check('alts','Mostrar opciones alternativas')}${check('sections','Mostrar totales por sección')}</div><div class="ex-grp">Detalles del producto</div><div class="ex-cols">${[['supplier','Proveedor'],['dims','Dimensiones'],['color','Color'],['material','Material'],['cat','Categoría'],['sku','SKU'],['plazo','Plazo de entrega'],['code','Código']].map(([key,title])=>check(key,title)).join('')}</div><div class="ex-grp">Enlaces y presentación</div><div class="ex-cols">${check('links','Enlaces de productos')}${check('notes','Notas para el cliente')}${check('logo','Logo del estudio')}${check('date','Fecha de generación')}</div>`:`<h3>Selecciona el diseño</h3><div class="ex-grid2">${card('lay','lista','Diseño de lista','Información detallada del producto',list)}${card('lay','grid','Diseño de cuadrícula','Vista de galería de imágenes',grid)}</div><div class="ex-grp">Orientación</div><div class="ex-grid2 small">${card('ori','portrait','Vertical','Página A4 vertical')}${card('ori','landscape','Horizontal','Página A4 horizontal')}</div><div class="ex-grp">Formato</div><div class="ex-grid2 small">${card('fmt','pdf','PDF','Para enviar o imprimir')}${card('fmt','xlsx','Hoja de cálculo','CSV para Excel / Sheets')}</div>${rooms}`;
  mb.classList.add('wide');modal(content+(o.prices?tax:'')+`<div class="modal-foot ex-export-actions"><button type="button" class="btn btn-ghost" onclick="${details?"ModernoShoppingExport.draw('design')":"closeModal()"}">${details?'Atrás':'Cancelar'}</button>${details?'':`<button type="button" class="btn btn-ghost" onclick="ModernoShoppingExport.draw('details')">Ajustes de exportación en lista</button>`}<button type="button" id="shopping-export-go" class="btn btn-dark" ${context.ids.size?'':'disabled'} onclick="ModernoShoppingExport.run()">${context.printing?'Imprimir listas':label}</button></div>`);mb.scrollTop=reset?0:scroll;context.fresh=false;
 }
 async function run(){
  if(!valid()){if(context)toast('Los datos o el acceso han cambiado. Vuelve a abrir la exportación.');return false;}if(busy){toast('Ya se está preparando una exportación.');return false;}const scope=context,p=scope.project,o=options();let model;
  try{model=collect(p,[...scope.ids],o);if(!model.rooms.length)throw Error('Selecciona al menos una lista.');if(model.rooms.length!==scope.ids.size)throw Error('Han cambiado las listas seleccionadas. Vuelve a abrir la exportación.');}catch(error){toast(error.message);return false;}
  if(o.fmt==='xlsx'){
   const text=csv(p,model,o,scope.summary),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=String(p.num||'proyecto').replace(/[^\w-]/g,'-')+'-listas-de-compra.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);closeModal();return true;
  }
  busy=true;const z=document.getElementById('printZone'),style=document.createElement('style');style.id='shopping-export-page';style.textContent='@page{size:A4 '+(o.ori==='landscape'?'landscape':'portrait')+'}'+(o.ori==='landscape'?'#printZone .ex-doc.pdf-page{min-height:175mm}':'');
  try{closeModal();document.head.append(style);z.innerHTML=html(p,model,o,scope.summary);z.style.display='block';return await printAs((p.num||'Proyecto')+' – '+(scope.summary?'Listas de compra':model.rooms[0].name));}
  finally{z.style.display='none';style.remove();busy=false;}
 }
 return {amounts,collect,html,csv,csvCell,options,open,set,select,selectGroup,draw,run};
})();
if(typeof module!=='undefined')module.exports=ModernoShoppingExport;
