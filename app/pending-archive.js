(function(root){
  const marker=key=>JSON.stringify({modernoPendingArchive:1,key});
  function createStore(idb){
    let opened;
    function db(){return opened||(opened=new Promise((resolve,reject)=>{
      if(!idb){reject(new Error('No hay almacenamiento de copias disponible'));return;}
      const req=idb.open('moderno-pending-copies',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('copies');
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    }));}
    async function read(key){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('copies','readonly'),r=tx.objectStore('copies').get(key);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Lectura cancelada'));});}
    async function write(key,raw){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('copies','readwrite');tx.objectStore('copies').put(raw,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Copia cancelada'));});if(await read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');}
    return {read,write};
  }
  async function migrate(storage,prefix,store){
    const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(prefix))keys.push(k);}
    for(const key of keys){
      const raw=storage.getItem(key);if(!raw||raw===marker(key))continue;
      await store.write(key,raw);
      if(await store.read(key)!==raw)throw new Error('No se pudo verificar la copia archivada');
      // Another tab may have changed this entry while the archive was being written.
      if(storage.getItem(key)!==raw)throw new Error('La copia ha cambiado; se conserva el original');
      storage.setItem(key,marker(key));
    }
  }
  async function resolve(storage,key,store){const raw=storage.getItem(key);if(raw!==marker(key))return raw;const copy=await store.read(key);if(typeof copy!=='string'||!copy)throw new Error('No se encuentra la copia archivada');return copy;}
  root.ModernoPendingArchive={createStore,migrate,resolve,marker};
})(typeof window!=='undefined'?window:globalThis);
