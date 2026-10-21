(function(root){
  const marker=key=>JSON.stringify({modernoPendingArchive:1,key});
  function pointer(raw){try{const value=JSON.parse(raw);return value?.modernoPendingArchive===1&&typeof value.key==='string'?value.key:null;}catch(e){return null;}}
  function createStore(idb){
    let opened;
    function db(){return opened||(opened=new Promise((resolve,reject)=>{
      if(!idb){reject(new Error('No hay almacenamiento de copias disponible'));return;}
      const req=idb.open('moderno-pending-copies',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('copies');
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>{opened=null;reject(req.error);};req.onblocked=()=>{opened=null;reject(new Error('El almacenamiento está ocupado por otra pestaña'));};
    }));}
    async function read(key){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('copies','readonly'),r=tx.objectStore('copies').get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Lectura cancelada'));});}
    async function write(key,raw){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('copies','readwrite');tx.objectStore('copies').put(raw,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Copia cancelada'));});if(await read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');}
    async function remove(key){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('copies','readwrite');tx.objectStore('copies').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Limpieza cancelada'));});}
    return {read,write,remove};
  }
  async function migrate(storage,prefix,store){
    const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(prefix))keys.push(k);}
    for(const key of keys){
      const raw=storage.getItem(key);if(!raw||pointer(raw))continue;
      await store.write(key,raw);
      if(await store.read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');
      // Another tab may have changed this entry while the archive was being written.
      if(storage.getItem(key)!==raw)throw new Error('La copia ha cambiado; se conserva el original');
      storage.setItem(key,marker(key));
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
    const previous=storage.getItem(key),prefix=key+'_actual_',target=prefix+(root.crypto?.randomUUID?.()||Date.now()+'.'+Math.random());
    if(!valid())return false;
    await store.write(target,raw);
    if(await store.read(target)!==raw)throw new Error('No se pudo verificar la copia actual');
    if(!valid()){try{await store.remove?.(target);}catch(e){}return false;}
    if(storage.getItem(key)!==previous)throw new Error('Otra pestaña ha cambiado la copia local');
    storage.setItem(key,marker(target));
    if(storage.getItem(key)!==marker(target)||await resolve(storage,key,store)!==raw)throw new Error('No se pudo verificar el acceso a la copia actual');
    // Only after the new pointer is verified may the previous live slot be removed.
    // Historical pending copies have their own immutable keys and are never removed.
    const old=pointer(previous);
    let referenced=false;
    if(old)for(let i=0;i<storage.length;i++){const candidate=storage.key(i);if(candidate!==key&&pointer(storage.getItem(candidate))===old){referenced=true;break;}}
    if(old?.startsWith(prefix)&&!referenced&&storage.getItem(key)===marker(target)){try{await store.remove?.(old);}catch(e){}}
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
    storage.setItem(key,marker(key));
    if(storage.getItem(key)!==marker(key))throw new Error('No se pudo verificar el acceso a la copia');
    if(!unchanged()||await resolve(storage,currentKey,store)!==raw)throw new Error('La copia pendiente ha cambiado; se conserva el original');
    storage.removeItem(currentKey+'_dirty');
    return key;
  }
  root.ModernoPendingArchive={createStore,migrate,resolve,marker,pointer,preserve,writeCurrent};
})(typeof window!=='undefined'?window:globalThis);
