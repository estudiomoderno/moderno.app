/* Task options come only from verified memberships. Never edits the user directory. */
var TaskMembers=(()=>{
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let owner='',generation=0,phase='idle',members=[];
 const key=()=>[ESTUDIO_ID,state.sessionUser?.id||state.sessionUser?.mail||'',_accessRole].join('|');
 const valid=()=>owner===key()&&!_accessLoading&&['admin','colaborador'].includes(_accessRole);
 function begin(){owner=key();generation++;phase='loading';members=[];}
 function has(name){return valid()&&phase==='ready'&&members.some(m=>m.name===name);}
 function html(draft){
  const selected=taskAssignees(draft),available=valid()&&phase==='ready'?members:[];
  const choices=available.map(m=>`<button type="button" class="${selected.includes(m.name)?'on':''}" title="${E(m.email)}" data-who="${E(m.name)}" onclick="tkToggleWho(this)">${E(m.name)}${selected[0]===m.name&&selected.length>1?' ★':''}</button>`).join('');
  const historic=selected.filter(name=>!available.some(m=>m.name===name)).map(name=>`<button type="button" class="on" data-who="${E(name)}" title="Quitar esta asignación anterior" onclick="tkToggleWho(this)">${E(name)} · asignación anterior</button>`).join('');
  const status=phase==='loading'?'<small role="status">Comprobando usuarios del estudio…</small>':phase==='error'?'<small role="status">No se pudo comprobar el equipo.</small><button type="button" onclick="TaskMembers.load()">Reintentar</button>':!available.length?'<small>Sin usuarios disponibles.</small>':'';
  return choices+historic+status;
 }
 function paint(){if(!valid())return;const box=document.getElementById('tkWho');if(box&&state._tk)box.innerHTML=html(state._tk);}
 async function load(){
  if(!valid()||!sb)return;const request=++generation;phase='loading';members=[];paint();
  try{const result=await sb.rpc('app_tareas_miembros',{p_estudio:ESTUDIO_ID});if(request!==generation||!valid())return;
   if(result.error||!Array.isArray(result.data))throw Error('No directory');
   const seen=new Set();members=result.data.filter(m=>m&&typeof m.id==='string'&&m.id&&typeof m.email==='string'&&m.email&&typeof m.name==='string'&&m.name.trim()).filter(m=>{if(seen.has(m.id))return false;seen.add(m.id);return true;}).map(m=>({...m,name:m.name.trim()}));phase='ready';
  }catch{if(request!==generation||!valid())return;phase='error';members=[];}
  paint();
 }
 return {begin,has,html,load,refresh:paint};
})();
