"use client"

import {useRef,useState} from 'react';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogMedia,AlertDialogTitle} from './vendor/reui/alert-dialog';
import {Trash2Icon} from 'lucide-react';

/* Owner's exact AlertDialog pattern. The existing Mail callbacks own deletion. */
export function MailDelete({count,folderLabel,onCancel,onConfirm,container}:any){
 const [open,setOpen]=useState(true),finished=useRef(false),cancel=useRef<HTMLButtonElement>(null),plural=Number(count)>1;
 function finish(action:()=>void){if(finished.current)return;finished.current=true;setOpen(false);queueMicrotask(action);}
 return <AlertDialog open={open} onOpenChange={value=>{setOpen(value);if(!value)finish(onCancel);}}>
  <AlertDialogContent size="sm" container={container} initialFocus={cancel} finalFocus={false}>
   <AlertDialogHeader>
    <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"><Trash2Icon aria-hidden="true"/></AlertDialogMedia>
    <AlertDialogTitle>{plural?`¿Mover ${count} correos a la papelera?`:'¿Mover este correo a la papelera?'}</AlertDialogTitle>
    <AlertDialogDescription>{plural?`Estos ${count} correos dejarán de aparecer en ${folderLabel} y se moverán a Papelera.`:`Este correo dejará de aparecer en ${folderLabel} y se moverá a Papelera.`}</AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
    <AlertDialogCancel ref={cancel} variant="ghost" onClick={()=>finish(onCancel)}>Cancelar</AlertDialogCancel>
    <AlertDialogAction variant="destructive" onClick={()=>finish(onConfirm)}>Mover a la papelera</AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
 </AlertDialog>;
}
