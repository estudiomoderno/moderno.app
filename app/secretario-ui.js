/* A single, session-scoped Secretary in the existing vanilla app.
   No conversation, document or credential is written to browser storage. */
var ModernoSecretary=(()=>{
  'use strict';
  const config=window.MODERNO_SECRETARY_CONFIG;
  if(config?.enabled!==true)return Object.freeze({enabled:false,refresh(){},reset(){},openFinance(){return false;}});
  const bridge=window.ModernoSecretaryBridge;
  if(!bridge)return Object.freeze({enabled:false,refresh(){},reset(){},openFinance(){return false;}});
  const financeViews=['informes','facturas','contabilidad','presupuestos','prevision'];
  const financeShortcuts=[['informes','Resumen'],['facturas','Facturas'],['contabilidad','Gastos'],['presupuestos','Presupuestos']];
  const financeDesktopMedia=window.matchMedia?.('(min-width:1100px) and (hover:hover) and (pointer:fine)');
  const desktopFinance=()=>financeDesktopMedia?.matches&&document.body.classList.contains('desktop-shell')&&financeViews.includes(state.view);
  const supported=()=>financeViews.includes(state.view)||['proyecto','estancia','presedit'].includes(state.view);
  const owner=()=>JSON.stringify([ESTUDIO_ID||'',state.sessionUser?.id||'',_accessRole||'']);
  const ready=()=>!_accessLoading&&!!ESTUDIO_ID&&!!state.sessionUser?.id&&['admin','miembro','colaborador'].includes(_accessRole)&&!state.portalAnon;
  let identity=owner(),messages=[],panel=null,thread=null,composer=null,sendButton=null,stopButton=null,statusNode=null,titleNode=null,contextNode=null,announcementNode=null;
  let collapsed=false,home=false,homePending=false,lastView=null,lastProject=null,busy=false,controller=null,generation=0,unavailable=false,authSubscription=null;
  let documentOpen=false,preview=null,returnButton=null,exitButton=null,foldButton=null,launcher=null;
  let expenseOverlay=null;
  let nativeFinance=false,financeTransition=null,questionTarget=null;
  let pendingBubble=null,revealingReply=null;
  let requestCounter=0,actions=new Map(),questions=[],answers={},pendingAnswers={},feedbackTask='finance_question',contextTrimmed=false,historyStart=0;
  let activeActivity=null,requestContext=null,contextInterrupted=false;
  const characterPath='/brand/secretario/lavanda/';
  const characterMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let characterState='espera',characterLabel='Secretario disponible',characterUntil=0,characterTimer=null,characterUnread=false,characterActive=null;
  const characterObserver=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(()=>drawCharacter()):null;
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
  function modeButton(label,handler){
    const control=button(label,handler,'secretary-mode-button');
    const glyph=document.createElementNS('http://www.w3.org/2000/svg','svg');
    glyph.setAttribute('viewBox','0 0 24 24');glyph.setAttribute('aria-hidden','true');
    for(const data of ['M9.937 15.5A2 2 0 0 0 8.5 14.063L2 12l6.5-2.063A2 2 0 0 0 9.937 8.5L12 2l2.063 6.5A2 2 0 0 0 15.5 9.937L22 12l-6.5 2.063a2 2 0 0 0-1.437 1.437L12 22z','M5 3v4m-2-2h4m12 12v4m-2-2h4']){
      const path=document.createElementNS(glyph.namespaceURI,'path');path.setAttribute('d',data);glyph.append(path);
    }
    control.prepend(glyph);return control;
  }
  const labelText=(value,max=500)=>typeof value==='string'?value.slice(0,max):'';
  function structuredFor(previous,current){
    if(!current)return {};
    if(current.receivable_scope!==undefined)return {...current};
    const before=previous||{},fullResetKeys=new Set(['draftId','quoteRef','brand']),relationKeys=new Set(['projectId','clientId']);
    const changed=(key,value)=>before[key]!==value;
    const entries=Object.entries(current),resetAll=entries.some(([key,value])=>(fullResetKeys.has(key)||relationKeys.has(key))&&changed(key,value));
    let merged=resetAll?{}:{...before};
    // A client that belongs to both spaces needs client + brand to survive as a
    // single clarification chain. The server validates the combination again,
    // so retaining these relation answers cannot bind an incompatible record.
    if(resetAll&&current.brand!==undefined){
      if(before.clientId!==undefined)merged.clientId=before.clientId;
      if(before.projectId!==undefined)merged.projectId=before.projectId;
    }
    if(resetAll&&current.clientId!==undefined){
      if(before.brand!==undefined)merged.brand=before.brand;
      if(before.projectId!==undefined)merged.projectId=before.projectId;
    }
    if(resetAll&&current.projectId==='none'){
      if(current.clientId===undefined&&before.clientId!==undefined)merged.clientId=before.clientId;
      if(current.brand===undefined&&before.brand!==undefined)merged.brand=before.brand;
    }
    for(const [key,value] of Object.entries(current)){
      const match=key.match(/^line\.(\d+)\.catalogId$/);
      if(match&&before[key]!==undefined&&before[key]!==value){delete merged[`line.${match[1]}.qty`];delete merged[`line.${match[1]}.price`];}
    }
    return {...merged,...current};
  }
  function pendingAfter(status,candidate){return status==='clarifying'?{...(candidate||{})}:{};}
  const activeProject=()=>['proyecto','estancia'].includes(state.view)?state.projects?.find(p=>p.id===state.currentProject):null;
  const secretaryName=()=>activeProject()?'Nuestro Secretario':'Secretario de Finanzas';
  function icon(presence){
    const image=el('img','secretary-logo secretary-character');image.src=characterPath+'espera.png';image.alt='';image.width=512;image.height=512;image.draggable=false;
    image.dataset.characterState='espera';image.dataset.animated='false';
    if(presence)image.dataset.secretaryPresence=presence;
    return image;
  }
  function drawCharacter(){
    const reopen=launcher?.dataset.mode==='project'?launcher:null;
    const candidate=ready()&&supported()?(collapsed?reopen?.querySelector('[data-secretary-presence]'):panel?.querySelector('.secretary-welcome [data-secretary-presence]')||panel?.querySelector('[data-secretary-presence="header"]')):null;
    const active=candidate?.isConnected?candidate:null;
    if(characterActive!==active){
      if(characterActive)characterObserver?.unobserve(characterActive);
      characterActive=active;if(active)characterObserver?.observe(active);
    }
    const visual=window.visualViewport,top=visual?.offsetTop||0,left=visual?.offsetLeft||0;
    const box=active?.getBoundingClientRect();
    const visible=!!box&&box.width>0&&box.height>0&&box.bottom>top&&box.top<top+(visual?.height||window.innerHeight)&&box.right>left&&box.left<left+(visual?.width||window.innerWidth);
    const animate=visible&&!document.hidden&&!characterMotion?.matches&&performance.now()<characterUntil;
    for(const image of [panel,reopen].filter(Boolean).flatMap(node=>Array.from(node.querySelectorAll('[data-secretary-presence]')))){
      const current=image===active,state=current?characterState:'espera',moving=current&&animate;
      const src=characterPath+state+(moving?'.webp':'.png');
      if(image.getAttribute('src')!==src)image.src=src;
      image.dataset.characterState=state;image.dataset.animated=String(moving);
    }
    if(panel){panel.dataset.characterState=characterState;panel.classList.toggle('has-welcome',!messages.length);}
    if(reopen){
      const opening='Modo IA';
      const label=characterUnread||busy?opening+', '+characterLabel.toLocaleLowerCase('es'):opening;
      reopen.dataset.characterState=characterState;reopen.dataset.unread=String(characterUnread);
      reopen.setAttribute('aria-label',label);reopen.title=label;
    }
  }
  function setCharacter(state,label,{notify=false,animate=true}={}){
    clearTimeout(characterTimer);characterTimer=null;
    characterState=state;characterLabel=label;
    if(notify&&collapsed)characterUnread=true;
    const duration={espera:6000,terminado:4000,aviso:5000}[state];
    characterUntil=!animate?0:duration?performance.now()+duration:Infinity;
    if(duration&&animate)characterTimer=setTimeout(()=>{
      characterTimer=null;characterUntil=0;
      if(characterState==='terminado'){characterState='espera';if(!characterUnread)characterLabel='Secretario disponible';}
      drawCharacter();
    },duration);
    drawCharacter();
  }
  function resetCharacter(){
    clearTimeout(characterTimer);characterTimer=null;characterObserver?.disconnect();characterActive=null;
    characterState='espera';characterLabel='Secretario disponible';characterUntil=0;characterUnread=false;
  }
  function messageAvatar(role){
    const avatar=el('span','secretary-avatar');
    if(role==='assistant'){
      avatar.append(icon());
      if(!unavailable&&navigator.onLine!==false){
        const badge=el('span','secretary-avatar-badge');
        badge.append(el('span','sr-only','Secretario activo en esta sesión'));avatar.append(badge);
      }
    }else{
      const user=state.sessionUser;
      const initials=(user?.name||'Tú').trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase('es');
      avatar.append(el('span','',initials||'T'));
      const photo=window.ModernoHeaderPresence?.photo(user?.avatar);
      if(photo){
        const image=el('img','');image.alt='';image.referrerPolicy='no-referrer';
        image.addEventListener('error',()=>image.remove(),{once:true});image.src=photo;avatar.append(image);
      }
    }
    return avatar;
  }
  function reset(){
    resetCharacter();
    clearTimeout(revealingReply?.timer);revealingReply=null;pendingBubble=null;
    finishFinanceTransition();nativeFinance=false;questionTarget=null;
    generation++;controller?.abort();messages.forEach(record=>record.pageController?.abort());controller=null;busy=false;messages=[];actions.clear();questions=[];answers={};pendingAnswers={};contextTrimmed=false;historyStart=0;
    feedbackOperation++;feedback?.setContext(null);feedbackLoaded=false;feedbackLoading=false;feedbackRevision=null;feedbackError='';feedbackHost=null;
    panel?.remove();panel=null;thread=null;composer=null;titleNode=null;contextNode=null;announcementNode=null;identity=owner();collapsed=false;home=false;homePending=false;unavailable=false;lastView=null;lastProject=null;requestContext=null;contextInterrupted=false;
    activeActivity=null;documentOpen=false;preview?.node.remove();preview=null;returnButton=null;exitButton=null;foldButton=null;
    stopExpenseOverlay();
    document.body.classList.remove('secretary-home','secretary-lateral','secretary-folded','secretary-on','secretary-previewing','secretary-document-open','secretary-ai-finance');
    showLauncher(null);
  }
  function checkIdentity(){if(identity!==owner()){reset();return false;}return true;}
  function clearLayout(){
    panel?.remove();
    preview?.node.remove();preview=null;documentOpen=false;
    stopExpenseOverlay();
    document.body.classList.remove('secretary-home','secretary-lateral','secretary-folded','secretary-on','secretary-previewing','secretary-document-open','secretary-ai-finance');
    drawCharacter();
  }
  function busyEditor(view,projectId,onExit){
    if(document.querySelector('.overlay.open,dialog[open]')){toast('Termina o cierra la ventana abierta para continuar.');return true;}
    if(draftEditing()&&draftDirty()){draftExitModal(view,projectId,onExit);return true;}
    return false;
  }
  function goDirect(view,projectId){
    if(!canView(view))return false;
    if(busyEditor(view,projectId,()=>goDirect(view,projectId)))return false;
    preview?.node.remove();preview=null;documentOpen=false;home=false;homePending=false;
    go(view,projectId);refresh();return state.view===view&&(projectId==null||state.currentProject===projectId);
  }
  const expenseObserver=new MutationObserver(()=>{
    if(!expenseOverlay||expenseOverlay.classList.contains('open'))return;
    stopExpenseOverlay();refresh();
    if(home)composer?.focus({preventScroll:true});
  });
  function stopExpenseOverlay(){
    if(!expenseOverlay)return;
    expenseObserver.disconnect();expenseOverlay=null;document.body.classList.remove('secretary-expense-open');
  }
  function observeExpenseOverlay(){
    const overlay=document.getElementById('overlay');
    if(!overlay?.classList.contains('open'))return;
    expenseOverlay=overlay;expenseObserver.observe(overlay,{attributes:true,attributeFilter:['class']});
    document.body.classList.add('secretary-expense-open');
  }
  function openFinanceGenerator(view,fromOwner=owner()){
    if(!checkIdentity()||identity!==fromOwner||!ready()||!desktopFinance()||!canView(view)||financeTransition)return;
    if(busyEditor(view,undefined,()=>openFinanceGenerator(view,fromOwner)))return;
    if(!window.ModernoPageBreadcrumbs?.openGenerator(view))return;
    if(view==='contabilidad')observeExpenseOverlay();
    refresh();
    if(view!=='contabilidad'){
      const heading=document.querySelector('#view .finance-document-editor h1');
      heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
    }
  }
  function enterFinance(first){
    nativeFinance=false;homePending=true;collapsed=false;characterUnread=false;preview?.node.remove();preview=null;
    go(first);
    if(state.view!==first)return false;
    home=true;homePending=false;refresh();return true;
  }
  function openFinance(){
    checkIdentity();if(!ready()||financeTransition)return false;
    const first=financeViews.find(view=>canView(view));if(!first)return false;
    if(busyEditor(first,undefined,openFinance))return false;
    const opened=enterFinance(first);
    if(opened)composer?.focus({preventScroll:true});
    return opened;
  }
  function finishFinanceTransition(){
    if(!financeTransition)return;
    const {overlay,workspace,wasInert}=financeTransition;
    financeTransition=null;
    for(const animation of overlay.getAnimations({subtree:true}))animation.cancel();
    overlay.remove();
    workspace.inert=wasInert;
    if(launcher)launcher.disabled=false;
    if(panel)panel.inert=false;
  }
  function positionFinanceTransition(){
    if(!financeTransition)return;
    const {overlay,workspace}=financeTransition,area=workspace.getBoundingClientRect(),visual=window.visualViewport;
    const header=document.querySelector('#desktop-header .desktop-inset-header')||document.getElementById('mHeader');
    const top=visual?.offsetTop||0,left=visual?.offsetLeft||0;
    overlay.style.top=Math.max(area.top,header?.getBoundingClientRect().bottom||0,top)+'px';
    overlay.style.left=Math.max(area.left,left)+'px';
    overlay.style.right=Math.max(0,window.innerWidth-Math.min(area.right,left+(visual?.width||window.innerWidth)))+'px';
    overlay.style.bottom=Math.max(0,window.innerHeight-Math.min(area.bottom,top+(visual?.height||window.innerHeight)))+'px';
  }
  function openNormalFinance(){return changeFinanceMode(false);}
  function applyFinanceMode(enter,first){
    if(enter)return enterFinance(first);
    if(busy){contextInterrupted=true;controller?.abort();}
    finishReply();
    nativeFinance=true;home=false;homePending=false;collapsed=false;
    preview?.node.remove();preview=null;
    go(first);return state.view===first;
  }
  function focusFinanceMode(enter){(enter?composer:launcher)?.focus({preventScroll:true});}
  async function changeFinanceMode(enter){
    checkIdentity();
    const first=financeViews.find(view=>canView(view));
    if(!ready()||!first||financeTransition)return;
    if(busyEditor(first,undefined,()=>changeFinanceMode(enter)))return;
    const workspace=document.querySelector('.main');
    const overlay=el('div','secretary-finance-loading');
    if(!workspace||characterMotion?.matches||document.hidden||typeof overlay.animate!=='function'){
      if(applyFinanceMode(enter,first))focusFinanceMode(enter);
      return;
    }
    const origin=currentContext(),epoch=generation,captured=owner();
    const current=()=>financeTransition?.overlay===overlay&&epoch===generation&&captured===owner()&&ready();
    const mark=icon();mark.classList.add('secretary-mode-mark');
    overlay.dataset.direction=enter?'enter':'exit';
    overlay.setAttribute('role','status');
    overlay.append(mark,el('span','',enter?'Abriendo Modo IA…':'Cargando Finanzas…'));
    const transition={overlay,workspace,wasInert:workspace.inert,switching:false};
    financeTransition=transition;
    document.body.append(overlay);workspace.inert=true;
    if(launcher)launcher.disabled=true;
    if(panel)panel.inert=true;
    positionFinanceTransition();
    const phase=(name,opacity,markFrames,duration)=>{
      overlay.dataset.phase=name;
      const timing={duration,easing:'cubic-bezier(.2,.65,.3,1)',fill:'both'};
      const animations=[overlay.animate(opacity,timing),mark.animate(markFrames,timing)];
      return Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
    };
    let switched=false;
    try{
      const approach=enter?[{transform:'scale(.78)',opacity:.3},{transform:'scale(1)',opacity:1}]:
        [{transform:'scale(1)'},{transform:'scale(1)'}];
      await phase('cover',[{opacity:0},{opacity:1}],approach,150);
      if(!current()||!sameContext(origin)||document.querySelector('.overlay.open,dialog[open]'))return;
      transition.switching=true;
      switched=applyFinanceMode(enter,first);
      transition.switching=false;
      if(switched&&current()&&!characterMotion?.matches&&!document.hidden){
        const end=enter?'scale(1)':'scale(.68)';
        await phase('reveal',[{opacity:1},{opacity:0}],[{transform:'scale(1)'},{transform:end}],185);
      }
    }finally{
      if(financeTransition?.overlay===overlay){
        const focus=switched&&current()&&state.view===first;
        finishFinanceTransition();
        if(focus)focusFinanceMode(enter);
      }
    }
  }
  function showLauncher(mode){
    if((launcher?.dataset.mode??null)===mode)return;
    launcher=mode==='finance'?modeButton('Modo IA',()=>changeFinanceMode(true)):mode==='project'?button('Modo IA',unfold,'secretary-reopen'):null;
    if(launcher){
      launcher.id='secretary-reopen';launcher.classList.add('secretary-reopen');launcher.dataset.mode=mode;
      launcher.lastChild.replaceWith(el('span','secretary-launch-label','Modo IA'));
      launcher.title='Modo IA';launcher.setAttribute('aria-label','Modo IA');launcher.setAttribute('aria-controls','moderno-secretary');launcher.setAttribute('aria-expanded','false');
      launcher.disabled=!!financeTransition;
      if(mode==='project')launcher.prepend(icon('launcher'));
    }
    window.ModernoHeaderActions?.setSecretaryControl(launcher);
  }
  function returnToConversation(){
    if(!ready())return;
    if(preview){preview.node.remove();preview=null;}
    if(document.querySelector('#view .finance-document-editor')&&draftEditing()){
      if(draftDirty()){openFinance();return;}
      state.draft=null;state.fView=null;state.qView=null;
      home=true;collapsed=false;render();
    }else{
      if(!supported()||state.view==='presedit'){openFinance();return;}
      home=true;collapsed=false;refresh();
    }
    composer?.focus();
  }
  function fold(){finishReply();collapsed=true;refresh();document.getElementById('secretary-reopen')?.focus();}
  function unfold(){collapsed=false;characterUnread=false;refresh();composer?.focus();}
  function snapshot(){
    const dirtyBlocks=bridge.BLOCKS.filter(key=>!_cloudHash[key]||!CLOUD_BLOCKS[key]||canon(CLOUD_BLOCKS[key].get())!==_cloudHash[key]);
    return {role:_accessRole,studyId:ESTUDIO_ID,clients:state.clients,projects:state.projects,quotes:state.quotes,drafts:state.borradores,brands:visibleWsOrder(),irpf:state.irpf,
      versions:_cloudSeen,dirtyBlocks,canView,today:new Date().toISOString().slice(0,10)};
  }
  function currentSourceVersions(versions){
    return !versions||Object.entries(versions).every(([block,version])=>_cloudSeen[block]===version&&CLOUD_BLOCKS[block]&&_cloudHash[block]===canon(CLOUD_BLOCKS[block].get()));
  }
  function applyAction(action,fromOwner){
    if(!checkIdentity()||identity!==fromOwner||!ready())throw Error('La sesión ha cambiado. Vuelve a hacer la consulta.');
    if(action?.type==='navigate'){
      const target=bridge.navigation(action.payload,{projects:state.projects,canView});
      const opensSecretary=action.payload.view==='finanzas'&&(!desktopFinance()||action.openImmediately!==true);
      const ok=opensSecretary?openFinance():goDirect(target.view,target.projectId);
      if(!ok)throw Error('La navegación está esperando a que termines la edición abierta.');
      return 'Pantalla abierta.';
    }
    if(action?.type==='open_document'){
      if(!currentSourceVersions(action.sourceVersions))
        throw Error('El documento ha cambiado. Vuelve a consultarlo para abrir su versión actual.');
      if(!openSource(action.payload,fromOwner,{mode:action.viewMode,sourceVersions:action.sourceVersions}))throw Error('No se pudo abrir el documento. Comprueba que sigue disponible.');
      return '';
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
  function mountPreview(title,description,source){
    const section=el('section','finance-page secretary-document-preview');
    const heading=el('h1','big',title);heading.tabIndex=-1;
    section.append(button('← Volver a la conversación',returnToConversation),heading);
    if(description)section.append(el('p','',description));
    preview?.node.remove();
    preview={node:section,view:state.view,project:state.currentProject,source:bridge.sourcePointer(source)};home=false;homePending=false;collapsed=false;refresh();
    if(desktopFinance())heading.focus({preventScroll:true});
    return section;
  }
  async function addPreviewFile(section,file,refreshFile=false,stillCurrent){
    if(!fileSrc(file))return;
    const content=await fileResolveForView(file,{refresh:refreshFile});
    if(!content||preview?.node!==section||stillCurrent&&!stillCurrent())return;
    const url=new URL(content,location.origin);
    if(!['https:','http:','blob:','data:'].includes(url.protocol))return;
    const type=String(file.type||'');
    if((type==='application/pdf'||/\.pdf$/i.test(file.name||''))&&(url.protocol!=='data:'||/^data:application\/pdf[;,]/i.test(url.href))){
      const frame=el('iframe','secretary-preview-pdf');
      frame.title=file.name||'Documento PDF';frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';frame.src=url.href;section.append(frame);
    }else if(type.startsWith('image/')&&(url.protocol!=='data:'||/^data:image\//i.test(url.href))){
      const image=el('img','secretary-preview-image');image.alt=file.name||'Documento';image.src=url.href;section.append(image);
    }
    if(url.protocol==='data:'&&!/^data:(?:image\/|application\/pdf[;,]|application\/octet-stream[;,])/i.test(url.href))return;
    const link=el('a','secretary-button','Descargar archivo');link.href=url.href;link.download=file.name||'documento';link.target='_blank';link.rel='noopener noreferrer';section.append(link);
    return true;
  }
  function nativeFinancialDocument(source){
    const documents=source.kind==='invoice'?state.invoices:state.quotes;
    const matches=documents.map((doc,index)=>({doc,index})).filter(({doc})=>doc?.ref===String(source.id)&&
      String(doc.brand??'')===String(source.brand??'')&&String(doc.projectId??doc.pid??'')===String(source.projectId??''));
    if(matches.length!==1||source.kind==='invoice'&&state.docsDel?.[source.id])return null;
    return matches[0];
  }
  function invoiceMovement(source){
    const entries=state.entries.filter(entry=>entry?.kind==='in'&&entry.link===String(source.id)&&String(entry.brand??'')===String(source.brand??'')&&
      String(entry.pid??entry.projectId??'')===String(source.projectId??'')&&!state.entriesDel?.[entry.id]);
    return entries.length===1?entries[0]:null;
  }
  const pdfAttachment=file=>!!fileSrc(file)&&(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''));
  function previewAttachment(section,file,mode,stillCurrent){
    const pdf=pdfAttachment(file),canOpen=fileSrc(file)&&(!mode||mode!=='pdf'||pdf);
    if(!canOpen){section.append(el('p','secretary-caption','No hay un PDF adjunto.'));return;}
    const status=el('p','secretary-caption','');status.setAttribute('role','status');
    const control=button(pdf?'Ver PDF adjunto':'Ver archivo adjunto',()=>openFile());
    section.append(control,status);
    async function openFile(){
      if(preview?.node!==section||!stillCurrent()){status.textContent='El documento cambió. Vuelve a consultarlo para abrir su archivo.';return;}
      control.disabled=true;status.textContent='Abriendo el archivo…';
      let opened=false;
      try{opened=await addPreviewFile(section,file,true,stillCurrent);}catch{}
      if(preview?.node!==section)return;
      if(!stillCurrent()){status.textContent='El documento cambió. Vuelve a consultarlo para abrir su archivo.';return;}
      if(opened){control.remove();status.textContent=pdf?'PDF adjunto disponible.':'Archivo adjunto disponible.';return;}
      status.textContent='El documento está registrado, pero no he podido abrir su archivo.';
      control.disabled=false;control.textContent='Reintentar apertura';
    }
    if(mode==='pdf')openFile();
  }
  function appendFinancialLines(section,doc,currency){
    const lines=Array.isArray(doc.lines)?doc.lines.filter(line=>line&&lineOn(line)):[];
    if(!lines.length)return;
    const table=el('table','lines secretary-preview-lines'),body=el('tbody');
    const head=el('tr');
    for(const text of ['Concepto','Cantidad','Precio unitario']){const cell=el('th','',text);cell.scope='col';head.append(cell);}
    const header=el('thead');header.append(head);table.append(header);
    for(const line of lines){
      const row=el('tr'),amount=Number(line.price);
      row.append(el('td','',labelText(line.name||line.c||line.concept,600)),
        el('td','',Number.isFinite(Number(line.qty))&&line.qty!=null?`${line.qty} ${unitLabel(line.unit)}`:''),
        el('td','',Number.isFinite(amount)&&line.price!=null&&currency?invoiceMoney(amount,currency):''));
      body.append(row);
    }
    table.append(body);section.append(table);
  }
  function openFinancialSource(source,fromOwner,{mode='read',sourceVersions}={}){
    const kind=source.kind,view=kind==='quote'?'presupuestos':kind==='entry'?'contabilidad':'facturas';
    const block=kind==='quote'?'presupuestos':'facturas';
    sourceVersions??={[block]:source.sourceVersion??_cloudSeen[block]};
    if(_accessRole!=='admin'||!canView(view)||typeof sourceVersions[block]!=='string'||!currentSourceVersions(sourceVersions))return false;
    const movement=kind==='entry'||kind==='invoice_entry';
    const native=movement?null:nativeFinancialDocument(source),doc=movement?invoiceEntry(source):native?.doc;
    if(!doc)return false;
    const reopen=()=>{if(!openSource(source,fromOwner,{mode,sourceVersions}))setStatus('El documento ya no está disponible. Vuelve a buscarlo.');};
    if(busyEditor(view,undefined,reopen))return true;
    if(mode==='edit'){
      const documents=kind==='quote'?state.quotes:state.invoices;
      if(!movement&&(!Array.isArray(doc.lines)||documents.filter(item=>item?.ref===doc.ref).length!==1))return false;
      preview?.node.remove();preview=null;home=false;homePending=false;collapsed=false;
      if(movement){editEntry(doc.id);observeExpenseOverlay();refresh();return true;}
      loadDoc(native.index,kind==='quote'?'presupuesto':'factura');
      if(state.draft?.editRef===doc.ref)draftTrack(state.draft);
      refresh();return state.draft?.editRef===doc.ref;
    }
    const {party,meta,amount,status}=documentCardDetails(source);
    const title=labelText(source.label,160)||String(source.id),section=mountPreview(title,party,source);
    section.append(el('p','secretary-caption','Versión actual del registro · Solo lectura'));
    if(meta)section.append(el('p','',meta));
    if(status)section.append(el('p','',status));
    const currency=source.currency||doc.currency||state.account?.currency;
    const pending=Number.isFinite(source.pending)&&source.pending>0;
    if(amount)section.append(el('p','',(pending?'Pendiente ':'Total registrado ')+amount));
    const registeredTotal=doc.total??doc.amount;
    if(pending&&Number.isFinite(registeredTotal)&&/^[A-Z]{3}$/.test(currency))section.append(el('p','',`Total registrado ${invoiceMoney(registeredTotal,currency)}`));
    appendFinancialLines(section,doc,/^[A-Z]{3}$/.test(currency)?currency:'');
    if(doc.legend)section.append(el('p','',labelText(doc.legend,2000)));
    const stillCurrent=()=>owner()===fromOwner&&ready()&&_accessRole==='admin'&&canView(view)&&currentSourceVersions(sourceVersions)&&
      (movement?invoiceEntry(source):nativeFinancialDocument(source)?.doc)===doc;
    const file=fileSrc(doc.file)?doc.file:kind==='invoice'?invoiceMovement(source)?.file:null;
    previewAttachment(section,file,mode,stillCurrent);
    if(native&&Array.isArray(doc.lines)&&!pdfAttachment(file)){
      section.append(button('Abrir editor para generar PDF',reopenWithEditor));
      section.append(el('p','secretary-caption','El PDF que generes reflejará la versión actual del documento.'));
    }
    function reopenWithEditor(){
      if(!stillCurrent()||!openSource(source,fromOwner,{mode:'edit',sourceVersions}))setStatus('El documento ya no está disponible. Vuelve a buscarlo.');
    }
    return true;
  }
  function openPayable(source,fromOwner,sourceVersion){
    if(!checkIdentity()||identity!==fromOwner||!ready()||_accessRole!=='admin'||!canView('contabilidad'))return false;
    const invoices=CLOUD_BLOCKS.facturas;
    if(!invoices||sourceVersion!==_cloudSeen.facturas||_cloudHash.facturas!==canon(invoices.get()))return false;
    const matches=state.entries.filter(entry=>entry&&String(entry.id)===source.id);
    const [entry]=matches;
    if(matches.length!==1||entry.kind!=='out'||entry.status!=='pend'||state.entriesDel?.[source.id]||
      String(entry.brand??'')!==String(source.brand??'')||String(entry.pid??entry.projectId??'')!==String(source.projectId??''))return false;
    if(busyEditor('contabilidad',undefined,()=>openPayable(source,fromOwner,sourceVersion)))return true;
    const section=mountPreview(source.label,source.supplier||'Proveedor sin registrar',source);
    section.append(el('p','',invoiceMoney(source.pending,source.currency)+' por pagar'),el('p','',invoiceStatus(source)));
    if(fileSrc(entry.file))addPreviewFile(section,entry.file).catch(()=>toast('No se ha podido abrir el archivo.'));
    else section.append(el('p','secretary-caption','Sin documento adjunto'));
    return true;
  }
  function openSource(source,fromOwner,options){
    if(!source||!checkIdentity()||identity!==fromOwner||!ready())return false;
    const id=String(source?.id||'');
    if(desktopFinance()&&['invoice','quote','invoice_entry','entry'].includes(source.kind)&&
      (source.kind!=='entry'||options||typeof source.sourceVersion==='string'))return openFinancialSource(source,fromOwner,options);
    if(source.kind==='project'){
      const project=state.projects.find(p=>String(p.id)===id);if(project)goDirect('proyecto',project.id);else toast('El proyecto ya no está disponible.');return;
    }
    if(['quote','invoice'].includes(source.kind)){
      const isF=source.kind==='invoice',view=isF?'facturas':'presupuestos',docs=isF?state.invoices:state.quotes;
      const candidates=docs.map((doc,index)=>({doc,index})).filter(({doc})=>doc.ref===id&&(!source.brand||doc.brand===source.brand)&&(source.projectId==null||String(doc.projectId||'')===String(source.projectId)));
      const index=candidates.length===1?candidates[0].index:-1;
      if(index<0||!canView(view)||!Array.isArray(docs[index].lines)){toast('El documento ya no está disponible en esta sesión.');return false;}
      if(busyEditor(view))return false;
      home=false;homePending=false;collapsed=false;loadDoc(index,isF?'factura':'presupuesto');
      if(state.draft?.editRef===id)draftTrack(state.draft);
      refresh();return state.draft?.editRef===id;
    }
    if(source.kind==='invoice_entry'){
      const entries=state.entries.filter(entry=>String(entry.id)===id&&entry.kind==='in'&&(!source.brand||entry.brand===source.brand));
      if(entries.length!==1||!canView('facturas')||busyEditor('facturas'))return false;
      const entry=entries[0],section=mountPreview(source.label,source.client,source);
      section.append(el('p','',entry.concept||''),el('p','',invoiceMoney(source.pending,source.currency)+' pendientes de cobro'));
      addPreviewFile(section,entry.file).catch(()=>toast('No se ha podido abrir el archivo.'));
      return true;
    }
    if(source.kind==='entry'){
      if(typeof source.sourceVersion==='string')return openPayable(source,fromOwner,source.sourceVersion);
      goDirect('contabilidad');return;
    }
    if(source.kind==='catalog'){goDirect('catalogo');return;}
    if(source.kind==='client'){goDirect('agenda');return;}
    if(source.kind==='document'){
      const project=state.projects.find(p=>String(p.id)===String(source.projectId));
      const files=project?.files?.filter(file=>String(project.id)+':'+String(file?.id)===id)||[];
      if(files.length!==1||!canView('proyecto')||busyEditor(state.view))return false;
      const file=files[0],section=mountPreview(file.name||source.label,project.name,source);
      if(file.body!=null)section.append(el('pre','secretary-document-body',String(file.body)));
      else addPreviewFile(section,file).catch(()=>toast('No se ha podido abrir el archivo.'));
      return true;
    }
    if(source.kind==='task'){
      const project=state.projects.find(p=>String(p.id)===String(source.projectId));
      if(!project||!canView('proyecto')){toast('El proyecto ya no está disponible.');return;}
      if(!goDirect('proyecto',project.id))return;
      projTab('tareas');return;
    }
    toast('Abre la sección correspondiente para consultar esta fuente.');
  }
  function announce(value){if(announcementNode)announcementNode.textContent=value;}
  function waitingBubble(){
    const bubble=el('div','secretary-bubble secretary-reply-marker');
    const spinner=el('span','secretary-spinner');spinner.setAttribute('aria-hidden','true');
    bubble.append(spinner,el('span','','Generando respuesta…'));
    bubble.setAttribute('aria-hidden','true');bubble.setAttribute('aria-busy','true');
    return bubble;
  }
  function finishReply(){
    if(!revealingReply)return;
    const reply=revealingReply;revealingReply=null;
    clearTimeout(reply.timer);
    reply.node.textContent=reply.record.content;reply.node.classList.remove('secretary-reply-revealing');
    reply.node.removeAttribute('aria-hidden');reply.node.removeAttribute('aria-busy');
    if(reply.extras)reply.extras.hidden=false;
    announce(reply.record.content);
  }
  function revealReply(record){
    const node=pendingBubble||waitingBubble();
    const parts=Array.from(record.content);
    const body=document.createTextNode(''),cursor=el('span','secretary-reply-caret');
    node.classList.remove('secretary-reply-marker');node.classList.add('secretary-reply-revealing');
    node.replaceChildren(body,cursor);
    const reply={record,node,length:0,timer:null,extras:null};revealingReply=reply;
    const step=Math.max(4,Math.ceil(parts.length/68));
    function frame(){
      if(revealingReply!==reply)return;
      const pin=thread&&thread.scrollHeight-thread.scrollTop-thread.clientHeight<100;
      reply.length+=step;
      if(reply.length>=parts.length)finishReply();
      else {body.data=parts.slice(0,reply.length).join('');reply.timer=setTimeout(frame,24);}
      if(pin)thread.scrollTop=thread.scrollHeight;
    }
    frame();
  }
  function appendMessage(role,content,response,automatic=false){
    const record={role,content:labelText(content,12000),response,owner:identity,...(automatic===true?{automatic:true}:{})};
    if(role==='assistant'){
      if(activeActivity){record.activity=activeActivity;activeActivity=null;}
      if(response&&record.content&&!collapsed&&!financeTransition&&!document.hidden&&!characterMotion?.matches)revealReply(record);
      else announce(record.content);
      pendingBubble=null;
    }
    messages.push(record);drawThread();return record;
  }
  function setStatus(value){
    if(statusNode)statusNode.textContent=[value,contextTrimmed?'Uso el contexto reciente. El historial sigue visible.':''].filter(Boolean).join(' ');
  }
  function currentContext(){
    const draft=!home&&draftEditing()?state.draft:null,project=activeProject();
    const document=draft?(draft.editRef?bridge.sourcePointer({kind:draft.kind==='factura'?'invoice':'quote',id:draft.editRef,brand:draft.brand,projectId:draft.projectId}):
      {kind:'draft',id:draft._draftId==null?null:String(draft._draftId),projectId:draft.projectId==null?null:String(draft.projectId)}):preview?.source??null;
    return {home,view:state.view,projectId:draft?.projectId??preview?.source?.projectId??project?.id??null,document,draft,draftVersion:draft?draftComparable(draft):null};
  }
  function sameContext(expected){
    const current=currentContext();
    return !!expected&&current.home===expected.home&&current.view===expected.view&&String(current.projectId??'')===String(expected.projectId??'')
      &&JSON.stringify(current.document)===JSON.stringify(expected.document)&&current.draft===expected.draft&&current.draftVersion===expected.draftVersion;
  }
  function requestsDraft(value){
    const words=labelText(value,6000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return /\b(?:prepar\w*|crea\w*|gener\w*|haz\w*|convert\w*|retom\w*|contin\w*|edit\w*)\b/.test(words)
      &&/\b(?:factur\w*|presupuest\w*|borrador\w*|guardad\w*)\b/.test(words);
  }
  function activityFor(content,projectId){
    const value=labelText(content,1000).toLocaleLowerCase('es');
    if(/(?:prepar|crea|crear|convert|contin|retom|borrador)/.test(value)&&/(?:factura|presupuesto|borrador)/.test(value))return 'Consultando clientes, proyectos y partidas para preparar el borrador…';
    if(/pendiente|sin cobrar|por cobrar/.test(value)&&/cobr/.test(value))return 'Comprobando las facturas y sus cobros…';
    if(/(?:cobr|factur|coste|gasto|presupuesto|pendiente)/.test(value))return 'Preparando la consulta con los registros autorizados…';
    if(projectId!=null)return 'Consultando las tareas y documentos autorizados de este proyecto…';
    return 'Consultando la información a la que tienes acceso…';
  }
  function finishActivity(status,steps=[]){
    if(!activeActivity)return;
    activeActivity.status=status;
    activeActivity.seconds=(performance.now()-activeActivity.started)/1000;
    activeActivity.steps=steps.map(step=>labelText(step?.label,300)).filter(Boolean).slice(0,8);
  }
  const activityIcons={session:'m_user',query:'buscar',stopped:'cerrar',failed:'alerta',result:'docs'};
  function drawActivity(activity){
    const {status,query,steps,id}=activity;
    const running=status==='running';
    const rows=[{
      kind:'session',status:query?'done':status,label:query?'Sesión comprobada':running?'Comprobando tu sesión…':status==='stopped'?'Comprobación detenida':'No se pudo comprobar la sesión',
      detail:'Se comprueba que la sesión coincide con el perfil activo.'
    }];
    if(query)rows.push({
      kind:'query',status,label:running?query:status==='done'?'Respuesta recibida':status==='stopped'?'Consulta detenida':'Consulta sin completar',
      detail:'La consulta sigue en curso. Puedes detenerla desde el cuadro de mensaje.'
    });
    for(const label of steps)rows.push({kind:'result',status:'done',label});
    const timeline=el('ol','secretary-activity-lines');
    rows.forEach((row,index)=>{
      const entry=el('li','secretary-activity-entry');
      const line=el('span','secretary-activity-line');line.dataset.status=row.status;
      if(row.status==='running')line.setAttribute('aria-current','step');
      const glyph=el('span','secretary-activity-icon');glyph.setAttribute('aria-hidden','true');
      glyph.innerHTML=ico(activityIcons[row.status==='stopped'||row.status==='failed'?row.status:row.kind]);
      const label=el('span','secretary-activity-label',row.label);if(row.status==='running')label.setAttribute('role','status');
      line.append(glyph,label);
      const hasDetail=row.detail&&(row.status==='running'||row.kind==='session'&&row.status==='done');
      if(hasDetail){
        const details=el('details','secretary-activity-step');
        details.open=activity.openByStep.get(row.kind)??row.status==='running';
        const trigger=el('summary','secretary-activity-trigger');trigger.dataset.traceKey=id+':'+index;
        trigger.append(line);details.append(trigger,el('p','secretary-activity-detail',row.detail));
        trigger.addEventListener('click',()=>activity.openByStep.set(row.kind,!details.open));
        entry.append(details);
      }else entry.append(line);
      timeline.append(entry);
    });
    if(running){
      const pending=el('div','secretary-activity secretary-working');pending.append(timeline);return pending;
    }
    const history=el('details','secretary-activity secretary-trace');history.open=activity.expanded;
    const heading=el('summary','secretary-activity-heading');heading.dataset.traceKey=id+':history';
    heading.append(el('span','',status==='done'?'Actividad realizada':status==='stopped'?'Actividad detenida':'Actividad incompleta'));
    const seconds=activity.seconds<1?'Menos de 1 s':new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(activity.seconds)+' s';
    heading.append(el('span','secretary-activity-time',seconds));
    heading.addEventListener('click',()=>{activity.expanded=!history.open;});
    history.append(heading,timeline);return history;
  }
  function requestFailure(message,{retryable=false,unavailable=false}={}){const error=Error(message);error.retryable=retryable;error.secretaryUnavailable=unavailable;return error;}
  function withReference(message,requestId){const value=String(requestId||'');return /^[a-z0-9-]{8,80}$/i.test(value)?`${message} Referencia ${value.slice(0,8)}.`:message;}
  function quotaFailure(scope,requestId){
    let message='Has alcanzado el límite de la prueba del Secretario. Puedes seguir trabajando desde Finanzas.';
    if(scope==='daily')message='Has alcanzado tu límite diario del Secretario. Este límite se renueva cada día a las 00:00 UTC.';
    else if(scope==='monthly')message='Has alcanzado tu límite mensual del Secretario. Este límite se renueva el día 1 de cada mes a las 00:00 UTC.';
    else if(scope==='global_monthly')message='Se ha alcanzado el límite mensual compartido del Secretario. Este límite se renueva el día 1 de cada mes a las 00:00 UTC.';
    const error=requestFailure(message),reference=String(requestId||'');error.secretaryQuota=true;
    if(/^[a-z0-9-]{8,80}$/i.test(reference))error.secretaryReference=reference.slice(0,8);
    return error;
  }
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
  const openQuestion=()=>questions.find(question=>question.id===questionTarget)||
    questions.find(question=>!Object.hasOwn(answers,question.id));
  const optionValue=option=>String(option.value??option.id??option.label);
  const answerLabel=question=>question.options.find(option=>optionValue(option)===answers[question.id])?.label??answers[question.id];
  function updateComposerPrompt(){
    if(composer)composer.placeholder=questions.length>1&&openQuestion()?.prompt||'Cuéntame qué necesitas…';
  }
  function sendAnswers(){
    const values=questions.map(answerLabel);
    const receipt=questions.every(question=>question.id.startsWith('receivable_'));
    const message=receipt?values.join('\n'):questions.map((question,index)=>question.prompt+' '+values[index]).join('\n');
    submitMessage(message,{...answers},{visibleContent:values.join('\n')});
  }
  function conversationCommand(value){
    if(!desktopFinance())return '';
    const words=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!.,]+/g,' ').trim().replace(/\s+/g,' ');
    if(/^(?:dejalo(?: estar)?|deja esta (?:consulta|preparacion)|cancela(?: esto| la consulta| la preparacion)?|olvidalo|no sigas)(?: por favor)?$/.test(words))return 'cancel';
    if(/^(?:vuelve|volver|regresa|regresar)(?: al chat| a la conversacion)(?: por favor)?$/.test(words))return 'return';
    return '';
  }
  function cancelConversationOperation(value){
    requestCounter++;controller?.abort();controller=null;busy=false;requestContext=null;contextInterrupted=false;
    for(const record of messages){record.pageController?.abort();delete record.retry;}
    finishReply();activeActivity=null;pendingBubble=null;questions=[];answers={};questionTarget=null;pendingAnswers={};
    contextTrimmed=false;historyStart=messages.length;
    setCharacter('espera','Secretario disponible');setStatus('');
    appendMessage('user',value);appendMessage('assistant','Vale, lo dejo aquí.');
    updateBusy();composer?.focus({preventScroll:true});
  }
  function submitComposer(event){
    event.preventDefault();
    const value=composer.value.trim();
    const command=conversationCommand(value);
    if(command==='cancel'){composer.value='';cancelConversationOperation(value);return;}
    if(busy)return;
    if(command==='return'){composer.value='';returnToConversation();return;}
    if(!value){if(questions.length&&questions.every(question=>answers[question.id]))sendAnswers();return;}
    const target=openQuestion();
    const matched=target&&bridge.clarificationAnswer([target],value);
    if(target&&(questionTarget===target.id&&target.freeText!==false||questions.length>1&&matched)){
      if(value.length>1000){setStatus('Escribe una respuesta de hasta 1.000 caracteres para esta pregunta.');return;}
      answers[target.id]=matched?.[target.id]??value;
      questionTarget=null;
      if(questions.every(question=>answers[question.id]))sendAnswers();
      else {composer.value='';drawThread();composer.focus({preventScroll:true});}
      return;
    }
    submitMessage(value,bridge.clarificationAnswer(questions,value)||undefined);
  }
  function drawQuestions(container,response){
    if(response!==messages.at(-1)?.response||!questions.length)return;
    const group=el('div','secretary-questions');
    for(const question of questions){
      const field=el('div','secretary-question');
      if(questions.length>1||question.prompt.trim()!==response.message.trim()){
        const prompt=button(labelText(question.prompt,600),()=>{
          questionTarget=question.id;drawThread();composer?.focus({preventScroll:true});
        },'secretary-question-prompt');
        prompt.setAttribute('aria-pressed',String(questionTarget===question.id||questions.length>1&&openQuestion()?.id===question.id));
        field.append(prompt);
        if(answers[question.id])field.append(el('span','secretary-caption',labelText(answerLabel(question),160)));
      }
      const opts=el('div','secretary-options');
      for(const option of question.options){
        const choice=button(labelText(option.label,160),()=>{
          answers[question.id]=optionValue(option);questionTarget=null;
          drawThread();composer?.focus({preventScroll:true});
        },'secretary-option');
        choice.setAttribute('aria-pressed',String(answers[question.id]===optionValue(option)));
        opts.append(choice);
      }
      if(opts.childNodes.length)field.append(opts);
      if(field.childNodes.length)group.append(field);
    }
    if(group.childNodes.length)container.append(group);
  }
  const invoiceMoney=(amount,currency)=>new Intl.NumberFormat('es-ES',{style:'currency',currency}).format(amount);
  const invoiceResults=payload=>payload?.payables??payload?.receivables;
  function validInvoiceResults(payload){
    const result=invoiceResults(payload),rows=payload?.sources,payables=payload?.payables;
    return !(payables&&payload.receivables)&&Number.isSafeInteger(result?.count)&&Number.isSafeInteger(result.offset)&&result.offset>=0&&Array.isArray(rows)&&rows.length<=12
      &&result.count>=result.offset+rows.length&&(result.next===null||rows.length>0&&result.next===result.offset+rows.length&&result.next<result.count)
      &&typeof result.version==='string'&&(result.projectId===null||typeof result.projectId==='string')
      &&Number.isSafeInteger(result.overdue)&&result.overdue>=0&&result.overdue<=result.count
      &&(!payables||typeof result.sourceVersion==='string'&&result.sourceVersion.length>0)
      &&Array.isArray(result.amounts)&&result.amounts.every(total=>/^[A-Z]{3}$/.test(total?.currency)&&Number.isFinite(total.amount)&&total.amount>0)
      &&rows.every(row=>(payables?row?.kind==='entry':['invoice','invoice_entry'].includes(row?.kind))&&typeof row.id==='string'&&typeof row.label==='string'
        &&Number.isFinite(row.pending)&&row.pending>0&&/^[A-Z]{3}$/.test(row.currency));
  }
  function invoiceStatus(source){
    const date=typeof source.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(source.due)?source.due.split('-').reverse().join('/'):'';
    const status=source.overdue?(source.partial?'Vencida · Cobro parcial':'Vencida'):source.partial?'Cobro parcial':date?'Vence':'Sin vencimiento registrado';
    return status+(date?' · '+date:'');
  }
  function invoiceEntry(source){
    const kind=source.kind==='entry'?'out':'in';
    const matches=state.entries.filter(entry=>entry?.kind===kind&&String(entry.id)===String(source.id)&&
      String(entry.brand??'')===String(source.brand??'')&&String(entry.pid??entry.projectId??'')===String(source.projectId??''));
    return matches.length===1&&!state.entriesDel?.[source.id]?matches[0]:null;
  }
  function isInvoiceSource(source,invoiceViewing){
    if(!source||source.id==null||!ready()||_accessRole!=='admin')return false;
    if(source.kind==='entry')return canView('contabilidad')&&(typeof source.sourceVersion==='string'||invoiceViewing&&!!invoiceEntry(source));
    return canView('facturas')&&['invoice','invoice_entry'].includes(source.kind);
  }
  function isDocumentSource(source,invoiceViewing){
    return source?.kind==='quote'?source.id!=null&&ready()&&_accessRole==='admin'&&canView('presupuestos'):isInvoiceSource(source,invoiceViewing);
  }
  function documentCardDetails(source){
    const payable=source.kind==='entry',quote=source.kind==='quote';
    const native=quote||source.kind==='invoice'?nativeFinancialDocument(source)?.doc:null;
    const entry=source.kind==='invoice'?invoiceMovement(source):payable||source.kind==='invoice_entry'?invoiceEntry(source):null;
    const party=payable?source.supplier||entry?.sup||entry?.client:source.client||native?.client||entry?.client||entry?.sup;
    const issued=financeDateISO(source.date||source.issued||native?.date||entry?.date);
    const project=source.projectId==null?null:state.projects.find(row=>String(row.id)===String(source.projectId));
    const projectLabel=labelText(source.projectLabel||project?.name||project?.num,160);
    const pending=Number.isFinite(source.pending)&&source.pending>0&&/^[A-Z]{3}$/.test(source.currency);
    const due=!quote&&financeDateISO(source.due);
    const total=source.total??native?.total??entry?.amount;
    const currency=source.currency||native?.currency||entry?.currency||state.account?.currency;
    const hasTotal=(typeof total==='number'||typeof total==='string'&&total.trim())&&Number.isFinite(Number(total))&&/^[A-Z]{3}$/.test(currency);
    let status=labelText(source.statusLabel,100),overdue=source.overdue===true;
    if(pending){
      status=overdue?(source.partial?'Vencida · Cobro parcial':'Vencida'):
        source.partial?'Cobro parcial':payable?'Pendiente de pago':'Pendiente de cobro';
    }
    else if(!status&&/^(?:anul|cancel|void|rectificad)/i.test(native?.status??entry?.status??''))status='Anulada';
    else if(!status&&quote&&native)status={pend:'Pendiente de aceptar',acc:'Aceptado',rej:'Rechazado'}[native.status||'pend']||'';
    else if(!status&&payable&&entry)status=entry.status==='cobr'?'Pagada':entry.status==='pend'?'Pendiente de pago':'';
    else if(!status&&entry&&(entry.cobros==null||Array.isArray(entry.cobros)&&entry.cobros.every(payment=>payment&&typeof payment==='object'))&&
      (entry.status==='cobr'||typeof (entry.due||entry.date)==='string')){
      const key=entryStKey(entry);
      status={cobr:'Cobrada',parc:'Cobrada en parte',venc:'Vencida',pend:'Pendiente'}[key]||'';
      overdue=key==='venc';
    }
    return {party:labelText(party,160),meta:[issued&&'Emisión '+issued.split('-').reverse().join('/'),projectLabel,
      due&&(overdue?'Venció ':'Vence ')+due.split('-').reverse().join('/'),due&&source.dueCalculated===true&&'Fecha calculada a 30 días'].filter(Boolean).join(' · '),
      amount:pending?invoiceMoney(source.pending,source.currency):hasTotal?invoiceMoney(Number(total),currency):'',status,overdue};
  }
  function appendDocumentCard(list,source,record){
    const {party,meta,amount,status,overdue}=documentCardDetails(source);
    const row=el('li','secretary-invoice'),label=el('div','secretary-invoice-label'),balance=el('div','secretary-invoice-balance');
    label.append(el('strong','',labelText(source.label,160)||String(source.id)));
    if(party)label.append(el('span','secretary-caption',party));
    if(meta)label.append(el('span','secretary-invoice-meta',meta));
    if(amount)balance.append(el('strong','',amount));
    if(status)balance.append(el('span','secretary-invoice-status'+(overdue?' secretary-invoice-overdue':''),status));
    const block=source.kind==='quote'?'presupuestos':'facturas';
    row.append(label,balance,button(source.kind==='quote'?'Ver presupuesto':'Ver factura',()=>{
      const version=record.response.documents?.sourceVersion??record.response.payables?.sourceVersion??record.versions?.[block];
      const sourceVersions=record.response.sourceVersions||source.sourceVersions||{[block]:version};
      if(!openSource(source,record.owner,{mode:'read',sourceVersions}))setStatus('El documento ya no está disponible. Vuelve a buscarlo.');
    },'secretary-source secretary-document-open'));list.append(row);
  }
  function appendDocumentCards(container,sources,record){
    if(!sources.length)return;
    const list=el('ul','secretary-invoices secretary-invoices-static');
    for(const source of sources)appendDocumentCard(list,source,record);
    container.append(list);
  }
  function visibleConversationSources(record){
    const response=record?.response,sources=response?.sources?.slice(0,80)||[];
    if(!desktopFinance()||invoiceResults(response)||response?.documents)return sources;
    const cards=sources.filter(source=>isDocumentSource(source,response.invoiceViewing));
    return cards.length?cards.slice(0,record.documentCardsExpanded?80:4):sources;
  }
  function invoiceRequest(content,results){
    const words=labelText(content,6000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9/-]+/g,' ').trim();
    const request=words.replace(/^(?:(?:por favor|puedes|podrias|quiero|necesito) )+/,'');
    const edit=/^(?:edita(?:me)?|editar|modifica(?:me)?|modificar|abr(?:e|ir) (?:el )?editor)\b/.test(request);
    const open=/^(?:abre(?:me|la|lo)?|abrir)\b/.test(request);
    if(edit||requestsDraft(words)||/^(?:ve a|ir a|llevame a|abr(?:e|ir) (?:la )?(?:pantalla|seccion|menu)|abr(?:e|ir) (?:las )?facturas$)/.test(request))
      return {edit,open,view:false};
    const invoice=/\bfacturas?\b/.test(request);
    const ordinal=/^(?:abre(?:me)?|abrir|ver|muestrame|ensename) (?:la |el )?(?:primer\w*|segund\w*|terc\w*|cuart\w*|quint\w*|sext\w*|septim\w*|octav\w*|noven\w*|decim\w*|\d{1,2})(?: |$)/.test(request);
    return {edit,open,view:!open&&(invoice||ordinal&&results?.some(source=>isInvoiceSource(source,true))),invoice};
  }
  function validDocumentResults(payload){
    const result=payload?.documents,sources=payload?.sources;
    return !invoiceResults(payload)&&['invoice','quote','received'].includes(result?.kind)&&Number.isSafeInteger(result.count)&&result.count>=0&&
      Number.isSafeInteger(result.offset)&&result.offset>=0&&typeof result.version==='string'&&result.version.length>0&&
      Array.isArray(sources)&&sources.length<=12&&result.count>=result.offset+sources.length&&
      (result.next===null?result.count===result.offset+sources.length:sources.length>0&&result.next===result.offset+sources.length&&result.next<result.count)&&
      sources.every(source=>(source?.kind===result.kind||result.kind==='received'&&source?.kind==='entry'||result.kind==='invoice'&&source?.kind==='invoice_entry')&&
        typeof source.id==='string'&&typeof source.label==='string');
  }
  function drawDocumentResults(container,record){
    const {documents,sources}=record.response;
    if(record.owner!==owner()||!ready()||_accessRole!=='admin'||!canView(documents.kind==='quote'?'presupuestos':documents.kind==='received'?'contabilidad':'facturas'))return;
    if(documents.scopeLabel)container.append(el('p','secretary-caption',labelText(documents.scopeLabel,500)));
    appendDocumentCards(container,sources,record);
    if(sources.length<documents.count)container.append(el('p','secretary-caption',`Viendo ${sources.length} de ${documents.count} documentos.`));
    if(documents.next!==null){
      const more=button(record.pageController?'Cargando…':'Ver más',()=>loadMoreInvoices(record),'secretary-button');
      more.disabled=!!record.pageController;container.append(more);
    }
    if(record.pageError)container.append(el('p','secretary-caption',record.pageError));
  }
  function drawInvoiceResults(container,record){
    const {sources,payables}=record.response,result=invoiceResults(record.response);
    if(result.scopeLabel)container.append(el('p','secretary-caption',labelText(result.scopeLabel,500)));
    if(!sources.length)return;
    if(desktopFinance()){
      if(record.owner!==owner()||!ready()||_accessRole!=='admin'||!canView(payables?'contabilidad':'facturas'))return;
      appendDocumentCards(container,sources,record);
    }else{
      const list=el('ul','secretary-invoices');
      for(const source of sources){
        const row=el('li','secretary-invoice');
        const label=el('div','secretary-invoice-label');
        const counterparty=payables?labelText(source.supplier,160)||'Proveedor sin registrar':labelText(source.client,160)||'Cliente sin registrar';
        label.append(el('strong','',labelText(source.label,160)),el('span','secretary-caption',counterparty));
        const balance=el('div','secretary-invoice-balance');
        balance.append(el('strong','',invoiceMoney(source.pending,source.currency)),el('span',source.overdue?'secretary-invoice-overdue':'secretary-caption',invoiceStatus(source)));
        row.append(label,balance,button('Abrir factura',()=>{
          const opened=payables?openPayable(source,record.owner,payables.sourceVersion):openSource(source,record.owner);
          if(!opened)setStatus(payables?'La factura no está disponible para abrir. Vuelve a consultar las facturas por pagar.':'La factura ya no está disponible. Vuelve a consultar los pendientes.');
        },'secretary-source'));
        list.append(row);
      }
      container.append(list);
    }
    if(sources.length<result.count)container.append(el('p','secretary-caption',`Viendo ${sources.length} de ${result.count} facturas. El total corresponde a todas.`));
    if(result.next!==null){
      const more=button(record.pageController?'Cargando…':'Ver más',()=>loadMoreInvoices(record),'secretary-button');
      more.disabled=!!record.pageController;container.append(more);
    }
    if(record.pageError)container.append(el('p','secretary-caption',record.pageError));
  }
  async function loadMoreInvoices(record){
    const documents=record.response.documents,result=documents||invoiceResults(record.response);
    if(record.pageController||record.owner!==owner()||!ready()||result.next===null)return;
    const paging=new AbortController();
    record.pageController=paging;record.pageError='';drawThread();
    try{
      const {data,error}=await sb.auth.getSession(),session=data?.session;
      if(error||!session?.access_token||session.user?.id!==state.sessionUser?.id||record.owner!==owner()||paging.signal.aborted)throw Error();
      const input={...record.invoiceQuery,studyId:ESTUDIO_ID,...(documents?{documentContext:record.response.documentContext,
        documentPage:{offset:result.next,version:result.version}}:{receivableContext:record.response.receivableContext,
        invoicePage:{offset:result.next,version:result.version,projectId:result.projectId}})};
      const response=await sendQuery(session,input,paging.signal),payload=await response.json();
      if(record.owner!==owner()||paging.signal.aborted)return;
      if(!response.ok){
        if(response.status===409){record.pageError='Los documentos han cambiado. Vuelve a consultar para actualizar los resultados.';result.next=null;return;}
        throw Error();
      }
      const page=documents?payload?.documents:invoiceResults(payload);
      const valid=documents?validDocumentResults(payload)&&page.kind===result.kind:validInvoiceResults(payload)&&!!payload.payables===!!record.response.payables&&
        page.overdue===result.overdue&&JSON.stringify(page.amounts)===JSON.stringify(result.amounts);
      if(!valid||page.version!==result.version||page.sourceVersion!==result.sourceVersion||page.offset!==record.response.sources.length||page.count!==result.count)throw Error();
      record.response.sources.push(...payload.sources);result.next=page.next;
    }catch{
      if(!paging.signal.aborted)record.pageError='No se han podido cargar más documentos. Puedes volver a intentarlo.';
    }finally{
      record.pageController=null;
      if(record.owner===owner()&&!paging.signal.aborted)drawThread();
    }
  }
  function drawThread(){
    if(!thread)return;
    updateComposerPrompt();
    const nearBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<100;
    const traceFocus=thread.contains(document.activeElement)?document.activeElement.dataset.traceKey:null;
    thread.replaceChildren();
    if(!messages.length){
      const welcome=el('div','secretary-welcome');welcome.append(icon('welcome'));
      welcome.append(el('h1','',activeProject()?'Vamos con este proyecto.':'¿Qué hacemos hoy?'));
      welcome.append(el('p','',activeProject()?'Pregúntame por sus tareas, plazos o documentos.':'Preparamos un presupuesto, revisamos una factura o ponemos en orden lo pendiente.'));
      const prompts=el('div','secretary-prompts');
      if(desktopFinance()){
        prompts.setAttribute('role','group');prompts.setAttribute('aria-label','Accesos directos');
        for(const [view,label] of [['presupuestos','Preparar presupuesto'],['facturas','Crear Factura'],['contabilidad','Añadir gasto']]){
          if(canView(view))prompts.append(button(label,()=>openFinanceGenerator(view),'secretary-prompt'));
        }
        if(canView('facturas')){
          const question='¿Qué tengo pendiente de cobro?';prompts.append(button(question,()=>submitMessage(question),'secretary-prompt'));
        }
      }else{
        const texts=activeProject()?['¿Qué queda pendiente en este proyecto?','Enséñame sus documentos','¿Qué debería revisar hoy?']:['Preparar un presupuesto','Crear una factura','¿Qué tengo pendiente de cobrar?'];
        for(const text of texts)prompts.append(button(text,()=>submitMessage(text),'secretary-prompt'));
      }
      welcome.append(prompts);thread.append(welcome);
    }
    for(const record of messages){
      const item=el('article','secretary-turn secretary-turn-'+record.role);item.setAttribute('aria-label',record.role==='user'?'Tú':secretaryName());
      if(record.activity)item.append(drawActivity(record.activity));
      const line=el('div','secretary-message-line');
      const reply=revealingReply?.record===record?revealingReply:null;
      line.append(messageAvatar(record.role),reply?.node||el('div','secretary-bubble',record.content));item.append(line);
      const extras=el('div','secretary-message-extras');
      if(invoiceResults(record.response))drawInvoiceResults(extras,record);
      else if(desktopFinance()&&record.response?.documents)drawDocumentResults(extras,record);
      else if(record.response?.sources?.length){
        const received=record.response.sources.slice(0,80);
        const cards=desktopFinance()&&record.owner===owner()?received.filter(source=>isDocumentSource(source,record.response.invoiceViewing)):[];
        appendDocumentCards(extras,cards.slice(0,4),record);
        if(cards.length>4){
          const more=el('details','secretary-more-sources');more.open=record.documentCardsExpanded===true;
          more.addEventListener('toggle',()=>{record.documentCardsExpanded=more.open;});
          more.append(el('summary','',`Ver los ${cards.length} documentos`));appendDocumentCards(more,cards.slice(4),record);extras.append(more);
        }
        const other=cards.length?received.filter(source=>!cards.includes(source)):received;
        const sources=el('div','secretary-sources');
        if(other.length)sources.append(el('span','secretary-caption','Fuentes'));
        for(const source of other.slice(0,4))sources.append(button(labelText(source.label,180)||'Abrir fuente',()=>openSource(source,record.owner),'secretary-source'));
        if(other.length>4){const more=el('details','secretary-more-sources');more.append(el('summary','',`Ver las ${other.length} fuentes`));const rest=el('div','secretary-sources');for(const source of other.slice(4))rest.append(button(labelText(source.label,180)||'Abrir fuente',()=>openSource(source,record.owner),'secretary-source'));more.append(rest);sources.append(more);}
        const sourceCount=Math.max(received.length,Number(record.response.sourceCount)||0,record.response.sources.length);
        if(sourceCount>received.length)sources.append(el('span','secretary-caption',`Se muestran ${received.length} de ${sourceCount} fuentes. Abre la sección para consultar el resto.`));
        if(sources.childNodes.length)extras.append(sources);
      }
      for(const action of record.response?.actions||[]){
        const result=actions.get(action.id);
        if(result?.done){if(result.message)extras.append(el('p','secretary-action-result',result.message));continue;}
        const target=el('div','secretary-proposal');
        if(result?.message)target.append(el('p','',result.message));
        target.append(button(action.type==='prepare_draft'?'Abrir borrador':labelText(action.label,120)||'Abrir',()=>runAction(action,record.owner),'secretary-action'));
        extras.append(target);
      }
      if(record.retry){extras.append(button('Volver a intentar',()=>{const retry=record.retry;delete record.retry;drawThread();retry();},'secretary-button'));}
      if(record.quota&&canView('facturas'))extras.append(button('Abrir Facturas',()=>{
        if(checkIdentity()&&record.owner===identity&&ready())goDirect('facturas');
      },'secretary-button secretary-quota-action'));
      if(record.reference)extras.append(el('p','secretary-caption secretary-reference','Referencia técnica: '+record.reference+'.'));
      if(record.response){drawQuestions(extras,record.response);drawFeedback(extras,record);}
      if(extras.childNodes.length){if(reply){extras.hidden=true;reply.extras=extras;}item.append(extras);}
      thread.append(item);
    }
    if(activeActivity)thread.append(drawActivity(activeActivity));
    if(pendingBubble){
      const line=el('div','secretary-message-line secretary-pending-reply');line.setAttribute('aria-hidden','true');
      line.append(messageAvatar('assistant'),pendingBubble);thread.append(line);
    }
    if(traceFocus)thread.querySelector('[data-trace-key="'+traceFocus+'"]')?.focus({preventScroll:true});
    if(nearBottom||busy)thread.scrollTop=thread.scrollHeight;
    drawCharacter();
  }
  function runAction(action,fromOwner){
    try{const message=applyAction(action,fromOwner);actions.set(action.id,{done:true,message});}
    catch(error){actions.set(action.id,{done:false,message:error.message||'No se pudo abrir esta propuesta.'});setCharacter('aviso','Revisa la propuesta');}
    drawThread();
  }
  function build(){
    panel=el('section','secretary-panel');panel.id='moderno-secretary';panel.setAttribute('aria-label',secretaryName());
    const header=el('header','secretary-header'),title=el('div','secretary-title');title.append(icon('header'));
    const copy=el('div','');titleNode=el('strong','',secretaryName());copy.append(titleNode);contextNode=el('span','secretary-context','');contextNode.hidden=true;copy.append(contextNode);title.append(copy);header.append(title);
    const controls=el('div','secretary-controls');
    if(config.feedbackEnabled===true){
      const settings=el('details','secretary-settings');
      const summary=el('summary','','•••');summary.setAttribute('aria-label','Opciones del Secretario');settings.append(summary);
      const settingsContent=el('div','secretary-settings-content');
      feedbackHost=el('div','secretary-feedback-settings');settingsContent.append(feedbackHost);drawFeedbackSettings();
      settings.append(settingsContent);controls.append(settings);
    }
    foldButton=button('Plegar',fold,'secretary-fold');
    foldButton.setAttribute('aria-label','Plegar el Secretario');controls.append(foldButton);
    exitButton=modeButton('Salir del Modo IA',openNormalFinance);controls.append(exitButton);header.append(controls);
    const shortcuts=el('nav','secretary-shortcuts');shortcuts.setAttribute('aria-label','Accesos directos de Finanzas');
    returnButton=button('Volver al chat',returnToConversation,'secretary-button secretary-return');shortcuts.append(returnButton);
    const sections=el('div','secretary-sections');
    for(const [view,label] of financeShortcuts)if(canView(view))sections.append(button(label,()=>goDirect(view),'secretary-shortcut'));
    if(sections.childNodes.length)shortcuts.append(sections);
    panel.append(shortcuts,header);
    thread=el('div','secretary-thread');thread.setAttribute('role','log');thread.setAttribute('aria-live','off');thread.setAttribute('aria-label','Conversación con '+secretaryName());panel.append(thread);
    const form=el('form','secretary-composer');const inputLabel=el('label','sr-only','Mensaje para el Secretario');inputLabel.htmlFor='secretary-message';form.append(inputLabel);
    composer=el('textarea','');composer.id='secretary-message';composer.rows=2;composer.maxLength=6000;form.append(composer);
    composer.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
    composer.addEventListener('input',()=>{if(busy)sendButton.disabled=conversationCommand(composer.value)!=='cancel';});
    const composerFoot=el('div','secretary-composer-foot');
    stopButton=button('Detener',()=>controller?.abort(),'secretary-button');stopButton.hidden=true;composerFoot.append(stopButton);
    sendButton=el('button','secretary-primary','Enviar');sendButton.type='submit';composerFoot.append(sendButton);form.append(composerFoot);
    form.addEventListener('submit',submitComposer);panel.append(form);
    statusNode=el('p','secretary-status');statusNode.setAttribute('role','status');panel.append(statusNode);
    announcementNode=el('p','sr-only','');announcementNode.setAttribute('aria-live','polite');announcementNode.setAttribute('aria-atomic','true');panel.append(announcementNode);drawThread();
    setCharacter('espera','Secretario disponible');
  }
  function updateBusy(){
    if(sendButton)sendButton.disabled=busy&&conversationCommand(composer?.value||'')!=='cancel';
    if(composer)composer.disabled=busy&&!desktopFinance();
    if(stopButton)stopButton.hidden=!busy;
    drawCharacter();
  }
  function endpoint(){
    const base=new URL(SUPABASE_URL),target=new URL(config.endpoint||base.origin+'/functions/v1/secretario',location.origin);
    // Auth keeps its branded domain. Edge Functions use the canonical project
    // origin because the custom-domain gateway rejects authenticated POSTs.
    const edgeOrigin=base.origin==='https://auth.moderno.app'?'https://cgqtylvaapwbuwqvpjtb.supabase.co':base.origin;
    // A user token may only reach the exact configured project function.
    if(target.origin!==edgeOrigin||target.protocol!=='https:'||target.pathname!=='/functions/v1/secretario'||target.username||target.password||target.search||target.hash)throw Error('La conexión del Secretario todavía no está configurada.');
    return target.href;
  }
  function sendQuery(session,input,signal){
    return fetch(endpoint(),{method:'POST',credentials:'omit',cache:'no-store',signal,
      // The function verifies the signed session against the project JWKS.
      headers:{'Content-Type':'application/json',apikey:SUPABASE_ANON_KEY},
      body:JSON.stringify({session:session.access_token,payload:input})});
  }
  async function submitMessage(content,answerValues,{visibleContent=content,previous}={}){
    if(busy||financeTransition||!content?.trim())return;
    checkIdentity();if(!ready()){setStatus('Inicia sesión para consultar al Secretario.');return;}
    if(!home&&!documentOpen){home=true;collapsed=false;refresh();}
    const captured=identity,epoch=generation,current=++requestCounter,originContext=currentContext();requestContext=originContext;contextInterrupted=false;
    const draftRequested=requestsDraft(content)||originContext.document?.kind==='draft'||
      questions.length>0&&requestsDraft(messages.findLast(item=>item.role==='user'&&!item.automatic)?.content);
    let history;
    const relevant=messages.slice(historyStart),previousQuery=relevant.findLast(item=>item.role==='assistant'&&item.response);
    const previousData=previousQuery?.response?.preserveQueryContext
      ?relevant.findLast(item=>item.role==='assistant'&&item.response&&!item.response.preserveQueryContext):previousQuery;
    const receivableContext=previous?previous.receivableContext:previousData?.response?.receivableContext;
    const documentContext=previous?previous.documentContext:previousData?.response?.documentContext;
    const financeContext=previous?previous.financeContext:previousData?.response?.financeContext;
    const results=previous?previous.results:visibleConversationSources(previousData).map(bridge.sourcePointer).filter(Boolean);
    try{const recent=previous?{history:previous.history,trimmed:contextTrimmed}:bridge.recentHistory(relevant.filter(item=>item.role==='user'||item.response),content);history=recent.history;contextTrimmed=recent.trimmed;}
    catch(error){setStatus(error.message);return;}
    const structuredAnswers=previous?previous.structuredAnswers:receivableContext?.clarification?{...answerValues}:structuredFor(pendingAnswers,answerValues),hasStructuredAnswers=Object.keys(structuredAnswers).length>0;
    const retry=()=>submitMessage(content,answerValues,{visibleContent,previous:{history,receivableContext,documentContext,financeContext,structuredAnswers,results}});
    finishReply();questions=[];answers={};questionTarget=null;busy=true;controller=new AbortController();
    characterUnread=false;setCharacter('pensando','Preparando la consulta');
    activeActivity={id:String(current),status:'running',started:performance.now(),query:null,steps:[],openByStep:new Map(),expanded:false};
    pendingBubble=waitingBubble();announce('Generando respuesta…');
    appendMessage('user',visibleContent,undefined,!!answerValues);updateBusy();
    if(composer)composer.value='';setStatus('');
    try{
      const client=sb;if(!client?.auth)throw Error('La conexión del Secretario todavía no está configurada.');
      const {data,error}=await client.auth.getSession(),session=data?.session;
      if(error||!session?.access_token||session.user?.id!==state.sessionUser?.id)throw Error('Comprueba tu sesión para seguir con el Secretario.');
      if(epoch!==generation||captured!==owner())return;
      if(!sameContext(originContext)){contextInterrupted=true;throw new DOMException('Context changed','AbortError');}
      if(controller.signal.aborted)throw new DOMException('Stopped','AbortError');
      const project=originContext.projectId==null?null:state.projects?.find(item=>String(item.id)===String(originContext.projectId));feedbackTask=project?'project_question':'finance_question';
      activeActivity.query=activityFor(content,originContext.projectId);drawThread();
      const focus={...(originContext.document?{document:originContext.document}:{}),...(results?.length&&new TextEncoder().encode(JSON.stringify(results)).length<=8000?{results}:{})};
      const input={studyId:ESTUDIO_ID,message:content,automatic:!!answerValues,history,context:{view:originContext.home?'finanzas':originContext.view,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,...(originContext.projectId!=null?{projectId:originContext.projectId}:{}),...(Object.keys(focus).length?{focus}:{})},...(hasStructuredAnswers?{answers:structuredAnswers}:{}),...(receivableContext?{receivableContext}:{}),...(documentContext?{documentContext}:{}),...(financeContext?{financeContext}:{})};
      setCharacter('trabajando','Consulta en curso');
      const response=await sendQuery(session,input,controller.signal);
      const payload=await response.json().catch(()=>null);
      if(epoch!==generation||captured!==owner()||current!==requestCounter)return;
      if(!sameContext(originContext)){contextInterrupted=true;throw new DOMException('Context changed','AbortError');}
      if(controller.signal.aborted)throw new DOMException('Stopped','AbortError');
      if(!response.ok){
        const code=payload?.error?.code;
        const ref=payload?.requestId;
        if(response.status===401||response.status===403)throw requestFailure(withReference('No puedo consultar esos datos con tu sesión actual. Comprueba tu acceso.',ref));
        if(code==='quota_exhausted')throw quotaFailure(payload?.error?.quotaScope,ref);
        if(code==='rate_limit')throw requestFailure(withReference('Hay varias consultas en curso. Espera un momento y vuelve a intentarlo.',ref),{retryable:true});
        if(code==='provider_busy')throw requestFailure(withReference('El servicio está ocupado ahora. Vuelve a intentarlo en un momento.',ref),{retryable:true,unavailable:true});
        if(code==='context_changed')throw requestFailure(withReference('Los datos o tus permisos cambiaron durante la consulta. Vuelve a intentarlo.',ref),{retryable:true});
        if(code==='cancelled')throw Object.assign(new DOMException('Stopped','AbortError'),{requestId:ref});
        if(code==='context_limit')throw requestFailure(withReference(payload?.error?.message||'Necesito una consulta más concreta para localizar esos datos.',ref));
        if(code==='invoice_data_unavailable')throw requestFailure('No he podido consultar las facturas ahora. Puedes reintentarlo.',{retryable:true});
        if(code==='payable_data_unavailable')throw requestFailure('No he podido consultar las facturas por pagar ahora. Puedes reintentarlo.',{retryable:true});
        if(code==='document_data_unavailable')throw requestFailure('No he podido consultar los documentos ahora. Puedes reintentarlo.',{retryable:true});
        if(['not_configured','provider_unavailable','service_unavailable','SECRETARY_NOT_CONFIGURED'].includes(code)||response.status>=500)throw requestFailure(withReference('El Secretario todavía no está disponible. Puedes seguir usando las pantallas y editores de Finanzas.',ref),{retryable:true,unavailable:true});
        throw requestFailure(withReference('No he podido completar la consulta. Puedes volver a intentarlo.',ref),{retryable:true});
      }
      if(!payload||!['answer','clarifying','proposal'].includes(payload.status)||typeof payload.message!=='string')throw Error('La respuesta no se pudo mostrar. Vuelve a intentarlo.');
      if(invoiceResults(payload)&&!validInvoiceResults(payload))throw Error('No se han podido comprobar las facturas de la respuesta.');
      if(payload.documents&&!validDocumentResults(payload))throw Error('No se han podido comprobar los documentos de la respuesta.');
      const safe={...payload,sources:Array.isArray(payload.sources)?payload.sources:[],trace:Array.isArray(payload.trace)?payload.trace.filter(step=>step?.status==='done'):[],
        actions:Array.isArray(payload.actions)?payload.actions.filter(action=>invoiceResults(payload)||payload.documents?action?.type==='open_document':
          ['navigate','prepare_draft','open_document'].includes(action?.type)).slice(0,4):[]};
      if(desktopFinance()){
        const {edit,open,view,invoice}=invoiceRequest(content,results);
        safe.invoiceViewing=view;
        const originalActions=safe.actions;
        safe.actions=originalActions.filter(action=>{
          if(action.type==='open_document'&&['read','edit','pdf'].includes(action.viewMode))return true;
          if(action.type==='open_document'&&(edit||open)){
            if(edit)action.viewMode='edit';
            return true;
          }
          if(action.type==='open_document'&&isDocumentSource(action.payload,view)){
            const source=action.payload;
            if(!safe.sources.some(item=>item?.kind===source.kind&&String(item.id)===String(source.id)&&
              String(item.brand??'')===String(source.brand??'')&&String(item.projectId??'')===String(source.projectId??'')))safe.sources.push(source);
            return false;
          }
          return !view||action.type==='open_document'&&!invoice;
        });
        const hasCards=!invoiceResults(safe)&&safe.sources.some(source=>isDocumentSource(source,view));
        if(hasCards)safe.message=safe.message.replace(/\s*Abre una fuente para revisar su contenido completo\.\s*$/,'');
        if(view&&originalActions.length!==safe.actions.length&&!hasCards&&safe.status!=='clarifying'){
          safe.status='clarifying';safe.message='¿Qué factura quieres ver? Indica su número o el cliente.';
          safe.sources=[];safe.questions=[];
        }
      }
      safe.actions=safe.actions.map((action,index)=>({...action,id:String(payload.requestId||current)+':'+String(action.id||index)}));
      questions=Array.isArray(safe.questions)?safe.questions.filter(question=>typeof question.id==='string'&&typeof question.prompt==='string').slice(0,6).map(question=>({...question,options:Array.isArray(question.options)?question.options.slice(0,8):[]})):[];
      pendingAnswers=pendingAfter(safe.status,structuredAnswers);
      if(safe.actions.some(action=>action.type==='prepare_draft')){const draft=safe.actions.find(action=>action.type==='prepare_draft').payload;feedbackTask=draft.sourceQuoteRef?'invoice_from_quote':draft.kind==='factura'?'invoice_create':'quote_create';}
      else if(safe.actions.some(action=>action.type==='navigate'))feedbackTask='navigation';
      unavailable=false;requestContext=null;finishActivity('done',safe.trace);
      setCharacter(safe.status==='clarifying'||questions.length?'aviso':'terminado',safe.status==='clarifying'||questions.length?'Necesito un dato tuyo':safe.actions.some(item=>item.type==='prepare_draft')?'Borrador preparado':'Respuesta lista',{notify:true});
      const record=appendMessage('assistant',safe.message,safe);record.feedbackTask=feedbackTask;
      if(desktopFinance())record.versions={facturas:_cloudSeen.facturas,presupuestos:_cloudSeen.presupuestos};
      if(invoiceResults(safe)||safe.documents)record.invoiceQuery=input;
      if(safe.cancelledOperation===true)historyStart=messages.length;
      const action=safe.actions.find(item=>item.type==='prepare_draft'&&safe.status==='proposal'&&draftRequested||['open_document','navigate'].includes(item.type)&&item.openImmediately===true);
      if(action&&!collapsed&&!financeTransition&&epoch===generation&&captured===owner())runAction(action,captured);
      setStatus('');
    }catch(error){
      if(epoch!==generation||captured!==owner()||current!==requestCounter)return;
      pendingAnswers=pendingAfter('error',structuredAnswers);
      finishActivity(error.name==='AbortError'?'stopped':'failed');
      if(error.name==='AbortError'){
        setCharacter('espera','Consulta detenida',{animate:false});
        const record=appendMessage('assistant',contextInterrupted?'La consulta se detuvo porque cambiaste de pantalla o de proyecto. Puedes volver a hacerla en el contexto actual.':'Consulta detenida. Puedes seguir cuando quieras.');
        if(!contextInterrupted&&!answerValues)record.retry=retry;
      }
      else{
        setCharacter('aviso',error.secretaryQuota?'Límite del Secretario alcanzado':'No se pudo completar la consulta',{notify:true});
        const network=error instanceof TypeError||navigator.onLine===false;
        unavailable=network||error.secretaryUnavailable===true;
        const record=appendMessage('assistant',network?'No se ha podido conectar con el Secretario. Comprueba la conexión y vuelve a intentarlo.':error.message||'El Secretario no está disponible ahora. Los editores siguen accesibles.');
        if(error.secretaryQuota===true){record.quota=true;record.reference=error.secretaryReference||'';}
        if(network||error.retryable===true)record.retry=retry;
      }
      setStatus(error.secretaryQuota?'Puedes seguir trabajando desde los accesos directos.':unavailable?'Tus documentos siguen disponibles en los accesos directos.':'Consulta detenida.');
    }finally{
      if(epoch===generation&&captured===owner()&&current===requestCounter){busy=false;controller=null;requestContext=null;contextInterrupted=false;updateBusy();drawThread();if(!collapsed&&!financeTransition&&panel?.isConnected&&!panel.hidden&&!preview?.node.contains(document.activeElement))composer?.focus({preventScroll:true});}
      else checkIdentity();
    }
  }
  function schedulePosition(){
    if(positionQueued)return;positionQueued=true;
    requestAnimationFrame(()=>{positionQueued=false;positionFinanceTransition();position();drawCharacter();});
  }
  function position(){
    if(!panel?.isConnected||home||collapsed)return;
    const sources=[...document.querySelectorAll('#syncTag,#project-window-bar,.project-tabs.project-dock,#desktop-header .desktop-inset-header,#mHeader')];
    if(positionResize){
      for(const node of positionSources)if(!sources.includes(node))positionResize.unobserve(node);
      for(const node of sources)if(!positionSources.includes(node))positionResize.observe(node);
      positionSources=sources;
    }
    const visual=window.visualViewport,viewportTop=visual?.offsetTop||0,screenHeight=visual?.height||window.innerHeight,viewportBottom=visual?Math.max(0,window.innerHeight-viewportTop-screenHeight):0,rect=panel.getBoundingClientRect(),screenMiddle=viewportTop+screenHeight/2;
    let top=viewportTop+76,bottom=viewportBottom+(window.innerWidth<=1100?16:48);
    for(const node of sources){
      const style=getComputedStyle(node),box=node.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||!box.width||!box.height)continue;
      const overlapsHorizontally=rect.left<box.right&&rect.right>box.left;
      if(node.id==='syncTag'||node.matches('.project-dock')&&box.bottom>screenMiddle){
        if(overlapsHorizontally)bottom=Math.max(bottom,window.innerHeight-box.top+12);
      }else if(overlapsHorizontally&&box.bottom<screenMiddle)top=Math.max(top,box.bottom+14);
    }
    panel.style.setProperty('--secretary-top',top+'px');
    panel.style.setProperty('--secretary-bottom',bottom+'px');
  }
  function refresh(){
    checkIdentity();
    if(!ready()||!supported()){showLauncher(null);clearLayout();finishFinanceTransition();lastView=state.view;return;}
    if(nativeFinance&&financeViews.includes(state.view)){
      clearLayout();
      if(lastView!==state.view){questions=[];answers={};questionTarget=null;pendingAnswers={};}
      lastView=state.view;lastProject=null;home=false;homePending=false;
      showLauncher('finance');return;
    }
    if(preview&&(preview.view!==state.view||preview.project!==state.currentProject)){preview.node.remove();preview=null;}
    const viewingDocument=!!expenseOverlay||!!preview||state.view==='presedit'||!!document.querySelector('#view .finance-document-editor');
    if(viewingDocument){home=false;}
    else if(homePending&&financeViews.includes(state.view)||documentOpen&&(messages.length||desktopFinance())&&(lastView===state.view||lastView==='presedit'&&state.view==='proyecto')){
      home=true;homePending=false;collapsed=false;
    }else if(lastView==null&&state.view==='informes')home=true;
    documentOpen=viewingDocument;
    const projectId=activeProject()?.id||null,changedView=lastView!==state.view||lastProject!==projectId;
    if(changedView){questions=[];answers={};questionTarget=null;pendingAnswers={};if(busy&&requestContext&&!sameContext(requestContext)){contextInterrupted=true;controller?.abort();}}
    lastView=state.view;lastProject=projectId;
    if(!panel)build();
    document.body.classList.add('secretary-on');document.body.classList.toggle('secretary-home',home&&!collapsed);
    document.body.classList.toggle('secretary-lateral',!home&&!collapsed);document.body.classList.toggle('secretary-folded',collapsed);
    document.body.classList.toggle('secretary-previewing',!!preview);
    document.body.classList.toggle('secretary-document-open',viewingDocument);
    if(preview&&!preview.node.isConnected)document.getElementById('view')?.append(preview.node);
    panel.classList.toggle('is-home',home);panel.hidden=collapsed;panel.inert=!!financeTransition;
    const inFinance=financeViews.includes(state.view);
    returnButton.hidden=home;exitButton.hidden=!inFinance;foldButton.hidden=inFinance;
    panel.classList.toggle('has-mode-exit',inFinance);
    document.body.classList.toggle('secretary-ai-finance',inFinance);
    const project=activeProject(),name=secretaryName();
    titleNode.textContent=name;panel.setAttribute('aria-label',name);thread.setAttribute('aria-label','Conversación con '+name);
    for(const turn of thread.querySelectorAll('.secretary-turn-assistant'))turn.setAttribute('aria-label',name);
    contextNode.textContent=project?.name||'';contextNode.hidden=!project;
    // Fixed lateral UI belongs to the viewport, outside project animations and
    // containing blocks. The central conversation remains ordinary view content.
    const mount=home?document.getElementById('view'):document.body;
    if(panel.parentElement!==mount)mount?.append(panel);
    showLauncher(collapsed?'project':null);
    updateBusy();position();schedulePosition();if(changedView&&!messages.length)drawThread();if(!feedbackError)loadFeedback();
  }
  const previousRender=render;
  render=function(){panel?.remove();const result=previousRender.apply(this,arguments);refresh();return result;};
  const previousGo=go;
  go=function(view,arg){
    const transition=financeTransition;
    const origin=transition&&!transition.switching?currentContext():null;
    const before=state.view,requestedHome=homePending,result=previousGo.apply(this,arguments);
    if(state.view!==before&&!requestedHome&&!(before==='presedit'&&state.view==='proyecto'&&home))home=false;
    if(origin&&financeTransition===transition&&!sameContext(origin))finishFinanceTransition();
    refresh();return result;
  };
  document.addEventListener('click',event=>{
    if(!ready())return;
    const finance=event.target.closest?.('.desktop-finance,#ngFin>.nav-head');
    if(finance){if(!nativeFinance){event.preventDefault();event.stopImmediatePropagation();openFinance();}return;}
    if(event.target.closest?.('#page-route-bar')){home=false;homePending=false;}
  },true);
  window.addEventListener('resize',schedulePosition);
  financeDesktopMedia?.addEventListener?.('change',()=>requestAnimationFrame(()=>{if(panel?.isConnected)drawThread();}));
  if(window.visualViewport){window.visualViewport.addEventListener('resize',schedulePosition);window.visualViewport.addEventListener('scroll',schedulePosition);}
  function completeMotion(){
    finishReply();
    for(const animation of financeTransition?.overlay.getAnimations({subtree:true})||[])animation.finish();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)completeMotion();drawCharacter();});
  characterMotion?.addEventListener?.('change',()=>{if(characterMotion.matches)completeMotion();drawCharacter();});
  new MutationObserver(schedulePosition).observe(document.body,{childList:true});
  window.addEventListener('storage',handleFeedbackStorage);
  if(sb?.auth?.onAuthStateChange){
    const result=sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||session?.user?.id&&session.user.id!==state.sessionUser?.id)reset();});authSubscription=result?.data?.subscription;
  }
  refresh();
  return Object.freeze({enabled:true,openFinance,refresh,reset});
})();
