import {readFile,readdir,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

function safePath(value){
  if(typeof value!=='string'||!value||value.includes('\\')||value.includes(':')||value.includes('\0')||value.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)))throw Error('Ruta de manifiesto no segura');
  return value;
}
async function contained(root,path){
  const base=await realpath(root),file=await realpath(resolve(root,path));
  const rel=relative(base,file);
  if(!rel||isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))throw Error('Archivo fuera de la copia');
  return file;
}
async function countFiles(root){
  let count=0;
  for(const e of await readdir(root,{withFileTypes:true})){
    if(e.isSymbolicLink())throw Error('No se admiten enlaces en la recuperacion');
    if(e.isDirectory())count+=await countFiles(resolve(root,e.name));
    else if(e.isFile())count++;
    else throw Error('Entrada no regular en la recuperacion');
  }
  return count;
}
export async function verifyRecoveryFiles(backupRoot,recoveryRoot){
  const manifest=JSON.parse(await readFile(resolve(backupRoot,'manifest.json'),'utf8'));
  const complete=JSON.parse(await readFile(resolve(backupRoot,'COMPLETE.json'),'utf8'));
  if(manifest.version!==1||complete.version!==1||!Array.isArray(manifest.objects)||!manifest.objects.length||complete.count!==manifest.objects.length)throw Error('Copia sin inventario completo coherente');
  const seen=new Set();let bytes=0;
  for(const entry of manifest.objects){
    const path=safePath(entry.Path),key=path.toLowerCase();
    if(seen.has(key)||!Number.isSafeInteger(entry.Size)||entry.Size<0)throw Error('Inventario duplicado o tamano invalido');
    seen.add(key);
    const a=await readFile(await contained(resolve(backupRoot,'objects'),path));
    const b=await readFile(await contained(resolve(recoveryRoot,'objects'),path));
    if(a.length!==entry.Size||b.length!==entry.Size||!a.equals(b))throw Error('Archivo ausente, incompleto o con contenido distinto');
    bytes+=a.length;
  }
  if(await countFiles(resolve(recoveryRoot,'objects'))!==seen.size)throw Error('Hay archivos adicionales en la recuperacion');
  return {count:seen.size,bytes,byteComparison:true,manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex')};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==4){console.error('Uso: node scripts/verify-recovery-files.mjs CARPETA_COPIA CARPETA_RECUPERADA');process.exitCode=1;}
  else try{console.log(JSON.stringify(await verifyRecoveryFiles(process.argv[2],process.argv[3])));}catch{console.error('La recuperacion no supera la comparacion completa. No usar como copia validada.');process.exitCode=1;}
}
