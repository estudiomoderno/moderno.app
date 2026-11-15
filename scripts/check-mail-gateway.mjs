import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
const constant=name=>new RegExp(`const ${name} = "([^"]+)";`).exec(html)?.[1]||'';
const endpoint=constant('MAIL_FUNCTION_URL');
const anonKey=constant('MAIL_FUNCTION_ANON_KEY');
if(!/^https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/mail-connect$/.test(endpoint))throw Error('Endpoint de correo no válido');
if(!anonKey.startsWith('eyJ'))throw Error('Clave pública heredada de correo no disponible');

const response=await fetch(endpoint,{
 method:'POST',
 headers:{Origin:'https://app.moderno.app','Content-Type':'application/json',apikey:anonKey,'X-Moderno-Session':'invalid-deployment-probe'},
 body:JSON.stringify({action:'status',studyId:'00000000-0000-0000-0000-000000000000'}),
 signal:AbortSignal.timeout(20000)
});
const type=response.headers.get('content-type')||'';
const text=await response.text();
let body;try{body=JSON.parse(text)}catch{}
if(response.status!==401||!type.includes('application/json')||body?.ok!==false||response.headers.get('access-control-allow-origin')!=='https://app.moderno.app'){
 throw Error(`La pasarela de correo no alcanzó la función: HTTP ${response.status}, ${type||'sin content-type'}`);
}
console.log('Pasarela de correo verificada: la petición alcanza la función y una sesión inválida se rechaza en JSON.');
