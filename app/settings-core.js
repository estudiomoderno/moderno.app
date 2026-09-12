(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModernoSettingsCore=api;})(globalThis,function(){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const problem=message=>Object.assign(new Error(message),{userMessage:message});
  function normalized(values,section){
    const out=clone(values||{});
    if(section==='impuestos'){
      for(const k of ['vat','irpf','margin'])if(out[k]!==''&&out[k]!=null&&Number.isFinite(Number(out[k])))out[k]=Number(out[k]);
      for(const k of ['fc','ps'])if(typeof out[k]==='string')out[k]=out[k].trim().toUpperCase();
    }
    return out;
  }
  const equal=(a,b,section)=>JSON.stringify(normalized(a,section))===JSON.stringify(normalized(b,section));
  // Keep legacy bank fields untouched: changing the default must not rewrite old documents.
  function paymentIban(account={},emitter={},doc){
    if(doc&&Object.hasOwn(doc,'paymentIban'))return String(doc.paymentIban??'');
    if(doc&&(doc.ref||doc.editRef))return String(emitter.iban||account.iban||'');
    return String(account.paymentIban??(emitter.iban||account.iban||''));
  }
  const bankConflict=(account={},emitter={})=>account.paymentIban==null&&!!account.iban&&!!emitter.iban&&account.iban!==emitter.iban;
  // Only edited fields are applied. A concurrent edit of that same field is never overwritten.
  function patch(current,base,draft){
    const out=clone(current||{});
    for(const k of Object.keys(draft)){
      if(JSON.stringify(draft[k])===JSON.stringify(base[k]))continue;
      if(JSON.stringify(current?.[k])!==JSON.stringify(base[k])&&JSON.stringify(current?.[k])!==JSON.stringify(draft[k]))throw problem('Otra persona ha cambiado estos datos. Revisa los cambios antes de guardar.');
      out[k]=clone(draft[k]);
    }
    return out;
  }
  function percent(value){if(value===''||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100)throw problem('Los porcentajes deben estar entre 0 y 100.');return Number(value);}
  function series(value){const s=String(value).trim().toUpperCase();if(!/^[A-Z0-9]{1,6}$/.test(s))throw problem('La serie debe tener entre 1 y 6 letras o números.');return s;}
  function explain(error){
    if(error?.userMessage)return error.userMessage;
    const code=String(error?.code||''),message=String(error?.message||'');
    if(/email_exists|user_already_exists/.test(code))return 'Ese correo ya está en uso. Prueba con otro.';
    if(/rate_limit/.test(code)||error?.status===429)return 'Has hecho varios intentos seguidos. Espera un momento y vuelve a intentarlo.';
    if(/session_not_found|refresh_token|bad_jwt/.test(code)||error?.status===401)return 'Tu sesión ha caducado. Vuelve a entrar para continuar.';
    if(/fetch|network|offline/i.test(message))return 'No se ha podido conectar. Revisa tu conexión y vuelve a intentarlo.';
    return 'No se han podido guardar los cambios. Siguen en pantalla; vuelve a intentarlo.';
  }
  return {patch,percent,series,explain,problem,normalized,equal,paymentIban,bankConflict};
});
