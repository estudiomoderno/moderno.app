/* Google Places adapter. No external requests until configured and used. */
(function(root){
 'use strict';
 let config,library,ready=false;
 function bounded(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('El buscador no responde')),12000);})]).finally(()=>clearTimeout(timer));}
 async function available(){
  if(!config)config=fetch('/places-config.json',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():null).then(v=>v&&/^AIza[\w-]{30,60}$/.test(v.browserKey||'')&&v.locationPersistenceReady===true?v:null).catch(()=>null);
  return !!(await config);
 }
 async function load(){
  if(!await available())throw Error('Direcciones manuales');
  const settings=await config;
  if(!library)library=(async()=>{
   if(!root.google?.maps?.importLibrary)await new Promise((resolve,reject)=>{
    const script=document.createElement('script');let timer;
    const finish=error=>{clearTimeout(timer);delete root.__modernoPlacesReady;script.onerror=null;if(error){script.remove();reject(error);}else resolve();};
    root.__modernoPlacesReady=()=>finish();
    const url=new URL('https://maps.googleapis.com/maps/api/js');url.search=new URLSearchParams({key:settings.browserKey,v:'weekly',loading:'async',callback:'__modernoPlacesReady',language:'es'}).toString();
    script.src=url.href;script.async=true;script.onerror=()=>finish(Error('No se pudo cargar el buscador'));timer=setTimeout(()=>finish(Error('El buscador no responde')),12000);document.head.append(script);
   });
   const result=await bounded(root.google.maps.importLibrary('places'));ready=true;return result;
  })().catch(error=>{library=null;throw error;});
  return library;
 }
 async function session(){
  const api=await load();let token=new api.AutocompleteSessionToken(),revision=0,closed=false;
  return {
   async search(input){const seq=++revision;if(closed||input.trim().length<3)return [];
    const result=await bounded(api.AutocompleteSuggestion.fetchAutocompleteSuggestions({input:input.trim(),sessionToken:token,language:'es'}));
    if(closed||seq!==revision)return [];
    return result.suggestions.filter(s=>s.placePrediction).map(s=>({label:s.placePrediction.text.toString(),prediction:s.placePrediction}));
   },
   async select(item){const seq=++revision;const place=item.prediction.toPlace();
    try{await bounded(place.fetchFields({fields:['id','addressComponents']}));if(closed||seq!==revision)return null;return address(place);}
    finally{if(!closed)token=new api.AutocompleteSessionToken();}
   },
   invalidate(){revision++;},close(){closed=true;revision++;token=null;}
  };
 }
 function address(place){
  const components=place.addressComponents||[];
  const part=(type,short=false)=>{const c=components.find(c=>(c.types||[]).includes(type));return String(c?.[short?'shortText':'longText']||'');};
  // Stable Place IDs are retained; coordinates will be resolved when rendering a
 // future map. Do not persist a permanent cache of restricted Google content.
  return {street:part('route')||part('premise'),number:part('street_number'),city:part('locality')||part('postal_town')||part('administrative_area_level_3'),province:part('administrative_area_level_2')||part('administrative_area_level_1'),country:part('country'),placeId:String(place.id||'')};
 }
 root.ModernoPlaces={available,session,enabled:()=>ready,address};
 if(typeof module!=='undefined')module.exports={address};
})(typeof globalThis!=='undefined'?globalThis:this);
