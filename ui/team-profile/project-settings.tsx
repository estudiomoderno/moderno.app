import {Button} from './vendor/reui/button';
import {DropdownMenu,DropdownMenuContent,DropdownMenuGroup,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from './vendor/reui/dropdown-menu';
import {CopyIcon,EllipsisVerticalIcon,PaletteIcon,PencilIcon,Share2Icon,TrashIcon} from 'lucide-react';

/* Owner's dropdown pattern, using the project's existing actions in Spanish. */
export function ProjectSettings({items,container}:any){
 const icons=[PencilIcon,PaletteIcon,Share2Icon,CopyIcon];
 const regular=items.filter((item:any)=>!item.destructive),deletion=items.find((item:any)=>item.destructive);
 return <div className="flex items-center justify-center">
  <DropdownMenu>
   <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Ajustes del proyecto" title="Ajustes del proyecto" data-project-settings-trigger="true"/>}>
    <EllipsisVerticalIcon aria-hidden="true"/>
   </DropdownMenuTrigger>
   <DropdownMenuContent className="w-48" align="end" container={container}>
    <DropdownMenuGroup>
     <DropdownMenuLabel>Acciones</DropdownMenuLabel>
     {regular.map((item:any,index:number)=>{const Icon=icons[index]||PencilIcon;return <DropdownMenuItem key={item.label} onClick={item.run}><Icon aria-hidden="true"/>{item.label}</DropdownMenuItem>;})}
    </DropdownMenuGroup>
    {deletion&&<><DropdownMenuSeparator/><DropdownMenuItem variant="destructive" onClick={deletion.run}><TrashIcon aria-hidden="true"/>{deletion.label}</DropdownMenuItem></>}
   </DropdownMenuContent>
  </DropdownMenu>
 </div>;
}
