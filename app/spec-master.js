/* Explicit, field-by-field library refresh into an unsaved editor draft only. */
var SpecMaster=(()=>{
 const fields={name:['itName','Nombre'],url:['itUrl','Enlace'],sku:['itSku','Referencia / variante'],supplier:['itSup','Proveedor'],dims:['itDims','Dimensiones a medida'],material:['itMat','Material / acabado'],color:['itCol','Color'],plazo:['itPlz','Plazo'],unit:['itUnit','Unidad'],price:['itPrice','Precio cliente'],cost:['itCost','Coste profesional']};
 let draft=null,review=null;
 const E=v=>ModernoDaily.escape(v??''),value=v=>String(v??'');
 function mount(item){
  draft={form:document.getElementById('itName'),libId:item.libId};review=null;
  const box=document.getElementById('itOrigin');if(!box)return;
  const origin=ModernoSpec.origin(item,state.library||[]);
  box.innerHTML='<p>'+E({independiente:'Ficha independiente: puedes definir una pieza a medida con su referencia, acabado y dimensiones.',biblioteca:'Copia independiente de biblioteca. Puedes revisar qué campos recuperar del maestro.',ambiguo:'Origen de biblioteca ambiguo: no se puede actualizar automáticamente.',no_disponible:'El producto de origen ya no está disponible en biblioteca.'}[origin.kind])+'</p>'+(_accessRole==='admin'&&origin.master?'<button type="button" class="btn btn-ghost" onclick="SpecMaster.compare()">Revisar datos de biblioteca</button>':'')+'<div id="itMasterReview"></div>';
 }
 function active(){return _accessRole==='admin'&&draft?.form?.isConnected&&draft.form===document.getElementById('itName');}
 function compare(){
  if(!active())return;
  const origin=ModernoSpec.origin({libId:draft.libId},state.library||[]);
  if(!origin.master){toast('El origen ya no es único o no está disponible');return;}
  const changes=Object.entries(fields).filter(([key])=>Object.hasOwn(origin.master,key)).map(([key,[id,label]])=>({key,id,label,before:document.getElementById(id).value,after:value(origin.master[key])})).filter(x=>x.before!==x.after);
  review={master:JSON.stringify(origin.master),changes};
  document.getElementById('itMasterReview').innerHTML='<p>Marca únicamente los datos que quieras sustituir. Cantidad, archivos, foto, notas y documentos anteriores se conservan. Después tendrás que guardar la ficha.</p>'+changes.map((x,i)=>'<label style="display:block;padding:10px 0"><input type="checkbox" id="itMasterPick'+i+'"> '+E(x.label)+'<small style="display:block">Actual: '+E(x.before||'Sin dato')+' → Biblioteca: '+E(x.after||'Sin dato')+'</small></label>').join('')+(changes.length?'<button type="button" class="btn btn-ghost" onclick="SpecMaster.apply()">Aplicar selección al formulario</button>':'<p>No hay diferencias en los campos disponibles.</p>');
 }
 function apply(){
  if(!active()||!review)return;
  const origin=ModernoSpec.origin({libId:draft.libId},state.library||[]);
  if(!origin.master||JSON.stringify(origin.master)!==review.master){toast('La biblioteca ha cambiado. Revisa las diferencias de nuevo');compare();return;}
  const chosen=review.changes.filter((x,i)=>document.getElementById('itMasterPick'+i)?.checked);
  if(chosen.some(x=>document.getElementById(x.id).value!==x.before)){toast('Has editado el formulario. Revisa las diferencias de nuevo');compare();return;}
  for(const x of chosen){const el=document.getElementById(x.id);if(x.key==='unit'&&![...el.options].some(o=>o.value===x.after)){const opt=document.createElement('option');opt.value=x.after;opt.textContent=x.after;el.append(opt);}el.value=x.after;}
  if(chosen.some(x=>x.key==='price'||x.key==='cost'))mgPick('it','libre',document.getElementById('itMgPills').querySelector('button'));
  unitSum('itQty','itPrice','itUnit','itSum','itCost');
  document.getElementById('itMasterReview').innerHTML='<p>'+chosen.length+' campos aplicados al formulario. Guarda para conservarlos o cancela para descartarlos.</p>';review=null;
 }
 return {mount,compare,apply};
})();
