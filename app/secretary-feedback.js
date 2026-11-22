(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ModernoSecretaryFeedback=api;
})(globalThis,function(){
  'use strict';

  // This module deliberately has no fetch, storage, timers, logging or analytics SDK.
  // Consent persistence and authenticated transport belong to the application server.
  const TASKS=Object.freeze(['invoice_from_quote','invoice_create','quote_create','finance_question','project_question','navigation']);
  const OUTCOMES=Object.freeze(['helpful','unhelpful']);
  const REASONS=Object.freeze({
    helpful:Object.freeze(['clear_answer','saved_time']),
    unhelpful:Object.freeze(['too_many_questions','unclear_answer','wrong_navigation','missing_information','could_not_finish','other'])
  });
  const MIN_CONTRIBUTORS=5,MIN_STUDIES=3;
  const invalid=()=>Object.assign(new TypeError('Valoración no válida.'),{code:'invalid_feedback'});

  // Inspect descriptors rather than reading arbitrary properties. Reject additional,
  // inherited, symbol and accessor fields instead of silently retaining private data.
  function fields(value,required,optional=[]){
    if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();
    const prototype=Object.getPrototypeOf(value);
    if(prototype!==Object.prototype&&prototype!==null)throw invalid();
    const allowed=new Set([...required,...optional]),descriptors=Object.getOwnPropertyDescriptors(value);
    for(const key of Reflect.ownKeys(descriptors)){
      if(typeof key!=='string'||!allowed.has(key)||!Object.hasOwn(descriptors[key],'value'))throw invalid();
    }
    for(const key of required)if(!Object.hasOwn(descriptors,key))throw invalid();
    return descriptors;
  }

  function selection(value){
    const data=fields(value,['task','outcome'],['reason']);
    const task=data.task.value,outcome=data.outcome.value;
    if(!TASKS.includes(task)||!OUTCOMES.includes(outcome))throw invalid();
    const out={task,outcome};
    if(Object.hasOwn(data,'reason')){
      if(!REASONS[outcome].includes(data.reason.value))throw invalid();
      out.reason=data.reason.value;
    }
    return out;
  }

  function buildEvent(value){
    return Object.freeze({version:1,event:'secretary_feedback',...selection(value)});
  }

  // Pure and DOM-independent: the same validator can be used in server JavaScript.
  function validateEvent(value){
    const data=fields(value,['version','event','task','outcome'],['reason']);
    if(data.version.value!==1||data.event.value!=='secretary_feedback')throw invalid();
    const selected={task:data.task.value,outcome:data.outcome.value};
    if(Object.hasOwn(data,'reason'))selected.reason=data.reason.value;
    return buildEvent(selected);
  }

  function identity(value){
    try{
      const data=fields(value,['userId','studyId']);
      const userId=data.userId.value,studyId=data.studyId.value;
      if(!opaqueKey(userId)||!opaqueKey(studyId))return null;
      return Object.freeze({userId,studyId});
    }catch{return null;}
  }
  function opaqueKey(value){return typeof value==='string'&&value.length>0&&value.length<=256&&!/[\s\x00-\x1f\x7f]/u.test(value);}
  const status=value=>Object.freeze({status:value});

  function createClient(options={}){
    const send=typeof options.send==='function'?options.send:null;
    const Abort=Object.hasOwn(options,'AbortController')?options.AbortController:globalThis.AbortController;
    let scope=null,scopeToken=0,consent=false,disposed=false,epoch=0;
    const pending=new Set();
    const available=()=>!disposed&&!!send&&typeof Abort==='function';
    function cancel(){
      epoch+=1;
      for(const controller of pending)controller.abort();
      pending.clear();
    }
    function setContext(value){
      if(disposed)return null;
      const next=identity(value);
      if(scope&&next&&scope.userId===next.userId&&scope.studyId===next.studyId)return scopeToken;
      cancel();consent=false;scope=next;scopeToken+=1;
      return scope?scopeToken:null;
    }
    function setConsent(enabled,token){
      if(disposed||!scope||token!==scopeToken||typeof enabled!=='boolean')return false;
      if(enabled&&!available())return false;
      // Invalidate consent reads/grants already in flight, even in the same scope.
      // Obtain the new token with setContext(currentIdentity) before enabling again.
      if(!enabled){cancel();scopeToken+=1;}
      consent=enabled;
      return true;
    }
    function getState(){
      return Object.freeze({available:available(),hasContext:!!scope,consent,pending:pending.size});
    }
    async function submit(value){
      if(!available()||!scope)return status('unavailable');
      if(!consent)return status('consent_required');
      let event;
      try{event=buildEvent(value);}catch{return status('invalid');}
      const controller=new Abort(),currentEpoch=epoch;
      const context=Object.freeze({...scope});
      pending.add(controller);
      let onAbort;
      const cancelled=new Promise(resolve=>{
        onAbort=()=>resolve(null);
        controller.signal.addEventListener('abort',onAbort,{once:true});
      });
      try{
        // A synchronous withdrawal/context change also cancels work before dispatch.
        const request=Promise.resolve().then(()=>{
          if(controller.signal.aborted||currentEpoch!==epoch||!consent)return null;
          return send(event,Object.freeze({signal:controller.signal,context}));
        });
        const result=await Promise.race([request,cancelled]);
        if(controller.signal.aborted||currentEpoch!==epoch||!consent)return status('cancelled');
        return status(result?.accepted===true?'sent':'failed');
      }catch{
        return status(controller.signal.aborted||currentEpoch!==epoch?'cancelled':'failed');
      }finally{
        controller.signal.removeEventListener('abort',onAbort);
        pending.delete(controller);
      }
    }
    function dispose(){cancel();consent=false;scope=null;disposed=true;}
    return Object.freeze({setContext,setConsent,getState,submit,dispose});
  }

  // Server-side review helper. Keys are trusted, internal pseudonyms derived by the
  // server, never fields accepted in a client feedback event or included in output.
  // A threshold is suppression of small groups, not a guarantee of anonymity.
  function aggregateForReview(records,options={}){
    const config=fields(options,[],['minimumContributors','minimumStudies']);
    const minimumContributors=Object.hasOwn(config,'minimumContributors')?config.minimumContributors.value:MIN_CONTRIBUTORS;
    const minimumStudies=Object.hasOwn(config,'minimumStudies')?config.minimumStudies.value:MIN_STUDIES;
    if(!Number.isSafeInteger(minimumContributors)||minimumContributors<MIN_CONTRIBUTORS||
       !Number.isSafeInteger(minimumStudies)||minimumStudies<MIN_STUDIES||!Array.isArray(records))throw invalid();
    const groups=new Map();
    for(const record of records){
      const data=fields(record,['event','contributorKey','studyKey']);
      const event=validateEvent(data.event.value),contributorKey=data.contributorKey.value,studyKey=data.studyKey.value;
      if(!opaqueKey(contributorKey)||!opaqueKey(studyKey))throw invalid();
      const key=[event.task,event.outcome,event.reason||''].join('|');
      if(!groups.has(key))groups.set(key,{event,contributors:new Set(),studies:new Set()});
      const group=groups.get(key);
      group.contributors.add(contributorKey);group.studies.add(studyKey);
    }
    const rows=[];
    for(const key of [...groups.keys()].sort()){
      const group=groups.get(key);
      if(group.contributors.size<minimumContributors||group.studies.size<minimumStudies)continue;
      const row={task:group.event.task,outcome:group.event.outcome};
      if(group.event.reason)row.reason=group.event.reason;
      rows.push(Object.freeze({...row,contributors:group.contributors.size,studies:group.studies.size}));
    }
    return Object.freeze({version:1,purpose:'human_review',minimumContributors,minimumStudies,groups:Object.freeze(rows)});
  }

  return Object.freeze({TASKS,OUTCOMES,REASONS,MIN_CONTRIBUTORS,MIN_STUDIES,buildEvent,validateEvent,createClient,aggregateForReview});
});
