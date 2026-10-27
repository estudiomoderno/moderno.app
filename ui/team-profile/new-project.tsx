import {AddressSearch} from './address-search';
import {useRef,useState} from 'react';
import {XIcon,PlusIcon} from 'lucide-react';
import {Button} from './vendor/reui/button';
import {Field,FieldGroup,FieldLabel} from './vendor/reui/field';
import {Input} from './vendor/reui/input';
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetFooter,SheetHeader,SheetTitle} from './vendor/reui/sheet';

export function NewProject({draft,brands,types,clients,templates,onChange,onCreate,onCancel,onNewClient,container}:any){
 const [values,setValues]=useState(draft),name=useRef<HTMLInputElement>(null),[addressBusy,setAddressBusy]=useState(false),[addressRevision,setAddressRevision]=useState(0);
 function change(key:string,value:string){if(['street','number','city','province','country'].includes(key)){setAddressRevision(n=>n+1);setAddressBusy(false);}setValues((old:any)=>({...old,[key]:value,...(['street','number','city','province','country'].includes(key)?{placeId:''}:{})}));onChange(key,value);}
 function selectAddress(address:any){for(const key of ['street','number','city','province','country','placeId'])onChange(key,address[key]);setValues((old:any)=>({...old,...address}));}
 const input=(key:string,label:string,auto='off',placeholder='')=><Field><FieldLabel htmlFor={'np-'+key}>{label}</FieldLabel><Input id={'np-'+key} name={key} value={values[key]} onChange={e=>change(key,e.target.value)} autoComplete={auto} placeholder={placeholder}/></Field>;
 return <Sheet open onOpenChange={(open,details)=>{if(!open)details.cancel();}}>
  <SheetContent container={container} className="new-project-sheet" showCloseButton={false} initialFocus={name} finalFocus={false}>
   <form className="new-project-form" onSubmit={event=>{event.preventDefault();if(!addressBusy)onCreate();}} autoComplete="on">
    <SheetHeader><SheetTitle>Nuevo proyecto</SheetTitle><SheetDescription>Datos del proyecto y ubicación.</SheetDescription><SheetClose render={<Button type="button" variant="ghost" size="icon-sm" className="new-project-sheet-close" aria-label="Cerrar"/>} onClick={onCancel}><XIcon aria-hidden="true"/></SheetClose></SheetHeader>
    <div className="new-project-sheet-body"><FieldGroup>
     {brands.length>1&&<Field><FieldLabel htmlFor="np-series">Serie</FieldLabel><select id="np-series" className="cn-input" value={values.brand} onChange={e=>change('brand',e.target.value)}>{brands.map((b:any)=><option key={b.key} value={b.key}>{b.name}</option>)}</select></Field>}
     <Field><FieldLabel htmlFor="np-code">PR</FieldLabel><Input id="np-code" value={brands.find((b:any)=>b.key===values.brand)?.code||''} readOnly aria-readonly="true"/></Field>
     <Field><FieldLabel htmlFor="np-name">Nombre del proyecto</FieldLabel><Input ref={name} id="np-name" name="name" value={values.name} onChange={e=>change('name',e.target.value)} required maxLength={200} placeholder="Ej: Reforma calle Maestra" autoComplete="off"/></Field>
     <Field><FieldLabel htmlFor="np-client">Cliente</FieldLabel><div className="new-project-client-row"><Input id="np-client" name="client" value={values.client} onChange={e=>change('client',e.target.value)} list="np-clients" autoComplete="off" placeholder="Buscar cliente"/><Button type="button" variant="outline" size="icon" aria-label="Crear cliente nuevo" onClick={onNewClient}><PlusIcon aria-hidden="true"/></Button></div><datalist id="np-clients">{clients.map((client:string)=><option key={client} value={client}/>)}</datalist></Field>
     <fieldset className="new-project-address"><legend>Dirección del proyecto</legend><FieldGroup>
      <AddressSearch cancelRevision={addressRevision} onSelect={selectAddress} onBusy={setAddressBusy}/>
      {input('street','Calle','section-project address-line1')}
      <div className="new-project-two-col">{input('number','Número')}{input('city','Ciudad','section-project address-level2')}</div>
      <div className="new-project-two-col">{input('province','Provincia','section-project address-level1')}{input('country','País','section-project country-name')}</div>
     </FieldGroup></fieldset>
     <Field><FieldLabel htmlFor="np-type">Tipo de proyecto</FieldLabel><select id="np-type" name="type" className="cn-input" value={values.type} onChange={e=>change('type',e.target.value)}><option value="">Seleccionar tipo</option>{types.map((type:string)=><option key={type} value={type}>{type}</option>)}</select></Field>
     <details className="new-project-options"><summary>Empezar desde</summary><FieldGroup><Field><FieldLabel htmlFor="np-from">Origen</FieldLabel><select id="np-from" className="cn-input" value={values.from} onChange={e=>change('from',e.target.value)}><option value="blank">En blanco</option><option value="tpl">Plantilla de proyecto</option></select></Field>{values.from==='tpl'&&<Field><FieldLabel htmlFor="np-template">Plantilla</FieldLabel><select id="np-template" className="cn-input" value={values.template} onChange={e=>change('template',e.target.value)}>{templates.length?templates.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>):<option value="">Sin plantillas disponibles</option>}</select></Field>}</FieldGroup></details>
    </FieldGroup></div>
    <SheetFooter><Button type="submit" disabled={addressBusy} className="new-project-create">Crear proyecto</Button><SheetClose render={<Button type="button" variant="outline"/>} onClick={onCancel}>Cancelar</SheetClose></SheetFooter>
   </form>
  </SheetContent>
 </Sheet>;
}
