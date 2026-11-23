import {createHash} from 'node:crypto';

export const PRODUCTION_PROJECT_REF='cgqtylvaapwbuwqvpjtb';
export const PRODUCTION_HOSTS=new Set(['auth.moderno.app','app.moderno.app']);
export const REQUIRED_ACK='CARGA_FICTICIA_EN_MODERNO_PRUEBAS';

export function projectRef(url){
  const host=new URL(url).hostname.toLowerCase();
  const suffix='.supabase.co';
  return host.endsWith(suffix)?host.slice(0,-suffix.length):'';
}

export function assertIsolatedTarget({url,allowedRef,ack,runId}){
  let parsed;
  try{parsed=new URL(url);}catch{throw Error('LOAD_SUPABASE_URL no es una URL valida');}
  const host=parsed.hostname.toLowerCase();
  const ref=String(allowedRef||'').trim().toLowerCase();
  if(parsed.protocol!=='https:')throw Error('La carga solo admite HTTPS');
  if(PRODUCTION_HOSTS.has(host)||host.includes(PRODUCTION_PROJECT_REF)||ref===PRODUCTION_PROJECT_REF){
    throw Error('Destino de produccion rechazado');
  }
  if(!/^[a-z0-9]{20}$/.test(ref))throw Error('LOAD_ALLOWED_PROJECT_REF debe ser la referencia exacta del proyecto aislado');
  if(projectRef(parsed.href)!==ref)throw Error('La URL no coincide con LOAD_ALLOWED_PROJECT_REF');
  if(ack!==REQUIRED_ACK)throw Error('Confirmacion de aislamiento ausente');
  if(!/^load-[a-z0-9][a-z0-9-]{5,47}$/.test(String(runId||'')))throw Error('LOAD_RUN_ID no es valido');
  return {host,ref};
}

export function deterministicUuid(runId,kind,index){
  const bytes=createHash('sha256').update(`${runId}:${kind}:${index}`).digest().subarray(0,16);
  bytes[6]=(bytes[6]&0x0f)|0x40;
  bytes[8]=(bytes[8]&0x3f)|0x80;
  const h=bytes.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

export function requireSecret(name,value){
  if(!String(value||'').trim())throw Error(`${name} no esta configurado`);
  return value;
}

export function safeFixturePath(value){
  const path=String(value||'');
  if(!path.startsWith('/tmp/')&&!path.includes('/_temp/'))throw Error('El manifiesto debe guardarse en un directorio temporal');
  return path;
}
