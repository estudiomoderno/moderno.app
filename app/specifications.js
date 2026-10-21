/* Specifications domain. Identity fields: id, libId, src. New copies record their own addedAt.
   No side effects on read, no bulk conversion and no external requests. */
var ModernoSpec=(()=>{
 const clone=v=>JSON.parse(JSON.stringify(v));
 const key=id=>typeof id+':'+String(id);
 const uuid=()=>crypto.randomUUID();
 function rows(p){return (p.rooms||[]).flatMap(r=>(r.sections||[]).flatMap((s,si)=>(s.items||[]).map((item,ii)=>({room:r,section:s,si,ii,item}))));}
 function refFor(id){return 'spec:'+key(id);}
 function resolve(p,ref){
  if(ref.src&&String(ref.src).startsWith('spec:')){
   const matches=rows(p).filter(x=>refFor(x.item.id)===ref.src);
   return matches.length===1?matches[0]:null;
  }
  const rs=(p.rooms||[]).filter(r=>r.id===ref.rid);
  if(rs.length!==1)return null;
  const r=rs[0],s=(r.sections||[])[ref.rsi],item=s&&s.items[ref.rii];
  return item?{room:r,section:s,si:ref.rsi,ii:ref.rii,item}:null;
 }
 function references(p){
  const refs=[];
  (p.pres||[]).forEach(pr=>(pr.pages||[]).forEach(pg=>(pg.els||[]).forEach(e=>{if(['prod','pin'].includes(e.t))refs.push(e);})));
  (p.moods||[]).forEach(m=>(m.secs||[]).forEach(s=>(s.items||[]).forEach(i=>{if(i.prodRef)refs.push(i.prodRef);})));return refs;
 }
 function origin(item,masters=[]){
  if(item.libId==null)return {kind:'independiente',master:null};
  const matches=masters.filter(m=>m.id===item.libId);
  return {kind:matches.length===1?'biblioteca':matches.length?'ambiguo':'no_disponible',master:matches.length===1?matches[0]:null};
 }
 function diagnose(p){
  const issues=[],rr=rows(p);
  const scan=(list,kind)=>{const groups=new Map();for(const x of list){if(x.id==null){issues.push({code:'missing_'+kind,id:null,name:x.name||'',blocking:false});continue;}const k=key(x.id);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
   for(const group of groups.values())if(group.length>1)issues.push({code:'duplicate_'+kind,id:group[0].id,name:group.map(x=>x.name||'Sin nombre').join(' · '),count:group.length,blocking:true});};
  scan(p.rooms||[],'room');scan((p.rooms||[]).flatMap(r=>r.sections||[]),'section');scan(rr.map(x=>x.item),'product');
  references(p).forEach((ref,index)=>{if(!resolve(p,ref))issues.push({code:'unresolved_reference',id:index,name:'Referencia '+(index+1),blocking:false});});
  return issues;
 }
 // Run only as part of an edit. References are bound before positions change.
 function prepare(p,newId=uuid){
  const ambiguous=diagnose(p).filter(x=>x.blocking);
  if(ambiguous.length){const error=Error('Hay identificadores repetidos. Revisa las referencias del proyecto antes de reorganizar o vincular fichas.');error.issues=ambiguous;throw error;}
  const rr=rows(p),bound=references(p).map(ref=>({ref,target:resolve(p,ref)}));
  const reserved=new Set(rr.filter(x=>x.item.id!=null).map(x=>key(x.item.id)));
  const assignments=[];rr.forEach(x=>{if(x.item.id==null){const id=newId();if(reserved.has(key(id)))throw Error('Identificador repetido');reserved.add(key(id));assignments.push([x.item,id]);}});
  const sections=(p.rooms||[]).flatMap(r=>r.sections||[]);
  const sectionReserved=new Set(sections.filter(s=>s.id!=null).map(s=>key(s.id))),sectionAssignments=[];
  sections.forEach(s=>{if(s.id==null){const id=newId();if(sectionReserved.has(key(id)))throw Error('Identificador de sección repetido');sectionReserved.add(key(id));sectionAssignments.push([s,id]);}});
  const itemIds=new Map(assignments);
  const refAssignments=bound.filter(({ref})=>!ref.src||!String(ref.src).startsWith('spec:')).map(({ref,target})=>[ref,target?refFor(itemIds.get(target.item)??target.item.id):'spec:missing:'+newId()]);
  assignments.forEach(([item,id])=>{item.id=id;});
  sectionAssignments.forEach(([section,id])=>{section.id=id;});
  refAssignments.forEach(([ref,src])=>{ref.src=src;});
  return p;
 }
 function reindex(p){references(p).forEach(ref=>{if(!String(ref.src||'').startsWith('spec:'))return;const x=resolve(p,ref);if(x){ref.rid=x.room.id;ref.rsi=x.si;ref.rii=x.ii;}else{ref.rsi=-1;ref.rii=-1;}});}
 // A label edit moves one exact instance, without preparing or renumbering the project.
 function reclassifyItem(p,room,si,ii,toSi,item,label,newId=uuid){
  const sections=room.sections||[],source=sections[si],previous=source?.items?.[ii];
  if(!(p.rooms||[]).includes(room)||!previous||item.id!==previous.id)throw Error('El producto ha cambiado. Vuelve a abrir su ficha.');
  if(toSi===si){source.items[ii]=item;return;}
  const targetIndex=toSi<0?sections.length:toSi;
  const destination=toSi<0?{id:newId(),name:label||'General',items:[]}:sections[toSi];
  if(!destination||!Array.isArray(destination.items))throw Error('No se encuentra la etiqueta de destino.');
  const destinationIndex=destination.items.length,updates=[];
  const repeatedRoom=(p.rooms||[]).filter(r=>r.id===room.id).length!==1;
  for(const ref of references(p)){
   const target=resolve(p,ref),stable=String(ref.src||'').startsWith('spec:');
   if(!target){
    // Never turn a dangling positional link into a link to the newly appended product.
    if(!stable&&ref.rid===room.id&&((repeatedRoom&&Number(ref.rsi)===si)||
       (Number(ref.rsi)===targetIndex&&(repeatedRoom||Number(ref.rii)===destinationIndex)))){
     throw Error('Hay un vínculo sin resolver en esta lista. Revisa ese vínculo antes de cambiar la etiqueta.');
    }
    continue;
   }
   if(target.room!==room||target.section!==source)continue;
   if(Number(target.ii)===ii)updates.push([ref,targetIndex,destinationIndex]);
   else if(Number(target.ii)>ii)updates.push([ref,si,Number(target.ii)-1]);
  }
  // All validation precedes mutations. Existing IDs and reference src values stay intact.
  if(toSi<0)sections.push(destination);
  source.items.splice(ii,1);destination.items.push(item);
  updates.forEach(([ref,rsi,rii])=>{ref.rsi=rsi;ref.rii=rii;});
 }
 function editItems(p,room,si,ii,operation){
  if(!['remove','duplicate','alternative'].includes(operation))throw Error('Acción de producto no válida.');
  const section=room.sections?.[si],item=section?.items?.[ii];
  if(!(p.rooms||[]).includes(room)||!item)throw Error('El producto ha cambiado. Vuelve a abrir su ficha.');
  const inserting=operation!=='remove',copy=inserting?duplicate(item):null,updates=[];
  if(copy&&rows(p).some(row=>row.item.id===copy.id))throw Error('No se pudo generar una copia independiente.');
  const missing=ref=>'spec:missing:'+JSON.stringify([ref.src??null,ref.rid,ref.rsi,ref.rii]);
  for(const ref of references(p)){
   const target=resolve(p,ref),stable=String(ref.src||'').startsWith('spec:');
   if(!target){
    const ambiguousRemoved=!inserting&&stable&&ref.src===refFor(item.id)&&rows(p).filter(row=>row.item.id===item.id).length===2;
    const newlyOccupied=inserting&&!stable&&ref.rid===room.id&&Number(ref.rsi)===si&&Number(ref.rii)===section.items.length;
    if(ambiguousRemoved||newlyOccupied)updates.push([ref,missing(ref),-1,-1]);
    continue;
   }
   if(target.room!==room||target.section!==section)continue;
   if(!inserting&&Number(target.ii)===ii)updates.push([ref,missing(ref),-1,-1]);
   else if(Number(target.ii)>ii)updates.push([ref,ref.src,si,Number(target.ii)+(inserting?1:-1)]);
  }
  if(inserting){if(operation==='alternative'){copy.alt=true;copy.name+=' — alternativa';}section.items.splice(ii+1,0,copy);}
  else section.items.splice(ii,1);
  updates.forEach(([ref,src,rsi,rii])=>{if(src!==undefined)ref.src=src;ref.rsi=rsi;ref.rii=rii;});
  return copy||item;
 }
 function fromProduct(product,newId=uuid){
  const it=clone(product);it.id=newId();it.addedAt=new Date().toISOString();if(product.id!=null)it.libId=product.id;else delete it.libId;
  delete it.cli;delete it.cliNote;delete it.rejected;delete it.hidden;delete it.alt;
  it.qty=product.qty==null?1:product.qty;it.status='Revisión Cliente';it.note='';return it;
 }
 function duplicate(item,newId=uuid){const it=clone(item);it.id=newId();it.addedAt=new Date().toISOString();delete it.cli;delete it.cliNote;delete it.rejected;it.status='Revisión Cliente';return it;}
 function economics(item){
  const number=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const price=number(item.price),cost=number(item.cost),qty=number(item.qty);
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  return {price,cost,qty,total:price===null||qty===null?null:round(price*qty),gain:price===null||cost===null||qty===null?null:round((price-cost)*qty),margin:price===null||cost===null||price===0?null:round((price-cost)/price*100)};
 }
 // Explicit output allowlist: never include internal costs, margins or notes.
 function board(room){return (room.sections||[]).map(s=>({name:s.name,items:(s.items||[]).filter(i=>!i.hidden&&!i.alt).map(i=>({id:i.id,name:i.name,sku:i.sku,color:i.color,material:i.material,dims:i.dims,img:i.img,qty:i.qty,unit:i.unit,price:i.price}))})).filter(s=>s.items.length);}
 return {rows,refFor,resolve,prepare,reindex,reclassifyItem,editItems,fromProduct,duplicate,economics,board,diagnose,origin};
})();
if(typeof module!=='undefined')module.exports=ModernoSpec;
