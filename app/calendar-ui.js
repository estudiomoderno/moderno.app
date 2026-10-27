/* Original ReUI calendar presentation; application records and native handlers remain authoritative. */
var ModernoCalendarUI=(()=>{
 'use strict';
 let enabled=true,failed=false,loading=false,host=null,component=null,owner='',anchor=null;
 const views={mes:'month',semana:'week',dia:'day',dias:'days',agenda:'agenda'};
 const workViews=new Map();let phaseDraft=null;
 const isWork=()=>state.view==='proyecto'&&state.projTab==='calobra';
 const isCalendar=()=>state.view==='calendario'||isWork();
 function config(){if(!isWork())return state.cal;const key=JSON.stringify([typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID,state.sessionUser?.id||state.sessionUser?.mail,state.currentProject]);if(!workViews.has(key))workViews.set(key,{view:'mes',off:0,pid:state.currentProject,showTasks:false,showObra:true,events:[]});return workViews.get(key);}
 const identity=()=>JSON.stringify([typeof ESTUDIO_ID==='undefined'?'':ESTUDIO_ID,state.sessionUser?.id,state.sessionUser?.mail,_accessRole,state.myRole,state.brandFilter,isWork()?'work:'+state.currentProject:'calendar']);
 const iso=d=>WorkflowPolish.iso(d),date=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;const d=new Date(s+'T00:00:00');return Number.isFinite(d.getTime())&&iso(d)===s?d:null;};
 const shift=(d,n)=>{const next=new Date(d);next.setDate(next.getDate()+n);return next;};
 const projects=()=>byBrand((state.projects||[]).filter(p=>!p.tpl&&p.status!=='Archivado'));
 const allowed=()=>enabled&&!failed&&!_accessLoading&&['admin','miembro','colaborador'].includes(_accessRole)&&Boolean(state.sessionUser?.id||state.sessionUser?.mail)&&(isWork()?canView('proyectos'):canView('calendario'));
 function clear(){component?.unmount();component=null;host?.remove();host=null;}
 function safeAction(fn){return (...args)=>{if(!allowed()||identity()!==owner||!isCalendar())return false;if(document.querySelector('.overlay.open,dialog[open]')){toast('Guarda o cancela la edición antes de cambiar el calendario.');return false;}return fn(...args);};}
 function payload(){
  const C=config(),pool=projects().filter(p=>!isWork()||p.id===state.currentProject),selected=pool.find(p=>p.id===C.pid),visible=selected?[selected]:C.pid?[]:pool,events=[];
  if(!anchor){anchor=new Date();anchor.setHours(0,0,0,0);if(C.view==='mes')anchor.setMonth(anchor.getMonth()+(C.off||0));else anchor=shift(anchor,(C.off||0)*(C.view==='dia'?1:7));}
  function add(id,title,start,end,data,color,editable=false,allDay=true){if(!start||!end||end<=start)return;events.push({id,title:String(title||'Actividad'),start,end,allDay,color,draggable:editable,resizable:editable,data});}
  for(const p of visible){
   if(C.showTasks)for(const [i,t] of (p.tasks||[]).entries()){const d=date(t.due);if(d)add('task:'+p.id+':'+i,t.title,d,shift(d,1),{kind:'task',pid:p.id,index:i,ref:t},'#525252');}
   if(C.showObra!==false)for(const [i,f] of (p.obraF||[]).entries()){const a=date(f.start),b=date(f.end);if(a&&b&&b>=a)add('phase:'+p.id+':'+i,f.name,a,shift(b,1),{kind:'phase',pid:p.id,index:i,ref:f,start:f.start,end:f.end},/^#[0-9a-f]{3,8}$/i.test(f.color||'')?f.color:'#64748b',true);}
  }
  for(const [i,e] of (C.events||[]).entries()){
   const start=date(e.date);if(!start)continue;const time=/\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(String(e.title||''));if(time)start.setHours(+time[1],+time[2]);
   add('event:'+i,e.title,start,time?new Date(start.getTime()+3600000):shift(start,1),{kind:'event',index:i,ref:e,date:e.date},e.src==='g'?'#2563eb':e.src==='a'?'#71717a':'#18181b',false,!time);
  }
  return {work:isWork(),events,projects:pool.map(p=>({id:p.id,label:[p.num,p.name].filter(Boolean).join(' ')})),projectLabel:selected?[selected.num,selected.name].filter(Boolean).join(' '):'',view:views[C.view]||'month',date:anchor,showTasks:Boolean(C.showTasks),showObra:C.showObra!==false,showWeekends:state.account?.showWeekends!==false,weekendDays:state.account?.weekend==='vs'?[5,6]:[0,6]};
 }
 function resolve(data){if(!data||isWork()&&(data.kind!=='phase'||data.pid!==state.currentProject))return null;if(data.kind==='event')return state.cal.events?.[data.index]===data.ref?data:null;const p=projects().find(p=>p.id===data.pid),record=(data.kind==='task'?p?.tasks:p?.obraF)?.[data.index];return record===data.ref?{...data,project:p}:null;}
 function canUpdate(update){const d=resolve(update.event?.data);return Boolean(d?.kind==='phase'&&['drag','resize-end'].includes(update.source)&&update.allDay&&date(iso(update.start))&&date(iso(update.end))&&update.end>update.start&&d.ref.start===d.start&&d.ref.end===d.end);}
 function fail(){failed=true;queueMicrotask(()=>{clear();document.querySelector('.calendar-native')?.removeAttribute('hidden');});}
 function props(){const snapshot=payload();return {...snapshot,
  onFilter:safeAction(q=>{if(isWork())return false;const p=calProjMatch(q);if(!String(q||'').trim())config().pid=null;else if(p)config().pid=p.id;else{toast('Ningún proyecto coincide o hay varias coincidencias.');return false;}render();return true;}),
  onProject:safeAction(()=>{const p=projects().find(p=>p.id===config().pid);if(p)go('proyecto',p.id);}),
  onToggle:safeAction(key=>{if(isWork())return false;if(!['showTasks','showObra'].includes(key))return;config()[key]=key==='showObra'?config()[key]===false:!config()[key];render();}),
  onView:safeAction(view=>{const old=Object.keys(views).find(k=>views[k]===view);if(old){config().view=old;config().off=0;component.update(props());}}),
  onDate:safeAction(d=>{if(!Number.isFinite(d?.getTime()))return;anchor=new Date(d);config().off=0;component.update(props());}),
  onNew:safeAction(()=>isWork()?newPhase():calNew()),
  onEventClick:safeAction(occurrence=>{const d=resolve(occurrence.event.data);if(!d)return;if(d.kind==='task')taskModal(d.pid,d.index);else if(d.kind==='phase')obraPlanModal(d.pid,d.index);else WorkflowPolish.eventInfo(d.date);}),
  onSlotClick:safeAction(slot=>isWork()?newPhase(iso(slot.date)):calDayMenu(iso(slot.date))),
  onSelectSlot:safeAction(slot=>isWork()?newPhase(iso(slot.start),iso(shift(slot.end,-1))):calDayMenu(iso(slot.start))),
  canDropEvent:update=>isCalendar()&&allowed()&&identity()===owner&&canUpdate(update),
  onEventUpdate:safeAction(update=>{if(!canUpdate(update))return false;const d=update.event.data,context=owner;queueMicrotask(()=>{if(!isCalendar()||!allowed()||identity()!==context||!canUpdate(update)||document.querySelector('.overlay.open,dialog[open]'))return;_calDrag={pid:d.pid,fi:d.index,mode:update.source==='drag'?'move':'end',grabOffset:0};calSpanDrop({preventDefault(){},currentTarget:{classList:{remove(){}}}},iso(update.source==='drag'?update.start:shift(update.end,-1)));});return false;})
 };}
 function newPhase(start=iso(new Date()),end=start){
  const p=projects().find(p=>p.id===state.currentProject);if(!isWork()||!p)return;
  phaseDraft={identity:owner,project:p};const E=ModernoDaily.escape;
  if(!date(start))start=iso(new Date());if(!date(end)||end<start)end=start;
  modal(`<h3>Nueva fase de obra</h3><form id="work-calendar-phase" onsubmit="event.preventDefault();ModernoCalendarUI.savePhase(this)"><label>Nombre<input name="title" required maxlength="200" placeholder="Nombre de la fase"></label><div class="row2"><label>Inicio<input name="start" type="date" required value="${E(start)}"></label><label>Fin<input name="end" type="date" required value="${E(end)}"></label></div><p role="alert"></p><div class="modal-foot"><button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn-dark">Guardar fase</button></div></form>`);
 }
 function savePhase(form){
  const d=phaseDraft,p=d?.project;if(!d||!allowed()||!isWork()||d.identity!==identity()||p.id!==state.currentProject||!projects().includes(p))return false;
  const name=form.elements.title.value.trim(),start=form.elements.start.value,end=form.elements.end.value;
  if(!name||name.length>200||!date(start)||!date(end)||end<start){form.querySelector('[role=alert]').textContent='Indica el nombre y unas fechas válidas. El fin no puede ser anterior al inicio.';return false;}
  obraSnap(p.id);p.obraF=p.obraF||[];p.obraF.push({id:crypto.randomUUID(),name,start,end,color:'#64748b',items:[]});phaseDraft=null;persistSoon();closeModal();render();return true;
 }
 function refresh(){
  const next=identity();if(next!==owner){clear();owner=next;anchor=null;}
  const target=document.getElementById(isWork()?'work-calendar-reui':'calendar-reui');
  if(!target||!isCalendar()||!allowed()){clear();document.querySelector('.calendar-native')?.removeAttribute('hidden');return;}
  const native=document.querySelector('.calendar-native');
  if(!window.ModernoCalendarComponent){
   if(!loading){loading=true;const script=document.createElement('script');script.src='/calendar-component.js?v=365130';script.onload=()=>{loading=false;safeRefresh();};script.onerror=fail;document.head.append(script);}return;
  }
  if(!component){host=document.createElement('div');host.className='calendar-component-host';component=ModernoCalendarComponent.mount(host,fail,()=>{if(host?.isConnected)document.querySelector('.calendar-native')?.setAttribute('hidden','');});}
  target.append(host);component.update(props());if(host.dataset.reuiReady==='true'&&native)native.hidden=true;
 }
 function safeRefresh(){try{refresh();}catch(error){fail();console.warn('Calendario ReUI no disponible; se conserva el calendario anterior.',error);}}
 const originalCalendar=vCalendar;vCalendar=function(){const html=originalCalendar.apply(this,arguments);return '<div class="calendar-layout"><div id="calendar-reui"></div><div class="calendar-native">'+html+'</div></div>';};
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);safeRefresh();return result;};
 safeRefresh();return {refresh:safeRefresh,savePhase,setEnabled(value){enabled=value===true;safeRefresh();}};
})();
