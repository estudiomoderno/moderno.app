import * as React from 'react';
import {Breadcrumb,BreadcrumbItem,BreadcrumbLink,BreadcrumbList,BreadcrumbPage,BreadcrumbSeparator} from './vendor/reui/breadcrumb';
import {Card,CardContent} from './vendor/reui/card';
import {HouseIcon} from 'lucide-react';

type Crumb={label:string;view?:string};
export function PageBreadcrumbs({items,onNavigate}:{items:Crumb[];onNavigate:(view:string)=>void}){
 return <Card className="p-2 route-card"><CardContent className="px-1 py-0">
  <Breadcrumb aria-label="Ruta de navegación"><BreadcrumbList className="gap-1.5 sm:gap-1.5">
   {items.map((item,index)=><React.Fragment key={index}>
    {index>0&&<BreadcrumbSeparator/>}
    <BreadcrumbItem>
     {item.view?<BreadcrumbLink render={<button type="button"/>} onClick={()=>onNavigate(item.view!)} className="flex items-center gap-1.5 cursor-pointer">
      {index===0&&<HouseIcon className="size-4" aria-hidden="true"/>}{item.label}
     </BreadcrumbLink>:index<items.length-1?<span>{item.label}</span>:<BreadcrumbPage className="font-semibold flex items-center gap-1.5">
      {index===0&&<HouseIcon className="size-4" aria-hidden="true"/>}{item.label}
     </BreadcrumbPage>}
    </BreadcrumbItem>
   </React.Fragment>)}
  </BreadcrumbList></Breadcrumb>
 </CardContent></Card>;
}
