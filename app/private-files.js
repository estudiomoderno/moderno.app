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
  return {storagePath,createResolver};
})();
if(typeof module!=='undefined')module.exports=ModernoFiles;
