import {useRef,useState} from 'react';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogMedia,AlertDialogTitle} from './vendor/reui/alert-dialog';
import {Trash2Icon} from 'lucide-react';

/* Owner's AlertDialog pattern. The existing confirmation callbacks own deletion. */
export function ShoppingDelete({name,onCancel,onConfirm,container}:any){
 const [open,setOpen]=useState(true),finished=useRef(false),cancel=useRef<HTMLButtonElement>(null);
 function finish(action:()=>void){if(finished.current)return;finished.current=true;setOpen(false);queueMicrotask(action);}
 return <AlertDialog open={open} onOpenChange={value=>{setOpen(value);if(!value)finish(onCancel);}}>
  <AlertDialogContent size="sm" container={container} initialFocus={cancel} finalFocus={false}>
   <AlertDialogHeader>
    <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"><Trash2Icon aria-hidden="true"/></AlertDialogMedia>
    <AlertDialogTitle>¿Eliminar «{name}»?</AlertDialogTitle>
    <AlertDialogDescription>Se eliminarán esta lista de compra y todos sus productos. Esta acción no se puede deshacer.</AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
    <AlertDialogCancel ref={cancel} variant="ghost" onClick={()=>finish(onCancel)}>Cancelar</AlertDialogCancel>
    <AlertDialogAction variant="destructive" onClick={()=>finish(onConfirm)}>Eliminar</AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
 </AlertDialog>;
}
