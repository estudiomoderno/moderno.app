/* Secretary document boundary. The app remains authoritative for permissions,
   financial arithmetic, numbering, persistence and document issue. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ModernoSecretaryBridge=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const VIEWS=Object.freeze({finanzas:'informes',facturas:'facturas',gastos:'contabilidad',presupuestos:'presupuestos',prevision:'prevision',proyecto:'proyecto'});
  const BLOCKS=Object.freeze(['config','contactos','proyectos','presupuestos','facturas']);
  function fail(message,code='invalid_proposal'){const error=new Error(message);error.code=code;throw error;}
  function text(value,max=200){return typeof value==='string'?value.trim().slice(0,max):'';}
  function number(value,label,max=1e12){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)fail('Falta confirmar '+label+'.');
    return value;
  }
  function tax(value,label){
    if(!value||typeof value.on!=='boolean')fail('Falta confirmar '+label+'.');
    return {on:value.on,pct:number(value.pct,label,100)};
  }
  function metadata(value){
    if(!value||typeof value!=='object'||Array.isArray(value))fail('No se pudo comprobar la procedencia de una partida.');
    const encoded=JSON.stringify(value);
    if(encoded.length>16000)fail('La procedencia de una partida supera el tamaño permitido.');
    return JSON.parse(encoded);
  }
  function assertVersions(sourceVersions,versions,dirtyBlocks=[]){
    if(!sourceVersions||typeof sourceVersions!=='object')fail('Vuelve a consultar los datos antes de abrir el borrador.','stale_proposal');
    for(const key of BLOCKS){
      if(typeof sourceVersions[key]!=='string'||!sourceVersions[key]||sourceVersions[key]!==versions?.[key]||dirtyBlocks.includes(key))
        fail('Los datos han cambiado o tienen cambios pendientes. Guarda y vuelve a pedir el borrador.','stale_proposal');
    }
  }
  function prepareDraft(payload,snapshot){
    if(snapshot.role!=='admin')fail('Tu perfil no puede preparar documentos económicos.','forbidden');
    if(!payload||!['factura','presupuesto'].includes(payload.kind))fail('Este tipo de documento no está disponible.');
    assertVersions(payload.sourceVersions,snapshot.versions,snapshot.dirtyBlocks);
    const brand=text(payload.brand,80);
    if(!brand||!snapshot.brands?.includes(brand))fail('El espacio del documento no está disponible.','forbidden');
    const clients=snapshot.clients||[];
    const clientId=text(payload.clientId,180);
    let clientIdx=-1;
    if(clientId.startsWith('contact:')){
      const index=Number(clientId.slice(8));
      if(Number.isInteger(index)&&index>=0&&index===payload.clientIndex&&clients[index]?.id==null)clientIdx=index;
    }else if(clientId){
      const matches=clients.map((client,index)=>({client,index})).filter(item=>item.client.id!=null&&String(item.client.id)===clientId);
      if(matches.length===1)clientIdx=matches[0].index;
    }
    const client=clients[clientIdx];
    if(!client||client.name!==payload.clientLabel||client.brand!==payload.clientBrand||
       !['Cliente',...(payload.kind==='factura'?['Proveedor']:[])].includes(client.type)||
       ![brand,'both'].includes(client.brand))fail('El contacto ha cambiado. Vuelve a seleccionarlo con el Secretario.','stale_proposal');
    let project=null;
    if(payload.projectId!=null&&payload.projectId!==''){
      const matches=(snapshot.projects||[]).filter(item=>String(item.id)===String(payload.projectId)&&!item.tpl);
      if(matches.length!==1||matches[0].brand!==brand)fail('No puedes abrir ese proyecto en este espacio.','forbidden');
      project=matches[0];
    }
    if(!Array.isArray(payload.lines)||!payload.lines.length||payload.lines.length>200)fail('El borrador necesita sus partidas completas.');
    const lines=payload.lines.map(line=>{
      const name=text(line?.name,500),unit=text(line?.unit,40);
      if(!name||!unit)fail('Falta confirmar el concepto o la unidad de una partida.');
      const qty=number(line.qty,'la cantidad',1e9);
      if(qty===0)fail('La cantidad debe ser mayor que cero.');
      const result={name,qty,unit,price:number(line.price,'el precio de «'+name+'»'),desc:text(line.desc,4000),cap:text(line.cap,300)};
      if(line.catId!=null){if(!['string','number'].includes(typeof line.catId))fail('El servicio de catálogo no está identificado.');result.catId=line.catId;}
      if(line.catalogSource)result.catalogSource=metadata(line.catalogSource);
      if(line.source){
        if(line.source.study!==snapshot.studyId||String(line.source.project)!==String(project?.id))fail('La procedencia pertenece a otro proyecto.','forbidden');
        result.source=metadata(line.source);
      }
      return result;
    });
    const iva=tax(payload.iva,'el impuesto'),irpf=tax(payload.irpf,'la retención'),disc=tax(payload.disc,'el descuento');
    if(irpf.on&&!snapshot.irpf)fail('La retención propuesta no está habilitada en este estudio.','stale_proposal');
    const sourceQuoteRef=text(payload.sourceQuoteRef,100);
    if(sourceQuoteRef){
      const matches=(snapshot.quotes||[]).filter(item=>item.ref===sourceQuoteRef&&item.brand===brand&&String(item.projectId||'')===String(project?.id||''));
      const quote=matches.length===1?matches[0]:null;
      if(payload.kind!=='factura'||!quote||quote.client!==client.name||
         String(quote.projectId||'')!==String(project?.id||''))fail('El presupuesto de origen ha cambiado. Vuelve a consultarlo.','stale_proposal');
    }
    let draftId=null;
    if(payload.draftId!=null){
      const matches=(snapshot.drafts||[]).filter(item=>String(item.id)===String(payload.draftId));
      const saved=matches.length===1?matches[0]:null;
      if(!saved||saved.kind!==payload.kind||saved.draft?.brand!==brand||saved.draft?.clientIdx!==clientIdx||saved.draft?.editRef)
        fail('El borrador guardado ha cambiado. Vuelve a consultarlo.','stale_proposal');
      draftId=saved.id;
    }
    const mode=payload.mode||(draftId!=null?'resume':sourceQuoteRef?'from_quote':'create');
    if(!['create','from_quote','resume','edit_saved_draft'].includes(mode)||
       (mode==='from_quote'&&!sourceQuoteRef)||(['resume','edit_saved_draft'].includes(mode)&&draftId==null)||
       (mode==='create'&&(sourceQuoteRef||draftId!=null)))fail('El origen de este borrador no está disponible.');
    if(mode==='edit_saved_draft'){
      const saved=snapshot.drafts.find(item=>item.id===draftId).draft;
      if(saved.editRef||saved.lines.length!==lines.length||saved.lines.some((line,index)=>line.name!==lines[index].name||line.unit!==lines[index].unit))
        fail('Las partidas del borrador han cambiado. Revísalo en su editor.','stale_proposal');
    }
    return {kind:payload.kind,brand,clientIdx,projectId:project?.id||null,lines,iva,irpf,disc,
      legend:text(payload.legend,4000),validUntil:'',num:null,date:snapshot.today||new Date().toISOString().slice(0,10),editRef:null,
      _secretaryMode:mode,...(sourceQuoteRef?{sourceQuoteRef}:{}),...(draftId!=null?{_draftId:draftId}:{})};
  }
  function navigation(payload,snapshot){
    const view=VIEWS[payload?.view];
    if(!view||!snapshot.canView(view))fail('No tienes acceso a esa pantalla.','forbidden');
    if(view==='proyecto'){
      const matches=(snapshot.projects||[]).filter(item=>String(item.id)===String(payload.projectId)&&!item.tpl);
      const project=matches.length===1?matches[0]:null;
      if(!project)fail('Ese proyecto no está disponible en tu sesión.','forbidden');
      return {view,projectId:project.id};
    }
    return {view};
  }
  function recentHistory(records,message){
    if(typeof message!=='string'||!message.trim()||message.length>6000)fail('Escribe un mensaje de hasta 6.000 caracteres.','message_length');
    const turns=(records||[]).filter(record=>['user','assistant'].includes(record.role)&&typeof record.content==='string');
    let history=turns.slice(-16).map(({role,content,automatic})=>({role,content,...(automatic===true?{automatic:true}:{})}));
    const oversized=history.findLastIndex(turn=>turn.content.length>6000);
    if(oversized>=0)history=history.slice(oversized+1);
    let total=message.length+history.reduce((sum,turn)=>sum+turn.content.length,0);
    while(history.length&&total>24000)total-=history.shift().content.length;
    return {history,trimmed:history.length!==turns.length};
  }
  function clarificationAnswer(questions,message){
    if(questions.length!==1)return null;
    const [question]=questions,key=question.id;
    if(key.startsWith('receivable_'))return null;
    const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    const reply=normalize(message).replace(/^(?:mejor |en realidad |cambia a |elige |usa |(?:quiero )?el(?: cliente| proyecto)? |(?:quiero )?la )/,'').trim();
    const original=normalize(message);
    const matches=question.options.filter(option=>[option.label,...String(option.label??'').split(' · '),option.value]
      .some(value=>value&&[original,reply].includes(normalize(value))));
    if(matches.length===1)return {[key]:String(matches[0].value??matches[0].id)};
    if(key==='currency'&&/^[a-z]{3}$/.test(reply))return {[key]:reply.toUpperCase()};
    if(key==='period'&&/^(?:este (?:mes|ano)|(?:el )?(?:mes|ano) (?:pasado|anterior)|(?:en |de )?(?:19|20|21)\d{2}|(?:entre|del|de|desde|hasta) \d+[/-]|(?:en |de )?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)/i.test(reply))return {[key]:message};
    if(/^line\.\d+\.(?:qty|price)$/.test(key)&&/^(?:(?:a|son|por) )?\d+(?:[.,]\d+)?(?: [a-záéíóú€$²³/]+){0,4}$/i.test(reply))return {[key]:message};
    return null;
  }
  function sourcePointer(source){
    if(!source||!source.kind||source.id==null)return null;
    const {kind,id,brand,projectId}=source;
    return {kind,id:String(id),...(brand?{brand:String(brand)}:{}),...(projectId!=null?{projectId:String(projectId)}:{})};
  }
  return Object.freeze({VIEWS,BLOCKS,prepareDraft,navigation,assertVersions,recentHistory,clarificationAnswer,sourcePointer});
});
