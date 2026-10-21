var ModernoFiles = (() => {
  function storagePath(source, origins) {
    if (typeof source !== 'string') return null;
    let path;
    if (source.startsWith('storage://archivos/')) path=source.slice(19);
    else {
      let url; try { url=new URL(source); } catch { return null; }
      if (!origins.includes(url.origin) || url.username || url.password) return null;
      const match=/^\/storage\/v1\/object\/(?:public|authenticated)\/archivos\/(.+)$/.exec(url.pathname);
      if (!match) return null;
      try { path=decodeURIComponent(match[1]); } catch { throw new Error('Ruta de archivo no válida'); }
    }
    if (!/^[a-f0-9-]{36}\//i.test(path) || path.includes('\\') || /[\x00-\x1f?#%]/.test(path) || path.split('/').some(p=>!p||p==='.'||p==='..')) throw new Error('Ruta de archivo no válida');
    return path;
  }
  function createResolver({origins, signMember, signPortal}) {
    return async function resolve(source, context) {
      const path=storagePath(source,origins);
      if (!path) {
        // Existing embedded files and external links are not sent to the signer.
        if (typeof source==='string' && (/^https:\/\//.test(source) || /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[a-z0-9+/=\r\n]*$/i.test(source))) return source;
        throw new Error('Archivo no disponible');
      }
      let result;
      if(context?.portalToken) result=await signPortal({path,token:context.portalToken,type:context.portalType});
      else {
        if(!context?.study || path.split('/')[0]!==context.study) throw new Error('Archivo de otro estudio');
        result=await signMember(path);
      }
      const url=new URL(result);
      if(!origins.includes(url.origin) || !url.pathname.startsWith('/storage/v1/object/sign/archivos/') || url.username || url.password) throw new Error('Enlace de descarga no válido');
      const returned=decodeURIComponent(url.pathname.slice('/storage/v1/object/sign/archivos/'.length));
      if(returned!==path || !url.searchParams.get('token')) throw new Error('Enlace de descarga no válido');
      // Signed links stay in the viewer. Never replace the persisted reference.
      return url.href;
    };
  }
  function createRequestCache(resolve,{ttl=45000,timeout=20000,concurrency=4,now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
    const entries=new Map(),queue=[];let running=0,owner=null,generation=0;
    const identity=c=>JSON.stringify([c?.study,c?.user,c?.role,c?.attempt,c?.portalToken,c?.portalType]);
    function pump(){
      while(running<concurrency&&queue.length){
        const job=queue.shift();running++;
        (async()=>{
          let timer,active=true;const started=now();
          try{
            if(job.generation!==generation)throw new Error('La sesión ha cambiado');
            const result=await Promise.race([
              Promise.resolve().then(async()=>{
                for(let attempt=0;;attempt++){
                  if(!active||job.generation!==generation)throw new Error('La sesión ha cambiado');
                  try{return await resolve(job.source,job.context);}
                  catch(error){const status=Number(error?.status||error?.statusCode);if(attempt>=2||![429,500,502,503,504].includes(status))throw error;await wait(500*2**attempt);}
                }
              }),
              new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('La imagen tarda demasiado en responder')),timeout);})
            ]);
            if(job.generation!==generation||entries.get(job.key)?.promise!==job.promise)throw new Error('La sesión o la imagen ha cambiado');
            const entry=entries.get(job.key);entry.expires=started+ttl;job.accept(result);
          }catch(error){if(entries.get(job.key)?.promise===job.promise)entries.delete(job.key);job.reject(error);}
          finally{active=false;clearTimeout(timer);running--;pump();}
        })();
      }
    }
    function get(source,context,refresh=false){
      const next=identity(context);if(next!==owner){owner=next;generation++;entries.clear();}
      const key=JSON.stringify([next,source]),entry=entries.get(key);
      if(entry&&(entry.expires===Infinity||!refresh&&entry.expires>now()))return entry.promise;
      for(const [old,value] of entries)if(value.expires<=now())entries.delete(old);
      let accept,reject;const promise=new Promise((yes,no)=>{accept=yes;reject=no;});
      entries.set(key,{promise,expires:Infinity});queue.push({key,source,context:{...context},generation,promise,accept,reject});pump();return promise;
    }
    return {get,clear(){generation++;entries.clear();owner=null;}};
  }
  return {storagePath,createResolver,createRequestCache};

})();
if(typeof module!=='undefined')module.exports=ModernoFiles;
