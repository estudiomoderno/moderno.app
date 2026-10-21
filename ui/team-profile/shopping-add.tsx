import {Button} from './vendor/reui/button';
import {PlusIcon} from 'lucide-react';

export function ShoppingAdd({onAdd}:{onAdd:()=>void}){
 return <Button variant="outline" aria-label="Añadir producto a esta lista" onClick={onAdd}>
  <PlusIcon aria-hidden="true"/>
  Añadir producto
 </Button>;
}
