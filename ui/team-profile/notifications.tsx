import {Badge} from './vendor/reui/badge';
import {Button} from './vendor/reui/button';
import {BellIcon} from 'lucide-react';

/* Owner's original notification pattern; only live data, Spanish label and
   the existing action replace the demonstration content. */
export function Notifications({count,onOpen}: {count:number;onOpen:()=>void}){
 const label=count?'Notificaciones ('+count+')':'Notificaciones';
 return <Button size="icon" variant="outline" className="relative ha-notifications" aria-label={label} title={label} onClick={onOpen}>
  <BellIcon aria-hidden="true"/>
  {count>0&&<Badge variant="destructive" size="xs" className="absolute -top-1 -right-1 rounded-full px-1" aria-hidden="true">
   {count>99?'99+':count}
  </Badge>}
 </Button>;
}
