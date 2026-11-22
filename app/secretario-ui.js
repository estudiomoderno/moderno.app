/* A single, session-scoped Secretary in the existing vanilla app.
   No conversation, document or credential is written to browser storage. */
var ModernoSecretary=(()=>{
  'use strict';
  const config=window.MODERNO_SECRETARY_CONFIG;
  if(config?.enabled!==true)return Object.freeze({enabled:false,refresh(){},reset(){},openFinance(){return false;}});
  const bridge=window.ModernoSecretaryBridge;
  if(!bridge)return Object.freeze({enabled:false,refresh(){},reset(){},openFinance(){return false;}});
  const financeViews=['informes','facturas','contabilidad','presupuestos','prevision'];
  const sectionLabels={informes:'Resumen',facturas:'Facturas',contabilidad:'Gastos',presupuestos:'Presupuestos',prevision:'Previsión'};
  const supported=()=>financeViews.includes(state.view)||['proyecto','estancia'].includes(state.view);
  const owner=()=>JSON.stringify([ESTUDIO_ID||'',state.sessionUser?.id||'',_accessRole||'']);
  const ready=()=>!_accessLoading&&!!ESTUDIO_ID&&!!state.sessionUser?.id&&['admin','miembro','colaborador'].includes(_accessRole)&&!state.portalAnon;
  let identity=owner(),messages=[],panel=null,thread=null,composer=null,sendButton=null,stopButton=null,statusNode=null,contextNode=null;
  let collapsed=false,home=false,homePending=false,lastView=null,lastProject=null,busy=false,controller=null,generation=0,unavailable=false,authSubscription=null;
  let requestCounter=0,actions=new Map(),questions=[],answers={},feedbackTask='finance_question',contextTrimmed=false;
  let positionQueued=false,positionSources=[];
  const positionResize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>schedulePosition()):null;
  let feedbackLoaded=false,feedbackLoading=false,feedbackRevision=null,feedbackOperation=0,feedbackError='',feedbackHost=null;
  const pendingWithdrawals=new Set();
  let withdrawalStorageBlocked=false;
  const feedback=window.ModernoSecretaryFeedback?.createClient({...(config.feedbackEnabled===true?{send:async(payload,{signal,context})=>{
    if(!ready()||String(ESTUDIO_ID)!==context.studyId||state.sessionUser?.id!==context.userId)throw Error('La sesión ha cambiado.');
    const call=sb.rpc('secretary_feedback_submit',{p_estudio:context.studyId,p_event:payload});
    const {data,error}=await (typeof call.abortSignal==='function'?call.abortSignal(signal):call);
    if(error)throw error;return data;
  }}:{})});
  const el=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=value;return node;};
  const button=(label,fn,className='secretary-button')=>{const node=el('button',className,label);node.type='button';node.addEventListener('click',fn);return node;};
  const labelText=(value,max=500)=>typeof value==='string'?value.slice(0,max):'';
  const activeProject=()=>['proyecto','estancia'].includes(state.view)?state.projects?.find(p=>p.id===state.currentProject):null;
  function icon(){const image=el('img','secretary-logo');image.src='/brand/moderno_app_simbolo_negro.svg';image.alt='';return image;}
  function reset(){
    generation++;controller?.abort();controller=null;busy=false;messages=[];actions.clear();questions=[];answers={};contextTrimmed=false;
    feedbackOperation++;feedback?.setContext(null);feedbackLoaded=false;feedbackLoading=false;feedbackRevision=null;feedbackError='';feedbackHost=null;
    panel?.remove();panel=null;thread=null;composer=null;identity=owner();collapsed=false;home=false;homePending=false;unavailable=false;lastView=null;lastProject=null;
    document.body.classList.remove('secretary-home','secretary-lateral','secretary-folded','secretary-on');
    document.getElementById('secretary-reopen')?.remove();
  }
  function checkIdentity(){if(identity!==owner()){reset();return false;}return true;}
  function clearLayout(){
    panel?.remove();document.getElementById('secretary-reopen')?.remove();
    document.body.classList.remove('secretary-home','secretary-lateral','secretary-folded','secretary-on');
  }
  function busyEditor(view,projectId){
    if(document.querySelector('.overlay.open,dialog[open]')){toast('Termina o cierra la ventana abierta para continuar.');return true;}
    if(draftEditing()&&draftDirty()){draftExitModal(view,projectId);return true;}
    return false;
  }
  function goDirect(view,projectId){
    if(!canView(view))return false;
    home=false;homePending=false;
    if(busyEditor(view,projectId))return false;
    go(view,projectId);refresh();return state.view===view&&(projectId==null||state.currentProject===projectId);
  }
  function openFinance(){
    checkIdentity();if(!ready())return false;
    const first=financeViews.find(view=>canView(view));if(!first)return false;
    homePending=true;collapsed=false;
    if(busyEditor(first))return false;
    go(first);
    if(state.view===first){home=true;homePending=false;refresh();composer?.focus();return true;}
    return false;
  }
  function fold(){collapsed=true;home=false;homePending=false;refresh();document.getElementById('secretary-reopen')?.focus();}
  function unfold(){collapsed=false;refresh();composer?.focus();}
  function snapshot(){
    const dirtyBlocks=bridge.BLOCKS.filter(key=>!_cloudHash[key]||!CLOUD_BLOCKS[key]||canon(CLOUD_BLOCKS[key].get())!==_cloudHash[key]);
    return {role:_accessRole,studyId:ESTUDIO_ID,clients:state.clients,projects:state.projects,quotes:state.quotes,drafts:state.borradores,brands:visibleWsOrder(),irpf:state.irpf,
      versions:_cloudSeen,dirtyBlocks,canView,today:new Date().toISOString().slice(0,10)};
  }
  function applyAction(action,fromOwner){
    if(!checkIdentity()||identity!==fromOwner||!ready())throw Error('La sesión ha cambiado. Vuelve a hacer la consulta.');
    if(action?.type==='navigate'){
      const target=bridge.navigation(action.payload,{projects:state.projects,canView});
      const ok=action.payload.view==='finanzas'?openFinance():goDirect(target.view,target.projectId);
      if(!ok)throw Error('La navegación está esperando a que termines la edición abierta.');
      return 'Pantalla abierta.';
    }
    if(action?.type!=='prepare_draft')throw Error('Esta acción no está disponible.');
    const draft=bridge.prepareDraft(action.payload,snapshot()),view=draft.kind==='factura'?'facturas':'presupuestos';
    if(!canView(view))throw Error('No tienes acceso a ese editor.');
    if(busyEditor(view))throw Error('Conservamos tu edición. Termínala y pulsa «Abrir borrador» para continuar.');
    home=false;homePending=false;collapsed=false;
    if(draft._draftId!=null){
      draftResume(draft._draftId);
      if(draft._secretaryMode==='edit_saved_draft'){
        state.draft.lines=state.draft.lines.map((line,index)=>({...line,qty:draft.lines[index].qty,price:draft.lines[index].price}));render();
      }
    }else if(draft.sourceQuoteRef){
      const candidates=state.quotes.map((q,index)=>({q,index})).filter(({q})=>q.ref===draft.sourceQuoteRef&&q.brand===draft.brand&&String(q.projectId||'')===String(draft.projectId||''));
      const index=candidates.length===1?candidates[0].index:-1;
      if(index<0)throw Error('El presupuesto de origen ya no está disponible de forma inequívoca.');
      quoteToInvoice(index);
    }else{
      go(view);
      if(state.view!==view)throw Error('No se pudo abrir el editor.');
      delete draft._secretaryMode;state.draft=draft;
      if(draft.kind==='factura')state.fView='nuevo';else state.qView='nuevo';
      render();
    }
    refresh();return 'Borrador abierto para revisar. Tú decides cuándo guardarlo.';
  }
  function openSource(source,fromOwner){
    if(!checkIdentity()||identity!==fromOwner||!ready())return;
    const id=String(source?.id||'');
    if(source.kind==='project'){
      const project=state.projects.find(p=>String(p.id)===id);if(project)goDirect('proyecto',project.id);else toast('El proyecto ya no está disponible.');return;
    }
    if(['quote','invoice'].includes(source.kind)){
      const isF=source.kind==='invoice',view=isF?'facturas':'presupuestos',docs=isF?state.invoices:state.quotes;
      const candidates=docs.map((doc,index)=>({doc,index})).filter(({doc})=>doc.ref===id&&(!source.brand||doc.brand===source.brand)&&(source.projectId==null||String(doc.projectId||'')===String(source.projectId)));
      const index=candidates.length===1?candidates[0].index:-1;
      if(index<0||!canView(view)){toast('El documento ya no está disponible en esta sesión.');return;}
      if(busyEditor(view))return;
      home=false;homePending=false;loadDoc(index,isF?'factura':'presupuesto');refresh();return;
    }
    if(source.kind==='entry'){goDirect('contabilidad');return;}
    if(source.kind==='catalog'){goDirect('catalogo');return;}
    if(source.kind==='client'){goDirect('agenda');return;}
    if(['document','task'].includes(source.kind)){
      const project=state.projects.find(p=>String(p.id)===String(source.projectId));
      if(!project||!canView('proyecto')){toast('El proyecto ya no está disponible.');return;}
      if(!goDirect('proyecto',project.id))return;
      projTab(source.kind==='document'?'archivos':'tareas');return;
    }
    toast('Abre la sección correspondiente para consultar esta fuente.');
  }
  function appendMessage(role,content,response){
    const record={role,content:labelText(content,12000),response,owner:identity};messages.push(record);
    drawThread();return record;
  }
  function setStatus(value){if(statusNode)statusNode.textContent=value+(contextTrimmed?' Uso el contexto reciente; el historial sigue visible.':'');}
  function feedbackScope(){return {userId:state.sessionUser.id,studyId:String(ESTUDIO_ID)};}
  function withdrawalKey(){return 'moderno_secretary_withdrawal:'+JSON.stringify([ESTUDIO_ID||'',state.sessionUser?.id||'']);}
  function withdrawalPending(){
    const key=withdrawalKey();if(pendingWithdrawals.has(key))return true;
    try{const value=localStorage.getItem(key);withdrawalStorageBlocked=false;return value==='pending';}
    catch{withdrawalStorageBlocked=true;return true;}
  }
  function markWithdrawal(value){
    const key=withdrawalKey();if(value)pendingWithdrawals.add(key);else pendingWithdrawals.delete(key);
    // This is only an opt-out recovery marker; no feedback, chat or document is stored.
    try{if(value)localStorage.setItem(key,'pending');else localStorage.removeItem(key);}catch{}
  }
  function handleFeedbackStorage(event){
    if(!feedback||config.feedbackEnabled!==true||!ready()||(event.key!==null&&event.key!==withdrawalKey()))return;
    const key=withdrawalKey();
    if(event.newValue==='pending')pendingWithdrawals.add(key);
    else if(event.key===key&&event.newValue===null)pendingWithdrawals.delete(key);
    feedbackOperation++;feedbackLoading=false;feedbackLoaded=false;feedbackRevision=null;
    feedback.setConsent(false,feedback.setContext(feedbackScope()));
    feedbackError=event.newValue==='pending'?'Los envíos se han detenido desde otra pestaña. Falta confirmar la retirada.':'La preferencia cambió en otra pestaña. Los envíos siguen detenidos hasta que la compruebes.';
    if(event.key===key&&event.newValue===null)for(const record of messages)delete record.feedbackSent;
    drawFeedbackSettings();drawThread();
  }
  function feedbackResult(data){
    const value=Array.isArray(data)?data[0]:data;
    if(!value||typeof value.enabled!=='boolean'||!Number.isInteger(value.revision)||value.revision<0)throw Error('Preferencia no disponible.');
    return value;
  }
  async function loadFeedback(){
    if(!feedback||config.feedbackEnabled!==true||feedbackLoading||feedbackLoaded||!ready()||!sb?.rpc)return;
    if(withdrawalPending()){
      feedback.setConsent(false,feedback.setContext(feedbackScope()));
      feedbackError=withdrawalStorageBlocked?'Este navegador no permite comprobar tu preferencia local. La participación compartida sigue desactivada.':'Los envíos siguen detenidos. Falta confirmar la retirada de tus valoraciones.';
      drawFeedbackSettings();return;
    }
    const captured=identity,token=feedback.setContext(feedbackScope()),operation=++feedbackOperation;feedbackLoading=true;
    try{
      const {data,error}=await sb.rpc('secretary_feedback_consent_get',{p_estudio:ESTUDIO_ID});if(error)throw error;
      const value=feedbackResult(data);
      if(captured!==owner()||operation!==feedbackOperation||withdrawalPending())return;
      feedbackRevision=value.revision;feedbackLoaded=feedback.setConsent(value.enabled,token);feedbackError='';
    }catch(error){if(captured===owner()&&operation===feedbackOperation){feedbackError='La mejora compartida no está disponible en este momento.';feedbackLoaded=false;}}
    finally{if(captured===owner()&&operation===feedbackOperation){feedbackLoading=false;drawFeedbackSettings();drawThread();}}
  }
  async function setFeedbackConsent(enabled){
    if(!feedback||config.feedbackEnabled!==true||!ready()||enabled&&(!feedbackLoaded||feedbackRevision==null||withdrawalPending()))return;
    const captured=identity,operation=++feedbackOperation,scope=feedbackScope();
    let token=feedback.setContext(scope);
    // Withdrawal stops submissions immediately; the server revision protects a
    // preceding grant that arrives late. No grants are retried automatically.
    if(!enabled){markWithdrawal(true);feedback.setConsent(false,token);token=feedback.setContext(scope);drawThread();}
    feedbackLoading=true;feedbackError='';drawFeedbackSettings();
    try{
      const {data,error}=await sb.rpc('secretary_feedback_consent_set',{p_estudio:ESTUDIO_ID,p_enabled:enabled,p_expected_revision:feedbackRevision??0});if(error)throw error;
      const value=feedbackResult(data);
      if(captured!==owner()||operation!==feedbackOperation)return;
      feedbackRevision=value.revision;
      if(value.enabled!==enabled)throw Error('La preferencia ha cambiado.');
      feedback.setConsent(enabled&&value.enabled,token);
      feedbackLoaded=true;
      if(!enabled){markWithdrawal(false);for(const record of messages)delete record.feedbackSent;}
      feedbackError=enabled?'Preferencia guardada. Solo se envían las valoraciones que tú elijas.':'Preferencia guardada. Se han retirado tus valoraciones compartidas.';
    }catch(error){
      if(captured===owner()&&operation===feedbackOperation){
        feedback.setConsent(false,feedback.setContext(scope));
        feedbackLoaded=false;feedbackError=enabled?'No se ha activado la mejora compartida. Vuelve a comprobar tu preferencia.':'Se han detenido los envíos. Falta confirmar la retirada en el servidor; vuelve a intentarlo.';
      }
    }finally{if(captured===owner()&&operation===feedbackOperation){feedbackLoading=false;drawFeedbackSettings();drawThread();}}
  }
  function drawFeedbackSettings(){
    if(!feedbackHost)return;feedbackHost.replaceChildren();
    if(config.feedbackEnabled!==true||!feedback){feedbackHost.hidden=true;return;}
    feedbackHost.hidden=false;feedbackHost.append(el('strong','','Mejorar el Secretario'));
    const label=el('label','secretary-consent'),input=el('input','');input.type='checkbox';input.checked=feedback.getState().consent;input.disabled=!feedbackLoaded||feedbackLoading;
    input.addEventListener('change',()=>setFeedbackConsent(input.checked));label.append(input,document.createTextNode('Ayudar a mejorar el Secretario'));feedbackHost.append(label);
    feedbackHost.append(el('p','','Comparte valoraciones y motivos predefinidos. No incluye tus conversaciones ni documentos. Puedes desactivarlo y retirar tus valoraciones.'));
    if(feedbackError)feedbackHost.append(el('p','',feedbackError));
    if(withdrawalPending()&&!feedbackLoading)feedbackHost.append(button('Reintentar retirada',()=>setFeedbackConsent(false),'secretary-button'));
    else if(!feedbackLoaded&&!feedbackLoading)feedbackHost.append(button('Comprobar preferencia',()=>{feedbackError='';loadFeedback();},'secretary-button'));
  }
  function drawFeedback(container,record){
    if(!record.response||!feedback?.getState().consent)return;
    const area=el('div','secretary-feedback');
    if(record.feedbackSent){area.append(el('span','secretary-caption','Valoración compartida. Gracias.'));container.append(area);return;}
    area.append(el('span','secretary-caption','¿Te ha ayudado?'));
    const reasons={helpful:[['clear_answer','Respuesta clara'],['saved_time','Me ahorró tiempo']],unhelpful:[['too_many_questions','Demasiadas preguntas'],['unclear_answer','No se entiende'],['wrong_navigation','Pantalla equivocada'],['missing_information','Falta información'],['could_not_finish','No pude terminar'],['other','Otro motivo']]};
    const choose=outcome=>{
      area.replaceChildren();const select=el('select','');select.setAttribute('aria-label','Motivo de la valoración');
      select.append(new Option('Elige un motivo (opcional)',''));
      for(const [value,label] of reasons[outcome])select.append(new Option(label,value));area.append(select);
      area.append(button('Compartir valoración',async()=>{
        if(record.owner!==owner()||withdrawalPending())return;
        const result=await feedback.submit({task:record.feedbackTask||'finance_question',outcome,...(select.value?{reason:select.value}:{})});
        if(record.owner!==owner())return;
        if(result.status==='sent'){record.feedbackSent=true;drawThread();}
        else{area.append(el('span','secretary-caption','La valoración no se ha enviado. Puedes volver a intentarlo.'));}
      },'secretary-button'));
      area.append(button('Cancelar',()=>drawThread(),'secretary-button'));
    };
    area.append(button('Sí',()=>choose('helpful'),'secretary-button'),button('No',()=>choose('unhelpful'),'secretary-button'));container.append(area);
  }
  function drawQuestions(container,response){
    if(response!==messages.at(-1)?.response||!questions.length)return;
    const form=el('form','secretary-questions');
    for(const question of questions){
      const field=el('fieldset','secretary-question');field.append(el('legend','',labelText(question.prompt,600)));
      const opts=el('div','secretary-options');
      for(const option of question.options||[]){
        const choice=button(labelText(option.label,160),()=>{
          answers[question.id]=String(option.value??option.id??option.label);
          for(const sibling of opts.children)sibling.setAttribute('aria-pressed',String(sibling===choice));
          free.value='';
        },'secretary-option');
        choice.setAttribute('aria-pressed',String(answers[question.id]===String(option.value??option.id??option.label)));opts.append(choice);
      }
      field.append(opts);
      const free=el('input','secretary-free-answer');free.type='text';free.maxLength=1000;free.placeholder='Escribe otra respuesta…';free.setAttribute('aria-label','Otra respuesta: '+labelText(question.prompt,300));
      free.addEventListener('input',()=>{answers[question.id]=free.value;for(const option of opts.children)option.setAttribute('aria-pressed','false');});field.append(free);form.append(field);
    }
    const submit=el('button','secretary-primary','Continuar');submit.type='submit';submit.disabled=busy;form.append(submit);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(questions.some(question=>!String(answers[question.id]||'').trim())){setStatus('Responde a las preguntas para continuar. También puedes escribir abajo.');return;}
      const copy={...answers},message=questions.map(question=>{
        const value=String(copy[question.id]),option=(question.options||[]).find(item=>String(item.value??item.id??item.label)===value);
        return question.prompt+' '+(option?labelText(option.label,160):value);
      }).join('\n');
      submitMessage(message,copy);
    });container.append(form);
  }
  function drawThread(){
    if(!thread)return;
    const nearBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<100;
    thread.replaceChildren();
    if(!messages.length){
      const welcome=el('div','secretary-welcome');welcome.append(icon());
      welcome.append(el('h1','',activeProject()?'Vamos con este proyecto.':'¿Qué hacemos hoy?'));
      welcome.append(el('p','',activeProject()?'Pregúntame por sus tareas, plazos o documentos.':'Preparamos un presupuesto, revisamos una factura o ponemos en orden lo pendiente.'));
      const prompts=el('div','secretary-prompts');
      const texts=activeProject()?['¿Qué queda pendiente en este proyecto?','Enséñame sus documentos','¿Qué debería revisar hoy?']:['Preparar un presupuesto','Crear una factura','¿Qué tengo pendiente de cobrar?'];
      for(const text of texts)prompts.append(button(text,()=>submitMessage(text),'secretary-prompt'));
      welcome.append(prompts);thread.append(welcome);
    }
    for(const record of messages){
      const item=el('article','secretary-turn secretary-turn-'+record.role);item.setAttribute('aria-label',record.role==='user'?'Tú':'Nuestro Secretario');
      const sender=el('div','secretary-sender',record.role==='user'?'Tú':'Nuestro Secretario');if(record.role!=='user')sender.prepend(icon());item.append(sender);
      if(record.response?.trace?.length){
        const details=el('details','secretary-trace');details.append(el('summary','','Actividad realizada'));
        const list=el('ol','');for(const step of record.response.trace.slice(0,8))list.append(el('li','',labelText(step.label,300)));details.append(list);item.append(details);
      }
      item.append(el('div','secretary-bubble',record.content));
      if(record.response?.sources?.length){
        const sources=el('div','secretary-sources');sources.append(el('span','secretary-caption','Fuentes'));
        const received=record.response.sources.slice(0,80);
        for(const source of received.slice(0,4))sources.append(button(labelText(source.label,180)||'Abrir fuente',()=>openSource(source,record.owner),'secretary-source'));
        if(received.length>4){const more=el('details','secretary-more-sources');more.append(el('summary','',`Ver las ${received.length} fuentes`));const rest=el('div','secretary-sources');for(const source of received.slice(4))rest.append(button(labelText(source.label,180)||'Abrir fuente',()=>openSource(source,record.owner),'secretary-source'));more.append(rest);sources.append(more);}
        const sourceCount=Math.max(received.length,Number(record.response.sourceCount)||0,record.response.sources.length);
        if(sourceCount>received.length)sources.append(el('span','secretary-caption',`Se muestran ${received.length} de ${sourceCount} fuentes. Abre la sección para consultar el resto.`));
        item.append(sources);
      }
      for(const action of record.response?.actions||[]){
        const result=actions.get(action.id);
        if(result?.done){item.append(el('p','secretary-action-result',result.message));continue;}
        const target=el('div','secretary-proposal');
        if(result?.message)target.append(el('p','',result.message));
        target.append(button(action.type==='prepare_draft'?'Abrir borrador':labelText(action.label,120)||'Abrir',()=>runAction(action,record.owner),'secretary-action'));
        item.append(target);
      }
      if(record.response){drawQuestions(item,record.response);drawFeedback(item,record);}
      thread.append(item);
    }
    if(busy){const running=el('div','secretary-working','Consultando la información a la que tienes acceso…');running.setAttribute('role','status');thread.append(running);}
    if(nearBottom||busy)thread.scrollTop=thread.scrollHeight;
  }
  function runAction(action,fromOwner){
    try{const message=applyAction(action,fromOwner);actions.set(action.id,{done:true,message});}
    catch(error){actions.set(action.id,{done:false,message:error.message||'No se pudo abrir esta propuesta.'});}
    drawThread();
  }
  function build(){
    panel=el('section','secretary-panel');panel.id='moderno-secretary';panel.setAttribute('aria-label','Nuestro Secretario');
    const header=el('header','secretary-header'),title=el('div','secretary-title');title.append(icon());
    const copy=el('div','');copy.append(el('strong','','Nuestro Secretario'));contextNode=el('span','secretary-context','Finanzas');copy.append(contextNode);title.append(copy);header.append(title);
    const controls=el('div','secretary-controls');
    const settings=el('details','secretary-settings');const summary=el('summary','','•••');summary.setAttribute('aria-label','Opciones del Secretario');settings.append(summary);
    const settingsContent=el('div','secretary-settings-content');settingsContent.append(el('strong','','Tu conversación'));
    settingsContent.append(el('p','','Se conserva mientras trabajas en esta sesión y se vacía al cerrar sesión.'));
    settingsContent.append(button('Vaciar conversación',()=>{reset();home=financeViews.includes(state.view);refresh();},'secretary-button'));
    feedbackHost=el('div','secretary-feedback-settings');settingsContent.append(feedbackHost);drawFeedbackSettings();
    settings.append(settingsContent);controls.append(settings);
    const close=button('Plegar',fold,'secretary-fold');close.setAttribute('aria-label','Plegar el Secretario');controls.append(close);header.append(controls);panel.append(header);
    const shortcuts=el('nav','secretary-shortcuts');shortcuts.setAttribute('aria-label','Accesos directos de Finanzas');
    for(const view of financeViews)if(canView(view))shortcuts.append(button(sectionLabels[view],()=>goDirect(view),'secretary-shortcut'));
    panel.append(shortcuts);
    thread=el('div','secretary-thread');thread.setAttribute('role','log');thread.setAttribute('aria-label','Conversación con el Secretario');thread.setAttribute('aria-live','polite');panel.append(thread);
    const form=el('form','secretary-composer');const inputLabel=el('label','sr-only','Mensaje para el Secretario');inputLabel.htmlFor='secretary-message';form.append(inputLabel);
    composer=el('textarea','');composer.id='secretary-message';composer.rows=2;composer.maxLength=6000;composer.placeholder='Cuéntame qué necesitas…';form.append(composer);
    composer.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
    const composerFoot=el('div','secretary-composer-foot');composerFoot.append(el('span','','Puedes preguntar o pedirme que prepare un borrador.'));
    stopButton=button('Detener',()=>controller?.abort(),'secretary-button');stopButton.hidden=true;composerFoot.append(stopButton);
    sendButton=el('button','secretary-primary','Enviar');sendButton.type='submit';composerFoot.append(sendButton);form.append(composerFoot);
    form.addEventListener('submit',event=>{event.preventDefault();const value=composer.value.trim();if(value)submitMessage(value);});panel.append(form);
    statusNode=el('p','secretary-status','Los documentos se guardan desde su editor.');statusNode.setAttribute('role','status');panel.append(statusNode);drawThread();
  }
  function updateBusy(){if(sendButton)sendButton.disabled=busy;if(composer)composer.disabled=busy;if(stopButton)stopButton.hidden=!busy;}
  function endpoint(){
    const base=new URL(SUPABASE_URL),target=new URL(config.endpoint||base.origin+'/functions/v1/secretario',location.origin);
    // An auth token may only reach the configured app backend, never a URL from a model response.
    if(target.origin!==base.origin||target.protocol!=='https:'||target.pathname!=='/functions/v1/secretario')throw Error('La conexión del Secretario todavía no está configurada.');
    return target.href;
  }
  async function submitMessage(content,answerValues){
    if(busy||!content?.trim())return;
    checkIdentity();if(!ready()){setStatus('Inicia sesión para consultar al Secretario.');return;}
    const captured=identity,epoch=generation,current=++requestCounter;
    let history;
    try{const recent=bridge.recentHistory(messages.filter(item=>item.role==='user'||item.response),content);history=recent.history;contextTrimmed=recent.trimmed;}
    catch(error){setStatus(error.message);return;}
    appendMessage('user',content);questions=[];answers={};busy=true;controller=new AbortController();updateBusy();drawThread();
    if(composer)composer.value='';setStatus('Puedes detener la consulta cuando quieras.');
    try{
      const client=sb;if(!client?.auth)throw Error('La conexión del Secretario todavía no está configurada.');
      const {data,error}=await client.auth.getSession(),session=data?.session;
      if(error||!session?.access_token||session.user?.id!==state.sessionUser?.id)throw Error('Comprueba tu sesión para seguir con el Secretario.');
      if(epoch!==generation||captured!==owner())return;
      const project=activeProject();feedbackTask=project?'project_question':'finance_question';
      const response=await fetch(endpoint(),{method:'POST',credentials:'omit',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
        body:JSON.stringify({studyId:ESTUDIO_ID,message:content,history,context:{view:home?'finanzas':state.view,...(project?{projectId:project.id}:{})},...(answerValues?{answers:answerValues}:{})})});
      const payload=await response.json().catch(()=>null);
      if(epoch!==generation||captured!==owner()||current!==requestCounter)return;
      if(!response.ok){
        const code=payload?.error?.code;
        if(response.status===401||response.status===403)throw Error('No puedo consultar esos datos con tu sesión actual. Comprueba tu acceso.');
        if(response.status===429)throw Error('El Secretario ha alcanzado su límite temporal. Prueba de nuevo más tarde.');
        if(['not_configured','provider_unavailable','service_unavailable','SECRETARY_NOT_CONFIGURED'].includes(code)||response.status>=500)throw Error('El Secretario todavía no está disponible. Puedes seguir usando las pantallas y editores de Finanzas.');
        throw Error('No he podido completar la consulta. Puedes volver a intentarlo.');
      }
      if(!payload||!['answer','clarifying','proposal'].includes(payload.status)||typeof payload.message!=='string')throw Error('La respuesta no se pudo mostrar. Vuelve a intentarlo.');
      const safe={...payload,sources:Array.isArray(payload.sources)?payload.sources:[],trace:Array.isArray(payload.trace)?payload.trace.filter(step=>step.status==='done'):[],
        actions:Array.isArray(payload.actions)?payload.actions.filter(action=>['navigate','prepare_draft'].includes(action.type)).slice(0,4):[]};
      safe.actions=safe.actions.map((action,index)=>({...action,id:String(payload.requestId||current)+':'+String(action.id||index)}));
      questions=Array.isArray(payload.questions)?payload.questions.filter(question=>typeof question.id==='string'&&typeof question.prompt==='string').slice(0,6).map(question=>({...question,options:Array.isArray(question.options)?question.options.slice(0,8):[]})):[];
      if(safe.actions.some(action=>action.type==='prepare_draft')){const draft=safe.actions.find(action=>action.type==='prepare_draft').payload;feedbackTask=draft.sourceQuoteRef?'invoice_from_quote':draft.kind==='factura'?'invoice_create':'quote_create';}
      else if(safe.actions.some(action=>action.type==='navigate'))feedbackTask='navigation';
      unavailable=false;const record=appendMessage('assistant',payload.message,safe);record.feedbackTask=feedbackTask;
      for(const action of safe.actions){if(epoch!==generation||captured!==owner())break;runAction(action,captured);}
      setStatus(questions.length?'Puedes elegir una opción o escribir tu respuesta.':'Los documentos se guardan desde su editor.');
    }catch(error){
      if(epoch!==generation||captured!==owner()||current!==requestCounter)return;
      if(error.name==='AbortError')appendMessage('assistant','Consulta detenida. Puedes seguir cuando quieras.');
      else{unavailable=true;appendMessage('assistant',error.message||'El Secretario no está disponible ahora. Los editores siguen accesibles.');}
      setStatus(unavailable?'Tus documentos siguen disponibles en los accesos directos.':'Consulta detenida.');
    }finally{
      if(epoch===generation&&captured===owner()&&current===requestCounter){busy=false;controller=null;updateBusy();drawThread();composer?.focus();}
      else checkIdentity();
    }
  }
  function schedulePosition(){
    if(positionQueued)return;positionQueued=true;
    requestAnimationFrame(()=>{positionQueued=false;position();});
  }
  function position(){
    const surface=collapsed?document.getElementById('secretary-reopen'):panel;
    if(!surface?.isConnected||home&&!collapsed)return;
    const sources=[...document.querySelectorAll('#syncTag,#project-window-bar,.project-tabs.project-dock,#desktop-header .desktop-inset-header,#mHeader')];
    if(positionResize){
      for(const node of positionSources)if(!sources.includes(node))positionResize.unobserve(node);
      for(const node of sources)if(!positionSources.includes(node))positionResize.observe(node);
      positionSources=sources;
    }
    const screenHeight=window.innerHeight,rect=surface.getBoundingClientRect();
    let top=76,bottom=window.innerWidth<=900?16:48;
    for(const node of sources){
      const style=getComputedStyle(node),box=node.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||!box.width||!box.height)continue;
      const overlapsHorizontally=rect.left<box.right&&rect.right>box.left;
      if(node.id==='syncTag'||node.matches('.project-dock')&&box.bottom>screenHeight/2){
        if(overlapsHorizontally)bottom=Math.max(bottom,screenHeight-box.top+12);
      }else if(overlapsHorizontally&&box.bottom<screenHeight/2)top=Math.max(top,box.bottom+14);
    }
    if(collapsed){surface.style.bottom=bottom+'px';return;}
    panel.style.setProperty('--secretary-top',top+'px');
    panel.style.setProperty('--secretary-bottom',bottom+'px');
  }
  function refresh(){
    checkIdentity();
    if(!ready()||!supported()){clearLayout();lastView=state.view;return;}
    if(homePending&&financeViews.includes(state.view)&&!draftEditing()){home=true;homePending=false;}
    if(lastView==null&&state.view==='informes')home=true;
    if(!financeViews.includes(state.view))home=false;
    const projectId=activeProject()?.id||null,changedView=lastView!==state.view||lastProject!==projectId;
    if(changedView&&['proyecto','estancia'].includes(state.view))collapsed=false;
    lastView=state.view;lastProject=projectId;
    if(!panel)build();
    document.body.classList.add('secretary-on');document.body.classList.toggle('secretary-home',home&&!collapsed);
    document.body.classList.toggle('secretary-lateral',!home&&!collapsed);document.body.classList.toggle('secretary-folded',collapsed);
    panel.classList.toggle('is-home',home);panel.hidden=collapsed;
    contextNode.textContent=activeProject()?.name||'Finanzas';
    // Fixed lateral UI belongs to the viewport, outside project animations and
    // containing blocks. The central conversation remains ordinary view content.
    const mount=home?document.getElementById('view'):document.body;
    if(panel.parentElement!==mount)mount?.append(panel);
    document.getElementById('secretary-reopen')?.remove();
    if(collapsed){const reopen=button('Nuestro Secretario',unfold,'secretary-reopen');reopen.id='secretary-reopen';reopen.prepend(icon());document.body.append(reopen);}
    updateBusy();position();schedulePosition();if(changedView&&!messages.length)drawThread();if(!feedbackError)loadFeedback();
  }
  const previousRender=render;
  render=function(){panel?.remove();const result=previousRender.apply(this,arguments);refresh();return result;};
  const previousGo=go;
  go=function(view,arg){
    const before=state.view,requestedHome=homePending,result=previousGo.apply(this,arguments);
    if(state.view!==before&&!requestedHome)home=false;
    refresh();return result;
  };
  document.addEventListener('click',event=>{
    if(!ready())return;
    const finance=event.target.closest?.('.desktop-finance,#ngFin>.nav-head');
    if(finance){event.preventDefault();event.stopImmediatePropagation();openFinance();return;}
    if(event.target.closest?.('#page-route-bar')){home=false;homePending=false;}
  },true);
  window.addEventListener('resize',schedulePosition);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',schedulePosition);
  new MutationObserver(schedulePosition).observe(document.body,{childList:true});
  window.addEventListener('storage',handleFeedbackStorage);
  if(sb?.auth?.onAuthStateChange){
    const result=sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id&&session.user.id!==state.sessionUser?.id)reset();});authSubscription=result?.data?.subscription;
  }
  refresh();
  return Object.freeze({enabled:true,openFinance,refresh,reset});
})();
