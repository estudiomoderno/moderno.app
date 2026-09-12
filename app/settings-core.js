(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModernoSettingsCore=api;})(globalThis,function(){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  // Only edited fields are applied. A concurrent edit of that same field is never overwritten.
  function patch(current,base,draft){
    const out=clone(current||{});
    for(const k of Object.keys(draft)){
      if(JSON.stringify(draft[k])===JSON.stringify(base[k]))continue;
      if(JSON.stringify(current?.[k])!==JSON.stringify(base[k])&&JSON.stringify(current?.[k])!==JSON.stringify(draft[k]))throw Error('Otra persona ha cambiado «'+k+'». Revisa la versión guardada antes de continuar.');
      out[k]=clone(draft[k]);
    }
    return out;
  }
  function percent(value){if(value===''||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100)throw Error('Los porcentajes deben estar entre 0 y 100.');return Number(value);}
  function series(value){const s=String(value).trim().toUpperCase();if(!/^[A-Z0-9]{1,6}$/.test(s))throw Error('La serie debe tener entre 1 y 6 letras o números.');return s;}
  return {patch,percent,series};
});
