import * as React from 'react';
import {Avatar,AvatarFallback,AvatarGroup,AvatarImage} from './vendor/reui/avatar';
import {Button} from './vendor/reui/button';
import {ButtonGroup,ButtonGroupText} from './vendor/reui/button-group';
import {DropdownMenu,DropdownMenuContent,DropdownMenuGroup,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from './vendor/reui/dropdown-menu';
import {MoreHorizontalIcon,SettingsIcon,UserIcon,UsersIcon} from 'lucide-react';

/* Owner's c-button-group-5: original components/classes. Only the requested
   actions, translated labels and live data replace the demonstration content. */
export function Pattern({members,status,items,onWorkspace,onOpenChange,container}:any){
 const online=status==='online';
 return <ButtonGroup aria-label="Equipo y ajustes" className="ha-team-group" data-online={String(online)}>
  <Button variant="outline"><UsersIcon aria-hidden="true"/><span>Equipo</span></Button>
  <ButtonGroupText className="gap-0 bg-transparent">
   <AvatarGroup className="ha-members">
    {members.slice(0,4).map((member:any)=><Avatar key={member.user||member.name} className="size-5 ha-avatar" title={member.name+(online?' · conectado':'')}>
     <AvatarImage src={member.avatar||undefined} alt={member.name} referrerPolicy="no-referrer"/>
     <AvatarFallback>{member.fallback}</AvatarFallback>
    </Avatar>)}
   </AvatarGroup>
   <div className="ml-2 flex items-center gap-1">
    <span className={'size-1.5 rounded-full '+(online?'bg-green-500':'bg-muted-foreground')} aria-hidden="true"/>
    <span className="ha-status text-muted-foreground text-xs font-medium" role="status" aria-live="polite">
     {online?members.length+' en línea':status==='connecting'?'Conectando…':'Sin conexión'}
    </span>
   </div>
  </ButtonGroupText>
  <DropdownMenu onOpenChange={onOpenChange}>
   <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Perfil y ajustes" data-profile-trigger="true"><MoreHorizontalIcon aria-hidden="true"/></Button>}/>
   <DropdownMenuContent align="end" className="w-48" container={container}>
    <DropdownMenuGroup>
     <DropdownMenuLabel>Ajustes</DropdownMenuLabel>
     <DropdownMenuSeparator/>
     {items.map((item:any,index:number)=><DropdownMenuItem key={item.label} onClick={item.run}>
      {index===0?<UserIcon aria-hidden="true"/>:<SettingsIcon aria-hidden="true"/>}<span>{item.label}</span>
     </DropdownMenuItem>)}
    </DropdownMenuGroup>
    {onWorkspace&&<><DropdownMenuSeparator/><DropdownMenuItem onClick={onWorkspace}><UsersIcon aria-hidden="true"/><span>Cambiar estudio</span></DropdownMenuItem></>}
   </DropdownMenuContent>
  </DropdownMenu>
 </ButtonGroup>;
}
