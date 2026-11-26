/* URL capture is staged on the server; this module never inserts directly into study blocks. */
const ProductClipper=(()=>{
 const endpoint='/api/product-clipper.php';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={name:'Nombre',brand:'Marca',manufacturer:'Fabricante',sku:'SKU',ean:'EAN',description:'Descripción',material:'Material',color:'Color',finish:'Acabado',unit:'Unidad de venta',availability:'Disponibilidad',leadTime:'Plazo',price:'Precio de origen',originalPrice:'Precio anterior',currency:'Moneda',dimensions:'Medidas',tax:'IVA',images:'Imágenes',review:'Revisión de la captura'};
 const availability={InStock:'Disponible',OutOfStock:'Agotado',PreOrder:'Reserva previa',BackOrder:'Bajo pedido',LimitedAvailability:'Disponibilidad limitada',SoldOut:'Agotado',Discontinued:'Descatalogado',OnlineOnly:'Solo en línea',InStoreOnly:'Solo en tienda'};
 const displayField=(key,value)=>key==='availability'?(availability[String(value).split('/').pop()]||value):value;
 const axes={width:'Ancho',height:'Alto',depth:'Fondo',length:'Largo'};
 let active=null;
 const identity=()=>[ESTUDIO_ID,state.sessionUser?.id].join('|');
 const valid=ctx=>ctx===active&&ctx.dialog.isConnected&&ctx.owner===identity();
 const cacheKey=()=> 'moderno-clipper:'+identity();
 function message(ctx,value){if(valid(ctx))ctx.dialog.querySelectorAll('[data-message]').forEach(el=>el.textContent=value);}
 function invalid(ctx,selector,text){const el=ctx.dialog.querySelector(selector);message(ctx,text);el.setAttribute('aria-invalid','true');el.focus();el.scrollIntoView({block:'center'});}
 function savedItem(ctx,content,id){
  const dest=ctx.row.destino;
  const items=dest.kind==='biblioteca'?content:content?.find(p=>String(p.id)===dest.projectId)?.rooms?.find(r=>String(r.id)===dest.roomId)?.sections?.find(s=>String(s.id)===dest.sectionId)?.items;
  return Array.isArray(items)?items.find(it=>String(it.id)===String(id)&&it.captureId===ctx.id):null;
 }
 async function confirmSaved(ctx,id){
  const block=ctx.row.destino.kind==='biblioteca'?'compras':'proyectos';
  const {data,error}=await cloudReadBlock(block);if(!valid(ctx))return false;if(error)throw error;
  if(!data||!savedItem(ctx,data.contenido,id))throw Error('El servidor todavía no confirma el producto en su destino. Conserva esta captura y pulsa Consultar última captura.');
  cloudApplyRemote(block,data.contenido,data.updated_at);if(!valid(ctx))return false;
  if(!savedItem(ctx,CLOUD_BLOCKS[block].get(),id))throw Error('El producto está guardado en la nube, pero hay cambios locales pendientes. Conserva la captura y vuelve a consultar cuando estén guardados.');
  persistNow();return true;
 }
 function finishSaved(ctx){
  if(!valid(ctx))return;const dest=ctx.row.destino,item=savedItem(ctx,CLOUD_BLOCKS[dest.kind==='biblioteca'?'compras':'proyectos'].get(),ctx.savedId);
  if(dest.kind==='biblioteca'){state.libQ='';state.libF={cat:item.cat||'Otros',sup:'',min:'',max:''};state.view='biblioteca';}
  else{const p=state.projects.find(p=>String(p.id)===dest.projectId),r=p?.rooms?.find(r=>String(r.id)===dest.roomId);if(p&&r){state.currentProject=p.id;state.currentRoom=r.id;state.roomSearch='';state.rf=null;state.view='estancia';}}
  localStorage.removeItem(cacheKey());ctx.dialog.close();closeModal();render();
  if(dest.kind==='lista'){
   const p=state.projects.find(p=>String(p.id)===dest.projectId),r=p?.rooms?.find(r=>String(r.id)===dest.roomId),si=r?.sections?.findIndex(s=>String(s.id)===dest.sectionId),ii=si>=0?r.sections[si].items.findIndex(it=>String(it.id)===String(ctx.savedId)):-1;
   if(ii>=0&&typeof itemModal==='function'){
    itemModal(si,ii);
    const fields=ctx.row.captura?.fields,source=fields?.price?.value,currency=fields?.currency?.value;
    if(item.price==null&&source!=null&&currency==='EUR'&&Number.isFinite(Number(source))&&Number(source)>=0){
     const input=document.getElementById('itPrice');if(input){input.value=source;unitSum('itQty','itPrice','itUnit','itSum','itCost');}
     const origin=document.getElementById('itOrigin');if(origin){const note=document.createElement('p');note.className='clipper-note';note.textContent='Precio encontrado en la tienda: '+source+' EUR'+(ctx.row.captura.tax?.status==='excluded'?' · IVA no incluido':ctx.row.captura.tax?.status==='included'?' · IVA incluido':' · La tienda no indica si incluye IVA')+'. Puedes ajustarlo antes de guardar.';origin.appendChild(note);}
    }
   }
  }else if(typeof libEdit==='function'){const index=state.library.findIndex(it=>String(it.id)===String(ctx.savedId));if(index>=0)libEdit(index);}
  toast('Producto añadido. Puedes ajustar sus datos en la ficha.');
 }
 async function invoke(body,{signal,user}={}){
  const {data:auth,error:authError}=await sb.auth.getSession(),token=auth?.session?.access_token;
  if(authError||!token)throw Error('La sesión ha caducado. Vuelve a iniciar sesión para importar productos.');
  if(user&&auth.session.user?.id!==user)throw Error('La sesión ha cambiado. Vuelve a abrir la lista.');
  let response;try{response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session64:btoa(token),payload:body}),credentials:'same-origin',cache:'no-store',signal});}catch{throw Error('No se pudo conectar con el importador. Conserva esta ventana y vuelve a intentarlo.');}
  let detail;try{detail=await response.json();}catch{}
  if(!response.ok)throw Object.assign(Error(detail?.error||'No se pudo consultar el importador. Conserva esta ventana y comprueba el estado.'),{code:detail?.code,status:response.status});
  return detail;
 }
 function open(kind,sectionIndex){
  if(!sb||!ESTUDIO_ID||!['admin','colaborador'].includes(_accessRole)){toast('Necesitas acceso al estudio para importar productos.');return;}
  if(active?.dialog.isConnected){active.dialog.focus();return;}
  let destination,url;
  if(kind==='biblioteca'){destination={kind,brand:state.brandFilter&&state.brandFilter!=='all'?state.brandFilter:wsOrder[0]};url=document.getElementById('lbUrl')?.value||'';}
  else{const {p,r}=getRoom(),s=r?.sections?.[sectionIndex];if(!p?.id||!r?.id||!s?.id){toast('Guarda primero el proyecto, la estancia y la sección.');return;}destination={kind:'lista',projectId:String(p.id),roomId:String(r.id),sectionId:String(s.id)};url=document.getElementById('itUrl')?.value||'';}
  const dialog=document.createElement('dialog');dialog.className='clipper-panel';dialog.setAttribute('aria-label','Importar producto desde una tienda');
  dialog.innerHTML=`<header><div><h2>Añadir producto desde URL <span class="clipper-ai-badge">✦ IA</span></h2><p>${kind==='biblioteca'?'Pega el enlace de la ficha del producto para importar sus datos. Podrás ajustarlos en la ficha.':'Pega el enlace de la ficha del producto. Podrás revisar sus datos y elegir la imagen de portada antes de añadirlo.'}</p></div><button type="button" class="btn btn-ghost" data-close aria-label="Cerrar importador">×</button></header>
   <label for="clip-url">Enlace del producto</label><div class="clipper-url"><input id="clip-url" type="url" value="${escape(url)}" placeholder="https://…"><button type="button" class="btn btn-dark" data-capture>Obtener datos</button></div>
   <p data-message role="status" aria-live="polite"></p><div data-result></div><footer><button type="button" class="btn btn-ghost" data-status>Consultar última captura</button><button type="button" class="btn btn-ghost" data-close>Volver</button></footer>`;
  document.body.appendChild(dialog);const ctx={dialog,destination,owner:identity(),study:ESTUDIO_ID,id:null,busy:false,row:null};active=ctx;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());dialog.addEventListener('close',()=>{clearTimeout(ctx.poll);clearTimeout(ctx.retry);dialog.remove();if(active===ctx)active=null;});
  dialog.querySelector('[data-capture]').onclick=()=>capture(ctx);dialog.querySelector('[data-status]').onclick=()=>{if(!ctx.busy)read(ctx);};
  dialog.showModal();dialog.querySelector('input').focus();
 }
 async function capture(ctx,pending){
  if(!valid(ctx)||ctx.busy)return;const raw=pending?.url||ctx.dialog.querySelector('#clip-url').value.trim();
  try{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{message(ctx,'Pega una URL completa de producto.');return;}
  const request=pending||{id:crypto.randomUUID(),url:raw},previousId=ctx.id,previousCache=localStorage.getItem(cacheKey());
  let queued=false;
  ctx.busy=true;clearTimeout(ctx.poll);
  const controls=['[data-capture]','#clip-url','[data-status]','[data-save]'].map(s=>ctx.dialog.querySelector(s)).filter(Boolean);
  controls.forEach(el=>el.disabled=true);
  const analysis=ctx.dialog.querySelector('[data-analysis]');if(analysis)analysis.hidden=false;
  try{
   await cloudFlush();if(!valid(ctx))return;const block=ctx.destination.kind==='biblioteca'?'compras':'proyectos';
   if(_cloudBusy||_cloudHash[block]!==canon(CLOUD_BLOCKS[block].get()))throw Error('Hay cambios pendientes en el destino. Espera a que estén guardados antes de importar.');
   ctx.id=request.id;localStorage.setItem(cacheKey(),ctx.id);message(ctx,'Buscando la información del producto…');
   await invoke({action:'capture',id:ctx.id,studyId:ctx.study,url:request.url,destination:ctx.destination});if(valid(ctx)){ctx.busy=false;await read(ctx);}
  }catch(e){
   // PT429 is returned before staging when the three active slots are occupied.
   // Unknown/network failures may have staged the request: never auto-repeat those.
   if(e.code==='PT429'&&e.status===429&&valid(ctx)){
    ctx.id=previousId;if(previousCache)localStorage.setItem(cacheKey(),previousCache);else localStorage.removeItem(cacheKey());
    queued=true;message(ctx,'Hay otras capturas en curso. Tu producto está esperando y se iniciará automáticamente.');
    ctx.retry=setTimeout(()=>{if(valid(ctx)){ctx.busy=false;capture(ctx,request);}},3000);
   }else message(ctx,e.message);
  }finally{
   if(!queued)ctx.busy=false;
   if(valid(ctx)&&!queued){controls.forEach(el=>el.disabled=false);if(ctx.row?.estado!=='procesando'&&analysis)analysis.hidden=true;}
  }
 }
 async function read(ctx){
  if(!valid(ctx))return;const id=ctx.id||localStorage.getItem(cacheKey());if(!id){message(ctx,'Todavía no hay una captura pendiente en este navegador.');return;}
  try{const row=await invoke({action:'read',id});if(!valid(ctx))return;ctx.id=id;ctx.row=row;const analysis=ctx.dialog.querySelector('[data-analysis]');if(analysis)analysis.hidden=row.estado!=='procesando';
   if(row.estado==='procesando'){message(ctx,'Estamos leyendo el producto…');clearTimeout(ctx.poll);ctx.poll=setTimeout(()=>{if(valid(ctx))read(ctx)},2500);return;}
   if(row.estado==='error'){message(ctx,'La tienda no se pudo leer ('+(row.error_code||'error')+'). Puedes probar otra ficha o añadir el producto manualmente.');return;}
   if(row.estado==='absorbido'){ctx.savedId=row.item_id;message(ctx,'El producto ya está guardado. Comprobando su destino…');if(await confirmSaved(ctx,ctx.savedId))finishSaved(ctx);return;}
   show(ctx,row);if(ctx.destination?.kind!=='lista')await save(ctx);
  }catch(e){message(ctx,e.message);}
 }
 function show(ctx,row){
  const c=row.captura,fields=c.fields,compatible=fields.currency?.value==='EUR'&&c.tax?.status==='included'&&c.variant?.verified&&fields.price?.value!=null;
  const destination=row.destino_snapshot,where=destination.kind==='biblioteca'?'Biblioteca':`${destination.projectName} · ${destination.roomName} · ${destination.sectionName}`;
  message(ctx,'Revisa los datos y elige una imagen de portada. La galería puede estar incompleta.');
  const cat=c.suggestions?.category||'Otros',categories=[...new Set([...allCats(),cat].filter(Boolean))];
  ctx.dialog.querySelector('[data-result]').innerHTML=`<p><strong>Destino:</strong> ${escape(where)}</p><fieldset class="clipper-images"><legend>Imágenes del producto <small>Selecciona la portada</small></legend><div class="clipper-gallery">${(c.images||[]).map((im,i)=>`<label><input type="radio" name="clip-primary" aria-label="Usar imagen ${i+1} como portada" value="${escape(im.storagePath)}" ${i===0?'checked':''}><img src="${escape(im.previewUrl)}" alt="" loading="lazy"><span class="clipper-image-caption"><span class="clipper-cover-selected">✓ Portada</span><span class="clipper-cover-choose">Elegir portada</span></span></label>`).join('')||'<p>No se encontraron imágenes descargables. Podrás añadirlas después.</p>'}</div></fieldset>
   <label for="clip-name">Nombre · obligatorio</label><input id="clip-name" value="${escape(fields.name?.value)}" maxlength="500" required>
   <div class="clipper-columns"><div><label for="clip-category">Categoría · obligatoria ${cat?'· sugerencia editable':''}</label><select id="clip-category" required><option value="">Elige categoría</option>${categories.map(v=>`<option ${v===cat?'selected':''}>${escape(v)}</option>`).join('')}</select></div><div><label for="clip-unit">Unidad de venta · obligatoria</label><input id="clip-unit" value="${escape(fields.unit?.value||'ud')}" placeholder="ud, lote, m²…" maxlength="40" required><small>Escribe «ud» si se vende por unidad; revisa si es un lote o se vende por metros.</small></div></div>
   ${c.suggestions?.room?`<p>Estancia sugerida: ${escape(c.suggestions.room)}. El destino elegido no cambia.</p>`:''}
   <p class="clipper-note"><strong>Variante:</strong> ${c.variant?.verified?'Coincide con la ficha consultada':'Sin confirmar: revisa color, medidas y referencia'}.<br><strong>Origen:</strong> ${escape(c.domain)} · ${escape(new Date(c.capturedAt).toLocaleString('es-ES'))}</p>
   <dl>${Object.keys(labels).filter(k=>k!=='name'&&k!=='description'&&fields[k]).map(key=>{const f=fields[key];return `<div><dt>${escape(labels[key])}</dt><dd>${f.value==null?'<span class="clipper-missing">No encontrado</span>':escape(displayField(key,f.value))}</dd></div>`;}).join('')}<div><dt>IVA</dt><dd>${c.tax.status==='included'?'Incluido, indicado por la tienda':c.tax.status==='excluded'?'No incluido':'Sin confirmar'}</dd></div><div><dt>Medidas</dt><dd>${c.dimensions.map(x=>escape(`${axes[x.axis]||x.axis}: ${x.value} ${x.unit}${x.cm!=null?' → '+x.cm+' cm':''}`)).join('<br>')||'No encontradas'}</dd></div></dl>
   <details><summary>Descripción de la tienda</summary><p>${escape(fields.description?.value||'No encontrada')}</p></details>
   <p class="clipper-note">El precio de origen se conserva con su moneda y precisión. ${compatible?'Puedes usarlo como precio cliente en euros.':'No se incorporará a los importes en euros; podrás completarlo después de comprobar moneda e impuestos.'}</p>
   ${compatible?'<label class="clipper-check"><input id="clip-use-price" type="checkbox" checked> Usar el precio de origen como precio cliente (€), con IVA incluido</label>':''}

   <p data-message role="status" aria-live="polite">${ctx.destination?.kind==='lista'?'Revisa la ficha y pulsa Añadir producto.':'Añadiendo el producto automáticamente…'}</p>
   <button type="button" class="btn btn-dark" data-save>${ctx.destination?.kind==='lista'?'Añadir producto':'Reintentar guardado'}</button>`;
  ctx.dialog.querySelectorAll('#clip-name,#clip-category,#clip-unit').forEach(el=>el.addEventListener('input',()=>el.removeAttribute('aria-invalid')));
  ctx.dialog.querySelector('[data-save]').onclick=()=>save(ctx);
 }
 async function save(ctx){
  if(!valid(ctx)||ctx.busy||!ctx.row)return;const d=ctx.dialog;
  const name=d.querySelector('#clip-name').value.trim(),category=d.querySelector('#clip-category').value,unit=d.querySelector('#clip-unit').value.trim();
  if(!name){invalid(ctx,'#clip-name','Escribe el nombre del producto.');return;}
  if(!category){invalid(ctx,'#clip-category','Elige la categoría donde quieres guardar el producto.');return;}
  if(!unit){invalid(ctx,'#clip-unit','Indica la unidad de venta: por ejemplo, ud para una unidad o m² si se vende por superficie.');return;}
  ctx.busy=true;d.querySelector('[data-save]').disabled=true;
  try{await cloudFlush();if(!valid(ctx))return;
   const block=ctx.row.destino.kind==='biblioteca'?'compras':'proyectos';if(_cloudBusy||_cloudHash[block]!==canon(CLOUD_BLOCKS[block].get()))throw Error('Espera a que se guarden los cambios pendientes del destino.');
   message(ctx,'Guardando el producto y comprobando su destino…');
   const {data,error}=await sb.rpc('clipper_absorber',{p_id:ctx.id,p_revision:{confirmed:true,name,category,unit,useSourcePrice:!!d.querySelector('#clip-use-price')?.checked,primaryImage:d.querySelector('[name="clip-primary"]:checked')?.value||null}});if(error)throw Error(error.message);
   if(!valid(ctx))return;if(!data?.itemId||!['absorbed','already_absorbed'].includes(data.status))throw Error('No se pudo confirmar el guardado. Pulsa Consultar última captura antes de repetir.');
   ctx.savedId=data.itemId;if(await confirmSaved(ctx,ctx.savedId))finishSaved(ctx);
  }catch(e){message(ctx,e.message||'No se pudo confirmar el guardado. Consulta el estado antes de repetir.');}finally{ctx.busy=false;if(valid(ctx))d.querySelector('[data-save]').disabled=false;}
 }
 const priceAccess=()=>Boolean(sb&&ESTUDIO_ID&&state.sessionUser?.id&&_accessRole==='admin'&&!_accessLoading&&(!state.account?.currency||state.account.currency==='EUR'));
 const roomItems=room=>(room?.sections||[]).flatMap(section=>section.items||[]);
 const hasPriceSource=item=>item?.id!=null&&Boolean(item.url&&item.captureId&&item.capture&&(item.capture.requestedUrl||item.capture.url));
 const canRefreshPrices=room=>priceAccess()&&roomItems(room).some(hasPriceSource);
 const priceReasons={
  source_missing:'La captura de origen ya no está disponible.',
  source_changed:'El enlace ya no coincide con la ficha capturada.',
  variant:'La tienda no permite confirmar la misma variante.',
  unit:'La unidad de venta no coincide.',
  currency:'La tienda publica el precio en otra moneda.',
  tax:'La tienda no confirma que el importe incluya el IVA.',
  price:'La tienda no publica un precio exacto aplicable.',
  unavailable:'La tienda no ha devuelto un precio verificable.'
 };
 const itemMatchesPrice=(item,quote)=>hasPriceSource(item)&&item.captureId===quote.captureId&&item.url===quote.url
  &&(item.sku??null)===quote.sku&&(item.unit??null)===quote.unit&&(item.price??null)===quote.previous;
 const uniqueById=(items,id)=>{
  const matches=(items||[]).filter(item=>String(item?.id)===id);
  return matches.length===1?matches[0]:null;
 };
 const currentItem=(room,id)=>uniqueById(roomItems(room),id);
 const projectsSaved=()=>!_cloudBusy&&_cloudHash.proyectos===canon(CLOUD_BLOCKS.proyectos.get());

 async function refreshPrices(){
  const {p,r}=getRoom();
  if(!p||!canRefreshPrices(r)||document.querySelector('dialog[open],#overlay.open'))return;
  const targets=roomItems(r).filter(hasPriceSource),ids=[...new Set(targets.map(item=>String(item.id)))];
  const owner=identity(),studyId=ESTUDIO_ID,user=state.sessionUser.id,projectId=String(p.id),roomId=String(r.id);
  const dialog=document.createElement('dialog');
  dialog.className='clipper-panel clipper-prices';
  dialog.setAttribute('aria-labelledby','clipper-prices-title');
  dialog.innerHTML='<header><h2 id="clipper-prices-title">Actualizar precios web</h2></header><p data-progress role="status" aria-live="polite">Preparando la consulta…</p><div data-results></div><footer><button type="button" class="btn btn-ghost" data-close>Cerrar</button><button type="button" class="btn btn-dark" data-apply hidden>Aplicar precios</button></footer>';
  const progress=dialog.querySelector('[data-progress]'),results=dialog.querySelector('[data-results]');
  const close=dialog.querySelector('[data-close]'),apply=dialog.querySelector('[data-apply]');
  const controller=new AbortController();
  let saving=false;
  const current=()=>dialog.open&&!controller.signal.aborted&&priceAccess()&&identity()===owner&&state.view==='estancia'
   &&String(state.currentProject)===projectId&&String(state.currentRoom)===roomId;
  dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});
  dialog.addEventListener('close',()=>{controller.abort();dialog.remove();document.getElementById('shopping-refresh-prices')?.focus();},{once:true});
  close.onclick=()=>dialog.close();
  document.body.append(dialog);dialog.showModal();
  const quotes=new Map();
  try{
   await cloudFlush();
   if(!current())return dialog.close();
   if(!projectsSaved())throw Error('La lista tiene cambios pendientes. Espera a que se guarden y vuelve a consultar.');
   for(let start=0;start<ids.length;start+=3){
    progress.textContent=`Consultando ${start} de ${ids.length} productos…`;
    const batch=ids.slice(start,start+3);
    const data=await invoke({action:'prices',studyId,projectId,roomId,ids:batch},{signal:controller.signal,user});
    if(!current())return dialog.close();
    if(!Array.isArray(data?.prices)||data.prices.length!==batch.length||data.prices.some((quote,i)=>quote?.id!==batch[i]))throw Error('No se pudo comprobar el resultado de las tiendas.');
    for(const quote of data.prices)quotes.set(quote.id,quote);
   }
  }catch(error){
   if(current())progress.textContent=error.message;
   else if(dialog.open)dialog.close();
   if(!quotes.size||!current())return;
  }
  const selectable=[];
  let withoutChanges=0,unavailable=0;
  const currency=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
  for(const id of ids){
   const item=currentItem(getRoom().r,id),quote=quotes.get(id);
   const row=document.createElement('div'),label=document.createElement('label'),name=document.createElement('strong'),detail=document.createElement('span');
   name.textContent=item?.name||targets.find(target=>String(target.id)===id)?.name||'Producto';
   label.append(name,detail);row.append(label);results.append(row);
   if(quote?.status!=='verified'||!Number.isFinite(quote.price)||quote.price<0||!itemMatchesPrice(item,quote)){
    unavailable++;detail.textContent=priceReasons[quote?.code]||(quote?'El producto cambió durante la consulta.':'No se ha podido consultar la tienda.');continue;
   }
   if(item.price!=null&&item.price!==''&&Number(item.price)===quote.price){
    withoutChanges++;detail.textContent=currency.format(quote.price)+' · Sin cambios';continue;
   }
   const input=document.createElement('input');input.type='checkbox';input.checked=true;
   detail.textContent=(item.price==null||item.price===''?'Sin precio':currency.format(item.price))+' → '+currency.format(quote.price);
   label.prepend(input);selectable.push({input,quote});
  }
  progress.textContent=`${selectable.length} con cambios · ${withoutChanges} sin cambios · ${unavailable} sin verificar`;
  if(!selectable.length)return;
  apply.hidden=false;
  apply.onclick=async()=>{
   const selected=selectable.filter(row=>row.input.checked).map(row=>row.quote);
   if(!selected.length||!current()||saving)return;
   saving=true;close.disabled=apply.disabled=true;
   let applied=false;
   try{
    await cloudFlush();
    if(!current()||!projectsSaved())throw Error('La lista tiene cambios pendientes. Vuelve a consultar cuando estén guardados.');
    const {data,error}=await cloudReadBlock('proyectos',controller.signal);
    if(error||!Array.isArray(data?.contenido)||!current()||!projectsSaved())throw Error('No se pudo verificar la lista guardada. Vuelve a consultar.');
    const remoteProject=uniqueById(data.contenido,projectId);
    const remoteRoom=uniqueById(remoteProject?.rooms,roomId);
    const items=selected.map(quote=>({quote,item:currentItem(getRoom().r,quote.id)}));
    if(items.some(({quote,item})=>!itemMatchesPrice(item,quote)||!itemMatchesPrice(currentItem(remoteRoom,quote.id),quote))){
     throw Error('Alguno de los productos seleccionados cambió. Cierra la ventana y consulta los precios de nuevo.');
    }
    for(const {quote,item} of items)item.price=quote.price;
    applied=true;
    persistNow();await cloudFlush();
    if(!current())return dialog.close();
    render();dialog.close();
    toast(projectsSaved()?`Precios actualizados en ${selected.length} producto(s).`:'Precios aplicados. El guardado sigue pendiente.');
   }catch(error){
    if(applied){dialog.close();if(identity()===owner)toast('Precios aplicados. Revisa el estado de guardado.');return;}
    if(current())progress.textContent=error.message;
    else dialog.close();
   }finally{saving=false;close.disabled=false;apply.disabled=!selectable.some(row=>row.input.checked);}
  };
  results.addEventListener('change',()=>{if(!saving)apply.disabled=!selectable.some(row=>row.input.checked);});
 }
 return {open,canRefreshPrices,refreshPrices};
})();
