(function(root){
  function normalizeOwner(value){return typeof value==='string'&&/^(id|mail):\S+$/.test(value)?value:'';}
  function normalizeStudy(value){return typeof value==='string'&&value.trim()?value.trim():'';}
  function normalizeHint(value){return typeof value==='string'&&/^\d+:[0-9a-f]{8}$/.test(value)?value:'';}
  function snapshotHint(raw){
    if(typeof raw!=='string')return '';
    let hash=2166136261;const count=Math.min(raw.length,8192);
    for(let sample=0;sample<count;sample++){
      const index=count===1?0:Math.floor(sample*(raw.length-1)/(count-1));
      hash^=raw.charCodeAt(index);hash=Math.imul(hash,16777619)>>>0;
    }
    return raw.length+':'+hash.toString(16).padStart(8,'0');
  }
  function snapshotOwner(raw){
    try{
      const value=JSON.parse(raw),session=value?.state?.sessionUser||{},sessionId=String(session.id||'').trim(),syncId=String(value?.sync?.user||'').trim();
      if(sessionId&&syncId&&sessionId!==syncId)return '';
      const id=sessionId||syncId;
      if(id)return 'id:'+id;
      const mail=String(session.mail||session.email||'').trim().toLowerCase();
      return mail?'mail:'+mail:'';
    }catch(e){return '';}
  }
  function snapshotStudy(raw){try{return normalizeStudy(JSON.parse(raw)?.sync?.study);}catch(e){return '';}}
  const marker=(key,owner='',study='',contentHint='')=>{
    const value={modernoPendingArchive:1,key},normalizedOwner=normalizeOwner(owner),normalizedStudy=normalizeStudy(study),normalizedHint=normalizeHint(contentHint);
    if(normalizedOwner)value.owner=normalizedOwner;if(normalizedStudy)value.study=normalizedStudy;if(normalizedHint)value.hint=normalizedHint;
    return JSON.stringify(value);
  };
  function pointer(raw){if(typeof raw!=='string'||raw.length>2048)return null;try{const value=JSON.parse(raw);return value?.modernoPendingArchive===1&&typeof value.key==='string'?value.key:null;}catch(e){return null;}}
  function owner(raw){try{const value=JSON.parse(raw);return value?.modernoPendingArchive===1?normalizeOwner(value.owner):snapshotOwner(raw);}catch(e){return '';}}
  function study(raw){try{const value=JSON.parse(raw);return value?.modernoPendingArchive===1?normalizeStudy(value.study):snapshotStudy(raw);}catch(e){return '';}}
  function hint(raw){try{const value=JSON.parse(raw);return value?.modernoPendingArchive===1?normalizeHint(value.hint):snapshotHint(raw);}catch(e){return '';}}
  function randomToken(){
    if(root.crypto?.randomUUID)return root.crypto.randomUUID();
    if(!root.crypto?.getRandomValues)throw new Error('No hay un generador seguro para identificar la copia');
    const words=root.crypto.getRandomValues(new Uint32Array(4));return Array.from(words,value=>value.toString(16).padStart(8,'0')).join('');
  }
  function createStore(idb){
    let opened,current;
    function reset(){
      const pending=opened;opened=null;
      if(current){try{current.close();}catch(e){}current=null;}
      if(pending)Promise.resolve(pending).then(database=>{try{database.close();}catch(e){}}).catch(()=>{});
    }
    function db(){return opened||(opened=new Promise((resolve,reject)=>{
      if(!idb){reject(new Error('No hay almacenamiento de copias disponible'));return;}
      const req=idb.open('moderno-pending-copies',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('copies');
      req.onsuccess=()=>{current=req.result;current.onversionchange=reset;resolve(current);};req.onerror=()=>{opened=null;reject(req.error);};req.onblocked=()=>{opened=null;reject(new Error('El almacenamiento está ocupado por otra pestaña'));};
    }));}
    async function read(key){try{const d=await db();return await new Promise((resolve,reject)=>{const tx=d.transaction('copies','readonly'),r=tx.objectStore('copies').get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Lectura cancelada'));});}catch(error){reset();throw error;}}
    async function write(key,raw){try{const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('copies','readwrite');tx.objectStore('copies').put(raw,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Copia cancelada'));});if(await read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');}catch(error){reset();throw error;}}
    async function remove(key){try{const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('copies','readwrite');tx.objectStore('copies').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Limpieza cancelada'));});}catch(error){reset();throw error;}}
    return {read,write,remove,reset};
  }
  async function migrate(storage,prefix,store){
    const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(prefix))keys.push(k);}
    for(const key of keys){
      const raw=storage.getItem(key);if(!raw||pointer(raw))continue;
      await store.write(key,raw);
      if(await store.read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');
      // Another tab may have changed this entry while the archive was being written.
      if(storage.getItem(key)!==raw)throw new Error('La copia ha cambiado; se conserva el original');
      storage.setItem(key,marker(key,snapshotOwner(raw),snapshotStudy(raw),snapshotHint(raw)));
    }
  }
  async function resolve(storage,key,store){
    for(let attempt=0;attempt<3;attempt++){
      const raw=storage.getItem(key),target=pointer(raw);if(!target)return raw;
      const copy=await store.read(target);
      if(storage.getItem(key)!==raw)continue;
      if(typeof copy!=='string'||!copy)throw new Error('No se encuentra la copia archivada');
      return copy;
    }
    throw new Error('Otra pestaña está cambiando la copia local');
  }
  async function writeCurrent(storage,key,raw,store,valid=()=>true){
    const previous=storage.getItem(key),prefix=key+'_actual_',target=prefix+randomToken();
    if(!valid())return false;
    await store.write(target,raw);
    if(await store.read(target)!==raw)throw new Error('No se pudo verificar la copia actual');
    if(!valid()){try{await store.remove?.(target);}catch(e){}return false;}
    if(storage.getItem(key)!==previous)throw new Error('Otra pestaña ha cambiado la copia local');
    const reference=marker(target,snapshotOwner(raw),snapshotStudy(raw),snapshotHint(raw));
    storage.setItem(key,reference);
    if(storage.getItem(key)!==reference||await resolve(storage,key,store)!==raw)throw new Error('No se pudo verificar el acceso a la copia actual');
    // Only after the new pointer is verified may the previous live slot be removed.
    // Historical pending copies have their own immutable keys and are never removed.
    const old=pointer(previous);
    let referenced=false;
    if(old)for(let i=0;i<storage.length;i++){const candidate=storage.key(i);if(candidate!==key&&pointer(storage.getItem(candidate))===old){referenced=true;break;}}
    if(old?.startsWith(prefix)&&!referenced&&storage.getItem(key)===reference){try{await store.remove?.(old);}catch(e){}}
    return valid();
  }
  async function preserve(storage,currentKey,key,store,valid=()=>true){
    const original=storage.getItem(currentKey),raw=await resolve(storage,currentKey,store);
    const unchanged=()=>valid()&&storage.getItem(currentKey)===original&&storage.getItem(currentKey+'_dirty')==='1';
    if(!raw||!unchanged())throw new Error('La copia pendiente ha cambiado');
    if(storage.getItem(key)!==null||await store.read(key)!==undefined)throw new Error('La copia de destino ya existe');
    if(!unchanged())throw new Error('La copia pendiente ha cambiado');
    await store.write(key,raw);
    if(await store.read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');
    if(!unchanged())throw new Error('La copia pendiente ha cambiado; se conserva el original');
    if(storage.getItem(key)!==null)throw new Error('La copia de destino ha cambiado');
    // Keep the original snapshot intact; only the small, resolvable pointer is new.
    const reference=marker(key,snapshotOwner(raw),snapshotStudy(raw),snapshotHint(raw));
    storage.setItem(key,reference);
    if(storage.getItem(key)!==reference)throw new Error('No se pudo verificar el acceso a la copia');
    if(!unchanged()||await resolve(storage,currentKey,store)!==raw)throw new Error('La copia pendiente ha cambiado; se conserva el original');
    storage.removeItem(currentKey+'_dirty');
    return key;
  }
  root.ModernoPendingArchive={createStore,migrate,resolve,marker,pointer,owner,study,hint,snapshotOwner,snapshotStudy,snapshotHint,preserve,writeCurrent};
})(typeof window!=='undefined'?window:globalThis);
