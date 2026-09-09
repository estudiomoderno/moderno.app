/* Resolución explícita: conserva copia, comprueba versiones y no envía hasta resolver. */
var flowReview=null;
function flowFieldLabel(path,record){
  const names={name:'Nombre',title:'Título',notes:'Notas',note:'Nota',amount:'Importe',total:'Total',price:'Precio',qty:'Cantidad',tasks:'Tareas',projects:'Proyectos',files:'Archivos',status:'Estado',col:'Estado',due:'Fecha límite',phone:'Teléfono',email:'Correo'};
  let current=record.local;const labels=[];
  for(const part of path){
    if(Array.isArray(current)){const row=current.find(x=>x&&['id','ref'].some(k=>typeof x[k]+':'+x[k]===part));labels.push(row?.num||row?.title||row?.name||'Elemento');current=row;}
    else{labels.push(names[part]||part);current=current?.[part];}
  }
  return labels.join(' → ')||'Lista completa';
}
function flowReviewOpen(){
  const records=window._cloudConflicts||{},block=Object.keys(records)[0];
  if(!block){toast('No hay conflictos pendientes');return;}
  const c=records[block];
  const local=JSON.parse(canon(CLOUD_BLOCKS[block].get()));
  flowReview={block,record:{...c,local},choices:{}};flowReviewDraw();
}
function flowReviewDraw(){
  const f=flowReview;if(!f)return;
  const plan=ModernoSync.reviewChanges(f.record.base,f.record.local,f.record.remote,f.choices);f.remaining=plan.conflicts;
  const E=ModernoDaily.escape,show=v=>E(v.missing?'Eliminado':JSON.stringify(v.value,null,2));
  modal('<h3>Resolver cambios compartidos</h3><p>Compara los cambios de '+E(f.block)+'. Los cambios independientes se combinan automáticamente. Si cambió el orden de una lista, se compara la lista completa.</p>'+plan.conflicts.map((c,i)=>'<section style="border:1px solid #ddd;padding:12px;margin:10px 0"><b>'+E(flowFieldLabel(c.path,f.record))+'</b><details><summary>Valor anterior</summary><pre style="max-height:180px;overflow:auto;white-space:pre-wrap">'+show(c.base)+'</pre></details><p>Tu cambio</p><pre style="max-height:180px;overflow:auto;white-space:pre-wrap">'+show(c.local)+'</pre><p>Cambio guardado en la nube</p><pre style="max-height:180px;overflow:auto;white-space:pre-wrap">'+show(c.remote)+'</pre><button class="btn btn-ghost" onclick="flowReviewChoose('+i+',\'local\')">Conservar mi cambio</button><button class="btn btn-ghost" onclick="flowReviewChoose('+i+',\'remote\')">Conservar cambio de la nube</button></section>').join('')+'<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Revisar más tarde</button><button class="btn btn-dark" '+(plan.conflicts.length?'disabled':'')+' onclick="flowReviewApply()">Guardar resolución</button></div>');
}
function flowReviewChoose(index,choice){if(!flowReview||!['local','remote'].includes(choice))return;const c=flowReview.remaining[index];if(!c)return;flowReview.choices[c.key]=choice;flowReviewDraw();}
async function flowReviewApply(){
  const f=flowReview;if(!f)return;const estudio=ESTUDIO_ID;
  try{
    const {data:cur,error}=await cloudReadBlock(f.block);if(error||!cur)throw Error('No se pudo comprobar la versión de la nube');
    if(ESTUDIO_ID!==estudio)throw Error('La sesión ha cambiado');
    if(canon(CLOUD_BLOCKS[f.block].get())!==canon(f.record.local)||cur.updated_at!==f.record.version){
      window._cloudConflicts[f.block]={...f.record,remote:cur.contenido,version:cur.updated_at};flowReviewOpen();toast('Hay cambios nuevos. Revisa de nuevo la comparación.');return;
    }
    const plan=ModernoSync.reviewChanges(f.record.base,f.record.local,f.record.remote,f.choices);if(plan.conflicts.length)return;
    const raw=JSON.stringify({v:1,when:Date.now(),state,BRAND,wsOrder}),key=LS_KEY+'_pendiente_'+Date.now();
    await pendingArchiveStore().write(key,raw);localStorage.setItem(key,ModernoPendingArchive.marker(key));
    // Recheck after asynchronous backup before changing any local values.
    if(ESTUDIO_ID!==estudio||canon(CLOUD_BLOCKS[f.block].get())!==canon(f.record.local))throw Error('Hay cambios nuevos; vuelve a revisar');
    _cloudApplying=true;try{CLOUD_BLOCKS[f.block].set(plan.value);}finally{_cloudApplying=false;}
    _cloudHash[f.block]=canon(cur.contenido);_cloudSeen[f.block]=cur.updated_at;
    delete window._cloudConflicts[f.block];flowReview=null;closeModal();persistNow();render();
    if(Object.keys(window._cloudConflicts).length){flowReviewOpen();return;}
    await cloudFlush();
  }catch(e){toast(e.message||'No se pudo resolver; se conservan los cambios');}
}
async function teamRevoke(index){
  const user=state.users[index];if(!user||!user.email)return;
  closeModal();await cloudFlush();
  if(syncHasChanges()){toast('Primero resuelve los cambios pendientes del estudio');return;}
  const estudio=ESTUDIO_ID;
  try{
    const {data,error}=await sb.rpc('app_revocar_acceso',{p_estudio:estudio,p_email:user.email,p_base:_cloudSeen.config});
    if(error||!data?.revocado)throw Error(error?.message||'No se confirmó la revocación');
    if(ESTUDIO_ID!==estudio)return;
    cloudApplyRemote('config',data.contenido,data.updated_at);toast('Acceso revocado en el servidor');teamsModal();
  }catch(e){toast('No se quitó el acceso: '+e.message);}
}
