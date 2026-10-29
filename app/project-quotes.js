/* References only: documents keep their own immutable-at-import snapshot. */
var ProjectQuotes=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),E=x=>ModernoDaily.escape(x??'');
 const fields=['id','name','sku','qty','unit','price','dims','material','color','img','url','plazo'];
 let selection=null;
 function snapshot(row){const s={};for(const k of fields)if(row.item[k]!==undefined)s[k]=copy(row.item[k]);return {...s,room_id:row.room.id,room:row.room.name};}
 function line(row,study,pid,policy){
  const i=row.item,qty=Number(i.qty),price=Number(i.price);
  if(i.cost!=null&&i.cost!==''&&(!Number.isFinite(Number(i.cost))||Number(i.cost)<0))throw Error('Revisa el coste de '+(i.name||'la ficha'));
  if(i.id==null||i.qty==null||i.qty===''||!Number.isFinite(qty)||qty<=0||i.price==null||i.price===''||!Number.isFinite(price)||price<0)throw Error('Revisa la identidad, cantidad y precio de '+(i.name||'la ficha'));
  const source={study,project:pid,item:i.id,snapshot:snapshot(row)};
  if(policy){policy=taxPolicy(policy,policy.mode);source.tax=copy(policy);}
  return {name:i.name||'Producto',desc:[i.sku,i.dims,i.material,i.color].filter(Boolean).join(' · '),cap:row.room.name||'Productos',qty,price:policy?basePrice(price,policy):price,unit:i.unit||'ud',cost:i.cost==null||i.cost===''?null:Number(i.cost),source};
 }
 function references(quotes,study,pid,item){return (quotes||[]).flatMap(q=>(q.lines||[]).filter(l=>!l.hidden&&l.source?.study===study&&l.source.project===pid&&l.source.item===item).map(l=>({ref:q.ref,status:q.status||'pend',qty:l.qty,snapshot:copy(l.source.snapshot)})));}
 function trace(quotes,study,p){
  const rows=ModernoSpec.rows(p);
  return (quotes||[]).filter(q=>q.projectId===p.id).flatMap(q=>(q.lines||[]).map((l,index)=>{
   const src=l.source,hasSource=src?.study===study&&src.project===p.id,matches=hasSource?rows.filter(r=>r.item.id===src.item):[];
   const current=matches.length===1?matches[0]:null,changed=current&&JSON.stringify([...fields,"room_id","room"].map(k=>snapshot(current)[k]??null))!==JSON.stringify([...fields,"room_id","room"].map(k=>src.snapshot?.[k]??null));
   return {ref:q.ref,status:q.status||'pend',index,name:l.name,qty:l.qty,unit:l.unit||'ud',sourceQty:hasSource?src.snapshot?.qty:null,origin:!src?'sin_origen':!hasSource?'otro_origen':matches.length>1?'ambiguo':!current?'ausente':changed?'modificada':'coincide',alternative:!!current?.item.alt};
  }));
 }
 function audit(pid){
  if(_accessRole!=='admin')return;const ps=state.projects.filter(p=>p.id===pid);if(ps.length!==1){toast('Proyecto ausente o ambiguo');return;}
  const p=ps[0],rows=trace(state.quotes,ESTUDIO_ID,p);
  modal('<h3>Cantidades en presupuestos</h3><p>'+E(p.name)+'</p><p>Cada documento conserva sus propias cantidades y su copia de la ficha. No se suman presupuestos alternativos ni se modifican documentos anteriores.</p>'+rows.map(r=>'<article class="ops-card"><b>'+E(r.ref)+' · '+E(r.name)+'</b><p>'+E({pend:'Pendiente',acc:'Aceptado',rej:'Rechazado'}[r.status]||r.status)+' · Documento: '+E(r.qty)+' '+E(r.unit)+(r.sourceQty!=null?' · Cantidad de origen al importar: '+E(r.sourceQty):'')+'</p><small>'+E({sin_origen:'Línea histórica o manual sin vínculo; no se adivina por nombre',otro_origen:'Origen de otro ámbito; revisar',ambiguo:'Identidad de origen ambigua',ausente:'Ficha de origen no disponible',modificada:'La ficha actual difiere de la copia del documento',coincide:'La ficha coincide con la copia de origen'}[r.origin])+(r.alternative?' · La ficha ahora está marcada como alternativa':'')+'</small></article>').join('')+(rows.length?'':'<p>No hay líneas de presupuesto vinculadas a este proyecto.</p>')+'<button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>');
 }
 function validate(draft,study){for(const l of draft.lines||[])if(l.source&&(l.source.study!==study||l.source.project!==draft.projectId))throw Error('Las fichas añadidas pertenecen a otro proyecto. Conserva su proyecto o retira esas líneas.');}
 function links(pid,item){if(_accessRole!=='admin')return '';const refs=references(state.quotes,ESTUDIO_ID,pid,item);return refs.length?'<small>Presupuestos vinculados: '+refs.map(r=>E(r.ref)+' ('+E({pend:'pendiente',acc:'aceptado',rej:'rechazado'}[r.status]||r.status)+')').join(' · ')+'</small>':'';}
 function open(){
  if(_accessRole!=='admin'||!state.draft){toast('Solo un administrador puede preparar este documento');return;}
  const p=state.projects.find(x=>x.id===state.draft.projectId);if(!p){toast('Selecciona primero el proyecto del documento');return;}
  let policy;try{policy=importPolicy(state.draft);}catch(e){toast(e.message);return;}
  selection={draft:state.draft,study:ESTUDIO_ID,project:p,rows:ModernoSpec.rows(p).filter(r=>!r.item.hidden&&!r.item.alt)};
  modal('<h3>Añadir fichas del proyecto</h3>'+(policy?'<p>Precios de las listas: '+E(policy.name)+' '+(policy.mode==='included'?'incluido':'excluido')+' ('+E(policy.rate)+' %), según el criterio de origen del presupuesto.</p>':'')+'<p>Se copiarán cantidades, acabados y precios actuales. El documento conservará esa copia aunque la ficha cambie.</p><div class="entry-col">'+selection.rows.map((r,n)=>'<label class="entry"><input type="checkbox" data-quote-product="'+n+'"> <span>'+E(r.room.name)+' · '+E(r.item.name)+'<small>'+E(r.item.qty)+' '+E(r.item.unit||'ud')+' · '+E(r.item.price)+' €</small></span></label>').join('')+'</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-dark" onclick="ProjectQuotes.add()">Añadir seleccionados</button></div>');
 }
 async function add(){
  const s=selection;if(!s)return;const rows=[...document.querySelectorAll('[data-quote-product]:checked')].map(x=>s.rows[Number(x.dataset.quoteProduct)]).filter(Boolean);
  if(!rows.length){toast('Selecciona al menos una ficha');return;}
  try{
   if(_accessRole!=='admin'||ESTUDIO_ID!==s.study||state.draft!==s.draft||s.draft.projectId!==s.project.id)throw Error('El documento o el estudio ha cambiado');
   specPrepare(s.project);persistNow();await cloudFlush();
   if(_accessRole!=='admin'||ESTUDIO_ID!==s.study||state.draft!==s.draft||s.draft.projectId!==s.project.id||_cloudBusy||_saveErr||_cloudHash.proyectos!==canon(CLOUD_BLOCKS.proyectos.get()))throw Error('Primero guarda los cambios del proyecto y vuelve a intentarlo');
   if(state.projects.find(p=>p.id===s.project.id)!==s.project||rows.some(r=>!ModernoSpec.rows(s.project).some(x=>x.item===r.item)))throw Error('Las fichas han cambiado; abre de nuevo la selección');
   const additions=rows.map(r=>line(r,s.study,s.project.id,importPolicy(s.draft)));
   if(additions.some(a=>s.draft.lines.some(l=>l.source?.study===a.source.study&&l.source.project===a.source.project&&l.source.item===a.source.item)))throw Error('Una ficha seleccionada ya está en el documento. Revisa sus cantidades en la línea existente.');
   s.draft.lines.push(...additions);selection=null;closeModal();render();toast('Fichas añadidas con su referencia de origen');
  }catch(e){toast(e.message);}
 }
 // Fiscal settings are authoritative; do not guess a rate from the country.
 function taxProfile(account,fallbackName='Impuesto sobre ventas'){
  const a=account||{},rate=Number(a.vat);
  if(a.vat==null||String(a.vat).trim()===''||!Number.isFinite(rate)||rate<0||rate>100)throw Error('Revisa el porcentaje de impuesto en Configuración fiscal.');
  return {country:String(a.country||'España'),name:String(a.taxName||'').trim()||fallbackName,rate,currency:String(a.currency||'EUR')};
 }
 function taxPolicy(profile,mode){if(!['included','excluded'].includes(mode))throw Error('Indica si los precios incluyen o excluyen impuestos.');return {...taxProfile({country:profile.country,taxName:profile.name,vat:profile.rate,currency:profile.currency}),mode};}
 function basePrice(price,policy){const n=Number(price);if(price==null||String(price).trim()===''||!Number.isFinite(n)||n<0)throw Error('Revisa los precios de los productos.');return policy?.mode==='included'?n/(1+policy.rate/100):n;}
 function totals(rows,profile,mode){const policy=taxPolicy(profile,mode);let base=0;for(const row of rows){if(row.item.cost!=null&&row.item.cost!==''&&(!Number.isFinite(Number(row.item.cost))||Number(row.item.cost)<0))throw Error('Revisa el coste de '+(row.item.name||'la ficha'));const qty=Number(row.item.qty);if(row.item.qty==null||String(row.item.qty).trim()===''||!Number.isFinite(qty)||qty<=0)throw Error('Revisa las cantidades de los productos.');base+=qty*basePrice(row.item.price,policy);}const tax=base*policy.rate/100,total=base+tax;if(!Number.isFinite(total)||Math.abs(total)>Number.MAX_SAFE_INTEGER/100)throw Error('El importe supera el límite de cálculo.');return {base,tax,total};}
 function importPolicy(draft){const policies=(draft.lines||[]).map(l=>l.source?.tax).filter(Boolean).map(p=>taxPolicy(p,p.mode));if(!policies.length)return null;const first=policies[0];if(policies.some(p=>JSON.stringify(p)!==JSON.stringify(first)))throw Error('El documento mezcla criterios de impuestos de origen. Revisa las líneas antes de añadir más fichas.');return taxPolicy(first,first.mode);}
 let conversion=null;
 const eligible=p=>ModernoSpec.rows(p).filter(r=>!r.item.hidden&&!r.item.alt);
 const fiscalNow=()=>taxProfile(state.account,taxNames(state.account?.country||'España')[0]);
 const owner=()=>JSON.stringify([ESTUDIO_ID,state.sessionUser?.id,state.sessionUser?.mail,_accessRole]);
 const canConvert=p=>!_accessLoading&&_accessRole==='admin'&&canView('presupuestos')&&byBrand([p]).includes(p);
 function rowState(r,initial){const data=snapshot(r);if(initial?.id==null)delete data.id;return JSON.stringify({...data,cost:r.item.cost??null});}
 function conversionCurrent(ctx){
  if(!ctx||conversion!==ctx||ctx.owner!==owner()||!canConvert(ctx.project)||state.projects.find(p=>p.id===ctx.pid)!==ctx.project||state.view!==ctx.view||state.draft!==ctx.draft||JSON.stringify(state.draft??null)!==ctx.draftState)return false;
  if(JSON.stringify(fiscalNow())!==JSON.stringify(ctx.profile)||JSON.stringify([ctx.project.num,ctx.project.name,ctx.project.brand,ctx.project.client])!==ctx.projectState)return false;
  const rows=eligible(ctx.project);return rows.length===ctx.rows.length&&rows.every((r,i)=>r.item===ctx.rows[i].item&&r.room===ctx.rows[i].room&&rowState(r,ctx.rows[i].initial)===ctx.rows[i].state);
 }
 function conversionOpen(ctx){return conversion===ctx&&!!document.getElementById('shopping-quote-tax-form')&&document.getElementById('overlay')?.classList.contains('open')&&document.getElementById('modalBox')?.classList.contains('shopping-quote-tax-dialog');}
 function conversionValid(ctx){try{return conversionCurrent(ctx)&&conversionOpen(ctx);}catch{return false;}}
 function prepare(pid){
  const p=state.projects.find(p=>p.id===pid);if(!p||!canConvert(p)){toast('Solo un administrador puede preparar presupuestos');return;}
  try{
   const profile=fiscalNow(),rows=eligible(p);if(!rows.length)throw Error('Añade productos al proyecto antes de preparar el presupuesto');totals(rows,profile,'excluded');
   conversion={pid,project:p,owner:owner(),profile,rows:rows.map(r=>({item:r.item,room:r.room,initial:snapshot(r),state:rowState(r,snapshot(r))})),projectState:JSON.stringify([p.num,p.name,p.brand,p.client]),draft:state.draft,draftState:JSON.stringify(state.draft??null),view:state.view,mode:null,busy:false};
   const name=E(profile.name),rate=E(profile.rate);
   modal(`<form id="shopping-quote-tax-form" onsubmit="event.preventDefault();ProjectQuotes.confirmTax()"><header class="shopping-quote-tax-header"><div><h3>Generar presupuesto</h3><p>${E(p.num)} · ${E(p.name)}</p></div><button type="button" aria-label="Cerrar configuración del presupuesto" onclick="ProjectQuotes.cancelTax()">×</button></header><p class="shopping-quote-tax-question">¿Los precios de las listas incluyen impuestos?</p><p class="shopping-quote-tax-country">País fiscal: <strong>${E(profile.country)}</strong> · ${name} ${rate} %</p>
   <fieldset class="shopping-quote-tax-options"><legend class="shopping-quote-sr">Impuestos de los precios aportados</legend><label><input type="radio" name="shoppingQuoteTax" aria-label="${name} incluido" value="included" onchange="ProjectQuotes.selectTax(this.value)"><span><strong>${name} incluido</strong><small>El impuesto ya está en los precios. Se separará de la base.</small></span></label><label><input type="radio" name="shoppingQuoteTax" aria-label="${name} excluido" value="excluded" onchange="ProjectQuotes.selectTax(this.value)"><span><strong>${name} excluido</strong><small>Se añadirá el impuesto a los precios de las listas.</small></span></label></fieldset>
   <div id="shopping-quote-tax-preview" aria-live="polite">Selecciona una opción para ver el desglose.</div><p id="shopping-quote-tax-error" role="alert"></p><footer class="modal-foot"><button type="button" class="btn" onclick="ProjectQuotes.cancelTax()">Cancelar</button><button type="submit" class="btn shopping-quote-tax-primary" id="shopping-quote-tax-go" disabled>Generar presupuesto</button></footer></form>`);
   document.getElementById('modalBox').classList.add('shopping-quote-tax-dialog');
  }catch(e){toast(e.message);}
 }
 function selectTax(mode){const ctx=conversion;if(!ctx||ctx.busy)return;try{if(!conversionValid(ctx))throw Error('El proyecto o la configuración fiscal han cambiado. Vuelve a abrir Generar presupuesto.');const a=totals(eligible(ctx.project),ctx.profile,mode);ctx.mode=mode;document.getElementById('shopping-quote-tax-preview').innerHTML=`<div><span>Base imponible</span><strong>${E(fmt(a.base))}</strong></div><div><span>${E(ctx.profile.name)} (${E(ctx.profile.rate)} %)</span><strong>${E(fmt(a.tax))}</strong></div><div class="shopping-quote-tax-total"><span>Total del presupuesto</span><strong>${E(fmt(a.total))}</strong></div>`;document.getElementById('shopping-quote-tax-go').disabled=false;}catch(e){document.getElementById('shopping-quote-tax-error').textContent=e.message;document.getElementById('shopping-quote-tax-go').disabled=true;}}
 function cancelTax(){conversion=null;closeModal();}
 async function confirmTax(){const ctx=conversion;if(!ctx||ctx.busy||!ctx.mode||!document.getElementById('overlay')?.classList.contains('open'))return;
  if(!conversionValid(ctx)){document.getElementById('shopping-quote-tax-error').textContent='El proyecto o la configuración fiscal han cambiado. Vuelve a abrir Generar presupuesto.';return;}
  ctx.busy=true;const button=document.getElementById('shopping-quote-tax-go');button.disabled=true;button.textContent='Preparando…';document.querySelectorAll('[name=shoppingQuoteTax]').forEach(input=>input.disabled=true);
  try{await listToQuote(ctx.pid,ctx);}finally{if(conversion===ctx){ctx.busy=false;button.disabled=false;button.textContent='Generar presupuesto';document.querySelectorAll('[name=shoppingQuoteTax]').forEach(input=>input.disabled=false);}}
 }
 function taxError(ctx,message){if(conversion===ctx){const field=document.getElementById('shopping-quote-tax-error');if(field)field.textContent=message;}}
 function finishTax(ctx){if(conversion!==ctx)return false;conversion=null;closeModal();return true;}
 return {taxProfile,taxPolicy,basePrice,totals,importPolicy,prepare,selectTax,cancelTax,confirmTax,conversionOpen,conversionValid,finishTax,taxError,snapshot,line,references,validate,links,open,add,trace,audit};
})();
