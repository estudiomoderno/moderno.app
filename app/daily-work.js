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
  function saveStatus({editing,localFailure,localDetail,review,online=true,changed,confirmed,phase,detail}){
    if(localFailure)return {mode:'err',label:'Necesita revisión',detail:localDetail||'No se pudo conservar la copia local. Mantén esta pestaña abierta y descarga una copia.'};
    if(review)return {mode:'err',label:'Necesita revisión',detail:detail||'Hay cambios o copias pendientes que revisar. No cierres esta pestaña.'};
    if(editing)return {mode:'pending',label:'Formulario abierto',detail:'Usa Guardar en el formulario para aplicar sus cambios. La confirmación de la nube se muestra después.'};
    if(!online)return {mode:'pending',label:changed?'Pendiente en este dispositivo':'Sin conexión',detail:'No se puede confirmar el estado actual de la nube. Conserva esta pestaña abierta.'};
    if(phase==='saving')return {mode:'saving',label:'Guardando',detail:detail||'Esperando la confirmación del servidor.'};
    if(phase==='connecting')return {mode:'saving',label:'Conectando',detail:'Comprobando los datos de tu estudio.'};
    if(phase==='retry')return {mode:'pending',label:'Pendiente de guardar',detail:detail||'El servidor no confirmó el último intento. Se reintentará automáticamente.'};
    if(changed||phase==='pending')return {mode:'pending',label:'Pendiente en este dispositivo',detail:detail||'Los cambios todavía no están confirmados en la nube.'};
    if(confirmed)return {mode:'ok',label:'Guardado en nube',detail:'Los datos actuales coinciden con la última versión confirmada.'};
    return {mode:'pending',label:'Pendiente de comprobar',detail:'Todavía no hay confirmación de la nube.'};
  }
  function syncFailureMode(error){
    const chain=[];for(let current=error;current&&chain.length<4&&!chain.includes(current);current=current.cause)chain.push(current);
    const codes=chain.flatMap(item=>[item?.code,item?.status,item?.statusCode]).filter(value=>value!==undefined&&value!==null).map(value=>String(value).toUpperCase());
    const names=chain.map(item=>String(item?.name||'')).join(' ');
    const message=chain.map(item=>String(item?.message||item||'')).join(' ');
    if(chain.some(item=>item?.syncReview===true))return 'review';
    if(codes.some(code=>['401','403','409','42501','PGRST301','PGRST302','PT409','INVALID_JWT','BAD_JWT','REFRESH_TOKEN_NOT_FOUND','SESSION_NOT_FOUND','USER_NOT_FOUND'].includes(code))||
       /conflicto|no autorizado|sin autorizaci[oó]n|permisos? (?:han cambiado|inv[aá]lid)|sesi[oó]n (?:inv[aá]lid|ha cambiado|caduc)|token (?:inv[aá]lid|caduc)|respuesta.+no v[aá]lida|datos?.+(?:dañad|corrupt)|copia.+(?:dañad|no coincide)|contrato.+(?:inv[aá]lid|incompatible)/i.test(message))return 'review';
    if(/AbortError|TimeoutError/i.test(names)||codes.some(code=>['0','408','425','429','ERR_NETWORK','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ECONNABORTED','PGRST000','PGRST001','PGRST002','PGRST003','55P03','57014','57P01','57P02','57P03'].includes(code)||/^5\d\d$/.test(code)||/^08/.test(code)||/^40/.test(code)||/^53/.test(code))||
       /failed to fetch|load failed|network(?:\s*error| request)?|fetch failed|offline|sin conexi[oó]n|tiempo de espera|timeout|timed out|tarda demasiado|temporar|service unavailable|bad gateway|gateway timeout|socket hang up|connection (?:reset|refused|closed)/i.test(message))return 'retry';
    // Un código estructurado no reconocido suele proceder de Auth/Postgres o del
    // contrato REST. El texto exterior puede mencionar “conexión”, pero eso no lo
    // convierte en un fallo de red.
    if(codes.length)return 'review';
    if(/conexi[oó]n/i.test(message))return 'retry';
    // Un error desconocido podría indicar datos o contrato incompatibles. No se
    // oculta tras reintentos automáticos hasta poder demostrar que es transitorio.
    return 'review';
  }
  function monthDays(month){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mes no válido');
    const [y,m]=month.split('-').map(Number), first=new Date(Date.UTC(y,m-1,1));
    const offset=(first.getUTCDay()+6)%7, count=new Date(Date.UTC(y,m,0)).getUTCDate();
    return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i<offset||i>=offset+count?'':month+'-'+String(i-offset+1).padStart(2,'0'));
  }
  return {normalize,escape,today,due,isMine,compare,projectMatches,saveStatus,syncFailureMode,monthDays};
});
