/* URL capture is staged on the server; this module never inserts directly into study blocks. */
const ProductClipper=(()=>{
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
  localStorage.removeItem(cacheKey());ctx.dialog.close();closeModal();render();toast('Producto guardado como borrador.');
 }
 async function invoke(body){const {data,error}=await sb.functions.invoke('product-clipper',{body});if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error||'No se pudo consultar el importador. Conserva esta ventana y comprueba el estado.');}return data;}
 function open(kind,sectionIndex){
  if(!sb||!ESTUDIO_ID||!['admin','colaborador'].includes(_accessRole)){toast('Necesitas acceso al estudio para importar productos.');return;}
  if(active?.dialog.isConnected){active.dialog.focus();return;}
  let destination,url;
  if(kind==='biblioteca'){destination={kind,brand:state.brandFilter&&state.brandFilter!=='all'?state.brandFilter:wsOrder[0]};url=document.getElementById('lbUrl')?.value||'';}
  else{const {p,r}=getRoom(),s=r?.sections?.[sectionIndex];if(!p?.id||!r?.id||!s?.id){toast('Guarda primero el proyecto, la estancia y la sección.');return;}destination={kind:'lista',projectId:String(p.id),roomId:String(r.id),sectionId:String(s.id)};url=document.getElementById('itUrl')?.value||'';}
  const dialog=document.createElement('dialog');dialog.className='clipper-panel';dialog.setAttribute('aria-label','Importar producto desde una tienda');
  dialog.innerHTML=`<header><div><h2>Importar desde una tienda</h2><p>Pega la URL de una ficha de producto. Revisarás los datos antes de guardarlos.</p></div><button type="button" class="btn btn-ghost" data-close aria-label="Cerrar importador">×</button></header>
   <label for="clip-url">Enlace del producto</label><div class="clipper-url"><input id="clip-url" type="url" value="${escape(url)}" placeholder="https://…"><button type="button" class="btn btn-dark" data-capture>Leer producto</button></div>
   <p class="clipper-note">Se creará un producto nuevo en estado Borrador. Los campos de la ficha manual no se usarán; puedes volver a ella cerrando esta ventana.</p>
   <p data-message role="status" aria-live="polite"></p><div data-result></div><footer><button type="button" class="btn btn-ghost" data-status>Consultar última captura</button><button type="button" class="btn btn-ghost" data-close>Volver</button></footer>`;
  document.body.appendChild(dialog);const ctx={dialog,destination,owner:identity(),study:ESTUDIO_ID,id:null,busy:false,row:null};active=ctx;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();if(active===ctx)active=null;});
  dialog.querySelector('[data-capture]').onclick=()=>capture(ctx);dialog.querySelector('[data-status]').onclick=()=>{if(!ctx.busy)read(ctx);};
  dialog.showModal();dialog.querySelector('input').focus();
 }
 async function capture(ctx){
  if(!valid(ctx)||ctx.busy)return;const raw=ctx.dialog.querySelector('#clip-url').value.trim();
  try{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{message(ctx,'Pega una URL completa de producto.');return;}
  ctx.busy=true;ctx.dialog.querySelector('[data-capture]').disabled=true;
  try{
   await cloudFlush();if(!valid(ctx))return;const block=ctx.destination.kind==='biblioteca'?'compras':'proyectos';
   if(_cloudBusy||_cloudHash[block]!==canon(CLOUD_BLOCKS[block].get()))throw Error('Hay cambios pendientes en el destino. Espera a que estén guardados antes de importar.');
   ctx.id=crypto.randomUUID();localStorage.setItem(cacheKey(),ctx.id);message(ctx,'Leyendo la ficha y guardando las imágenes… Puedes cerrar y consultar la captura más tarde.');
   await invoke({action:'capture',id:ctx.id,studyId:ctx.study,url:raw,destination:ctx.destination});if(valid(ctx))await read(ctx);
  }catch(e){message(ctx,e.message);}finally{ctx.busy=false;if(valid(ctx))ctx.dialog.querySelector('[data-capture]').disabled=false;}
 }
 async function read(ctx){
  if(!valid(ctx))return;const id=ctx.id||localStorage.getItem(cacheKey());if(!id){message(ctx,'Todavía no hay una captura pendiente en este navegador.');return;}
  try{const row=await invoke({action:'read',id});if(!valid(ctx))return;ctx.id=id;ctx.row=row;
   if(row.estado==='procesando'){message(ctx,'La captura sigue en curso. Vuelve a consultar su estado en unos segundos.');return;}
   if(row.estado==='error'){message(ctx,'La tienda no se pudo leer ('+(row.error_code||'error')+'). Puedes probar otra ficha o añadir el producto manualmente.');return;}
   if(row.estado==='absorbido'){ctx.savedId=row.item_id;message(ctx,'El producto ya está guardado. Comprobando su destino…');if(await confirmSaved(ctx,ctx.savedId))finishSaved(ctx);return;}
   show(ctx,row);
  }catch(e){message(ctx,e.message);}
 }
 function show(ctx,row){
  const c=row.captura,fields=c.fields,compatible=fields.currency?.value==='EUR'&&c.tax?.status==='included'&&c.variant?.verified&&fields.price?.value!=null;
  const destination=row.destino_snapshot,where=destination.kind==='biblioteca'?'Biblioteca':`${destination.projectName} · ${destination.roomName} · ${destination.sectionName}`;
  message(ctx,'Captura preparada para revisar. La galería puede estar incompleta.');
  const cat=c.suggestions?.category||'',categories=[...new Set([...allCats(),cat].filter(Boolean))];
  ctx.dialog.querySelector('[data-result]').innerHTML=`<p><strong>Destino:</strong> ${escape(where)}</p><div class="clipper-gallery">${(c.images||[]).map((im,i)=>`<label><img src="${escape(im.previewUrl)}" alt="Imagen ${i+1} del producto"><span><input type="radio" name="clip-primary" value="${escape(im.storagePath)}" ${i===0?'checked':''}> Principal</span></label>`).join('')||'<p>No se encontraron imágenes descargables. Podrás añadirlas después.</p>'}</div>
   <label for="clip-name">Nombre · obligatorio</label><input id="clip-name" value="${escape(fields.name?.value)}" maxlength="500" required>
   <div class="clipper-columns"><div><label for="clip-category">Categoría · obligatoria ${cat?'· sugerencia editable':''}</label><select id="clip-category" required><option value="">Elige categoría</option>${categories.map(v=>`<option ${v===cat?'selected':''}>${escape(v)}</option>`).join('')}</select></div><div><label for="clip-unit">Unidad de venta · obligatoria</label><input id="clip-unit" value="${escape(fields.unit?.value||'')}" placeholder="ud, lote, m²…" maxlength="40" required><small>Escribe «ud» si se vende por unidad; revisa si es un lote o se vende por metros.</small></div></div>
   ${c.suggestions?.room?`<p>Estancia sugerida: ${escape(c.suggestions.room)}. El destino elegido no cambia.</p>`:''}
   <p class="clipper-note"><strong>Variante:</strong> ${c.variant?.verified?'Coincide con la ficha consultada':'Sin confirmar: revisa color, medidas y referencia'}.<br><strong>Origen:</strong> ${escape(c.domain)} · ${escape(new Date(c.capturedAt).toLocaleString('es-ES'))}</p>
   <dl>${Object.keys(labels).filter(k=>k!=='name'&&k!=='description'&&fields[k]).map(key=>{const f=fields[key];return `<div><dt>${escape(labels[key])}</dt><dd>${f.value==null?'<span class="clipper-missing">No encontrado</span>':escape(displayField(key,f.value))}</dd></div>`;}).join('')}<div><dt>IVA</dt><dd>${c.tax.status==='included'?'Incluido, indicado por la tienda':c.tax.status==='excluded'?'No incluido':'Sin confirmar'}</dd></div><div><dt>Medidas</dt><dd>${c.dimensions.map(x=>escape(`${axes[x.axis]||x.axis}: ${x.value} ${x.unit}${x.cm!=null?' → '+x.cm+' cm':''}`)).join('<br>')||'No encontradas'}</dd></div></dl>
   <details><summary>Descripción de la tienda</summary><p>${escape(fields.description?.value||'No encontrada')}</p></details>
   <p class="clipper-note">El precio de origen se conserva con su moneda y precisión. ${compatible?'Puedes usarlo como precio cliente en euros.':'No se incorporará a los importes en euros; podrás completarlo después de comprobar moneda e impuestos.'}</p>
   ${compatible?'<label class="clipper-check"><input id="clip-use-price" type="checkbox"> Usar el precio de origen como precio cliente (€), con IVA incluido</label>':''}
   <label class="clipper-check"><input id="clip-confirm" type="checkbox"> He revisado la variante, los datos y el destino. Guardar como borrador.</label>
   <p data-message role="status" aria-live="polite">Completa la categoría y la unidad de venta y marca la revisión para guardar.</p>
   <button type="button" class="btn btn-dark" data-save>Guardar borrador</button>`;
  ctx.dialog.querySelectorAll('#clip-name,#clip-category,#clip-unit,#clip-confirm').forEach(el=>el.addEventListener('input',()=>el.removeAttribute('aria-invalid')));
  ctx.dialog.querySelector('[data-save]').onclick=()=>save(ctx);
 }
 async function save(ctx){
  if(!valid(ctx)||ctx.busy||!ctx.row)return;const d=ctx.dialog;
  if(!d.querySelector('#clip-confirm').checked){invalid(ctx,'#clip-confirm','Marca la revisión antes de guardar.');return;}
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
 return {open};
})();
