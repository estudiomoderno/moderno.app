import {Badge} from './vendor/reui/badge';
import {Button} from './vendor/reui/button';
import {Autocomplete,AutocompleteContent,AutocompleteEmpty,AutocompleteInput,AutocompleteItem,AutocompleteList} from './vendor/reui/autocomplete';
import {HouseIcon,PlusIcon,XIcon} from 'lucide-react';
import {useEffect,useMemo,useRef,useState} from 'react';

/* Owner's closable Badge pattern. The label selects an existing project tab;
   the original ghost Button only closes that tab. */
export function ProjectWindows({tabs,projects,searchOpen,onSearchToggle,onSearchClose,onSearchLayout,onList,onOpen,onClose,container}:any){
 const [query,setQuery]=useState(''),input=useRef<HTMLInputElement>(null);
 const norm=(value:string)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const matches=useMemo(()=>projects.filter((item:any)=>norm(item.search).includes(norm(query))).slice(0,50),[projects,query]);
 useEffect(()=>{setQuery('');if(searchOpen)input.current?.focus();},[searchOpen]);
 function choose(id:string){if(onOpen(id))onSearchClose();}
 return <div className="pw-window-controls flex items-center gap-1">
  <Button size="icon" variant="outline" className="relative pw-all" aria-label="Ver todos los proyectos" title="Ver todos los proyectos" onClick={onList}>
   <HouseIcon aria-hidden="true"/>
  </Button>
  <div className="pw-tabs flex items-center gap-1" role="tablist" aria-label="Proyectos abiertos">
   {tabs.map((tab:any)=><Badge key={tab.id} variant="outline" className={'gap-0.5 h-8 pw-tab'+(tab.selected?' is-active':'')}>
    <button type="button" className="pw-tab-select" role="tab" id={'project-window-'+tab.id} data-project={tab.id} aria-selected={tab.selected} aria-controls="view" tabIndex={tab.tabIndex} title={tab.title} aria-label={tab.title} onClick={()=>onOpen(tab.id)}>
     <span className="pw-tab-title">{tab.title}</span>
    </button>
    <Button variant="ghost" size="icon" className="size-3 hover:bg-transparent pw-close" data-project={tab.id} aria-label={'Cerrar pestaña de '+tab.title} title={'Cerrar pestaña de '+tab.title} onClick={()=>onClose(tab.id)}>
     <XIcon aria-hidden="true"/>
    </Button>
   </Badge>)}
  </div>
  <div className="pw-search-group">
   <Button variant="ghost" size="icon" className="pw-add" aria-label="Abrir otro proyecto" title="Abrir otro proyecto" aria-expanded={searchOpen} aria-controls="project-inline-search" onClick={onSearchToggle}>
    <PlusIcon aria-hidden="true"/>
   </Button>
   <div id="project-inline-search" className="pw-search-collapse" data-open={String(searchOpen)} inert={!searchOpen} onTransitionEnd={event=>{if(event.propertyName==='width')onSearchLayout();}}>
    <div className="pw-search-inner w-full max-w-xs">
     <Autocomplete items={matches} filter={null} value={query} onValueChange={setQuery} itemToStringValue={(item:any)=>item.value} autoHighlight onOpenChange={(open,details)=>{if(!open&&details.reason==='escape-key')onSearchClose(true);}}>
      <AutocompleteInput ref={input} placeholder="Buscar proyecto" aria-label="Buscar proyecto para abrir" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();onSearchClose(true);}}}/>
      {searchOpen&&<AutocompleteContent container={container}>
       <AutocompleteEmpty>No hay proyectos que coincidan.</AutocompleteEmpty>
       <AutocompleteList>
        {(item:any)=><AutocompleteItem key={item.id} value={item} className="pw-project-choice" onClick={()=>choose(item.id)}>{item.value}</AutocompleteItem>}
       </AutocompleteList>
      </AutocompleteContent>}
     </Autocomplete>
    </div>
   </div>
  </div>
 </div>;
}
