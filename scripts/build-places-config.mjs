// The key is public in the browser; keep it out of Git and restrict it by origin/API.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function settings(env){
 const browserKey=(env.GOOGLE_MAPS_BROWSER_KEY||'').trim();
 const locationPersistenceReady=env.PLACES_LOCATION_READY==='true';
 if(browserKey&&!/^AIza[\w-]{30,60}$/.test(browserKey))throw Error('Formato inesperado de clave pública de Maps');
 return {browserKey,locationPersistenceReady};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const value=settings(process.env);
 await writeFile(new URL('../app/places-config.json',import.meta.url),JSON.stringify(value)+'\n');
 console.log(value.browserKey?'Buscador de direcciones configurado':'Direcciones manuales: falta clave de Google');
}
