import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../app/index.html',import.meta.url),'utf8');
const constant=name=>new RegExp(`const ${name} = "([^"]+)";`).exec(html)?.[1]||'';
const endpoint=constant('MAIL_FUNCTION_URL');
const anonKey=constant('MAIL_FUNCTION_ANON_KEY');
if(!/^https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/mail-connect$/.test(endpoint))throw Error('Endpoint de correo no válido');
if(!anonKey.startsWith('eyJ'))throw Error('Clave pública heredada de correo no disponible');

const response=await fetch(endpoint,{
 method:'POST',
 headers:{Origin:'https://app.moderno.app','Content-Type':'application/json',apikey:anonKey},
 body:JSON.stringify({action:'status',studyId:'00000000-0000-0000-0000-000000000000',authToken:`invalid.${'x'.repeat(1800)}.deployment-probe`}),
 signal:AbortSignal.timeout(20000)
});
const type=response.headers.get('content-type')||'';
const text=await response.text();
let body;try{body=JSON.parse(text)}catch{}
if(response.status!==401||!type.includes('application/json')||body?.ok!==false||response.headers.get('access-control-allow-origin')!=='https://app.moderno.app'){
 throw Error(`La pasarela de correo no alcanzó la función: HTTP ${response.status}, ${type||'sin content-type'}`);
}
console.log('Pasarela de correo verificada: la petición alcanza la función y una sesión inválida se rechaza en JSON.');

const callback=await fetch('https://auth.moderno.app/functions/v1/mail-connect?state=invalid',{redirect:'manual',signal:AbortSignal.timeout(20000)});
const location=callback.headers.get('location')||'';
if(callback.status!==303||!location.startsWith('https://app.moderno.app/')||!location.includes('mail_oauth=invalid_state')){
 throw Error(`El retorno personalizado de correo no está disponible: HTTP ${callback.status}`);
}
console.log('Retorno OAuth verificado en el dominio personalizado de Moderno.app.');
