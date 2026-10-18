import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/calendar-ui.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const nativeDrop=html.slice(html.indexOf('function calSpanDrop('),html.indexOf('/* Filtro de proyecto del calendario:'));
function fixture(){
 let props,hidden=false;const calls=[];
 const target={append(){}},native={setAttribute(){hidden=true;},removeAttribute(){hidden=false;},set hidden(v){hidden=v;}};
 const host=()=>({className:'',dataset:{reuiReady:'true'},remove(){},isConnected:true});
 const mount=()=>({update(p){props=p;},unmount(){calls.push(['unmount']);}});
 const state={view:'calendario',sessionUser:{id:'fictional'},myRole:'admin',brandFilter:'a',account:{weekend:'vs',showWeekends:false},cal:{view:'mes',off:0,showTasks:true,showObra:true,events:[{title:'Cita ficticia 10:30',date:'2026-10-22'},{title:'Fecha inválida',date:'2026-02-31'}]},projects:[{id:1,brand:'a',num:'PR-1',name:'Ficticio',tasks:[{title:'Entrega',due:'2026-10-22'},{title:'Inválida',due:'2026-02-31'}],obraF:[{name:'Fase',start:'2026-10-20',end:'2026-10-24'}]},{id:2,brand:'b',name:'Otro ámbito',tasks:[{title:'No visible',due:'2026-10-22'}]},{id:3,brand:'a',tpl:true},{id:4,brand:'a',status:'Archivado'}]};
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const ctx=vm.createContext({state,ESTUDIO_ID:'fictional',_accessRole:'admin',_accessLoading:false,_calDrag:null,Date,console,queueMicrotask,
  window:{ModernoCalendarComponent:{mount}},ModernoCalendarComponent:{mount},document:{getElementById:()=>target,querySelector:s=>s==='.calendar-native'?native:null,createElement:host,head:{append(){assert.fail('No network needed');}}},
  canView:()=>true,byBrand:items=>items.filter(p=>p.brand===state.brandFilter),WorkflowPolish:{iso,eventInfo:d=>calls.push(['event',d])},
  vCalendar:()=>'<calendar-original>',render(){calls.push(['render']);},calProjMatch:q=>state.projects.find(p=>p.id===1&&q==='PR-1'),
  taskModal:(...a)=>calls.push(['task',...a]),obraPlanModal:(...a)=>calls.push(['phase',...a]),calDayMenu:d=>calls.push(['day',d]),calNew:()=>calls.push(['new']),toast:m=>calls.push(['toast',m]),persistSoon:()=>calls.push(['persist']),obraSnap:id=>calls.push(['snap',id])
 });vm.runInContext(nativeDrop,ctx);vm.runInContext(source,ctx);return {ctx,state,calls,props:()=>props,hidden:()=>hidden};
}
test('calendar adapter preserves records, inclusive phase end, timed appointments and project scope',()=>{
 const f=fixture(),before=JSON.stringify(f.state),p=f.props();
 assert.equal(p.events.length,3);assert.deepEqual(Array.from(p.events,e=>e.title),['Entrega','Fase','Cita ficticia 10:30']);assert.equal(p.projects.length,1);
 assert.equal(p.events[1].end.getDate(),25);assert.equal(p.events[0].allDay,true);assert.equal(p.events[0].draggable,false);assert.equal(p.events[2].allDay,false);assert.equal(p.events[2].start.getHours(),10);assert.equal(p.events[2].start.getMinutes(),30);
 assert.equal(p.showWeekends,false);assert.deepEqual([...p.weekendDays],[5,6]);assert.equal(JSON.stringify(f.state),before);assert.equal(f.calls.length,0);
});
test('calendar actions delegate to native forms and reject stale or out-of-scope records',()=>{
 const f=fixture(),p=f.props();p.onEventClick({event:p.events[0]});p.onEventClick({event:p.events[1]});p.onEventClick({event:p.events[2]});
 assert.deepEqual(f.calls,[['task',1,0],['phase',1,0],['event','2026-10-22']]);
 f.state.projects[0].tasks.splice(0,1);p.onEventClick({event:p.events[0]});assert.equal(f.calls.length,3);
 f.state.brandFilter='b';p.onEventClick({event:p.events[1]});p.onNew();assert.equal(f.calls.length,3);
});
test('phase moves retain local dates across the autumn DST boundary using the existing write handler',async()=>{
 const previous=process.env.TZ;process.env.TZ='Europe/Madrid';
 try{const f=fixture(),event=f.props().events.find(e=>e.data.kind==='phase');const u={event,source:'drag',allDay:true,start:new Date('2026-10-24T00:00:00'),end:new Date('2026-10-29T00:00:00')};assert.equal(f.props().canDropEvent(u),true);assert.equal(f.props().onEventUpdate(u),false);await Promise.resolve();
  assert.equal(f.state.projects[0].obraF[0].start,'2026-10-24');assert.equal(f.state.projects[0].obraF[0].end,'2026-10-28');assert.equal(f.calls.filter(c=>c[0]==='persist').length,1);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('resizing preserves the inclusive end and rejects left resize, tasks, invalid ranges and stale phase proposals',async()=>{
 const f=fixture(),event=f.props().events.find(e=>e.data.kind==='phase'),base={event,source:'resize-end',allDay:true,start:new Date('2026-10-20T00:00:00'),end:new Date('2026-10-28T00:00:00')};
 for(const u of [{...base,source:'resize-start'},{...base,allDay:false},{...base,end:base.start},{...base,event:f.props().events[0]}])assert.equal(f.props().canDropEvent(u),false);
 f.props().onEventUpdate(base);await Promise.resolve();assert.equal(f.state.projects[0].obraF[0].end,'2026-10-27');assert.equal(f.props().canDropEvent(base),false);
});
test('navigation settings and disabling the presentation never persist calendar records',()=>{
 const f=fixture(),before=JSON.stringify({projects:f.state.projects,events:f.state.cal.events});f.props().onView('week');f.props().onDate(new Date('2027-01-01T00:00:00'));f.props().onToggle('showTasks');f.ctx.ModernoCalendarUI.setEnabled(false);
 assert.equal(f.hidden(),false);assert.equal(JSON.stringify({projects:f.state.projects,events:f.state.cal.events}),before);assert.equal(f.calls.filter(c=>c[0]==='persist').length,0);
});

test('calendar callbacks cannot act through a loading session, external role, changed identity or an open form',()=>{
 for(const mode of ['loading','role','identity','form']){const f=fixture(),p=f.props();if(mode==='loading')f.ctx._accessLoading=true;else if(mode==='role')f.ctx._accessRole='cliente';else if(mode==='identity')f.state.sessionUser.id='different';else{const original=f.ctx.document.querySelector;f.ctx.document.querySelector=s=>s==='.overlay.open,dialog[open]'?{}:original(s);}
  p.onNew();p.onEventClick({event:p.events[0]});assert.equal(f.calls.some(c=>['new','task','phase','persist'].includes(c[0])),false);
 }
});
