/* References only: documents keep their own immutable-at-import snapshot. */
var ProjectQuotes=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),E=x=>ModernoDaily.escape(x??'');
 const fields=['id','name','sku','qty','unit','price','dims','material','color','img','url','plazo'];
 let selection=null;
 function snapshot(row){const s={};for(const k of fields)if(row.item[k]!==undefined)s[k]=copy(row.item[k]);return {...s,room_id:row.room.id,room:row.room.name};}
 function line(row,study,pid){
  const i=row.item,qty=Number(i.qty),price=Number(i.price);
  if(i.cost!=null&&i.cost!==''&&(!Number.isFinite(Number(i.cost))||Number(i.cost)<0))throw Error('Revisa el coste de '+(i.name||'la ficha'));
  if(i.id==null||i.qty==null||i.qty===''||!Number.isFinite(qty)||qty<=0||i.price==null||i.price===''||!Number.isFinite(price)||price<0)throw Error('Revisa la identidad, cantidad y precio de '+(i.name||'la ficha'));
  const source={study,project:pid,item:i.id,snapshot:snapshot(row)};
  return {name:i.name||'Producto',desc:[i.sku,i.dims,i.material,i.color].filter(Boolean).join(' · '),cap:row.room.name||'Productos',qty,price,unit:i.unit||'ud',cost:i.cost==null||i.cost===''?null:Number(i.cost),source};
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
  selection={draft:state.draft,study:ESTUDIO_ID,project:p,rows:ModernoSpec.rows(p).filter(r=>!r.item.hidden&&!r.item.alt)};
  modal('<h3>Añadir fichas del proyecto</h3><p>Se copiarán cantidades, acabados y precios actuales. El documento conservará esa copia aunque la ficha cambie.</p><div class="entry-col">'+selection.rows.map((r,n)=>'<label class="entry"><input type="checkbox" data-quote-product="'+n+'"> <span>'+E(r.room.name)+' · '+E(r.item.name)+'<small>'+E(r.item.qty)+' '+E(r.item.unit||'ud')+' · '+E(r.item.price)+' €</small></span></label>').join('')+'</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-dark" onclick="ProjectQuotes.add()">Añadir seleccionados</button></div>');
 }
 async function add(){
  const s=selection;if(!s)return;const rows=[...document.querySelectorAll('[data-quote-product]:checked')].map(x=>s.rows[Number(x.dataset.quoteProduct)]).filter(Boolean);
  if(!rows.length){toast('Selecciona al menos una ficha');return;}
  try{
   if(_accessRole!=='admin'||ESTUDIO_ID!==s.study||state.draft!==s.draft||s.draft.projectId!==s.project.id)throw Error('El documento o el estudio ha cambiado');
   specPrepare(s.project);persistNow();await cloudFlush();
   if(_accessRole!=='admin'||ESTUDIO_ID!==s.study||state.draft!==s.draft||s.draft.projectId!==s.project.id||_cloudBusy||_saveErr||_cloudHash.proyectos!==canon(CLOUD_BLOCKS.proyectos.get()))throw Error('Primero guarda los cambios del proyecto y vuelve a intentarlo');
   if(state.projects.find(p=>p.id===s.project.id)!==s.project||rows.some(r=>!ModernoSpec.rows(s.project).some(x=>x.item===r.item)))throw Error('Las fichas han cambiado; abre de nuevo la selección');
   const additions=rows.map(r=>line(r,s.study,s.project.id));
   if(additions.some(a=>s.draft.lines.some(l=>l.source?.study===a.source.study&&l.source.project===a.source.project&&l.source.item===a.source.item)))throw Error('Una ficha seleccionada ya está en el documento. Revisa sus cantidades en la línea existente.');
   s.draft.lines.push(...additions);selection=null;closeModal();render();toast('Fichas añadidas con su referencia de origen');
  }catch(e){toast(e.message);}
 }
 return {snapshot,line,references,validate,links,open,add,trace,audit};
})();
