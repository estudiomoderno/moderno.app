import * as React from 'react';
import {
 Breadcrumb,
 BreadcrumbItem,
 BreadcrumbLink,
 BreadcrumbList,
 BreadcrumbPage,
 BreadcrumbSeparator,
} from './vendor/reui/breadcrumb';
import {Button} from './vendor/reui/button';
import {
 ChevronRightIcon,
 FileTextIcon,
 HouseIcon,
 LayoutDashboardIcon,
 LayoutGridIcon,
 PlusIcon,
 ReceiptTextIcon,
 SettingsIcon,
 Share2Icon,
} from 'lucide-react';

type Crumb={label:string;view?:string};
type PageBreadcrumbProps={items:Crumb[];onNavigate:(view:string)=>boolean|void};

export function PageBreadcrumbs({items,onNavigate}:PageBreadcrumbProps){
 const icons=[HouseIcon,LayoutGridIcon,SettingsIcon];
 return <Breadcrumb>
  <BreadcrumbList className="sm:gap-1">
   {items.map((item,index)=>{
    const Icon=icons[Math.min(index,icons.length-1)];
    const current=index===items.length-1;
    return <React.Fragment key={`${item.label}-${index}`}>
     {index>0&&<BreadcrumbSeparator><ChevronRightIcon /></BreadcrumbSeparator>}
     <BreadcrumbItem>
      {current?<BreadcrumbPage>
       <Button variant="secondary" size="sm"><Icon />{item.label}</Button>
      </BreadcrumbPage>:<BreadcrumbLink
       render={<Button variant="ghost" size="sm" />}
       href="#"
       onClick={event=>{event.preventDefault();if(item.view)onNavigate(item.view)}}
      ><Icon />{item.label}</BreadcrumbLink>}
     </BreadcrumbItem>
    </React.Fragment>;
   })}
  </BreadcrumbList>
 </Breadcrumb>;
}

type FinanceToolbarProps={
 finance:Crumb[];
 current?:string;
 search?:string;
 onNavigate:(view:string)=>boolean|void;
 onSearch?:(value:string)=>void;
 onCreate?:()=>boolean|void;
 onShare?:()=>void;
};

const financeIcons={informes:LayoutDashboardIcon,presupuestos:FileTextIcon,facturas:ReceiptTextIcon};

export function FinanceToolbar({finance,current,search='',onNavigate,onSearch,onCreate,onShare}:FinanceToolbarProps){
 const searchRef=React.useRef<HTMLInputElement>(null);
 const [activeFinance,setActiveFinance]=React.useState(current);
 const [financeSearch,setFinanceSearch]=React.useState(search);
 React.useEffect(()=>setActiveFinance(current),[current]);
 React.useEffect(()=>setFinanceSearch(search),[search]);
 const invoice=current==='facturas';
 return <div className="flex h-[34px] w-full min-w-0 items-center gap-3 font-sans">
  <nav aria-label="Secciones de Finanzas" className="flex h-[34px] shrink-0 overflow-hidden rounded-lg border bg-background shadow-xs">
   {finance.map(item=>{
    const Icon=financeIcons[item.view as keyof typeof financeIcons]??LayoutGridIcon;
    return <Button key={item.view} variant={activeFinance===item.view?'secondary':'ghost'} className="h-full rounded-none border-0 border-r px-3 text-[13px] font-medium leading-4 last:border-r-0" data-finance-view={item.view} aria-current={activeFinance===item.view?'page':undefined} onClick={()=>{const previous=activeFinance;setActiveFinance(item.view);if(onNavigate(item.view!)===false)setActiveFinance(previous)}}><Icon className="size-4" aria-hidden="true" />{item.label}</Button>;
   })}
  </nav>
  <div className="flex h-[34px] min-w-[220px] max-w-xl flex-1 items-stretch" role="search" aria-label="Buscar en Finanzas">
   <Button type="button" variant="outline" className="h-[34px] shrink-0 rounded-r-none px-3 text-[13px]" onClick={()=>searchRef.current?.focus()}>Buscar</Button>
   <input ref={searchRef} id="finance-search" type="search" autoComplete="off" value={financeSearch} onChange={event=>{setFinanceSearch(event.currentTarget.value);onSearch?.(event.currentTarget.value)}} placeholder="Presupuesto, factura o cliente" aria-label="Buscar en Finanzas" className="h-[34px] min-w-0 flex-1 -ms-px rounded-r-lg border bg-background px-3 text-[13px] outline-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" />
  </div>
  <div className="ml-auto flex shrink-0 items-center gap-2">
   <Button type="button" className="h-[34px] !bg-[#0666ff] px-3 text-[13px] !text-white hover:!bg-[#0055dc]" onClick={onCreate}><PlusIcon className="size-4" aria-hidden="true" />{invoice?'Nueva factura':'Nuevo presupuesto'}</Button>
   <Button type="button" variant="outline" size="icon" className="size-[34px]" aria-label="Compartir Finanzas" title="Compartir" onClick={onShare}><Share2Icon className="size-4" aria-hidden="true" /></Button>
  </div>
 </div>;
}
