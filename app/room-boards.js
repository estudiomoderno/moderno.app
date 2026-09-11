/* Saved boards contain a public-field projection, never the complete project. */
var RoomBoards=(()=>{
 const templates=['visual','fichas'],audiences=['cliente','diseno','obra'];
 const copy=v=>JSON.parse(JSON.stringify(v));
 function capture(p,r,options={},id=crypto.randomUUID(),date=new Date().toISOString()){
  const audience=audiences.includes(options.audience)?options.audience:'cliente',template=templates.includes(options.template)?options.template:'visual',prices=audience!=='obra'&&options.prices===true;
  const sections=(r.sections||[]).map(s=>({name:s.name||'',items:(s.items||[]).filter(i=>!i.hidden&&!i.alt).map(i=>{
   const out={};for(const key of ['id','name','sku','color','material','dims','img','qty','unit'])if(i[key]!==undefined)out[key]=copy(i[key]);if(prices&&i.price!==undefined)out.price=copy(i.price);return out;
  })})).filter(s=>s.items.length);
  return {id,date,template,audience,prices,project:{num:p.num||'',name:p.name||''},room:{id:r.id,name:r.name||'',sections}};
 }
 function fingerprint(s){const c=copy(s);delete c.id;delete c.date;return JSON.stringify(c);}
 let context=null,shown=null,options={template:'visual',audience:'cliente',prices:false};
 function current(){
  if(!context||context.study!==ESTUDIO_ID||context.user!==state.sessionUser?.id||!canView('estancia'))return null;
  const ps=state.projects.filter(p=>p.id===context.pid);if(ps.length!==1)return null;
  const rs=(ps[0].rooms||[]).filter(r=>r.id===context.rid);return rs.length===1?{p:ps[0],r:rs[0]}:null;
 }
 function html(s){return '<div class="board-'+(templates.includes(s.template)?s.template:'visual')+'">'+roomBoardContent(s.project,s.room,s.prices)+'<p class="board-revision-label">'+ModernoDaily.escape(({cliente:'Cliente',diseno:'Diseño',obra:'Obra'})[s.audience]||'')+' · '+ModernoDaily.escape(s.date)+' · Revisión '+ModernoDaily.escape(s.id)+'</p></div>';}
 function open(){const {p,r}=getRoom();if(!p||!r||!canView('estancia'))return;context={pid:p.id,rid:r.id,study:ESTUDIO_ID,user:state.sessionUser?.id};shown=null;draw();}
 function draw(){
  const cr=current();if(!cr)return;const E=ModernoDaily.escape;
  if(!shown)shown=capture(cr.p,cr.r,options);
  const stored=(cr.r.boardRevisions||[]).some(x=>x.id===shown.id);
  modal('<div class="room-board-dialog"><div class="room-board-toolbar"><div><h3>Board de la estancia</h3><p>'+(stored?'Revisión conservada. No cambia al editar las fichas.':'Vista previa de las fichas actuales. Conserva una revisión para volver a ella.')+' Costes y notas internas excluidos.</p></div><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button></div><div class="room-board-toolbar"><label>Plantilla <select id="boardTemplate" onchange="RoomBoards.configure()">'+templates.map(t=>'<option value="'+t+'" '+(shown.template===t?'selected':'')+'>'+({visual:'Visual',fichas:'Fichas técnicas'})[t]+'</option>').join('')+'</select></label><label>Destino <select id="boardAudience" onchange="RoomBoards.configure()">'+audiences.map(a=>'<option value="'+a+'" '+(shown.audience===a?'selected':'')+'>'+({cliente:'Cliente',diseno:'Diseño',obra:'Obra'})[a]+'</option>').join('')+'</select></label><label><input id="boardPrices" type="checkbox" '+(shown.prices?'checked':'')+' '+(shown.audience==='obra'?'disabled':'')+' onchange="RoomBoards.configure()"> Precios de venta</label></div><p>Cambiar plantilla o destino crea una vista de las fichas actuales. El destino prepara el contenido del PDF; no concede acceso ni envía documentos. Para obra se omiten los precios. Las imágenes privadas deben estar disponibles para exportar el PDF completo.</p><div class="room-board-toolbar">'+(_accessRole==='admin'&&!stored?'<button class="btn btn-ghost" onclick="RoomBoards.save()">Conservar revisión</button>':'')+'<button class="btn btn-dark" onclick="RoomBoards.pdf()">Descargar PDF</button><button class="btn btn-ghost" onclick="RoomBoards.latest()">Ver fichas actuales</button></div>'+(_accessRole==='admin'?'<label>Revisiones conservadas <select id="boardHistory" onchange="RoomBoards.history(this.value)"><option value="">Selecciona una revisión</option>'+(cr.r.boardRevisions||[]).map(x=>'<option value="'+E(x.id)+'" '+(x.id===shown.id?'selected':'')+'>'+E(x.date+' · '+x.audience+' · '+x.template)+'</option>').join('')+'</select></label>':'')+html(shown)+'</div>');
 }
 function configure(){if(!current())return;options={template:document.getElementById('boardTemplate').value,audience:document.getElementById('boardAudience').value,prices:document.getElementById('boardPrices').checked};shown=null;draw();}
 function latest(){shown=null;draw();}
 function history(id){const cr=current();if(!cr||_accessRole!=='admin')return;const matches=(cr.r.boardRevisions||[]).filter(x=>x.id===id);if(matches.length!==1)return;shown=copy(matches[0]);draw();}
 function save(){
  const cr=current();if(!cr||_accessRole!=='admin'||!shown)return;
  if((cr.r.boardRevisions||[]).some(x=>x.id===shown.id)){toast('Esta revisión ya está conservada');return;}
  if(fingerprint(capture(cr.p,cr.r,shown))!==fingerprint(shown)){toast('Las fichas han cambiado. Revisa la vista actual antes de conservarla');return;}
  cr.r.boardRevisions=[...(cr.r.boardRevisions||[]),copy(shown)];closeModal();render();toast('Revisión añadida. Comprueba el estado Guardado en nube antes de cerrar.');
 }
 async function pdf(){if(!current()||!shown)return;const s=copy(shown),z=document.getElementById('printZone');z.innerHTML='<div class="pdf-page">'+html(s)+'</div>';try{await printAs('Board — '+s.room.name+' — '+s.date);}finally{z.style.display='none';}}
 return {capture,fingerprint,open,configure,latest,history,save,pdf};
})();
if(typeof module!=='undefined')module.exports=RoomBoards;
