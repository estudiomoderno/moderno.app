/* Published masters are read from an authorized RPC, never from other studies. */
const ModernoBrands=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let owner='',rows=[],checked=0,pending=false,selected=false,query='',active=null;
 const key=()=>ESTUDIO_ID+'|'+(state.sessionUser?.id||'')+'|'+_accessRole;
 function refresh(){
  const next=key();if(owner!==next){owner=next;rows=[];checked=0;selected=false;active=null;pending=false;}
  if(!ESTUDIO_ID||!['admin','colaborador'].includes(_accessRole)||pending||Date.now()-checked<60000)return;
  pending=true;checked=Date.now();const study=ESTUDIO_ID;
  sb.rpc('biblioteca_marcas_leer',{p_estudio:study}).then(({data,error})=>{
   if(owner!==next||key()!==next)return;
   const hadRows=rows.length;rows=!error&&Array.isArray(data)?data.filter(ModernoLibraryOrigin.published):[];
   if(!rows.length)selected=false;
   if(state.view==='biblioteca'&&(rows.length||hadRows))render();
  }).catch(()=>{}).finally(()=>{if(owner===next)pending=false;});
 }
 function tabs(){refresh();return rows.length?`<div class="pill-tabs" style="margin:14px 0"><button class="${selected?'':'on'}" onclick="ModernoBrands.choose(false)">Mi estudio</button><button class="${selected?'on':''}" onclick="ModernoBrands.choose(true)">Marcas</button></div>`:'<h2 style="font-size:20px;margin:14px 0 6px">Mi estudio</h2>';}
 function choose(value){selected=!!value&&rows.length>0;render();}
 function view(){
  refresh();if(!selected||!rows.length)return null;
  const visible=rows.filter(r=>(r.product.name+' '+r.brandName+' '+(r.product.sku||'')).toLowerCase().includes(query.toLowerCase()));
  return `<h1 class="big">Tu biblioteca de productos</h1>${tabs()}<input id="brand-library-search" type="search" placeholder="Buscar producto o marca…" value="${esc(query)}" oninput="ModernoBrands.search(this)" style="width:100%;margin-bottom:16px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">${visible.map(r=>`<article class="widget"><small>${esc(r.brandName)}</small><h3>${esc(r.product.name)}</h3><p>${esc(r.product.sku||'')}</p>${r.rights.saveToStudy?`<button class="btn btn-dark" onclick="ModernoBrands.open(${rows.indexOf(r)})">Guardar en Mi estudio</button>`:''}</article>`).join('')}</div>${visible.length?'':'<p>No hay productos con esa búsqueda.</p>'}`;
 }
 function open(index){
  const r=rows[index];if(!r||!r.rights.saveToStudy)return;
  active={record:r,id:crypto.randomUUID(),owner:key(),busy:false};
  modal(`<h3>Guardar en Mi estudio</h3><p>${esc(r.product.name)}</p><label>Precio de venta (€), opcional<input id="brand-copy-price" type="number" min="0" step="0.01"></label><label>Proveedor<input id="brand-copy-supplier"></label><label>Notas privadas<textarea id="brand-copy-notes"></textarea></label><p id="brand-copy-message" role="status">Se guardará una copia independiente. Los cambios de la marca no modificarán tus documentos.</p><div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button><button id="brand-copy-save" class="btn btn-dark" onclick="ModernoBrands.save()">Guardar copia</button></div>`);
 }
 async function save(){
  const ctx=active,button=document.getElementById('brand-copy-save'),message=document.getElementById('brand-copy-message');
  if(!ctx||ctx.busy||ctx.owner!==key()||!button)return;
  const price=document.getElementById('brand-copy-price').value;
  if(price!==''&&(!Number.isFinite(+price)||+price<0)){message.textContent='Revisa el precio.';return;}
  const custom={price:price===''?null:+price,supplier:document.getElementById('brand-copy-supplier').value,notes:document.getElementById('brand-copy-notes').value};
  ctx.busy=true;button.disabled=true;
  try{
   await cloudFlush();if(ctx.owner!==key()||active!==ctx||!button.isConnected)return;
   if(_cloudBusy||_cloudHash.compras!==canon(state.library))throw Error('Guarda primero los cambios pendientes de la biblioteca.');
   const {data,error}=await sb.rpc('biblioteca_marca_guardar',{p_estudio:ESTUDIO_ID,p_producto:ctx.record.id,p_revision:ctx.record.revision,p_id:ctx.id,p_custom:custom});
   if(error)throw Error('No se pudo guardar. Comprueba tu conexión o vuelve a consultar el catálogo.');
   if(ctx.owner!==key()||active!==ctx||!button.isConnected)return;
   if(!['saved','already_saved'].includes(data?.status))throw Error('No se ha confirmado la copia.');
   const remote=await cloudReadBlock('compras');if(ctx.owner!==key()||active!==ctx||!button.isConnected)return;
   if(remote.error||!remote.data?.contenido?.some(p=>p.id===ctx.id))throw Error('Copia guardada; vuelve a pulsar Guardar copia para comprobar su recepción.');
   cloudApplyRemote('compras',remote.data.contenido,remote.data.updated_at);
   if(!state.library.some(p=>p.id===ctx.id))throw Error('Copia guardada en nube. Guarda tus cambios locales y vuelve a comprobarla.');
   persistNow();selected=false;state.libQ='';state.libF={cat:'',sup:'',min:'',max:''};closeModal();render();toast('Copia guardada en Mi estudio.');
  }catch(e){if(message.isConnected)message.textContent=e.message;}
  finally{ctx.busy=false;if(button.isConnected)button.disabled=false;}
 }
 return {tabs,view,choose,open,save,search(el){query=el.value;renderKeep(el);}};
})();
