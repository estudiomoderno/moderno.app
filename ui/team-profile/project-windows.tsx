import {Badge} from './vendor/reui/badge';
import {Button} from './vendor/reui/button';
import {HouseIcon,XIcon} from 'lucide-react';

/* Owner's closable Badge pattern. The label selects an existing project tab;
   the original ghost Button only closes that tab. */
export function ProjectWindows({tabs,onList,onOpen,onClose}:any){
 return <div className="pw-window-controls flex items-center gap-2">
  <Button size="icon" variant="outline" className="relative pw-all" aria-label="Ver todos los proyectos" title="Ver todos los proyectos" onClick={onList}>
   <HouseIcon aria-hidden="true"/>
  </Button>
  <div className="pw-tabs flex items-center gap-1" role="tablist" aria-label="Proyectos abiertos">
   {tabs.map((tab:any)=><Badge key={tab.id} variant="outline" className={'gap-0.5 pw-tab'+(tab.selected?' is-active':'')}>
    <button type="button" className="pw-tab-select" role="tab" id={'project-window-'+tab.id} data-project={tab.id} aria-selected={tab.selected} aria-controls="view" tabIndex={tab.tabIndex} title={tab.title} aria-label={tab.title} onClick={()=>onOpen(tab.id)}>
     <span className="pw-tab-title">{tab.title}</span>
    </button>
    <Button variant="ghost" size="icon" className="size-3 hover:bg-transparent pw-close" data-project={tab.id} aria-label={'Cerrar pestaña de '+tab.title} title={'Cerrar pestaña de '+tab.title} onClick={()=>onClose(tab.id)}>
     <XIcon aria-hidden="true"/>
    </Button>
   </Badge>)}
  </div>
 </div>;
}
