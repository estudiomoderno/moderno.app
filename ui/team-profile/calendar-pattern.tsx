import {useEffect,useState} from 'react';
import {es} from 'date-fns/locale/es';
import {EventCalendar} from './vendor/reui/event-calendar/event-calendar';
import {EventCalendarContent} from './vendor/reui/event-calendar/event-calendar-content';
import {EventCalendarNav,EventCalendarToolbar} from './vendor/reui/event-calendar/event-calendar-nav';
import {Card,CardContent} from './vendor/reui/card';
import {Button} from './vendor/reui/button';
import {Label} from './vendor/reui/label';
import {Switch} from './vendor/reui/switch';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './vendor/reui/tabs';
import {Popover,PopoverContent,PopoverTrigger} from './calendar-ui/popover';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './calendar-ui/select';
import {PlusIcon,Settings2Icon,XIcon,FolderOpenIcon} from 'lucide-react';
import {CalendarPortal} from './calendar-ui/portal';

const i18n={labels:{today:'Hoy',previous:'Periodo anterior',next:'Periodo siguiente',addEvent:'Añadir actividad',allDay:'Todo el día',more:(n:number)=>`+${n} más`,noEvents:'Sin actividades',loading:'Cargando',event:'Actividad',events:(n:number)=>`${n} actividades`,selectView:'Vista del calendario',week:(n:number)=>`Semana ${n}`,resources:'Equipo',goToDate:'Ir a una fecha',dropNotAllowed:'No se puede mover aquí',continues:'continúa',timeFrom:(s:string)=>`Desde ${s}`,timeUntil:(s:string)=>`Hasta ${s}`,toggleDayEvents:(n:number,open:boolean)=>`${open?'Ocultar':'Mostrar'} ${n} actividades`,eventDetails:(s:string)=>`Ver ${s}`},viewNames:{month:'Mes',week:'Semana',day:'Día',days:(n:number)=>`${n} días`,agenda:'Agenda',resource:'Equipo'},formats:{timeGutter:'HH:mm',timeGutterMinute:'HH:mm',eventTime:'HH:mm'}};
const defaults={weekNumbers:false,nowIndicator:true,offDays:false,dayStartHour:0,dayEndHour:24,interval:60,snapDuration:15,eventTooltip:false,showDayAddButton:false,drag:true,resize:true,selectSlot:true};
function Toggle({id,label,checked,onChange}:any){return <div className="flex items-center justify-between gap-4"><Label htmlFor={id} className="font-normal">{label}</Label><Switch id={id} checked={checked} onCheckedChange={onChange}/></div>;}
function Choice({id,label,value,options,onChange}:any){return <div className="flex items-center justify-between gap-4"><Label htmlFor={id} className="font-normal">{label}</Label><Select value={String(value)} onValueChange={v=>onChange(Number(v))}><SelectTrigger id={id} size="sm" className="w-28"><SelectValue>{options.find((o:any)=>o.value===value)?.label}</SelectValue></SelectTrigger><SelectContent>{options.map((o:any)=><SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent></Select></div>;}
/* Owner's EventCalendar/Card/Nav/Toolbar composition, fed only by the existing app.
   Demo people/events and demo addEvent writes are deliberately not instantiated. */
export function CalendarPattern(props:any){
 const [settings,setSettings]=useState(defaults),[query,setQuery]=useState(props.projectLabel);
 useEffect(()=>setQuery(props.projectLabel),[props.projectLabel]);
 const [weekends,setWeekends]=useState(props.showWeekends);
 const patch=(key:string,value:any)=>setSettings(s=>({...s,[key]:value}));
 const toggle=(key:keyof typeof defaults,label:string)=><Toggle key={key} id={'ec-'+key} label={label} checked={settings[key]} onChange={(v:boolean)=>patch(key,v)}/>;
 return <CalendarPortal.Provider value={props.container}><div className="calendar-pattern" dir="ltr">
  {!props.work&&<div className="mb-3 flex flex-wrap items-center gap-2">
   <Label htmlFor="calendar-project-filter" className="sr-only">Filtrar por proyecto</Label>
   <input id="calendar-project-filter" className="h-8 w-full max-w-xs rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" list="calendar-project-options" placeholder="Filtrar por proyecto" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')props.onFilter(query);if(e.key==='Escape'){setQuery('');props.onFilter('');}}}/>
   <datalist id="calendar-project-options">{props.projects.map((p:any)=><option key={p.id} value={p.label}/>)}</datalist>
   <Button size="sm" variant="outline" onClick={()=>props.onFilter(query)}>Filtrar</Button>
   {props.projectLabel&&<Button size="icon-sm" variant="ghost" aria-label="Abrir proyecto seleccionado" title="Abrir proyecto seleccionado" onClick={props.onProject}><FolderOpenIcon aria-hidden="true"/></Button>}
   {props.projectLabel&&<Button size="icon-sm" variant="ghost" aria-label="Quitar filtro de proyecto" onClick={()=>{setQuery('');props.onFilter('');}}><XIcon aria-hidden="true"/></Button>}
   <Button size="sm" variant={props.showTasks?'secondary':'outline'} aria-pressed={props.showTasks} onClick={()=>props.onToggle('showTasks')}>Tareas</Button>
   <Button size="sm" variant={props.showObra?'secondary':'outline'} aria-pressed={props.showObra} onClick={()=>props.onToggle('showObra')}>Obra</Button>
  </div>}
  <Card className="w-full py-0"><CardContent className="p-0">
   <EventCalendar events={props.events} view={props.view} date={props.date} views={props.work?['month','week','day','days','agenda']:['month','week','day','agenda']} onViewChange={props.onView} onDateChange={props.onDate} locale={es} i18n={i18n} weekStartsOn={1} weekendDays={props.weekendDays} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} viewSettings={{weekends,weekNumbers:settings.weekNumbers,nowIndicator:settings.nowIndicator,offDays:settings.offDays}} interactions={{drag:settings.drag,resize:settings.resize,selectSlot:settings.selectSlot}} dayStartHour={settings.dayStartHour} dayEndHour={settings.dayEndHour} interval={settings.interval} snapDuration={settings.snapDuration} eventTooltip={settings.eventTooltip} showDayAddButton={settings.showDayAddButton} offDays={{weekendDays:props.weekendDays}} onEventClick={props.onEventClick} onEventUpdate={props.onEventUpdate} canDropEvent={props.canDropEvent} onSlotClick={props.onSlotClick} onSelectSlot={props.onSelectSlot} className="w-full">
    <div className="calendar-nav-row flex flex-wrap items-center gap-2 pe-2">
     <EventCalendarNav className="min-w-0 flex-1"/>
     <EventCalendarToolbar>
      <Popover><PopoverTrigger render={<Button variant="outline" size="sm"/>}><Settings2Icon className="size-4" aria-hidden="true"/>Ajustes</PopoverTrigger><PopoverContent align="end" sideOffset={8} className="w-80 max-w-[calc(100vw-24px)]">
       <Tabs defaultValue="view" className="flex-col"><TabsList className="h-8 w-full shrink-0"><TabsTrigger value="view" className="flex-1">Vista</TabsTrigger><TabsTrigger value="time" className="flex-1">Horario</TabsTrigger><TabsTrigger value="behavior" className="flex-1">Interacción</TabsTrigger></TabsList>
        <TabsContent value="view" className="flex flex-col gap-3"><Toggle id="ec-weekends" label="Fines de semana" checked={weekends} onChange={setWeekends}/>{toggle('weekNumbers','Números de semana')}{toggle('nowIndicator','Hora actual')}{toggle('offDays','Marcar días de descanso')}{toggle('showDayAddButton','Botón para añadir en cada día')}</TabsContent>
        <TabsContent value="time" className="flex flex-col gap-3"><Choice id="ec-start" label="El día empieza" value={settings.dayStartHour} options={[0,6,8].map(v=>({value:v,label:String(v).padStart(2,'0')+':00'}))} onChange={(v:number)=>patch('dayStartHour',v)}/><Choice id="ec-end" label="El día termina" value={settings.dayEndHour} options={[18,20,24].map(v=>({value:v,label:v+':00'}))} onChange={(v:number)=>patch('dayEndHour',v)}/><Choice id="ec-interval" label="Intervalo" value={settings.interval} options={[30,60].map(v=>({value:v,label:v+' min'}))} onChange={(v:number)=>patch('interval',v)}/><Choice id="ec-snap" label="Ajuste al arrastrar" value={settings.snapDuration} options={[5,15,30].map(v=>({value:v,label:v+' min'}))} onChange={(v:number)=>patch('snapDuration',v)}/></TabsContent>
        <TabsContent value="behavior" className="flex flex-col gap-3">{toggle('drag','Arrastrar fases para mover')}{toggle('resize','Arrastrar para cambiar duración')}{toggle('selectSlot','Seleccionar para añadir')}{toggle('eventTooltip','Información al pasar el ratón')}</TabsContent>
       </Tabs><Button variant="outline" size="sm" className="mt-4 w-full" onClick={()=>{setSettings(defaults);setWeekends(props.showWeekends);}}>Restablecer</Button>
      </PopoverContent></Popover>
      <Button size="sm" onClick={props.onNew}><PlusIcon className="size-4" aria-hidden="true"/>{props.work?'Añadir fase':'Nuevo evento'}</Button>
     </EventCalendarToolbar>
    </div><EventCalendarContent/>
   </EventCalendar>
  </CardContent></Card>
 </div></CalendarPortal.Provider>;
}
