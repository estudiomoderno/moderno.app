/* Google Places adapter. No external requests until configured and used. */
(function(root){
 'use strict';
 let config,library,ready=false,persistenceReady=false;
 function bounded(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('El buscador no responde')),12000);})]).finally(()=>clearTimeout(timer));}
 async function available(){
  if(!config)config=fetch('/places-config.json',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():null).then(v=>v&&/^AIza[\w-]{30,60}$/.test(v.browserKey||'')?v:null).catch(()=>null);
  return !!(await config);
 }
 async function load(){
  if(!await available())throw Error('Direcciones manuales');
  const settings=await config;
  persistenceReady=settings.locationPersistenceReady===true;
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
  return {street:part('route')||part('premise'),number:part('street_number'),city:part('locality')||part('postal_town')||part('administrative_area_level_3'),province:part('administrative_area_level_2')||part('administrative_area_level_1'),cp:[part('postal_code'),part('postal_code_suffix')].filter(Boolean).join('-'),country:part('country'),placeId:String(place.id||'')};
 }
 // Map lookups are read-only and transient; no coordinate cache is persisted.
 async function locate(textQuery){
  if(!String(textQuery||'').trim())return null;const {Place}=await load();
  const result=await bounded(Place.searchByText({textQuery:String(textQuery).trim(),fields:['id','location'],language:'es',maxResultCount:1}));
  const loc=result.places?.[0]?.location;if(!loc)return null;
  const lat=loc.lat(),lng=loc.lng();return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
 }
 async function createMap(host,onInteract=()=>{}){
  await load();const api=await bounded(root.google.maps.importLibrary('maps'));
  if(!host?.isConnected)throw Error('Mapa cerrado');
  const map=new api.Map(host,{center:{lat:40.2,lng:-3.7},zoom:6,minZoom:2,maxZoom:20,disableDefaultUI:true,clickableIcons:false,gestureHandling:'greedy',scrollwheel:true,keyboardShortcuts:true,styles:[{featureType:'all',stylers:[{saturation:-100},{lightness:12}]},{featureType:'poi',stylers:[{visibility:'off'}]},{featureType:'transit',stylers:[{visibility:'off'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#c5cbcb'}]},{featureType:'landscape',elementType:'geometry',stylers:[{color:'#e9ece9'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]}]});
  let rows=[],select=()=>{},layer,disposed=false;
  class Pins extends api.OverlayView{
   onAdd(){this.div=document.createElement('div');this.getPanes().overlayMouseTarget.append(this.div);api.OverlayView.preventMapHitsAndGesturesFrom(this.div);}
   draw(){if(!this.div||disposed)return;const projection=this.getProjection(),groups=new Map();
    for(const row of rows){const pos=projection.fromLatLngToDivPixel(new root.google.maps.LatLng(row.point));if(!pos)continue;const key=Math.floor(pos.x/82)+':'+Math.floor(pos.y/48);let group=groups.get(key);if(!group){group={x:pos.x,y:pos.y,rows:[]};groups.set(key,group);}group.rows.push(row);}
    this.div.replaceChildren();for(const group of groups.values()){
     const button=document.createElement('button');button.type='button';button.className='hm-pin'+(group.rows.some(r=>r.attention)?' hm-pin-attention':'');button.style.left=group.x+'px';button.style.top=group.y+'px';button.textContent=group.rows.length>1?group.rows.length+' proyectos':group.rows[0].label;button.setAttribute('aria-label',group.rows.length>1?'Ver '+group.rows.length+' proyectos en esta zona':'Ver proyecto '+group.rows[0].label);button.onclick=()=>select(group.rows.map(r=>r.id));this.div.append(button);
    }
   }
   onRemove(){this.div?.remove();this.div=null;}
  }
  layer=new Pins();layer.setMap(map);
  const drag=map.addListener('dragstart',onInteract),wheel=()=>onInteract();host.addEventListener('wheel',wheel,{passive:true});
  return {
   markers(items,callback){rows=items;select=callback;layer.draw();},
   fit(points){if(!points.length||disposed)return;const bounds=new root.google.maps.LatLngBounds();points.forEach(p=>bounds.extend(p));if(points.length===1||points.every(p=>p.lat===points[0].lat&&p.lng===points[0].lng)){map.setCenter(points[0]);map.setZoom(15);}else{const left=host.clientWidth>760?335:35;map.fitBounds(bounds,{top:55,right:55,bottom:65,left});}},
   focus(point){map.panTo(point);if((map.getZoom()||0)<15)map.setZoom(15);},
   zoom(step){map.setZoom(Math.max(2,Math.min(20,(map.getZoom()||6)+step)));},
   resize(){root.google.maps.event.trigger(map,'resize');},
   destroy(){if(disposed)return;disposed=true;drag.remove();host.removeEventListener('wheel',wheel);layer.setMap(null);root.google.maps.event.clearInstanceListeners(map);map.unbindAll();host.replaceChildren();rows=[];}
  };
 }
 root.ModernoPlaces={available,session,locate,createMap,enabled:()=>ready,canPersistLocation:()=>ready&&persistenceReady,address};
 if(typeof module!=='undefined')module.exports={address};
})(typeof globalThis!=='undefined'?globalThis:this);
