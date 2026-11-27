(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else if(root)root.ModernoSecretaryDictation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  // Privacy boundary: recognition only starts when the browser accepts
  // processLocally=true. This module never captures, uploads or stores audio.
  const mounted=new WeakMap();
  const STATES=Object.freeze({
    idle:'idle',checking:'checking',listening:'listening',stopping:'stopping',
    downloadRequired:'language_download_required',downloading:'language_downloading',
    languageUnavailable:'language_unavailable',unsupported:'unsupported',
    permissionDenied:'permission_denied',deviceUnavailable:'device_unavailable',
    silence:'silence',aborted:'aborted',error:'error'
  });

  const COPY=Object.freeze({
    idle:'Dictado local preparado.',
    checking:'Comprobando el dictado local…',
    listening:'Escuchando en este dispositivo…',
    stopping:'Terminando el dictado…',
    language_download_required:'Este idioma debe descargarse en el dispositivo antes de dictar.',
    language_downloading:'El idioma se está descargando en el dispositivo.',
    language_unavailable:'El dictado local no está disponible para este idioma.',
    unsupported:'Este navegador no admite dictado privado en el dispositivo.',
    permission_denied:'Permite el acceso al micrófono en este dispositivo para usar el dictado.',
    device_unavailable:'No se encuentra un micrófono disponible en este dispositivo.',
    silence:'No se ha detectado voz. Puedes volver a intentarlo.',
    aborted:'El dictado se ha interrumpido. Puedes volver a intentarlo.',
    error:'No se ha podido completar el dictado local. No se ha enviado audio a ningún servicio externo.'
  });

  function element(value){
    return !!value&&typeof value==='object'&&typeof value.append==='function'&&value.ownerDocument;
  }
  function field(value){
    return !!value&&typeof value==='object'&&typeof value.value==='string'&&typeof value.addEventListener==='function';
  }
  function languageOf(composer,doc,scope){
    const candidate=String(composer.lang||doc?.documentElement?.lang||scope?.navigator?.language||'es-ES').trim();
    return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(candidate)?candidate:'es-ES';
  }
  function recognitionClass(scope){
    const candidate=scope?.SpeechRecognition||scope?.webkitSpeechRecognition;
    return typeof candidate==='function'?candidate:null;
  }
  function appendTranscript(original,transcript){
    const addition=String(transcript||'').trim();
    if(!addition)return String(original||'');
    const current=String(original||'');
    if(!current)return addition;
    return current+(/\s$/u.test(current)?'':' ')+addition;
  }
  function localSupport(instance){
    if(!instance||!('processLocally' in instance))return false;
    try{
      instance.processLocally=true;
      return instance.processLocally===true;
    }catch{return false;}
  }
  function availabilityName(value){
    return ['available','downloadable','downloading','unavailable'].includes(value)?value:'unavailable';
  }

  function mount(options={}){
    const host=options.host,composer=options.composer,onChange=options.onChange;
    if(!element(host)||!field(composer))throw new TypeError('El dictado necesita un contenedor y un campo de mensaje válidos.');
    if(onChange!=null&&typeof onChange!=='function')throw new TypeError('onChange debe ser una función.');
    mounted.get(host)?.destroy();

    const doc=host.ownerDocument,scope=doc.defaultView||root,Ctor=recognitionClass(scope);
    const language=languageOf(composer,doc,scope);
    const container=doc.createElement('div');container.className='secretary-dictation';
    const control=doc.createElement('button');control.type='button';control.className='secretary-dictation-button';
    control.setAttribute('aria-label','Dictar mensaje');control.setAttribute('aria-pressed','false');
    const statusNode=doc.createElement('span');statusNode.className='secretary-dictation-status';
    statusNode.setAttribute('role','status');statusNode.setAttribute('aria-live','polite');
    container.append(control,statusNode);host.append(container);

    let status=STATES.idle,recognition=null,active=false,destroyed=false,manualStop=false;
    let heard=false,added=false,installArmed=false,operation=0,lastError='';
    const committed=new Set();

    function snapshot(){
      return Object.freeze({status,active,language,supported:status!==STATES.unsupported,transcriptAdded:added,error:lastError||null});
    }
    function render(next,message,error=''){
      status=next;lastError=error;container.dataset.state=next;
      control.setAttribute('aria-pressed',active?'true':'false');
      if(next===STATES.downloadRequired)control.textContent='Descargar idioma';
      else if(next===STATES.downloading)control.textContent='Comprobar descarga';
      else if(active)control.textContent='Detener dictado';
      else control.textContent='Dictar';
      control.disabled=destroyed||next===STATES.checking;
      statusNode.textContent=message||COPY[next]||COPY.error;
    }
    function notify(){
      const value=composer.value;
      try{
        const EventCtor=scope?.Event||root?.Event;
        if(typeof composer.dispatchEvent==='function'&&typeof EventCtor==='function')composer.dispatchEvent(new EventCtor('input',{bubbles:true}));
      }catch{}
      try{onChange?.(value);}catch{}
    }
    function add(text){
      const next=appendTranscript(composer.value,text);
      if(next===composer.value)return false;
      composer.value=next;added=true;
      try{composer.setSelectionRange?.(next.length,next.length);}catch{}
      notify();return true;
    }
    function detach(){
      if(!recognition)return null;
      const current=recognition;
      for(const name of ['onstart','onaudiostart','onspeechstart','onresult','onnomatch','onerror','onend'])current[name]=null;
      recognition=null;return current;
    }
    function quietAbort(){
      const current=detach();active=false;
      if(!current)return;
      try{current.abort();}catch{}
    }
    function finish(next,message,error=''){
      active=false;recognition=null;render(next,message,error);
    }
    function classify(error){
      const code=String(error?.error||error?.name||'').toLowerCase();
      if(['not-allowed','notallowederror','securityerror'].includes(code))return [STATES.permissionDenied,COPY.permission_denied,'permission_denied'];
      if(['audio-capture','notfounderror','devicesnotfounderror','notreadableerror'].includes(code))return [STATES.deviceUnavailable,COPY.device_unavailable,'device_unavailable'];
      if(['no-speech','nomatch'].includes(code))return [STATES.silence,COPY.silence,'silence'];
      if(['language-not-supported','notsupportederror'].includes(code))return [STATES.languageUnavailable,COPY.language_unavailable,'language_unavailable'];
      if(code==='aborted')return [STATES.aborted,COPY.aborted,'aborted'];
      return [STATES.error,COPY.error,'recognition_error'];
    }
    function recognitionError(event){
      const [next,message,code]=classify(event);
      active=false;recognition=null;render(next,message,code);
    }
    function readResults(event){
      const results=event?.results;
      if(!results||typeof results.length!=='number')return;
      const from=Number.isInteger(event.resultIndex)&&event.resultIndex>=0?event.resultIndex:0;
      let interim='';
      for(let index=from;index<results.length;index+=1){
        const result=results[index],alternative=result?.[0],text=typeof alternative?.transcript==='string'?alternative.transcript:'';
        if(!text)continue;
        heard=true;
        if(result.isFinal===true&&!committed.has(index)){
          committed.add(index);add(text);
        }else if(result.isFinal!==true)interim=text.trim();
      }
      if(active)render(STATES.listening,interim?`Escuchando: ${interim}`:COPY.listening);
    }
    function begin(){
      if(destroyed)return false;
      let candidate;
      try{candidate=new Ctor();}catch(error){
        const [next,message,code]=classify(error);render(next,message,code);return false;
      }
      if(!localSupport(candidate)){
        render(STATES.unsupported,COPY.unsupported,'local_recognition_unsupported');return false;
      }
      recognition=candidate;manualStop=false;heard=false;added=false;lastError='';committed.clear();
      candidate.lang=language;candidate.continuous=false;candidate.interimResults=true;candidate.maxAlternatives=1;
      candidate.onstart=()=>{if(candidate!==recognition||destroyed)return;active=true;render(STATES.listening);};
      candidate.onaudiostart=candidate.onstart;
      candidate.onspeechstart=()=>{if(candidate===recognition)heard=true;};
      candidate.onresult=event=>{if(candidate===recognition&&!destroyed)readResults(event);};
      candidate.onnomatch=()=>{if(candidate===recognition)recognitionError({error:'no-speech'});};
      candidate.onerror=event=>{if(candidate!==recognition||destroyed)return;if(manualStop&&event?.error==='aborted')return;recognitionError(event);};
      candidate.onend=()=>{
        if(candidate!==recognition||destroyed)return;
        recognition=null;active=false;
        if(manualStop)render(STATES.idle,added?'Dictado añadido. Puedes editarlo antes de enviar.':COPY.idle);
        else if(!heard&&!added)render(STATES.silence,COPY.silence,'silence');
        else render(STATES.idle,added?'Dictado añadido. Puedes editarlo antes de enviar.':COPY.idle);
      };
      try{
        active=true;render(STATES.listening);candidate.start();return true;
      }catch(error){
        recognition=null;active=false;
        const [next,message,code]=classify(error);render(next,message,code);return false;
      }
    }
    async function available(){
      if(typeof Ctor?.available!=='function')return 'available';
      return availabilityName(await Ctor.available({langs:[language],processLocally:true}));
    }
    async function install(){
      if(typeof Ctor?.install!=='function')return false;
      return (await Ctor.install({langs:[language]}))===true;
    }
    async function start(){
      if(destroyed)return false;
      if(active){stop();return false;}
      if(composer.disabled||composer.readOnly){render(STATES.error,'El campo de mensaje no está disponible ahora.','composer_unavailable');return false;}
      if(!Ctor){render(STATES.unsupported,COPY.unsupported,'local_recognition_unsupported');return false;}
      const ticket=++operation;render(STATES.checking);
      try{
        const availability=await available();
        if(destroyed||ticket!==operation)return false;
        if(availability==='unavailable'){
          installArmed=false;render(STATES.languageUnavailable,COPY.language_unavailable,'language_unavailable');return false;
        }
        if(availability==='downloading'){
          installArmed=false;render(STATES.downloading);return false;
        }
        if(availability==='downloadable'){
          if(!installArmed){installArmed=true;render(STATES.downloadRequired);return false;}
          installArmed=false;render(STATES.downloading,'Descargando el idioma en este dispositivo…');
          const installed=await install();
          if(destroyed||ticket!==operation)return false;
          if(!installed){render(STATES.languageUnavailable,'No se ha podido descargar el idioma para el dictado local.','language_install_failed');return false;}
          render(STATES.idle,'Idioma descargado. Ya puedes iniciar el dictado.');return false;
        }
        installArmed=false;return begin();
      }catch(error){
        if(destroyed||ticket!==operation)return false;
        const [next,message,code]=classify(error);render(next,message,code);return false;
      }
    }
    function stop(){
      operation+=1;
      if(destroyed||!recognition){active=false;return false;}
      manualStop=true;render(STATES.stopping);
      try{recognition.stop();return true;}
      catch{quietAbort();render(STATES.aborted,COPY.aborted,'aborted');return false;}
    }
    function reset(){
      operation+=1;quietAbort();manualStop=false;heard=false;added=false;installArmed=false;committed.clear();
      if(!destroyed)render(STATES.idle);return !destroyed;
    }
    function destroy(){
      if(destroyed)return;
      operation+=1;quietAbort();destroyed=true;control.removeEventListener('click',click);container.remove();
      if(mounted.get(host)===controller)mounted.delete(host);
    }
    function click(){void start();}
    const controller=Object.freeze({start,stop,reset,getState:snapshot,destroy});
    control.addEventListener('click',click);mounted.set(host,controller);

    if(!Ctor)render(STATES.unsupported,COPY.unsupported,'local_recognition_unsupported');
    else{
      let probe;
      try{probe=new Ctor();}catch{}
      if(!localSupport(probe))render(STATES.unsupported,COPY.unsupported,'local_recognition_unsupported');
      else render(STATES.idle);
    }
    return controller;
  }

  return Object.freeze({STATES,mount});
});
