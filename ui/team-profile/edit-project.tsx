import {ProjectAddressFields} from './project-address-fields';
import {useRef,useState} from 'react';
import {XIcon} from 'lucide-react';
import {Button} from './vendor/reui/button';
import {Field,FieldGroup,FieldLabel} from './vendor/reui/field';
import {Input} from './vendor/reui/input';
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from './vendor/reui/sheet';

export function EditProject({draft,code,clients,onChange,onSave,onCancel,container}:any){
 const [values,setValues]=useState(draft),name=useRef<HTMLInputElement>(null),[addressBusy,setAddressBusy]=useState(false),[addressRevision,setAddressRevision]=useState(0);
 function change(key:string,value:string){if(['street','number','city','province','cp','country'].includes(key)){setAddressRevision(n=>n+1);setAddressBusy(false);}setValues((old:any)=>({...old,[key]:value}));onChange(key,value);}
 function selectAddress(address:any){for(const key of ['street','number','city','province','cp','country','placeId'])onChange(key,address[key]||'');setValues((old:any)=>({...old,...address}));}
 return <Sheet open onOpenChange={(open,details)=>{if(!open)details.cancel();}}>
  <SheetContent container={container} className="new-project-sheet edit-project-sheet" showCloseButton={false} initialFocus={name} finalFocus={false}>
   <form className="new-project-form" onSubmit={e=>{e.preventDefault();if(!addressBusy)onSave();}}>
    <SheetHeader className="edit-project-sheet-header"><SheetTitle className="sr-only">Editar proyecto</SheetTitle><SheetDescription className="sr-only">Datos del proyecto.</SheetDescription><SheetClose render={<Button type="button" variant="ghost" size="icon-sm" className="new-project-sheet-close" aria-label="Cerrar edición"/>} onClick={onCancel}><XIcon aria-hidden="true"/></SheetClose></SheetHeader>
    <div className="new-project-sheet-body"><FieldGroup>
     <Field><FieldLabel htmlFor="ep-code">PR</FieldLabel><Input id="ep-code" value={code} readOnly aria-readonly="true"/></Field>
     <Field><FieldLabel htmlFor="ep-name">Nombre del proyecto</FieldLabel><Input ref={name} id="ep-name" value={values.name} maxLength={200} required autoComplete="off" onChange={e=>change('name',e.target.value)}/></Field>
     <Field><FieldLabel htmlFor="ep-status">Estado</FieldLabel><select id="ep-status" className="cn-input" value={values.status} onChange={e=>change('status',e.target.value)}>{['En progreso','En revisión','Entregado','Archivado'].map(s=><option key={s} value={s}>{s}</option>)}</select></Field>
     <Field><FieldLabel htmlFor="ep-client">Cliente</FieldLabel><Input id="ep-client" value={values.client} list="ep-clients" autoComplete="off" placeholder="Buscar cliente" onChange={e=>change('client',e.target.value)}/><datalist id="ep-clients">{clients.map((c:string)=><option key={c} value={c}/>)}</datalist></Field>
     <ProjectAddressFields prefix="ep" values={values} onChange={change} onSelect={selectAddress} onBusy={setAddressBusy} cancelRevision={addressRevision}/>
     <Field><FieldLabel htmlFor="ep-tags">Etiquetas</FieldLabel><Input id="ep-tags" value={values.tags} autoComplete="off" placeholder="Reforma, vivienda…" onChange={e=>change('tags',e.target.value)}/></Field>
    </FieldGroup></div>
    <SheetFooter><Button type="submit" disabled={addressBusy} className="new-project-create">Guardar cambios</Button><SheetClose render={<Button type="button" variant="outline"/>} onClick={onCancel}>Cancelar</SheetClose></SheetFooter>
   </form>
  </SheetContent>
 </Sheet>;
}
