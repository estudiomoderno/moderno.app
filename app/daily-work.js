(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModernoDaily=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const normalize=v=>String(v||'').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function today(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
  function due(value,day=today()){
    const valid=/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
    if(!valid)return {label:'Sin fecha',kind:'undated',rank:3,date:''};
    const rank=value<day?0:value===day?1:2;
    return {label:['Vencida','Hoy','Próxima'][rank],kind:['overdue','today','next'][rank],rank,date:value};
  }
  function isMine(assignees,name,email){const names=[normalize(name),normalize(email)].filter(Boolean);return (assignees||[]).some(a=>names.includes(normalize(a)));}
  function compare(a,b,day=today()){const x=due(a.t.due,day),y=due(b.t.due,day);return x.rank-y.rank||x.date.localeCompare(y.date)||normalize(a.p.num+' '+a.p.name).localeCompare(normalize(b.p.num+' '+b.p.name),'es',{numeric:true})||normalize(a.t.title).localeCompare(normalize(b.t.title),'es')||a.i-b.i;}
  function projectMatches(p,q){return normalize(p.num+' '+p.name+' '+(p.client||'')).includes(normalize(q));}
  function saveStatus({editing,localFailure,review,online=true,changed,confirmed,phase,detail}){
    if(localFailure)return {mode:'err',label:'Necesita revisión',detail:'No se pudo conservar la copia local. Mantén esta pestaña abierta y descarga una copia.'};
    if(review)return {mode:'err',label:'Necesita revisión',detail:detail||'Hay cambios o copias pendientes que revisar. No cierres esta pestaña.'};
    if(editing)return {mode:'pending',label:'Formulario abierto',detail:'Usa Guardar en el formulario para aplicar sus cambios. La confirmación de la nube se muestra después.'};
    if(!online)return {mode:'pending',label:changed?'Pendiente en este dispositivo':'Sin conexión',detail:'No se puede confirmar el estado actual de la nube. Conserva esta pestaña abierta.'};
    if(phase==='saving')return {mode:'saving',label:'Guardando',detail:detail||'Esperando la confirmación del servidor.'};
    if(phase==='connecting')return {mode:'saving',label:'Conectando',detail:'Comprobando los datos de tu estudio.'};
    if(changed||phase==='pending')return {mode:'pending',label:'Pendiente en este dispositivo',detail:detail||'Los cambios todavía no están confirmados en la nube.'};
    if(confirmed)return {mode:'ok',label:'Guardado en nube',detail:'Los datos actuales coinciden con la última versión confirmada.'};
    return {mode:'pending',label:'Pendiente de comprobar',detail:'Todavía no hay confirmación de la nube.'};
  }
  function monthDays(month){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mes no válido');
    const [y,m]=month.split('-').map(Number), first=new Date(Date.UTC(y,m-1,1));
    const offset=(first.getUTCDay()+6)%7, count=new Date(Date.UTC(y,m,0)).getUTCDate();
    return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i<offset||i>=offset+count?'':month+'-'+String(i-offset+1).padStart(2,'0'));
  }
  return {normalize,escape,today,due,isMine,compare,projectMatches,saveStatus,monthDays};
});
