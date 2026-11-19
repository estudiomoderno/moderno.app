import * as React from 'react';
import {
 Breadcrumb,
 BreadcrumbItem,
 BreadcrumbList,
 BreadcrumbPage,
} from './vendor/reui/breadcrumb';
import {Button} from './vendor/reui/button';
import {
 CalculatorIcon,
 CalendarDaysIcon,
 ChartNoAxesCombinedIcon,
 CirclePlayIcon,
 ContactRoundIcon,
 FileTextIcon,
 FolderKanbanIcon,
 LandmarkIcon,
 LayoutTemplateIcon,
 LayoutDashboardIcon,
 LayoutGridIcon,
 LifeBuoyIcon,
 ListTodoIcon,
 MailIcon,
 MessageSquareIcon,
 PackageIcon,
 PlugIcon,
 PlusIcon,
 PuzzleIcon,
 ReceiptTextIcon,
 SettingsIcon,
 Share2Icon,
 ShieldCheckIcon,
 WrenchIcon,
 ZapIcon,
} from 'lucide-react';

type Crumb={label:string;view?:string};
type PageBreadcrumbProps={
 items:Crumb[];
 onNavigate:(view:string)=>boolean|void;
 /* Compatibility with the previous loader while open tabs renew their cache. */
 finance?:Crumb[];
 current?:string;
 search?:string;
 onSearch?:(value:string)=>void;
 onNewQuote?:()=>boolean|void;
 onShare?:()=>void;
};

export function PageBreadcrumbs({items,onNavigate,finance,current,search,onSearch,onNewQuote,onShare}:PageBreadcrumbProps){
 if(finance?.length)return <FinanceToolbar finance={finance} current={current} search={search} onNavigate={onNavigate} onSearch={onSearch} onCreate={onNewQuote} onShare={onShare} />;
 const item=items.at(-1)??{label:'Moderno.app'};
 const Icon=routeIcons[item.view as keyof typeof routeIcons]??LayoutGridIcon;
 return <Breadcrumb>
  <BreadcrumbList>
   <BreadcrumbItem>
    <BreadcrumbPage className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
     <Icon className="size-4 shrink-0" aria-hidden="true" />
     <span className="truncate">{item.label}</span>
    </BreadcrumbPage>
   </BreadcrumbItem>
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
 actionLabel?:string;
 onShare?:()=>void;
};

const financeIcons={informes:LayoutDashboardIcon,facturas:ReceiptTextIcon,presupuestos:FileTextIcon,contabilidad:LandmarkIcon,prevision:ChartNoAxesCombinedIcon};
const routeIcons={
 home:LayoutDashboardIcon,proyectos:FolderKanbanIcon,proyecto:FolderKanbanIcon,estancia:FolderKanbanIcon,
 informes:LayoutDashboardIcon,facturas:ReceiptTextIcon,presupuestos:FileTextIcon,contabilidad:LandmarkIcon,prevision:ChartNoAxesCombinedIcon,
 workspace:ListTodoIcon,agenda:ContactRoundIcon,mail:MailIcon,calendario:CalendarDaysIcon,conversaciones:MessageSquareIcon,
 biblioteca:PackageIcon,catalogo:WrenchIcon,automatizaciones:ZapIcon,utilidades:CalculatorIcon,integraciones:PlugIcon,plugins:PuzzleIcon,
 plantillas:LayoutTemplateIcon,tutoriales:CirclePlayIcon,soporte:LifeBuoyIcon,ajustes:SettingsIcon,admin:ShieldCheckIcon,
};

export function FinanceToolbar({finance,current,search='',actionLabel='',onNavigate,onSearch,onCreate,onShare}:FinanceToolbarProps){
 const searchRef=React.useRef<HTMLInputElement>(null);
 const [activeFinance,setActiveFinance]=React.useState(current);
 const [financeSearch,setFinanceSearch]=React.useState(search);
 React.useEffect(()=>setActiveFinance(current),[current]);
 React.useEffect(()=>setFinanceSearch(search),[search]);
 return <div className="flex h-[34px] w-full min-w-0 items-center gap-3 font-sans">
  <nav aria-label="Secciones de Finanzas" className="finance-sections flex h-[34px] shrink-0 overflow-hidden rounded-lg border bg-background shadow-xs">
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
   {actionLabel&&<Button type="button" className="h-[34px] !bg-[#0666ff] px-3 text-[13px] !text-white hover:!bg-[#0055dc]" onClick={onCreate}><PlusIcon className="size-4" aria-hidden="true" />{actionLabel}</Button>}
   <Button type="button" variant="outline" size="icon" className="size-[34px]" aria-label="Compartir Finanzas" title="Compartir" onClick={onShare}><Share2Icon className="size-4" aria-hidden="true" /></Button>
  </div>
 </div>;
}
