import {useEffect,useRef,useState} from 'react';
import {Field,FieldLabel} from './vendor/reui/field';
import {Input} from './vendor/reui/input';

// Suggestions remain in this dialog only; no localStorage or analytics payloads.
export function AddressSearch({onSelect,onBusy,cancelRevision}:any){
 const [available,setAvailable]=useState(false),[query,setQuery]=useState(''),[items,setItems]=useState<any[]>([]),[message,setMessage]=useState(''),[active,setActive]=useState(-1);
 const session=useRef<any>(null),epoch=useRef(0),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;const api=(window as any).ModernoPlaces;api?.available().then((ok:boolean)=>{if(mounted.current)setAvailable(ok);});return()=>{mounted.current=false;epoch.current++;session.current?.then((s:any)=>s.close()).catch(()=>{});};},[]);
 useEffect(()=>{epoch.current++;setItems([]);setMessage('');},[cancelRevision]);
 useEffect(()=>{
  if(!available||query.trim().length<3)return;
  const revision=++epoch.current;let cancelled=false;
  const timer=setTimeout(async()=>{
   if(cancelled||!mounted.current||revision!==epoch.current)return;
   setMessage('Buscando direcciones…');
   try{session.current ||= (window as any).ModernoPlaces.session();const api=await session.current;
    if(cancelled||revision!==epoch.current)return;
    const results=await api.search(query);if(cancelled||revision!==epoch.current)return;
    setItems(results);setActive(-1);setMessage(results.length?'':'Sin resultados. Puedes escribir la dirección abajo.');
   }catch{if(!cancelled&&revision===epoch.current){session.current=null;setItems([]);setMessage('Buscador no disponible. Puedes escribir la dirección abajo.');}}
  },350);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[query,available]);
 async function select(item:any){
  const revision=++epoch.current;setItems([]);setMessage('Completando dirección…');onBusy(true);
  try{const api=await session.current;const address=await api.select(item);if(!mounted.current||revision!==epoch.current)return;
   if(!address?.placeId||!address.street)throw Error('Dirección incompleta');
   onSelect(address);setMessage('Dirección seleccionada. Revisa el número y los demás datos.');
  }catch{if(mounted.current&&revision===epoch.current)setMessage('No se pudo completar. Puedes escribir la dirección abajo.');}
  finally{if(mounted.current&&revision===epoch.current)onBusy(false);}
 }
 if(!available)return null;
 return <Field className="new-project-address-search"><FieldLabel htmlFor="np-address-search">Buscar dirección</FieldLabel><Input id="np-address-search" role="combobox" aria-autocomplete="list" aria-expanded={items.length>0} aria-controls="np-address-results" aria-activedescendant={active>=0?`np-address-option-${active}`:undefined} autoComplete="off" placeholder="Calle, número y ciudad" value={query} onChange={e=>{epoch.current++;onBusy(false);setQuery(e.target.value);setItems([]);setActive(-1);setMessage('');}} onKeyDown={e=>{
  if(e.key==='ArrowDown'&&items.length){e.preventDefault();setActive(i=>(i+1)%items.length);}
  if(e.key==='ArrowUp'&&items.length){e.preventDefault();setActive(i=>(i-1+items.length)%items.length);}
  if(e.key==='Enter'){e.preventDefault();if(items[active])select(items[active]);}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();epoch.current++;setItems([]);setMessage('');onBusy(false);}
 }}/>
 <div id="np-address-results" role="listbox" aria-label="Direcciones sugeridas">{items.map((item,i)=><button type="button" role="option" id={`np-address-option-${i}`} aria-selected={active===i} key={i} onMouseDown={e=>e.preventDefault()} onClick={()=>select(item)}>{item.label}</button>)}</div>
 <span className="new-project-search-status" role="status">{message}</span>{items.length>0&&<span className="new-project-google-attribution" translate="no">Google Maps</span>}
 </Field>;
}
