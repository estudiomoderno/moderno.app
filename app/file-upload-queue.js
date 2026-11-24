(function(root){
  'use strict';
  const PREFIX='local-file://';
  const DEFAULTS={maxItems:2000,maxFileBytes:50*1024*1024,maxTotalBytes:1024*1024*1024,draftLeaseMs:24*60*60*1000};
  const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const STUDY=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  function normalizeOwner(value){const owner=String(value||'').trim();return owner&&owner.length<=256&&!/[\x00-\x20\x7f]/.test(owner)?owner:'';}

  function reference(id){if(!UUID.test(String(id||'')))throw new Error('Identificador de archivo no valido');return PREFIX+String(id).toLowerCase();}
  function parseReference(value){if(typeof value!=='string'||!value.startsWith(PREFIX))return null;const id=value.slice(PREFIX.length);if(!UUID.test(id))throw new Error('Referencia de archivo no valida');return id.toLowerCase();}
  function stableReference(value,study){
    if(typeof value!=='string'||!value.startsWith('storage://archivos/'))throw new Error('La subida no devolvio una referencia estable');
    const path=value.slice('storage://archivos/'.length),parts=path.split('/');
    if(!STUDY.test(String(study||''))||parts[0]!==study||parts.length<2||parts.some(part=>!part||part==='.'||part==='..')||path.includes('\\')||/[\x00-\x1f?#%]/.test(path))throw new Error('Referencia remota no valida');
    return value;
  }
  function metadata(record){return {id:record.id,reference:reference(record.id),study:record.study,name:record.name,type:record.type,size:record.size,createdAt:record.createdAt,attempts:record.attempts||0,attachedAt:record.attachedAt||null,remote:record.remote||null,uploadedAt:record.uploadedAt||null,cloudConfirmedAt:record.cloudConfirmedAt||null};}
  function verifyRecord(record){
    if(!record||!UUID.test(String(record.id||''))||!STUDY.test(String(record.study||'')))throw new Error('Archivo pendiente no valido');
    // Legacy rows can be missing an owner until a verified local snapshot
    // explicitly claims them for the authenticated account.
    if(record.owner!==undefined&&!normalizeOwner(record.owner))throw new Error('Propietario de archivo pendiente no valido');
    const hasBlob=record.blob instanceof Blob,confirmedMapping=!hasBlob&&record.blob==null&&!!record.remote&&Number.isFinite(record.cloudConfirmedAt);
    if(!hasBlob&&!confirmedMapping)throw new Error('Archivo pendiente no valido');
    if(hasBlob&&(record.size!==record.blob.size||record.type!==(record.blob.type||'application/octet-stream')))throw new Error('El archivo pendiente no coincide con sus metadatos');
    if(!hasBlob&&(!Number.isFinite(record.size)||record.size<0||typeof record.type!=='string') )throw new Error('El mapping confirmado no coincide con sus metadatos');
    if(record.leaseUntil!==undefined&&(!Number.isFinite(record.leaseUntil)||record.leaseUntil<record.createdAt))throw new Error('La proteccion temporal del archivo no es valida');
    if(record.attachedAt!==undefined&&record.attachedAt!==null&&(!Number.isFinite(record.attachedAt)||record.attachedAt<record.createdAt))throw new Error('La confirmacion local del archivo no es valida');
    if(record.cloudConfirmedAt!==undefined&&record.cloudConfirmedAt!==null&&!Number.isFinite(record.cloudConfirmedAt))throw new Error('La confirmacion remota del archivo no es valida');
    if(record.remote)stableReference(record.remote,record.study);
    return record;
  }
  function randomId(cryptoSource=root.crypto){
    if(cryptoSource?.randomUUID)return cryptoSource.randomUUID();
    if(!cryptoSource?.getRandomValues)throw new Error('No hay un generador seguro para identificar el archivo');
    const bytes=new Uint8Array(16);cryptoSource.getRandomValues(bytes);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  function createMemoryStore(){
    const records=new Map();
    const clone=value=>value&&({...value});
    return {
      async get(id){return clone(records.get(id));},
      async put(record){verifyRecord(record);records.set(record.id,clone(record));},
      async remove(id){records.delete(id);},
      async list(){return [...records.values()].map(clone);},
      // Mirrors the IndexedDB store: reset closes session resources, it never
      // deletes durable Blobs waiting for a later authenticated retry.
      reset(){}
    };
  }

  function createStore(idb,{databaseName='moderno-file-upload-queue',storeName='files'}={}){
    let opening,current;
    function reset(){const pending=opening;opening=null;if(current){try{current.close();}catch{}current=null;}if(pending)Promise.resolve(pending).then(database=>{try{database.close();}catch{}}).catch(()=>{});}
    function db(){return opening||(opening=new Promise((resolve,reject)=>{
      if(!idb){reject(new Error('No hay almacenamiento local de archivos disponible'));return;}
      const request=idb.open(databaseName,1);
      request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(storeName)){const store=database.createObjectStore(storeName,{keyPath:'id'});store.createIndex('study','study',{unique:false});store.createIndex('createdAt','createdAt',{unique:false});}};
      request.onsuccess=()=>{current=request.result;current.onversionchange=reset;resolve(current);};
      request.onerror=()=>{opening=null;reject(request.error||new Error('No se pudo abrir la cola local'));};
      request.onblocked=()=>{opening=null;reject(new Error('La cola local esta ocupada por otra pestana'));};
    }));}
    async function transaction(mode,action){
      try{const database=await db();return await new Promise((resolve,reject)=>{const tx=database.transaction(storeName,mode),store=tx.objectStore(storeName);let result;try{result=action(store);}catch(error){reject(error);return;}tx.oncomplete=()=>resolve(typeof result==='function'?result():result);tx.onerror=()=>reject(tx.error||new Error('Operacion local fallida'));tx.onabort=()=>reject(tx.error||new Error('Operacion local cancelada'));});}
      catch(error){reset();throw error;}
    }
    async function get(id){let value;await transaction('readonly',store=>{const request=store.get(id);request.onsuccess=()=>{value=request.result;};request.onerror=()=>{};});return value;}
    async function list(){let values=[];await transaction('readonly',store=>{const request=store.getAll();request.onsuccess=()=>{values=request.result||[];};request.onerror=()=>{};});return values;}
    async function put(record){
      verifyRecord(record);await transaction('readwrite',store=>store.put(record));
      const saved=await get(record.id);verifyRecord(saved);
      if(saved.study!==record.study||saved.owner!==record.owner||saved.size!==record.size||saved.name!==record.name||saved.remote!==record.remote)throw new Error('No se pudo verificar el archivo pendiente');
    }
    async function remove(id){await transaction('readwrite',store=>store.delete(id));if(await get(id)!==undefined)throw new Error('No se pudo limpiar el archivo pendiente');}
    return {get,list,put,remove,reset};
  }

  function createQueue({store,upload,owner,now=Date.now,cryptoSource=root.crypto,createObjectURL=root.URL?.createObjectURL?.bind(root.URL),revokeObjectURL=root.URL?.revokeObjectURL?.bind(root.URL),limits={}}={}){
    if(!store||typeof store.get!=='function'||typeof store.put!=='function'||typeof store.list!=='function'||typeof store.remove!=='function')throw new Error('Falta el almacen de archivos pendientes');
    const queueOwner=normalizeOwner(owner);if(!queueOwner)throw new Error('Falta el propietario de la cola de archivos');
    const policy={...DEFAULTS,...limits},urls=new Map();
    async function checkedList(){const rows=await store.list();for(const row of rows)verifyRecord(row);return rows;}
    async function enqueue(blob,{study,name}={}){
      if(!(blob instanceof Blob)||!blob.size)throw new Error('Selecciona un archivo con contenido');
      if(!STUDY.test(String(study||'')))throw new Error('No se puede vincular el archivo al estudio');
      if(blob.size>policy.maxFileBytes)throw new Error('El archivo supera el limite local');
      // Confirmed mappings are tiny and deliberately survive for cross-tab
      // replacement, but their already-uploaded Blob no longer consumes quota.
      const rows=await checkedList(),total=rows.reduce((sum,row)=>sum+(row.blob instanceof Blob?row.blob.size:0),0);
      if(rows.length>=policy.maxItems||total+blob.size>policy.maxTotalBytes)throw new Error('No hay espacio reservado para mas archivos pendientes');
      const id=randomId(cryptoSource),createdAt=now(),record={id,study,owner:queueOwner,name:String(name||blob.name||'archivo').slice(0,240),type:blob.type||'application/octet-stream',size:blob.size,createdAt,leaseUntil:createdAt+Math.max(0,Number(policy.draftLeaseMs)||0),attempts:0,blob};
      await store.put(record);const saved=await store.get(id);verifyRecord(saved);return reference(id);
    }
    async function recordFor(value,study){const id=parseReference(value);if(!id)throw new Error('Referencia local no valida');const record=await store.get(id);verifyRecord(record);if(study&&record.study!==study)throw new Error('Archivo pendiente de otro estudio');if(record.owner!==queueOwner)throw new Error('Archivo pendiente de otra cuenta');return record;}
    async function resolve(value,{study}={}){
      const record=await recordFor(value,study),cached=urls.get(record.id);if(cached)return cached;
      if(record.remote)return record.remote;
      if(typeof createObjectURL!=='function')throw new Error('El navegador no puede mostrar el archivo pendiente');
      const url=createObjectURL(record.blob);urls.set(record.id,url);return url;
    }
    async function retry(value,{study}={}){
      const record=await recordFor(value,study);if(record.remote)return record.remote;
      if(!record.attachedAt){const error=new Error('El archivo todavia no forma parte de una copia local verificada');error.code='LOCAL_FILE_NOT_PERSISTED';throw error;}
      if(typeof upload!=='function')throw new Error('La subida no esta configurada');
      let remote;try{remote=stableReference(await upload({...record}),record.study);}catch(error){try{await store.put({...record,attempts:(record.attempts||0)+1,lastAttemptAt:now()});}catch{}throw error;}
      const completed={...record,attempts:(record.attempts||0)+1,lastAttemptAt:now(),uploadedAt:now(),remote};
      // Keep the Blob until the caller confirms that the stable reference is persisted.
      await store.put(completed);const saved=await store.get(record.id);verifyRecord(saved);if(saved.remote!==remote)throw new Error('No se pudo verificar la subida pendiente');return remote;
    }
    async function acknowledge(value,remote,{study}={}){
      const record=await recordFor(value,study);if(record.remote!==remote||stableReference(remote,record.study)!==remote)throw new Error('La referencia remota no esta confirmada');
      await store.remove(record.id);const url=urls.get(record.id);if(url&&typeof revokeObjectURL==='function')revokeObjectURL(url);urls.delete(record.id);return true;
    }
    async function confirmCloud(value,remote,{study,retentionMs=policy.draftLeaseMs}={}){
      const record=await recordFor(value,study);if(record.remote!==remote||stableReference(remote,record.study)!==remote)throw new Error('La referencia remota no esta confirmada');
      const confirmedAt=record.cloudConfirmedAt||now(),leaseUntil=Math.max(record.leaseUntil||0,confirmedAt+Math.max(0,Number(retentionMs)||0));
      // The stable mapping is retained for another tab, but the potentially
      // large Blob is released only after the server has acknowledged it.
      await store.put({...record,blob:null,cloudConfirmedAt:confirmedAt,leaseUntil});
      const url=urls.get(record.id);if(url&&typeof revokeObjectURL==='function')revokeObjectURL(url);urls.delete(record.id);return true;
    }
    async function discard(value,{study}={}){const record=await recordFor(value,study);await store.remove(record.id);const url=urls.get(record.id);if(url&&typeof revokeObjectURL==='function')revokeObjectURL(url);urls.delete(record.id);return true;}
    async function list(study){const rows=await checkedList();return rows.filter(row=>row.owner===queueOwner&&(!study||row.study===study)).sort((a,b)=>a.createdAt-b.createdAt).map(metadata);}
    async function markPersisted(references,{study}={}){
      if(!STUDY.test(String(study||'')))throw new Error('Estudio no valido');
      const wanted=new Set([...references].map(value=>reference(parseReference(value)))),attached=[];
      for(const row of await checkedList()){
        const rowReference=reference(row.id);if(row.study!==study||row.owner&&row.owner!==queueOwner||!wanted.has(rowReference))continue;
        if(row.owner!==queueOwner||!row.attachedAt)await store.put({...row,owner:queueOwner,attachedAt:row.attachedAt||now()});
        attached.push(rowReference);
      }
      return attached;
    }
    async function retryAll(study,{onUploaded,references}={}){
      if(!STUDY.test(String(study||'')))throw new Error('Estudio no valido');
      const active=references===undefined?null:new Set([...references].map(value=>reference(parseReference(value))));
      // A Blob is eligible only after a verified local snapshot contains its
      // reference. This durable bit survives a tab crash between local save and
      // the later Storage retry; drafts and cancelled forms never set it.
      const available=await list(study),known=new Set(available.map(row=>row.reference));
      const results=active?[...active].filter(value=>!known.has(value)).map(value=>{const error=new Error('Falta la copia local del archivo');error.code='LOCAL_FILE_MISSING';return {reference:value,error};}):[];
      const rows=available.filter(row=>row.attachedAt&&(!active||active.has(row.reference)));
      for(const row of rows){try{const remote=await retry(row.reference,{study});let confirmed=false;if(onUploaded)confirmed=await onUploaded(row.reference,remote,row);if(confirmed)await acknowledge(row.reference,remote,{study});results.push({reference:row.reference,remote,confirmed:true===confirmed});}catch(error){results.push({reference:row.reference,error});}}
      return results;
    }
    async function reconcile(study,references,{minimumAgeMs=60000}={}){
      if(!STUDY.test(String(study||'')))throw new Error('Estudio no valido');
      const active=new Set([...references].map(value=>reference(parseReference(value)))),moment=now(),cutoff=moment-Math.max(0,Number(minimumAgeMs)||0),removed=[],deferred=[];
      const rows=(await checkedList()).filter(row=>row.study===study&&row.owner===queueOwner).sort((a,b)=>a.createdAt-b.createdAt);
      for(const row of rows){
        const rowReference=reference(row.id);if(active.has(rowReference))continue;
        if(row.createdAt>cutoff||row.leaseUntil>moment){deferred.push(rowReference);continue;}
        await discard(rowReference,{study});removed.push(rowReference);
      }
      return {removed,deferred};
    }
    function dispose(){for(const url of urls.values())if(typeof revokeObjectURL==='function')revokeObjectURL(url);urls.clear();}
    return {enqueue,resolve,retry,retryAll,markPersisted,reconcile,acknowledge,confirmCloud,discard,list,dispose};
  }

  function collectReferences(value,{maxNodes=200000}={}){
    const found=new Set(),stack=[value],seen=new Set();let visited=0;
    while(stack.length){const current=stack.pop();if(typeof current==='string'){if(current.startsWith(PREFIX)){const id=current.slice(PREFIX.length);if(!UUID.test(id))throw new Error('Referencia local de archivo no valida');found.add(reference(id));}continue;}if(!current||typeof current!=='object'||seen.has(current))continue;if(++visited>maxNodes)throw new Error('Documento demasiado grande para revisar archivos pendientes');seen.add(current);if(Array.isArray(current))for(const item of current)stack.push(item);else for(const item of Object.values(current))stack.push(item);}
    return [...found].sort();
  }

  const api={PREFIX,reference,parseReference,stableReference,createMemoryStore,createStore,createQueue,collectReferences};
  root.ModernoFileUploadQueue=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
