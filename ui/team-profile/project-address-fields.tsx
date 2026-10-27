import {AddressSearch} from './address-search';
import {Field,FieldGroup,FieldLabel} from './vendor/reui/field';
import {Input} from './vendor/reui/input';

// One address form for both creation and editing. Direction 2 stays manual.
export function ProjectAddressFields({values,onChange,onSelect,onBusy,cancelRevision,prefix='np'}:any){
 const input=(key:string,label:string,auto='off',placeholder='')=><Field><FieldLabel htmlFor={prefix+'-'+key}>{label}</FieldLabel><Input id={prefix+'-'+key} name={key} value={values[key]||''} onChange={e=>onChange(key,e.target.value)} autoComplete={auto} placeholder={placeholder}/></Field>;
 return <fieldset className="new-project-address"><legend>Dirección del proyecto</legend><FieldGroup>
      <AddressSearch cancelRevision={cancelRevision} onSelect={onSelect} onBusy={onBusy}/>
      {input('street','Calle','section-project address-line1')}
      <div className="new-project-two-col">{input('number','Número')}{input('city','Ciudad','section-project address-level2')}</div>
      {input('address2','Dirección 2','off','Portal, piso, puerta…')}
      <div className="new-project-two-col">{input('province','Provincia','section-project address-level1')}{input('cp','Código postal','section-project postal-code')}</div>
      {input('country','País','section-project country-name')}
     </FieldGroup></fieldset>;
}
