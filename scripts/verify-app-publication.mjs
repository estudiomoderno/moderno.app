import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const files=['index.html','project-ui.js','project-documents.js','plan-annotations.js','plan-editor.js','plan-editor.css','client-portal-site.js','client-portal-site.css','brand/project-ui.css','desktop-shell.js','brand/desktop-shell.css'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyPublication({fetchResource=fetch,readResource=name=>readFile(new URL('../app/'+name,import.meta.url)),revision='check'}={}){
  // Fixed public origin and resources, no authentication or arbitrary target URLs.
  for(const name of files){
    const expected=await readResource(name);
    const url=new URL('/'+(name==='index.html'?'':name),'https://app.moderno.app');url.searchParams.set('publication',revision);
    const response=await fetchResource(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw Error(name+': HTTP '+response.status);
    const actual=new Uint8Array(await response.arrayBuffer());
    if(hash(actual)!==hash(expected))throw Error(name+': el recurso público no coincide con el commit desplegado');
    console.log(name+': contenido público verificado');
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let failure;
  for(let attempt=1;attempt<=3;attempt++){
    try{await verifyPublication({revision:process.env.GITHUB_SHA||'check'});failure=null;break;}
    catch(error){failure=error;console.error('Comprobación '+attempt+': '+error.message);if(attempt<3)await new Promise(r=>setTimeout(r,10000));}
  }
  if(failure)process.exitCode=1;
}
