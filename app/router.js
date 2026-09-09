(function(root){
  const locales={es:{home:'',workspace:'workspace',biblioteca:'biblioteca',proyectos:'proyectos',agenda:'agenda',calendario:'calendario',contabilidad:'contabilidad',prevision:'prevision-cobros',facturas:'facturas',presupuestos:'presupuestos',catalogo:'catalogo',compras:'compras',informes:'informes',plantillas:'plantillas',utilidades:'utilidades',integraciones:'integraciones',admin:'administracion',ajustes:'ajustes'}};
  const id=v=>/^\d+$/.test(String(v))&&Number.isSafeInteger(Number(v))?Number(v):null;
  function authCallback(location){return !!(location.hash&&!/^#\//.test(location.hash)&&location.hash!=='#')||/[?&](code|error|access_token|refresh_token)=/.test(location.search||'');}
  function parse(location){
    const raw=/^#\//.test(location.hash||'')?location.hash.slice(1):location.pathname||'/';
    let path;try{path=decodeURIComponent(raw).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}catch{return null;}
    const parts=path.replace(/^\/+|\/+$/g,'').split('/');if(parts[0]==='es')parts.shift();if(!parts.length)parts.push('');
    if(['cliente','obra','api','auth','storage'].includes(parts[0]))return null;
    if(parts[0]==='index.html')parts[0]='';
    if(parts[0]==='proyecto'&&id(parts[1])!==null){
      const route={locale:'es',view:'proyecto',project:id(parts[1])};
      if(parts.length===4&&['estancia','presentacion'].includes(parts[2])&&id(parts[3])!==null){route.view=parts[2]==='estancia'?'estancia':'presedit';route.detail=id(parts[3]);}
      else if(parts.length!==2)return null;
      return route;
    }
    const view=Object.keys(locales.es).find(v=>locales.es[v]===parts[0]);
    return view!==undefined&&parts.length===1?{locale:'es',view}:null;
  }
  function path(route){
    if(!locales[route.locale||'es'])throw Error('Idioma no disponible');
    if(['proyecto','estancia','presedit'].includes(route.view)){
      if(id(route.project)===null)return '/es/proyectos';
      const base='/es/proyecto/'+route.project;
      return ['estancia','presedit'].includes(route.view)&&id(route.detail)!==null?base+'/'+(route.view==='estancia'?'estancia':'presentacion')+'/'+route.detail:base;
    }
    return '/es/'+(locales.es[route.view]||'');
  }
  const api={locales,parse,path,authCallback};root.ModernoRouter=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
