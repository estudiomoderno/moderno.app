import * as React from 'react';
import {Breadcrumb,BreadcrumbItem,BreadcrumbLink,BreadcrumbList,BreadcrumbPage,BreadcrumbSeparator} from './vendor/reui/breadcrumb';
import {Card,CardContent} from './vendor/reui/card';
import {Button} from './vendor/reui/button';
import {HouseIcon} from 'lucide-react';

type Crumb={label:string;view?:string};
export function PageBreadcrumbs({items,onNavigate,finance,current}:{items:Crumb[];onNavigate:(view:string)=>void;finance?:Crumb[];current?:string}){
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
 return <div className="finance-header">
  <div className="finance-route">{route}</div>
  <nav aria-label="Secciones de Finanzas" className="finance-sections">
   {finance.map(item=><Button key={item.view} variant={current===item.view?'secondary':'ghost'} className="h-8 px-3 text-xs font-medium leading-4" data-finance-view={item.view} aria-current={current===item.view?'page':undefined} onClick={()=>onNavigate(item.view!)}>{item.label}</Button>)}
  </nav>
 </div>;
}
