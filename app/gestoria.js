/* Consulta de Gestoría. No utiliza formularios de edición ni escribe bloques. */
var gestoriaStatusText='Solo lectura';
function gestoriaStatus(message){
  if(message)gestoriaStatusText=message;
  let tag=document.getElementById('syncTag');
  if(!tag&&document.body){tag=document.createElement('button');tag.id='syncTag';tag.type='button';document.body.appendChild(tag);}
  if(!tag)return;
  tag.className='ok';tag.innerHTML='<span class="dot" aria-hidden="true"></span><span class="txt" role="status" aria-live="polite"></span>';
  tag.querySelector('.txt').textContent=gestoriaStatusText;
  tag.title='Consulta de solo lectura. Pulsa para actualizar.';tag.onclick=gestoriaLoad;
}
async function gestoriaLoad(){
  const estudio=ESTUDIO_ID;
  gestoriaStatus('Solo lectura · Actualizando consulta…');
  const {data,error}=await sb.rpc('gestoria_consultar',{p_estudio:ESTUDIO_ID});
  if(_accessRole!=='gestoria'||ESTUDIO_ID!==estudio)return;
  if(error||!data||data.readonly!==true){_gestoriaData=null;gestoriaStatus('Solo lectura · No se pudo actualizar');render();return;}
  _gestoriaData=data;showLogin(false);render();
  gestoriaStatus('Solo lectura · Consulta actualizada');
}
function gestoriaFiles(e){return [e.file,...(Array.isArray(e.files)?e.files:[])].filter(f=>f&&typeof f==='object'&&(f.type==='application/pdf'||/\.pdf$/i.test(f.name||''))&&(f.data||f.url));}
function vGestoria(){
  const E=ModernoDaily.escape,d=_gestoriaData;
  if(!d)return '<h1>Finanzas y Contabilidad</h1><p>Solo lectura. No hay una consulta disponible.</p><button class="btn btn-dark" onclick="gestoriaLoad()">Reintentar</button>';
  return '<h1>Finanzas y Contabilidad</h1><p>Gestoría · Solo lectura. Puedes consultar y descargar PDF.</p><button class="btn btn-ghost" onclick="gestoriaLoad()">Actualizar consulta</button>'+
  '<h2 class="sec">Proyectos</h2><div class="ws-table-wrap"><table class="ws-task-table"><thead><tr><th>Proyecto</th><th>Cliente</th><th>Importe</th></tr></thead><tbody>'+(d.projects||[]).map(p=>'<tr><td>'+E(p.num+' '+p.name)+'</td><td>'+E(p.client||'')+'</td><td>'+fmt(p.total||0)+'</td></tr>').join('')+'</tbody></table></div>'+
  '<h2 class="sec">Contabilidad</h2><div class="ws-table-wrap"><table class="ws-task-table"><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Importe</th><th>Estado</th><th>PDF</th></tr></thead><tbody>'+(d.entries||[]).map((e,i)=>'<tr><td>'+E(e.date||'')+'</td><td>'+E(e.concept||'')+'</td><td>'+(e.kind==='in'?'Ingreso':'Gasto')+'</td><td>'+fmt(e.amount||0)+'</td><td>'+E(e.status||'')+'</td><td>'+gestoriaFiles(e).map((f,j)=>'<button class="btn btn-ghost" onclick="gestoriaPdf('+i+','+j+')">'+E(f.name||'Descargar PDF')+'</button>').join('')+'</td></tr>').join('')+'</tbody></table></div>'+
  '<h2 class="sec">Facturas</h2><div class="ws-table-wrap"><table class="ws-task-table"><thead><tr><th>Factura</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Documento</th></tr></thead><tbody>'+(d.invoices||[]).map((f,i)=>'<tr><td>'+E(f.ref||f.num||'')+'</td><td>'+E(f.date||'')+'</td><td>'+E(typeof f.client==='string'?f.client:'')+'</td><td>'+fmt(f.total||0)+'</td><td>'+gestoriaFiles(f).map((file,j)=>'<button class="btn btn-ghost" onclick="gestoriaPdf('+i+','+j+',&quot;invoices&quot;)">'+E(file.name||'Descargar PDF original')+'</button>').join('')+'<button class="btn btn-ghost" onclick="gestoriaInvoice('+i+')">Resumen PDF</button></td></tr>').join('')+'</tbody></table></div>';
}
async function gestoriaPdf(entry,index,kind='entries'){
  if(_accessRole!=='gestoria'||!_gestoriaData)return;
  const consulta=_gestoriaData,estudio=ESTUDIO_ID;
  if(!['entries','invoices'].includes(kind))return;
  const f=gestoriaFiles((_gestoriaData[kind]||[])[entry]||{})[index];if(!f)return;
  const src=await fileResolveForView(f);if(!src)return;
  if(_accessRole!=='gestoria'||ESTUDIO_ID!==estudio||_gestoriaData!==consulta)return;
  const a=document.createElement('a');a.href=src;a.download=f.name||'documento.pdf';a.target='_blank';a.rel='noopener';a.click();
}
async function gestoriaInvoice(index){
  if(_accessRole!=='gestoria'||!_gestoriaData)return;
  const f=(_gestoriaData.invoices||[])[index];if(!f)return;
  const E=ModernoDaily.escape,em=_gestoriaData.emitter||{},z=document.getElementById('printZone');
  z.innerHTML='<article style="padding:24px"><h1>Consulta de factura '+E(f.ref||f.num||'')+'</h1><p>Resumen de consulta. No sustituye al documento original.</p><p>'+E(em.name||'')+' · '+E(em.nif||'')+'</p><p>'+E(em.addr||'')+' '+E(em.city||'')+'</p><p>'+E(f.date||'')+' · '+E(typeof f.client==='string'?f.client:'')+'</p><table style="width:100%"><thead><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th></tr></thead><tbody>'+(f.lines||[]).filter(l=>l.hidden!==true&&l.on!==false).map(l=>'<tr><td>'+E(l.name||'')+'</td><td>'+E(l.qty||0)+'</td><td>'+fmt(l.price||0)+'</td></tr>').join('')+'</tbody></table><p><b>Total: '+fmt(f.total||0)+'</b></p></article>';
  await printAs('Factura '+(f.ref||f.num||''));
}
