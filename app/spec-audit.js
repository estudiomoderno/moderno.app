/* Read-only identity diagnostics; never merge, rename or repair records here. */
var SpecAudit=(()=>{
 const E=x=>ModernoDaily.escape(x??'');
 const labels={missing_room:'Estancia sin identificador',missing_section:'Sección sin identificador',missing_product:'Ficha sin identificador',duplicate_room:'Identificador de estancia repetido',duplicate_section:'Identificador de sección repetido',duplicate_product:'Identificador de ficha repetido',unresolved_reference:'Referencia que no se puede localizar'};
 function open(pid){
  if(_accessRole!=='admin'){toast('Solo el administrador puede revisar estas referencias');return;}
  const found=state.projects.filter(p=>p.id===pid);
  if(found.length!==1){toast('El proyecto está ausente o tiene un identificador repetido. No se ha cambiado ningún dato.');return;}
  const p=found[0],issues=ModernoSpec.diagnose(p),rows=ModernoSpec.rows(p),origins=rows.map(r=>({r,origin:ModernoSpec.origin(r.item,state.library||[])}));
  modal('<h3>Referencias del proyecto</h3><p>'+E(p.name)+'</p><p>Esta revisión no cambia datos. Un identificador repetido requiere revisar su origen; no se fusionan fichas por nombre. Los identificadores que faltan se preparan al editar, cuando la referencia es inequívoca.</p><p>'+rows.length+' fichas · '+issues.length+' observaciones</p><div class="entry-col">'+issues.slice(0,200).map(x=>'<article class="entry"><div><b>'+E(labels[x.code]||x.code)+'</b><p>'+E(x.name)+'</p><small style="display:block">'+E(x.id==null?'Sin identificador':typeof x.id+': '+x.id)+(x.blocking?' · No reorganizar ni vincular hasta revisar':'')+'</small></div></article>').join('')+(issues.length?'':'<p>No se han detectado referencias ausentes ni identificadores repetidos.</p>')+'</div><h4>Origen de las fichas</h4><p>El producto de biblioteca y la ficha del proyecto son copias independientes. Una modificación del maestro no cambia presupuestos ni pedidos.</p><div class="entry-col">'+origins.slice(0,200).map(({r,origin})=>'<article class="entry"><div><b>'+E(r.item.name)+'</b><small style="display:block">'+E(r.room.name)+' · '+E({independiente:'Ficha independiente',biblioteca:'Copia de biblioteca',ambiguo:'Referencia de biblioteca ambigua',no_disponible:'Producto de biblioteca no disponible'}[origin.kind])+'</small></div></article>').join('')+'</div>'+(rows.length>200||issues.length>200?'<p>Se muestran las primeras 200 filas de cada apartado.</p>':'')+'<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button></div>');
 }
 return {open};
})();
