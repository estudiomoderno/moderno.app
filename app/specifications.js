/* Specifications domain. Existing fields only: id, libId, src.
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
 // Run only as part of an edit. References are bound before positions change.
 function prepare(p,newId=uuid){
  const rr=rows(p),bound=references(p).map(ref=>({ref,target:resolve(p,ref)}));
  const counts=new Map();rr.forEach(x=>{if(x.item.id!=null)counts.set(key(x.item.id),(counts.get(key(x.item.id))||0)+1);});
  const reserved=new Set(rr.filter(x=>x.item.id!=null).map(x=>key(x.item.id)));
  const assignments=[];rr.forEach(x=>{if(x.item.id==null||counts.get(key(x.item.id))>1){const id=newId();if(reserved.has(key(id)))throw Error('Identificador repetido');reserved.add(key(id));assignments.push([x.item,id]);}});
  const sections=(p.rooms||[]).flatMap(r=>r.sections||[]),sectionCounts=new Map();
  sections.forEach(s=>{if(s.id!=null)sectionCounts.set(key(s.id),(sectionCounts.get(key(s.id))||0)+1);});
  const sectionReserved=new Set(sections.filter(s=>s.id!=null).map(s=>key(s.id))),sectionAssignments=[];
  sections.forEach(s=>{if(s.id==null||sectionCounts.get(key(s.id))>1){const id=newId();if(sectionReserved.has(key(id)))throw Error('Identificador de sección repetido');sectionReserved.add(key(id));sectionAssignments.push([s,id]);}});
  const itemIds=new Map(assignments);
  const refAssignments=bound.filter(({ref})=>!ref.src||!String(ref.src).startsWith('spec:')).map(({ref,target})=>[ref,target?refFor(itemIds.get(target.item)??target.item.id):'spec:missing:'+newId()]);
  assignments.forEach(([item,id])=>{item.id=id;});
  sectionAssignments.forEach(([section,id])=>{section.id=id;});
  refAssignments.forEach(([ref,src])=>{ref.src=src;});
  return p;
 }
 function reindex(p){references(p).forEach(ref=>{if(!String(ref.src||'').startsWith('spec:'))return;const x=resolve(p,ref);if(x){ref.rid=x.room.id;ref.rsi=x.si;ref.rii=x.ii;}else{ref.rsi=-1;ref.rii=-1;}});}
 function fromProduct(product,newId=uuid){
  const it=clone(product);it.id=newId();if(product.id!=null)it.libId=product.id;else delete it.libId;
  delete it.cli;delete it.cliNote;delete it.rejected;delete it.hidden;delete it.alt;
  it.qty=product.qty==null?1:product.qty;it.status='Revisión Cliente';it.note='';return it;
 }
 function duplicate(item,newId=uuid){const it=clone(item);it.id=newId();delete it.cli;delete it.cliNote;delete it.rejected;it.status='Revisión Cliente';return it;}
 function economics(item){
  const number=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const price=number(item.price),cost=number(item.cost),qty=number(item.qty);
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  return {price,cost,qty,total:price===null||qty===null?null:round(price*qty),gain:price===null||cost===null||qty===null?null:round((price-cost)*qty),margin:price===null||cost===null||price===0?null:round((price-cost)/price*100)};
 }
 // Explicit output allowlist: never include internal costs, margins or notes.
 function board(room){return (room.sections||[]).map(s=>({name:s.name,items:(s.items||[]).filter(i=>!i.hidden&&!i.alt).map(i=>({id:i.id,name:i.name,sku:i.sku,color:i.color,material:i.material,dims:i.dims,img:i.img,qty:i.qty,unit:i.unit,price:i.price}))})).filter(s=>s.items.length);}
 return {rows,refFor,resolve,prepare,reindex,fromProduct,duplicate,economics,board};
})();
if(typeof module!=='undefined')module.exports=ModernoSpec;
