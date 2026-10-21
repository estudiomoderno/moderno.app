/* Recover only future snapshots with a captured server baseline and verified owner. */
(function(root){
 const allowed=role=>role==='admin'?['proyectos','compras','presupuestos','facturas','contactos','contratistas','fases','agenda','config']:role==='colaborador'?['proyectos','compras','contactos','fases','agenda']:[];
 function blocks(d){
  const s=d.state||{};
  return {
   proyectos:s.projects||[],compras:s.library||[],
   presupuestos:{quotes:s.quotes||[],n:s.quoteCounter,drafts:s.borradores||[]},
   facturas:{invoices:s.invoices||[],n:s.invCounter,entries:s.entries||[],del:s.entriesDel||{},ddel:s.docsDel||{}},
   contactos:s.clients||[],contratistas:{},fases:{tpl:Array.isArray(s.obraTpl)?s.obraTpl:[]},agenda:s.cal||{},
   config:{ibv:2,idPrefix:s.idPrefix||{},series:s.series||{},defMargin:s.defMargin??0,irpf:!!s.irpf,trades:s.trades||[],catalog:s.catalog,catalogArchive:s.catalogArchive||[],catalogSeed:s.catalogSeed||null,account:s.account,emitter:s.emitter,users:s.users,onboarded:s.onboarded,counters:s.counters,docs:s.docs,logos:s.logos,BRAND:d.BRAND,wsOrder:d.wsOrder}
  };
 }
 function capture({study,user,role,loaded,hashes,versions,values,canonical,conflicts={}}){
  if(!loaded||!study||!user||!allowed(role).length)return undefined;
  const pending={};
  for(const b of allowed(role)){
   const value=canonical(values[b]);
   if(value!==hashes[b])pending[b]={base:conflicts[b]?canonical(conflicts[b].base):hashes[b]===undefined?null:hashes[b],version:versions[b]||null,...(conflicts[b]?{review:true}:{})};
  }
  return {v:1,study,user,role,pending};
 }
 function plan(raw,rows,owner,{canonical,merge}){
  if(!raw)return {status:'none',changes:{},conflicts:{}};
  let d;try{d=JSON.parse(raw);}catch(e){return {status:'invalid',changes:{},conflicts:{}};}
  if(d.v!==1)return {status:'invalid',changes:{},conflicts:{}};
  const sync=d.sync;
  if(!sync)return {status:'legacy',changes:{},conflicts:{}};
  if(sync.v!==1||!sync.pending||typeof sync.pending!=='object'||Array.isArray(sync.pending)||!d.state)return {status:'invalid',changes:{},conflicts:{}};
  if(!owner.user||sync.study!==owner.study||sync.user!==owner.user||sync.role!==owner.role||!allowed(owner.role).length)return {status:'other-owner',changes:{},conflicts:{}};
  const local=blocks(d),changes={},conflicts={};
  for(const b of Object.keys(sync.pending)){
   if(!allowed(owner.role).includes(b))return {status:'invalid',changes:{},conflicts:{}};
   const baseline=sync.pending[b];let base;
   if(!baseline||baseline.base!==null&&typeof baseline.base!=='string')return {status:'invalid',changes:{},conflicts:{}};
   try{base=baseline.base===null?undefined:JSON.parse(baseline.base);}catch(e){return {status:'invalid',changes:{},conflicts:{}};}
   const remote=rows.find(r=>r.bloque===b);
   if(remote&&remote.rol!==owner.role)return {status:'invalid',changes:{},conflicts:{}};
   const value=local[b];
   if(remote&&canonical(value)===canonical(remote.contenido))continue; // already acknowledged before the tab closed
   if(base!==undefined&&canonical(value)===canonical(base))continue;
   try{
    if(baseline.review)throw Error('Revisión pendiente de la sesión anterior');
    if(base===undefined&&remote||base!==undefined&&!remote)throw Error('El bloque ha cambiado de existencia');
    changes[b]=base===undefined?value:merge(base,value,remote.contenido);
   }catch(e){
    // Keep the local value visible, but never upload any block until review resolves the conflict.
    changes[b]=value;conflicts[b]={base:base??{},local:value,remote:remote?.contenido??{},version:remote?.updated_at??null};
   }
  }
  return {status:Object.keys(conflicts).length?'conflict':Object.keys(changes).length?'pending':'confirmed',changes,conflicts};
 }
 root.ModernoPendingRecovery={blocks,capture,plan};
})(typeof window!=='undefined'?window:globalThis);
