import * as React from 'react';
import {Breadcrumb,BreadcrumbItem,BreadcrumbLink,BreadcrumbList,BreadcrumbPage,BreadcrumbSeparator} from './vendor/reui/breadcrumb';
import {Card,CardContent} from './vendor/reui/card';
import {Button} from './vendor/reui/button';
import {HouseIcon,PlusIcon,Share2Icon} from 'lucide-react';

type Crumb={label:string;view?:string};
type PageBreadcrumbProps={items:Crumb[];onNavigate:(view:string)=>boolean|void;finance?:Crumb[];current?:string;search?:string;onSearch?:(value:string)=>void;onNewQuote?:()=>boolean|void;onShare?:()=>void};
export function PageBreadcrumbs({items,onNavigate,finance,current,search='',onSearch,onNewQuote,onShare}:PageBreadcrumbProps){
 const searchRef=React.useRef<HTMLInputElement>(null);
 const [activeFinance,setActiveFinance]=React.useState(current);
 const [financeSearch,setFinanceSearch]=React.useState(search);
 React.useEffect(()=>setActiveFinance(current),[current]);
 React.useEffect(()=>setFinanceSearch(search),[search]);
 const route=<Card className="route-card h-8 justify-center px-2 py-0 text-xs font-medium"><CardContent className="px-1 py-0">
  <Breadcrumb aria-label="Ruta de navegación"><BreadcrumbList className="gap-1.5 sm:gap-1.5 text-xs leading-4">
   {items.map((item,index)=><React.Fragment key={index}>
    {index>0&&<BreadcrumbSeparator/>}
    <BreadcrumbItem>
     {item.view?<BreadcrumbLink render={<button type="button"/>} onClick={()=>onNavigate(item.view!)} className="flex items-center gap-1.5 cursor-pointer">
      {index===0&&<HouseIcon className="size-4" aria-hidden="true"/>}{item.label}
     </BreadcrumbLink>:index<items.length-1?<span>{item.label}</span>:<BreadcrumbPage className="font-medium flex items-center gap-1.5">
      {index===0&&<HouseIcon className="size-4" aria-hidden="true"/>}{item.label}
     </BreadcrumbPage>}
    </BreadcrumbItem>
   </React.Fragment>)}
  </BreadcrumbList></Breadcrumb>
 </CardContent></Card>;
 if(!finance)return route;
 return <div className="flex h-9 w-full min-w-0 items-center gap-3 font-sans">
  <nav aria-label="Secciones de Finanzas" className="flex h-9 shrink-0 overflow-hidden rounded-lg border bg-background shadow-xs">
   {finance.map(item=><Button key={item.view} variant={activeFinance===item.view?'secondary':'ghost'} className="h-full rounded-none border-0 border-r px-3 text-[13px] font-medium leading-4 last:border-r-0" data-finance-view={item.view} aria-current={activeFinance===item.view?'page':undefined} onClick={()=>{const previous=activeFinance;setActiveFinance(item.view);if(onNavigate(item.view!)===false)setActiveFinance(previous)}}>{item.label}</Button>)}
  </nav>
  <div className="flex h-9 min-w-[220px] max-w-xl flex-1 items-stretch" role="search" aria-label="Buscar en Finanzas">
   <Button type="button" variant="outline" className="h-9 shrink-0 rounded-r-none px-3 text-[13px]" onClick={()=>searchRef.current?.focus()}>Buscar</Button>
   <input ref={searchRef} id="finance-search" type="search" autoComplete="off" value={financeSearch} onChange={event=>{setFinanceSearch(event.currentTarget.value);onSearch?.(event.currentTarget.value)}} placeholder="Presupuesto, factura o cliente" aria-label="Buscar en Finanzas" className="h-9 min-w-0 flex-1 -ms-px rounded-r-lg border bg-background px-3 text-[13px] outline-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" />
  </div>
  <div className="ml-auto flex shrink-0 items-center gap-2">
   <Button type="button" className="h-9 !bg-[#0666ff] px-3 text-[13px] !text-white hover:!bg-[#0055dc]" onClick={()=>{const previous=activeFinance;setActiveFinance('presupuestos');if(onNewQuote?.()===false)setActiveFinance(previous)}}><PlusIcon className="size-4" aria-hidden="true"/>Nuevo presupuesto</Button>
   <Button type="button" variant="outline" size="icon" className="size-9" aria-label="Compartir Finanzas" title="Compartir" onClick={onShare}><Share2Icon className="size-4" aria-hidden="true"/></Button>
  </div>
 </div>;
}
