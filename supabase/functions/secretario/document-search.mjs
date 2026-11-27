import {matchesSource} from './conversation.mjs';
import {collectPayables,resolvePayableScope} from './payables.mjs';
import {invoicePaymentTurn} from './payment-direction.mjs';
import {parsePeriod,resolveReceivableScope} from './receivable-scope.mjs';
import {collectReceivables,isoDate,normalizeReceivableText} from './receivables.mjs';
import {buildEntityCatalog,normalizeEntityText,parseEntityIdentity,resolveEntity,serializeEntityIdentity} from './entities.mjs';

const PAGE_SIZE=12;
const kinds=['invoice','quote','received'];
const modes=['list','sum','sent','sent-copy','accepted-copy','linked','verify','pending-payables'];
const states=['accepted','pending','rejected','paid','partial','overdue','open','unknown_due','void','sent'];
const fields=['document_client','document_project','document_party','document_reference','document_period','document_currency'];
const string=(value,max=160)=>typeof value==='string'?value.trim().slice(0,max):'';
const id=value=>typeof value==='string'||Number.isSafeInteger(value)?String(value):'';
const norm=value=>normalizeReceivableText(value).replace(/[^a-z0-9/-]+/g,' ').trim().replace(/\s+/g,' ');
const escape=value=>value.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
const key=(...parts)=>JSON.stringify(parts);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const bounded=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
const only=(value,keys)=>object(value)&&Object.keys(value).every(field=>keys.includes(field));
const projectId=row=>id(row?.projectId??row?.pid)||null;
const currency=value=>/^[A-Z]{3}$/.test(String(value||'').toUpperCase())?String(value).toUpperCase():null;
const finiteAmount=value=>(typeof value==='number'||typeof value==='string'&&value.trim())&&Number.isFinite(Number(value))?Number(value):null;
const money=(amount,code)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:code,useGrouping:'always',
  ...(Number.isInteger(amount)?{minimumFractionDigits:0}:{})}).format(amount);
const dateLabel=date=>date.split('-').reverse().join('/');
const writing=/^(?:(?:por favor|puedes|podrias|quiero|necesito) )*(?:abr(?:e(?:me)?|ir)|edit\w*|crea\w*|prepara\w*|haz|hacer|genera\w*|guarda\w*|continua\w*|retoma\w*|descarga\w*|paga\w*|envia\w*|manda\w*|registra\w*|emite\w*|anula\w*|borra\w*)\b/;
const differentTopic=/\b(?:tareas?|pedidos?|resumen|balance|costes?|borradores?)\b/;
const invoiceWord=/\bfacturas?\b/;
const quoteWord=/\bpresupuestos?\b/;
const referenceWord=/\b[a-z]{1,12}(?:-[a-z0-9]+)*[-/]\d[a-z0-9/-]*\b/g;
const sentWord=/\b(?:mande|mandamos|mandaste|envie|enviaste|enviamos|mandad[ao]s?|enviad[ao]s?)\b/;
const clearAll=/\b(?:sin filtros|todos los filtros)\b/;
const clearProject=/\b(?:todo el estudio|todos los proyectos|sin filtro de proyecto)\b/;
const clearParty=/\b(?:todos los clientes|todos los proveedores|sin filtro de (?:cliente|proveedor))\b/;
const clearCurrency=/\b(?:todas las monedas|cualquier moneda|sin filtro de moneda)\b/;
const clearDate=/\b(?:todos los anos|sin limite de fechas|sin filtro de (?:periodo|fecha))\b/;
const clearState=/\b(?:cualquier estado|todos los estados|sin filtro de estado)\b/;
const clearReference=/\b(?:todas las referencias|sin filtro de referencia)\b/;
const unspecifiedFilter=/^(?:(?:y|ahora|mejor|por favor) )*(?:quita(?:me)?|quitar|elimina(?:me)?|eliminar) (?:ese|este|el) filtro$/;
const clearResult=/^(?:(?:y|ahora|mejor|ensename|muestrame|ver|dime) )*(?:todas|todos|las demas|los demas|el resto)$/;
const namedScope=/\b(?:cliente|proveedor|proyecto)(?: (?:de|del|llamad[ao]))?$/;
const quoteStateWords=/\b(?:aceptad[oa]s?|rechazad[oa]s?|pendientes? (?:de )?(?:aceptar|aceptacion))\b/;
const invoiceStateWords=/\b(?:cobrad[ao]s?|pagad[ao]s?)\b/;
const receivedWords=/\b(?:recibid[oa]s?|(?:de|del|a|al) (?:(?:un[ao]?|el|la|mis|los|las|nuestros|nuestras) )?proveedor(?:a|es|as)?)\b/;
const unnamedSupplier=/\b(?:de|a) un[ao]? proveedor(?:a)?\b/;
const paymentsMade='(?:(?:(?:he|e|hemos) (?:pagado|abonado|liquidado))|pague|pagamos|abone|abonamos)';
const outgoingPaid=new RegExp('\\b'+paymentsMade+'\\b');
const outgoingUnpaid=new RegExp('\\bno (?:(?:aun|todavia) )?'+paymentsMade+'\\b');
const incomingPaid=/\b(?:(?:he|e|hemos) cobrado|cobre|cobramos|(?:me|nos) (?:ha|han) (?:pagado|abonado))\b/;
const paidDateWords=/\b(?:fecha de (?:pago|abono|cobro)|(?:pagad[oa]s?|cobrad[oa]s?|pague|cobre|abone) (?:durante|entre|desde|hasta|el \d))\b/;
const currencyWords={euro:'EUR',euros:'EUR',dolar:'USD',dolares:'USD','dolar estadounidense':'USD','dolares estadounidenses':'USD',
  libra:'GBP',libras:'GBP','libra esterlina':'GBP','libras esterlinas':'GBP','dolar canadiense':'CAD','dolares canadienses':'CAD',
  'peso mexicano':'MXN','pesos mexicanos':'MXN','franco suizo':'CHF','francos suizos':'CHF',yen:'JPY',yenes:'JPY'};
const currencyCodes=new Set(Intl.supportedValuesOf('currency'));
const currencyFilter=new RegExp('\\b(?:en (?:moneda )?|moneda )('+Object.keys(currencyWords).sort((a,b)=>b.length-a.length).join('|')+'|[a-z]{3})\\b','g');
const currencyValue=value=>{
  const name=norm(value),code=Object.hasOwn(currencyWords,name)?currencyWords[name]:currency(name);
  return currencyCodes.has(code)?code:null;
};
const mentionsPhrase=(text,phrase)=>!!norm(phrase)&&new RegExp('(?:^| )'+escape(norm(phrase))+'(?= |$)').test(text);

function focusedDocument(request){
  const focus=request.context?.focus;
  return focus?.document??(focus?.results?.length===1?focus.results[0]:null);
}

function family(pointer){
  return ({invoice:'invoice',invoice_entry:'invoice',quote:'quote',entry:'received'})[pointer?.kind]??null;
}

function documentMode(text){
  if(/\b(?:version|copia)\b/.test(text)&&/\b(?:acepto|aprobo|aceptada|aprobada)\b/.test(text))return 'accepted-copy';
  if(sentWord.test(text)&&/\b(?:misma|mismo|version|copia|exacta)\b/.test(text))return 'sent-copy';
  if(sentWord.test(text))return 'sent';
  if(/\b(?:cuanto(?:s)? (?:suman|suma)|(?:suma|total|importe) de los presupuestos)\b/.test(text))return 'sum';
  if(invoiceWord.test(text)&&quoteWord.test(text)&&/\b(?:hice|emiti|vinculad[oa]s?|facturad[oa]s?|existe|tiene|facturas? (?:del|de ese|de este) presupuesto)\b/.test(text))return 'linked';
  if(/\b(?:esta|figura|consta)\b/.test(text)&&(quoteStateWords.test(text)||invoiceStateWords.test(text)))return 'verify';
  return 'list';
}

function contextual(text){
  if(differentTopic.test(text))return false;
  return clearAll.test(text)||clearResult.test(text)||
    /^(?:(?:y|ahora|mejor|dime|muestrame|ensename|solo|de esas|de esos|cual esta|cuales estan|las que estan|los que estan) )*(?:(?:las?|los?|esas?|esos?) )?(?:de |del |a |en |entre |desde |hasta |sin |(?:este|ese|el) (?:ano|mes)\b|cliente |proveedor |proyecto |aceptad[oa]s?\b|rechazad[oa]s?\b|cobrad[oa]s?\b|pagad[oa]s?\b|pendientes?\b|anulad[oa]s?\b)/.test(text);
}

function settledWord(text){
  if(outgoingUnpaid.test(text)||/\b(?:no|sin|parcialmente) (?:(?:estan?|han sido) )?(?:cobrad[oa]s?|pagad[oa]s?)\b|\b(?:cobrad[oa]s?|pagad[oa]s?) en parte\b/.test(text))return null;
  if(incomingPaid.test(text)||/\bcobrad[oa]s?\b/.test(text))return 'incoming';
  return outgoingPaid.test(text)||/\bpagad[oa]s?\b/.test(text)?'outgoing':null;
}

export function validDocumentContext(value){
  if(!only(value,['scope','clarification']))return false;
  const {scope,clarification}=value;
  if(scope){
    if(!only(scope,['kind','clientKey','projectId','date','state','reference','latest','selection','mode','paymentParty','brand','currency'])||
      !kinds.includes(scope.kind)||!modes.includes(scope.mode)||scope.mode==='pending-payables'&&scope.kind!=='received'||typeof scope.latest!=='boolean'||
      !['clientKey','projectId','reference','selection'].every(field=>scope[field]==null||bounded(scope[field],400))||
      scope.state!=null&&!states.includes(scope.state)||
      scope.brand!=null&&(typeof scope.brand!=='string'||scope.brand.length>80)||
      scope.currency!=null&&!/^[A-Z]{3}$/.test(scope.currency)||
      scope.paymentParty&&(!only(scope.paymentParty,['name','label','brand','clientIndex'])||!bounded(scope.paymentParty.name,400)||
        scope.paymentParty.label!=null&&!bounded(scope.paymentParty.label,160)||
        scope.paymentParty.brand!==null&&(typeof scope.paymentParty.brand!=='string'||scope.paymentParty.brand.length>80)||
        scope.paymentParty.clientIndex!=null&&(!Number.isSafeInteger(scope.paymentParty.clientIndex)||scope.paymentParty.clientIndex<0))||
      scope.date&&(!only(scope.date,['from','to','field'])||scope.date.field!=null&&!['issued','due'].includes(scope.date.field)||!isoDate(scope.date.from)||!isoDate(scope.date.to)||
        scope.date.from!==isoDate(scope.date.from)||scope.date.to!==isoDate(scope.date.to)||scope.date.from>scope.date.to))return false;
  }
  return !!(scope||clarification)&&(!clarification||
    only(clarification,['kind','field','query','answers'])&&kinds.includes(clarification.kind)&&fields.includes(clarification.field)&&bounded(clarification.query,6000)&&
    (!clarification.answers||only(clarification.answers,fields)&&Object.values(clarification.answers).every(answer=>bounded(answer,1200))));
}

export function documentSearchTurn(request){
  const {message,answers={},automatic,documentContext:context}=request;
  if(request.documentPage)return context?.scope?{kind:context.scope.kind,query:'',base:context.scope,answers:{}}:null;
  const focus=focusedDocument(request);
  const prompt=context?.clarification;
  const current=automatic?(prompt&&answers[prompt.field]||answers.detail||message):message;
  const text=norm(current);
  const actionText=text.replace(/^(?:hola|buenas(?: tardes| noches)?|buenos dias)\b */,'');
  const paymentText=text.replace(/\bfecha de (?:pago|abono|cobro)\b/g,' ');
  if(!text||writing.test(actionText)||/\bpdf\b|\b(?:por|de) (?:cobrar|cobro|pagar|pago)\b/.test(paymentText))return null;
  if(!prompt&&context?.scope&&context.scope.mode!=='pending-payables'&&unspecifiedFilter.test(text)){
    const base=context.scope,filters=documentFilters(base,{});
    return {kind:base.kind,query:filters.length===1?filters[0].clear:current,base,answers:{},filterChoice:filters.length!==1?filters:null};
  }
  const missingMovement=/\b(?:ingresos?|movimientos?|asientos?)\b/.test(text)&&
    /\b(?:faltan?|faltantes?|ausentes?|sin registrar|no (?:estan |figuran )?registrad[oa]s?)\b/.test(text);
  const explicitDocuments=/\b(?:busca|muestra(?:me)?|ensena(?:me)?|ver|listar) (?:(?:las?|los?|mis|tus|unas?) )?(?:facturas?|presupuestos?)\b/.test(text);
  if(missingMovement&&!explicitDocuments&&!invoiceStateWords.test(text)&&!quoteStateWords.test(text))return null;
  const mode=documentMode(text);
  const explicitKind=mode==='linked'?'quote':invoiceWord.test(text)?'invoice':quoteWord.test(text)?'quote':null;
  const hasFollowup=!!context?.scope&&contextual(text);
  const dependentMode=['sent','sent-copy','accepted-copy'].includes(mode);
  const typedParty=/^(?:(?:el|la) )?(?:proveedor|cliente|proyecto) /.test(text);
  if(prompt&&(automatic?Object.hasOwn(answers,prompt.field):(!explicitKind||typedParty)&&!differentTopic.test(text))){
    const prior=norm(prompt.query),settled=settledWord(prior)??(context.scope?.state==='paid'?(prompt.kind==='received'?'outgoing':'incoming'):null);
    return {kind:prompt.kind,query:prompt.query,base:context.scope,answers:{...prompt.answers,[prompt.field]:current},focus,settled};
  }
  const fromGastos=/^(?:gastos|contabilidad)$/.test(request.context?.view||'');
  const settled=mode==='list'&&(explicitKind==='invoice'||contextual(text))?settledWord(text):null;
  const payableOrigin=settled==='outgoing'&&!context?.scope&&!request.receivableContext?.scope?
    invoicePaymentTurn({...request,message:'facturas',automatic:false,answers:{}}):null;
  const impliedKind=contextual(text)&&quoteStateWords.test(text)?'quote':contextual(text)&&invoiceStateWords.test(text)?
    /\bpagad[oa]s?\b/.test(text)&&(fromGastos||context?.scope?.kind==='received'||payableOrigin?.direction==='payable')?'received':'invoice':null;
  const received=receivedWords.test(text)||outgoingPaid.test(text)&&!incomingPaid.test(text);
  const kind=explicitKind==='invoice'&&(received||payableOrigin?.direction==='payable'||fromGastos&&!/\b(?:emitid[ao]s?|ventas|clientes?)\b/.test(text))?'received':
    explicitKind||(dependentMode?family(focus)||context?.scope?.kind:null)||impliedKind||(hasFollowup?context.scope.kind:null);
  if(!kind||differentTopic.test(text)&&!explicitKind)return null;
  if(!explicitKind&&!dependentMode&&!hasFollowup&&!impliedKind)return null;
  const inherited=!explicitKind||hasFollowup&&/^(?:y|ahora|mejor|solo)\b/.test(text);
  const base=inherited&&context?.scope?.kind===kind?context.scope:null;
  const paidScope=settled&&inherited&&!base?
    kind==='invoice'&&request.receivableContext?.scope?{receipt:request.receivableContext}:
    kind==='received'&&payableOrigin?.direction==='payable'?{payable:payableOrigin}:null:null;
  return {kind,query:current,base,answers:{},focus,settled:settled??(base?.state==='paid'?(kind==='received'?'outgoing':'incoming'):null),paidScope};
}

export function plannedDocumentTurn(request,plan){
  const lookup=plan?.lookup,kind=lookup?.documentType;
  if(!kinds.includes(kind))return null;
  const local=documentSearchTurn(request);
  const query=local?.query??request.message,text=norm(query);
  const action=text.replace(/^(?:hola|buenas(?: tardes| noches)?|buenos dias)\b */,'');
  if(!text||writing.test(action)||/\bpdf\b/.test(text))return null;
  if(local&&(local.kind!==kind||request.documentContext?.clarification&&local.query!==request.message))return local;
  const previous=request.documentContext?.scope;
  const base=local?.base??(lookup.continuation&&previous?.kind===kind&&contextual(text)?previous:null);
  return {kind,query,base,answers:local?.answers??{},focus:local?.focus??focusedDocument(request),paidScope:local?.paidScope,
    planned:{...lookup,clientId:plan.clientId,projectId:plan.projectId,projectQuery:plan.projectQuery}};
}

function documentEntities(snapshot,kind,catalog=buildEntityCatalog(snapshot)){
  const role=kind==='received'?'supplier':'client';
  const names={supplier:'proveedor',client:'cliente',project:'proyecto'};
  const selectable=entity=>entity.kind==='project'?entity.id:serializeEntityIdentity(entity.identity);
  const candidates=catalog.entities.filter(entity=>[role,'project'].includes(entity.kind));
  const counts=new Map();
  for(const entity of candidates){const value=selectable(entity);if(value)counts.set(value,(counts.get(value)??0)+1);}
  const options=candidates.map((entity,index)=>{
    const {record}=entity,value=selectable(entity),brand=entity.brand??'';
    const stable=!!value&&counts.get(value)===1;
    const aliases=[entity.label,record?.num,...entity.aliases].map(norm).filter(Boolean);
    const partial=entity.kind!=='project'?aliases.flatMap(alias=>alias.split(' ')).filter(word=>word.length>3&&!['proveedor','cliente'].includes(word)):[];
    const suffix=[entity.origin!=='document_party'?record?.num:null,
      entity.kind!=='project'&&entity.origin!=='document_party'&&brand&&brand!=='both'?snapshot.config?.BRAND?.[brand]?.name||brand:null]
      .filter(Boolean).join(' · ');
    return {entity:names[entity.kind],key:stable?value:`unresolved:${index}`,label:string(entity.label),suffix,brand,
      aliases:[...new Set([...aliases,...partial])],relation:entity,selectable:stable,index:entity.contactIndex,
      contactId:entity.origin==='contact'?id(record?.id):null};
  });
  return {catalog,clients:options.filter(option=>option.relation.kind===role),projects:options.filter(option=>option.entity==='proyecto')};
}

function entityMatches(value,entities){
  const found=[];
  for(const entity of entities){
    for(const alias of entity.aliases){
      const regex=new RegExp('(?:^| )('+escape(alias)+')(?= |$)','g');
      for(const match of value.matchAll(regex)){
        const start=match.index+match[0].length-match[1].length,end=start+match[1].length;
        const before=value.slice(0,start).trimEnd(),named=namedScope.exec(before)?.[0].split(' ')[0];
        if(named&&named!==entity.entity)continue;
        if(!named&&!/\b(?:de|del|a|al|para|en)$/.test(before)&&!/\d/.test(alias))continue;
        found.push({...entity,start,end});
      }
    }
  }
  return found.filter(match=>!found.some(other=>other.start<=match.start&&other.end>=match.end&&(other.start<match.start||other.end>match.end)));
}

const selectionLabel=item=>[item.label,item.suffix].filter(Boolean).join(' · ');
function clarification(turn,field,message,options=[]){
  return {
    status:'clarifying',message,sources:[],actions:[],trace:[],
    questions:[{id:field,prompt:message,freeText:true,options:options.filter(item=>item.selectable!==false).slice(0,8).map(item=>({id:field+':'+item.key,value:item.key,label:selectionLabel(item)}))}],
    documentContext:{scope:turn.base??null,clarification:{kind:turn.kind,field,query:turn.query,
      answers:Object.fromEntries(Object.entries(turn.answers??{}).filter(([id,value])=>id!==field&&bounded(value,1200)))}}
  };
}

const searchLabels={
  invoice:{one:'factura emitida',many:'facturas emitidas',article:'la'},
  quote:{one:'presupuesto',many:'presupuestos',article:'el'},
  received:{one:'factura recibida',many:'facturas recibidas',article:'la'}
};

function requestedState(text,kind){
  if(/\banulad[oa]s?\b/.test(text))return 'void';
  if(kind==='quote'){
    if(/\b(?:no aceptad[oa]s?|pendientes? de (?:aceptar|aceptacion)|pendientes?)\b/.test(text))return 'pending';
    if(/\baceptad[oa]s?\b/.test(text))return 'accepted';
    if(/\brechazad[oa]s?\b/.test(text))return 'rejected';
    return null;
  }
  if(outgoingUnpaid.test(text)||/\b(?:no (?:(?:estan?|han sido) )?(?:cobrad[oa]s?|pagad[oa]s?)|sin (?:cobrar|pagar))\b/.test(text))return 'pending';
  if(/\b(?:enviad[oa]s?|mandad[oa]s?)\b/.test(text)&&!/\b(?:mande|mandamos|envie|enviamos)\b/.test(text))return 'sent';
  if(/\b(?:cobro parcial|pago parcial|cobrad[ao]s? en parte|pagad[ao]s? en parte|parcialmente (?:cobrad[ao]s?|pagad[ao]s?))\b/.test(text))return 'partial';
  if(settledWord(text))return 'paid';
  if(/\b(?:sin vencer|no vencid[oa]s?)\b/.test(text))return 'open';
  if(/\bvencid[ao]s?\b/.test(text))return 'overdue';
  return /\bpendientes?\b/.test(text)?'pending':null;
}

function chosenAnswer(answer,entities,catalog){
  if(!answer)return [];
  const types=[...new Set(entities.map(item=>item.relation.kind))],identity=parseEntityIdentity(answer);
  if(identity){
    const resolved=resolveEntity(catalog,{selected:identity,types});
    return resolved.status==='resolved'?entities.filter(item=>item.selectable&&item.relation===resolved.entity):[];
  }
  if(typeof answer==='string'&&answer.trim().startsWith('{'))return [];
  const selected=entities.filter(item=>item.selectable&&item.entity==='proyecto'&&item.key===answer);
  if(selected.length)return selected;
  const input=normalizeEntityText(answer),exact=entities.filter(item=>item.relation.aliases.includes(input)||normalizeEntityText(selectionLabel(item))===input);
  if(exact.length)return exact;
  const resolved=resolveEntity(catalog,{query:answer.trim().replace(/^(?:del?|al?|para) /i,''),types});
  return entities.filter(item=>resolved.candidates.includes(item.relation));
}

function paymentScope(snapshot,request,turn,today){
  const previous=turn.paidScope;
  if(!previous)return {};
  if(previous.receipt){
    if(previous.receipt.clarification)return null;
    const {scope}=resolveReceivableScope(snapshot,request,{query:'',base:previous.receipt.scope,answers:{}},today);
    if(!scope)return null;
    const {client,projectId,date,reference,brand,currency}=scope;
    return {projectId,date,reference,brand,currency,
      paymentParty:client?{name:client.name,label:client.label,brand:client.brand||null,clientIndex:client.clientIndex}:null};
  }
  const {scope,supplierLabel,problem}=resolvePayableScope(snapshot,request,{...previous.payable,query:''},today);
  if(!scope||problem)return null;
  const {supplier,projectId,date,reference,currency}=scope;
  return {projectId,date,reference,currency,clientKey:supplier?.identity??null,
    paymentParty:supplier&&!supplier.identity?{name:supplier.key,label:string(supplierLabel)||supplier.key,brand:supplier.brand}:null};
}

function scopeFor(snapshot,request,turn,today,documents){
  const {kind,planned,answers={}}=turn,text=norm(turn.query);
  const party=kind==='received'?'proveedor':'cliente';
  const {catalog,clients,projects}=documentEntities(snapshot,kind,request.entityCatalog);
  const carried=clearAll.test(text)?{}:paymentScope(snapshot,request,turn,today);
  if(!carried)return normalAnswer('No he podido confirmar el filtro anterior. Indica de nuevo el cliente o proveedor, proyecto y periodo que quieras conservar.');
  const scope={kind,clientKey:null,projectId:null,date:null,state:null,reference:null,latest:false,selection:null,mode:'list',...turn.base,...carried};
  if(request.documentPage){
    if(scope.clientKey&&!clients.some(client=>client.key===scope.clientKey)||scope.projectId&&!projects.some(project=>project.key===scope.projectId))return null;
    return {scope,client:clients.find(client=>client.key===scope.clientKey),clients};
  }
  if(clearAll.test(text))Object.assign(scope,{clientKey:null,paymentParty:null,projectId:null,date:null,state:null,reference:null,brand:null,currency:null,latest:false,selection:null});
  if(clearProject.test(text))scope.projectId=null;
  if(clearParty.test(text)){scope.clientKey=null;scope.paymentParty=null;}
  if(clearCurrency.test(text))scope.currency=null;
  if(clearDate.test(text))scope.date=null;
  if(clearState.test(text))scope.state=null;
  if(clearReference.test(text))Object.assign(scope,{latest:false,reference:null,brand:null,selection:null});
  if(clearResult.test(text))Object.assign(scope,{latest:false,reference:null,brand:null,selection:null});
  const mode=documentMode(text),plannedState=planned?.state??(planned?.overdue==='overdue'?'overdue':planned?.overdue==='open'?'open':null);
  const kindStates=kind==='quote'?['accepted','pending','rejected','void','sent']:['pending','partial','paid','open','overdue','void','sent'];
  if(plannedState&&!clearState.test(text)&&!kindStates.includes(plannedState))return normalAnswer('Ese estado no está disponible para este tipo de documento.',{preserveQueryContext:true});
  const state=requestedState(text,kind)??(!clearState.test(text)?plannedState:null);
  if(state&&mode!=='verify')scope.state=state;
  scope.mode=mode;
  const ask=(field,message,options)=>clarification({...turn,base:scope},field,message,options);
  let remainder=[clearAll,clearProject,clearParty,clearCurrency,clearDate,clearState,clearReference].reduce((value,filter)=>value.replace(filter,' '),text);
  const needsSupplier=kind==='received'&&unnamedSupplier.test(remainder);
  if(needsSupplier)remainder=remainder.replace(unnamedSupplier,' ');
  const currencies=[...remainder.matchAll(currencyFilter)].filter(([,name])=>currencyValue(name));
  const codes=[...new Set(currencies.map(([,name])=>currencyValue(name)))];
  const currencyAnswer=Object.hasOwn(answers,'document_currency')?currencyValue(answers.document_currency):null;
  if(Object.hasOwn(answers,'document_currency')&&!currencyAnswer||codes.length>1&&!currencyAnswer){
    return ask('document_currency','¿En qué moneda quieres ver las facturas?',codes.map(code=>({key:code,label:code})));
  }
  for(const [occurrence] of currencies)remainder=remainder.replace(occurrence,' ');
  const plannedCurrency=currencyValue(planned?.currency);
  if(planned?.currency&&!currencyAnswer&&!clearCurrency.test(text)&&(!plannedCurrency||!codes.includes(plannedCurrency)&&plannedCurrency!==scope.currency)){
    return ask('document_currency','¿En qué moneda quieres ver los documentos?');
  }
  scope.currency=currencyAnswer??codes[0]??scope.currency;
  const allEntities=[...clients,...projects];
  const mentioned=new Set((request.verifiedMentions??[]).map(entity=>serializeEntityIdentity(entity.identity)).filter(Boolean));
  const verified=allEntities.filter(item=>item.selectable&&mentioned.has(serializeEntityIdentity(item.relation.identity))&&
    (item.entity==='proyecto'?!clearProject.test(text):!clearParty.test(text)));
  const chosen=Object.hasOwn(answers,'document_party')?chosenAnswer(answers.document_party,allEntities,catalog):null;
  if(chosen&&(chosen.length!==1||!chosen[0].selectable))return ask('document_party','¿Qué cliente, proveedor o proyecto quieres consultar?',chosen);
  const groups=new Map();
  for(const match of entityMatches(remainder,[...clients,...projects])){
    const position=key(match.start,match.end);
    if(!groups.has(position))groups.set(position,[]);
    groups.get(position).push(match);
  }
  const deduped=[];
  for(const group of [...groups.values()].sort((a,b)=>b[0].start-a[0].start)){
    const {start,end}=group[0];
    remainder=remainder.slice(0,start)+' '.repeat(end-start)+remainder.slice(end);
    const options=[...new Map(group.map(match=>[match.key,match])).values()];
    if(options.some(option=>option.entity!==options[0].entity)){
      const selection=chosen??verified.filter(item=>options.some(option=>option.key===item.key));
      if(selection.length!==1)return ask('document_party','¿Te refieres al contacto o al proyecto?',options.map(item=>({...item,label:(item.entity==='proyecto'?'Proyecto ':item.entity==='proveedor'?'Proveedor ':'Cliente ')+item.label})));
      if(options.some(option=>option.key===selection[0].key))deduped.push(selection[0]);
    }else deduped.push(...options);
  }
  if(chosen&&!deduped.some(item=>item.key===chosen[0].key))deduped.push(chosen[0]);
  for(const item of verified)if(!deduped.some(candidate=>candidate.key===item.key))deduped.push(item);
  for(const [field,label,options,fragment,wanted,cleared] of [
    ['document_client',party,clients,planned?.partyQuery,kind==='received'?planned?.supplierId:planned?.clientId,clearParty.test(text)],
    ['document_project','proyecto',projects,planned?.projectQuery,planned?.projectId,clearProject.test(text)]
  ]){
    if(!planned||cleared||answers[field]||!fragment&&!wanted)continue;
    const grounded=!fragment||mentionsPhrase(text,fragment);
    const direct=fragment&&grounded?chosenAnswer(fragment,options,catalog):[];
    const evidence=direct.length?direct:deduped.filter(item=>item.entity===label);
    const compatible=wanted?evidence.filter(item=>item.key===wanted||item.contactId&&item.contactId===String(wanted)):evidence;
    if(!grounded||compatible.length!==1||!compatible[0].selectable)return ask(field,'¿De qué '+label+' quieres ver los documentos?',evidence);
    if(fragment)remainder=remainder.replace(norm(fragment),' ');
    if(!deduped.some(item=>item.key===compatible[0].key))deduped.push(compatible[0]);
  }
  const activeProject=/\b(?:este proyecto|proyecto actual|proyecto abierto)\b/.test(text);
  if(activeProject&&request.context?.projectId&&projects.some(project=>project.key===request.context.projectId)){
    scope.projectId=request.context.projectId;
    remainder=remainder.replace(/\b(?:este proyecto|proyecto actual|proyecto abierto)\b/,' ');
  }
  for(const [dimension,field,property,options] of [[party,'document_client','clientKey',clients],['proyecto','document_project','projectId',projects]]){
    const answer=answers[field],eligible=[...new Map(deduped.filter(item=>item.entity===dimension).map(item=>[item.key,item])).values()];
    const proposed=answer?chosenAnswer(answer,options,catalog):eligible;
    const hasNamedRequest=new RegExp('\\b'+dimension+'(?: (?:de|del|llamado))? +[a-z0-9]').test(remainder.replace(/\b(?:sin filtro de |todos los )\w+\b/g,' '));
    if(dimension==='proveedor'&&needsSupplier&&!proposed.length&&!scope.clientKey&&!scope.paymentParty){
      return ask(field,'¿De qué proveedor?',options);
    }
    if(proposed.length>1||proposed[0]?.selectable===false||!proposed.length&&(answer||hasNamedRequest&&!chosen)){
      return ask(field,dimension==='proyecto'?'¿De qué proyecto quieres ver los documentos?':'¿De qué '+party+' quieres ver los documentos?',proposed);
    }
    if(proposed.length===1){
      scope[property]=proposed[0].key;
      if(property==='clientKey')scope.paymentParty=null;
      remainder=remainder.replace(new RegExp('\\b'+dimension+'(?: (?:de|del|llamado))?\\b'),' ');
    }
    if(answer)remainder=remainder.replace(new RegExp('\\b'+dimension+'(?: [a-z0-9/-]+)*(?= +(?:desde|entre|hasta|en|este ano|este mes)\\b|$)'),' ');
  }
  if(activeProject&&!scope.projectId)return ask('document_project','¿De qué proyecto quieres ver los documentos?');
  const identity=answers.document_reference;
  if(identity){
    const exact=documents.filter(doc=>doc.key===identity||norm(doc.reference)===norm(identity));
    if(exact.length!==1)return ask('document_reference','¿Qué referencia quieres consultar?',exact);
    scope.reference=norm(exact[0].reference);
    scope.selection=exact[0].key;
  }
  const directNumber=/\b(?:factura|presupuesto)(?: (?:n|nro|numero|no))? +(\d{1,15})\b(?![-/])/.exec(remainder)?.[1];
  const matchingReferences=[...new Set(documents.map(doc=>norm(doc.reference)).filter(ref=>/\d/.test(ref)&&
    (/^\d+$/.test(ref)?ref===directNumber:new RegExp('(?:^| )'+escape(ref)+'(?= |$)').test(remainder))))];
  if(planned?.reference&&!identity&&!mentionsPhrase(text,planned.reference)&&norm(planned.reference)!==scope.reference){
    return ask('document_reference','¿Qué referencia quieres consultar?');
  }
  const plannedReference=planned?.reference&&mentionsPhrase(text,planned.reference)?norm(planned.reference):null;
  const possibleReference=[...new Set([plannedReference,directNumber,...(remainder.match(referenceWord)||[]).filter(ref=>/^(?:f|fc|fac|fra|fv|p|pre|g|fr)[-/]/.test(ref))].filter(Boolean))];
  const references=matchingReferences.length?matchingReferences:possibleReference;
  if(references.length>1&&!identity)return ask('document_reference','¿Qué referencia quieres consultar?');
  if(references.length===1&&!identity){scope.reference=references[0];scope.brand=null;scope.selection=null;}
  const explicitFocus=/\b(?:(?:est[ae]|esa|ese) (?:factura|presupuesto)|la misma|el mismo|la version|el que)\b/.test(text);
  if(!scope.reference&&(explicitFocus||['linked','verify','sent-copy','accepted-copy'].includes(mode))&&family(turn.focus)===kind){
    const focused=documents.find(doc=>matchesSource(doc.source,turn.focus));
    if(focused){scope.reference=norm(focused.reference);scope.selection=focused.key;}
  }
  for(const reference of new Set([...references,...matchingReferences]))remainder=remainder.replace(reference,' ');
  const explicitDate=answers.document_period||null;
  const plannedPeriod=planned?.period&&mentionsPhrase(text,planned.period)?planned.period:null;
  const period=parsePeriod(explicitDate||plannedPeriod||remainder,today);
  if(period?.invalid||!period&&(explicitDate||planned?.period&&!clearDate.test(text)||/\b(?:trimestre|periodo|desde|hasta|entre|ultim[oa]s? \w+ (?:semanas?|dias?|meses?))\b/.test(remainder))){
    return ask('document_period','¿Qué fechas quieres consultar? Indica el mes y el año o dos fechas.');
  }
  if(period){
    const field=/\b(?:vencimiento|vencen?)\b/.test(text)?'due':/\b(?:emision|emitid[oa]s?)\b/.test(text)?'issued':planned?.dateField??scope.date?.field;
    scope.date={from:period.from,to:period.to,...(field?{field}:{})};
    if(!explicitDate)remainder=remainder.replace(period.matched,' ');
  }
  if(/\b(?:ultim[oa]|mas recient[ea])\b/.test(text))scope.latest=true;
  const unresolved=remainder.replace(/\b(?:(?:de|a) (?:mis |los )?(?:proveedores|clientes)|anulad[oa]s?|cobrad[oa]s?|pagad[oa]s?|enviad[oa]s?|mandad[oa]s?|emitid[oa]s?|recibid[oa]s?|rechazad[oa]s?|aceptad[oa]s?|vencid[oa]s?|pendientes? (?:de )?aceptar|pendientes?)\b/g,' ')
    .replace(/\s+/g,' ').trim().replace(/\b(?:de|del|para|al?|en)(?: (?:de|del|para|al?|en|el|la|los|las))*$/,'').trim();
  if(!chosen&&!scope.reference&&!clearResult.test(text)&&!clearAll.test(text)&&
    /\b(?:de|del|para|al?|en) +(?!(?:este|esta|ese|esa|los|las|la|el|todo|mis|mi|emision|aceptar|aceptacion|fecha)\b)[a-z0-9][a-z0-9 /-]*$/.test(unresolved)){
    return ask('document_party','¿De qué '+party+' o proyecto quieres ver los documentos?');
  }
  const client=clients.find(item=>item.key===scope.clientKey);
  if(scope.clientKey&&!client)return ask('document_client','¿De qué '+party+' quieres ver los documentos?');
  if(scope.projectId&&!projects.some(project=>project.key===scope.projectId))return ask('document_project','¿De qué proyecto quieres ver los documentos?');
  return {scope,client,clients};
}

const paidStatus=/^(?:cobr|cobrad[oa]|pag|pagad[oa]|paid)$/;
const voidStatus=/^(?:anul|cancel|void|rectificad)/;
const draftStatus=/^(?:borrador|draft)/;
const documentState=record=>norm(record?.status);
const invoiceSent=record=>['env','enviada','enviado'].includes(documentState(record));
const hasDraft=record=>record?.draft===true||draftStatus.test(documentState(record));
const isVoid=record=>record?.voided===true||voidStatus.test(documentState(record));
const stateLabels={
  invoice:{paid:'Cobrada',partial:'Cobrada en parte',pending:'Pendiente de cobro',open:'Sin vencer',overdue:'Vencida',void:'Anulada',sent:'Enviada'},
  received:{paid:'Pagada',partial:'Pagada en parte',pending:'Pendiente de pago',open:'Sin vencer',overdue:'Vencida',void:'Anulada'},
  quote:{accepted:'Aceptado',pending:'Pendiente de aceptar',rejected:'Rechazado',void:'Anulado',sent:'Enviado'}
};

function documentDue(kind,record,entry){
  const recorded=isoDate(record.due),movement=isoDate(entry?.due);
  if(record.due&&!recorded||entry?.due&&!movement||recorded&&movement&&recorded!==movement)return null;
  if(recorded||movement)return recorded||movement;
  const issued=kind==='invoice'&&entry&&(isoDate(entry.date)||isoDate(record.date));
  return issued?new Date(Date.parse(issued)+30*86400000).toISOString().slice(0,10):null;
}

function incomingState(doc,entry,pending,conflicting){
  if(isVoid(doc)||isVoid(entry))return 'void';
  if(conflicting)return null;
  if(pending)return pending.overdue?'overdue':pending.partial?'partial':'pending';
  const documentPaid=paidStatus.test(documentState(doc)),entryPaid=paidStatus.test(documentState(entry));
  const cobros=entry?.cobros??[];
  if(!Array.isArray(cobros)||cobros.some(payment=>!(finiteAmount(payment?.amount)>0)))return null;
  if(!cobros.length){
    if(documentPaid&&documentState(entry)&&!entryPaid)return null;
    return documentPaid||entryPaid?'paid':invoiceSent(doc)||invoiceSent(entry)?'sent':null;
  }
  const total=finiteAmount(entry.amount),irpf=entry.irpf==null||entry.irpf===''?0:finiteAmount(entry.irpf),base=finiteAmount(entry.base);
  if(total==null||irpf==null||irpf<0||irpf>100||irpf>0&&base==null)return null;
  const remaining=Math.round((total-(irpf>0?base*irpf/100:0)-cobros.reduce((sum,payment)=>sum+Number(payment.amount),0))*100);
  return remaining===0?'paid':null;
}

function typedRows(snapshot,today,kind){
  const projects=new Map(snapshot.projects.map(project=>[id(project.id),project]));
  const defaultCurrency=currency(snapshot.config?.account?.currency);
  const records=[];
  const add=(sourceKind,record,reference,{entry,pending,state,party,disputed=false}={})=>{
    if(!bounded(reference,160)||!bounded(sourceKind==='entry'||sourceKind==='invoice_entry'?id(record.id):reference,160))return;
    const pid=projectId(record);
    const brand=string(record.brand,80),date=isoDate(record.date)||isoDate(entry?.date),due=documentDue(kind,record,entry);
    const rawAmount=sourceKind==='entry'||sourceKind==='invoice_entry'?record.amount:record.total;
    const amount=finiteAmount(rawAmount);
    const ownCurrency=currency(record.currency),entryCurrency=currency(entry?.currency);
    const code=record.currency&&!ownCurrency||entry?.currency&&!entryCurrency||ownCurrency&&entryCurrency&&ownCurrency!==entryCurrency?
      null:ownCurrency||entryCurrency||defaultCurrency;
    const counterparty=string(party||record.client||entry?.client||entry?.sup),project=projects.get(pid);
    const source={
      kind:sourceKind,id:sourceKind==='entry'||sourceKind==='invoice_entry'?id(record.id):reference,
      label:reference,brand,projectId:pid,
      ...(counterparty?{[kind==='received'?'supplier':'client']:counterparty}:{}),
      ...(project?{projectLabel:string(project.name||project.num)}:{}),
      ...(date?{date}:{}),...(due?{due,...(kind==='invoice'&&entry&&!record.due&&!entry.due?{dueCalculated:true}:{})}:{}),
      ...(amount!==null&&code?{total:amount,currency:code}:{}),
      ...(state?{statusLabel:stateLabels[kind][state]}:{}),
      ...(pending?{pending:pending.remaining??pending.pending,currency:pending.currency,due:pending.due,overdue:pending.overdue,
        partial:pending.partial===true,...(pending.dueCalculated===true?{dueCalculated:true}:{})}:{})
    };
    const identity=key(source.kind,source.id,source.brand,source.projectId);
    records.push({key:identity,reference,date,due,brand,projectId:pid,party:counterparty,amount,currency:code,state,sent:invoiceSent(record)||invoiceSent(entry),source,record,
      label:reference,suffix:[snapshot.config?.BRAND?.[brand]?.name||brand,project?.name||project?.num,counterparty,date&&dateLabel(date)].filter(Boolean).join(' · '),
      review:disputed});
  };
  if(kind==='quote'){
    for(const quote of snapshot.quotes??[]){
      if(!object(quote)||hasDraft(quote))continue;
      const status=isVoid(quote)?'void':({acc:'accepted',pend:'pending',rej:'rejected','':'pending'})[documentState(quote)]??null;
      add('quote',quote,string(quote.ref),{state:status,disputed:!status});
    }
  }else if(kind==='received'){
    const pending=new Map(collectPayables(snapshot,today).rows.map(row=>[row.id,{...row,pending:row.pending/100}]));
    for(const entry of snapshot.entries??[]){
      if(entry?.kind!=='out'||snapshot.invoiceData?.del?.[entry.id]||hasDraft(entry))continue;
      const open=pending.get(id(entry.id));
      const paymentDetail=['cobros','pagos','payments'].some(field=>entry[field]!=null&&(!Array.isArray(entry[field])||entry[field].length>0));
      const status=isVoid(entry)?'void':open?.overdue?'overdue':open?'pending':!paymentDetail&&paidStatus.test(documentState(entry))?'paid':null;
      add('entry',entry,string(entry.reference||entry.ref||entry.concept),{pending:open,state:status,party:entry.sup||entry.client,disputed:!status});
    }
  }else{
    const pending=new Map(),linked=new Map(),known=new Map(),entryIds=new Map();
    for(const row of collectReceivables(snapshot,{today}).rows){
      pending.set(key(row.kind,row.id,row.brand,row.projectId),{...row,remaining:row.remaining/100});
    }
    for(const entry of snapshot.entries??[]){
      if(!entry||snapshot.invoiceData?.del?.[entry.id])continue;
      const entryId=id(entry.id);
      entryIds.set(entryId,(entryIds.get(entryId)??0)+1);
      if(entry.kind!=='in')continue;
      const oldRef=/\(([^()]+)\)\s*$/.exec(entry.concept??'')?.[1];
      const reference=string(entry.link||oldRef);
      if(!reference)continue;
      const identity=key(entry.brand,reference);
      if(!linked.has(identity))linked.set(identity,[]);
      linked.get(identity).push(entry);
    }
    for(const invoice of snapshot.invoices??[]){
      if(!object(invoice)||snapshot.invoiceData?.ddel?.[invoice.ref]||hasDraft(invoice))continue;
      const reference=string(invoice.ref),identity=key(invoice.brand,reference),entries=linked.get(identity)??[];
      known.set(identity,(known.get(identity)??0)+1);
      const entry=entries.length===1?entries[0]:null;
      const open=pending.get(key('invoice',reference,string(invoice.brand,80),projectId(invoice)??projectId(entry)));
      const differingProject=projectId(invoice)&&projectId(entry)&&projectId(invoice)!==projectId(entry);
      const differingTotal=invoice.total!=null&&entry?.amount!=null&&Math.round((Number(invoice.total)-Number(entry.amount))*100)!==0;
      const contradictory=entries.length>1||differingProject||differingTotal||invoice.currency&&entry?.currency&&currency(invoice.currency)!==currency(entry.currency);
      const status=incomingState(invoice,entry,open,contradictory);
      add('invoice',invoice,reference,{entry,pending:open,state:status,disputed:!!contradictory});
    }
    for(const entry of snapshot.entries??[]){
      if(entry?.kind!=='in'||snapshot.invoiceData?.del?.[entry.id]||hasDraft(entry)||entryIds.get(id(entry.id))!==1)continue;
      const open=pending.get(key('invoice_entry',id(entry.id),string(entry.brand,80),projectId(entry)));
      const explicit=string(entry.link||/\(([^()]+)\)\s*$/.exec(entry.concept??'')?.[1]);
      const reference=open?.label||/^(?:f|fc|fac|fra|fv)[-/ ]?[a-z0-9/-]{0,100}\d/i.test(explicit)&&explicit||
        /^(?:factura\s+)?((?:f|fc|fac|fra|fv)[-/ ]?[a-z0-9/-]{0,100}\d[\w/-]*)\b/i.exec(entry.concept??'')?.[1];
      if(!reference||known.has(key(entry.brand,reference))||snapshot.invoiceData?.ddel?.[reference])continue;
      const status=incomingState(null,entry,open,false);
      add('invoice_entry',entry,reference,{entry,pending:open,state:status,party:entry.client||entry.sup||String(entry.concept||'').split(' · ').slice(1).join(' · ')});
    }
  }
  return records;
}

function matchingClient(document,client,clients){
  if(!client)return true;
  if(client.brand&&client.brand!=='both'&&client.brand!==document.brand)return false;
  const name=normalizeEntityText(document.party);
  if(!name||!client.relation.aliases.includes(name))return false;
  const record=document.record;
  const linkedId=client.entity==='proveedor'?(record.supplierId??record.contactId??record.clientId):record.clientId;
  const linkedIndex=client.entity==='proveedor'?(record.supplierIdx??record.supIdx??record.clientIdx):record.clientIdx;
  if(linkedId!=null&&linkedId!==''&&client.contactId)return id(linkedId)===client.contactId;
  if(linkedIndex!=null&&linkedIndex!==''&&client.index!=null)return String(linkedIndex)===String(client.index);
  return clients.some(other=>other.key!==client.key&&other.relation.aliases.includes(name)&&(!other.brand||other.brand==='both'||other.brand===document.brand))?null:true;
}

function matchingPaymentParty(document,party){
  if(!party)return true;
  if(party.brand!==null&&party.brand!==document.brand||norm(document.party)!==party.name)return false;
  if(party.clientIndex==null)return true;
  if(document.record.clientIdx==null||document.record.clientIdx==='')return null;
  return String(document.record.clientIdx)===String(party.clientIndex);
}

function byDate(a,b){
  return (b.date??'').localeCompare(a.date??'')||a.reference.localeCompare(b.reference,'es')||a.key.localeCompare(b.key);
}

const periodLabel=scope=>scope.date?(scope.date.field==='due'?'Vencimiento: ':'Emisión: ')+dateLabel(scope.date.from)+' a '+dateLabel(scope.date.to):null;
function documentFilters(scope,{client,projectLabel}){
  const party=scope.kind==='received'?'proveedor':'cliente';
  const filters=[
    [(scope.clientKey||scope.paymentParty)&&(client?.label||scope.paymentParty?.label||(party==='proveedor'?'Proveedor':'Cliente')),'sin filtro de '+party],
    [scope.projectId&&(projectLabel||'Proyecto'),'sin filtro de proyecto'],[periodLabel(scope),'sin filtro de periodo'],
    [scope.currency,'sin filtro de moneda'],[scope.state&&(stateLabels[scope.kind][scope.state]||'Estado'),'sin filtro de estado'],
    [scope.reference?.toUpperCase()||(scope.latest?'Más reciente por fecha de emisión':null),'sin filtro de referencia']
  ];
  return filters.filter(([label])=>label).map(([label,clear])=>({label,clear}));
}

function renderMessage({scope,rows,client,projectLabel,review,missingLatest}){
  const name=searchLabels[scope.kind];
  const count=rows.length,qualifiers=[client?.label??scope.paymentParty?.label,projectLabel,periodLabel(scope),scope.currency].filter(Boolean);
  const suffix=qualifiers.length?' · '+qualifiers.join(' · '):'';
  const first=rows[0];
  if(scope.mode==='sent-copy')return 'No puedo confirmar que sea la misma que enviaste. '+(count?'Este es el documento disponible ahora.':'Indica la referencia para localizar el documento actual.');
  if(scope.mode==='accepted-copy')return 'No tengo una versión vinculada a la aceptación. '+(count?'Puedes ver la versión actual.':'Indica la referencia para localizar la versión actual.');
  if(scope.mode==='sent'){
    if(!count)return 'No he encontrado '+name.many+' con esos filtros. Tampoco tengo un registro de envío que pueda comprobar.';
    if(count===1&&first.sent)return 'He encontrado '+first.reference+'. '+(scope.kind==='quote'?'Figura como «enviado»':'Figura como «enviada»')+', pero no tengo un registro de correo que lo confirme.';
    return (count===1?'He encontrado '+first.reference+'. ':'He encontrado '+count+' '+name.many+'. ')+'Desde aquí no puedo confirmar si '+(count===1?'la enviaste.':'las enviaste.');
  }
  if(scope.mode==='sum'&&count){
    const amounts=new Map();
    let incomplete=0;
    for(const row of rows){
      const cents=Math.round(row.amount*100);
      if(row.amount==null||!row.currency||!Number.isSafeInteger(cents)||!Number.isSafeInteger((amounts.get(row.currency)??0)+cents)){incomplete++;continue;}
      amounts.set(row.currency,(amounts.get(row.currency)??0)+cents);
    }
    const total=[...amounts].sort(([a],[b])=>a.localeCompare(b)).map(([code,amount])=>money(amount/100,code)).join(' y ');
    if(!total)return 'No he podido confirmar el importe de los '+name.many+'.';
    return (incomplete||review?'El total de los importes comprobados es ':'Los '+name.many+(scope.state==='accepted'?' aceptados':'')+' suman ')+total+suffix+'.'+
      (incomplete||review?' Hay documentos con importes o datos sin confirmar.':'');
  }
  if(scope.mode==='verify'&&count===1)return first.reference+(first.source.statusLabel?' figura como «'+first.source.statusLabel.toLowerCase()+'».':' no tiene un estado confirmado.');
  if(scope.latest&&count){
    if(missingLatest)return 'Hay '+name.many+' sin fecha de emisión. '+(count===1?'Te muestro el resultado más reciente con fecha registrada.':'Te muestro los resultados más recientes con fecha registrada.');
    if(count>1)return 'Hay '+count+' '+name.many+' con la fecha de emisión más reciente, '+dateLabel(first.date)+'.';
    return (scope.kind==='quote'?'El más reciente':'La más reciente')+' por fecha de emisión es '+first.reference+', del '+dateLabel(first.date)+'.';
  }
  if(!count)return review?'No he podido confirmar '+name.many+' con esos filtros. Hay registros que necesitan revisión.':
    'No he encontrado '+name.many+' con esos filtros.';
  if(scope.reference&&count===1)return 'Aquí tienes '+name.article+' '+name.one+' '+first.reference+(first.party?', de '+first.party:'')+'.';
  const state=scope.state?stateLabels[scope.kind][scope.state]?.toLowerCase():null;
  return 'He encontrado '+count+' '+(count===1?name.one:name.many)+(state?' con estado «'+state+'»':'')+suffix+'.'+
    (count>PAGE_SIZE?' Te muestro las primeras '+PAGE_SIZE+'.':'')+(review?' Hay registros que necesitan revisión.':'');
}

const normalAnswer=(message,extras={})=>({status:'answer',message,sources:[],actions:[],questions:[],trace:[],...extras});

export function searchDocuments(snapshot,request,turn,now){
  if(snapshot.role!=='admin')return null;
  if(turn.filterChoice)return normalAnswer(turn.filterChoice.length?'¿Qué filtro quieres quitar?':'No hay filtros activos.',{
    activeFilters:turn.filterChoice,preserveQueryContext:true});
  const text=norm(turn.query);
  if(paidDateWords.test(text)||turn.planned?.dateField==='paid')return normalAnswer('Solo dispongo de la fecha de emisión para filtrar estas facturas.',{preserveQueryContext:true});
  if(turn.kind==='quote'&&turn.planned?.dateField==='due')return normalAnswer('Solo dispongo de la fecha de emisión para filtrar estos presupuestos.',{preserveQueryContext:true});
  if(/\b(?:con|sin) (?:iva|impuestos?|retencion(?:es)?)\b|\b(?:mas|menos|mayor(?:es)?|menor(?:es)?) (?:de|que|a) \d/.test(text))
    return normalAnswer('Puedo filtrar por cliente o proveedor, proyecto, fecha de emisión, estado y referencia.');
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:request.context?.timeZone||'Europe/Madrid'}).format(now);
  const data=typedRows(snapshot,today,turn.kind);
  const scoped=scopeFor(snapshot,request,turn,today,data);
  if(!scoped||scoped.status)return scoped;
  const {scope,client,clients}=scoped,page=request.documentPage;
  if(scope.kind==='quote'&&/\b(?:aceptad[oa]s? (?:durante|entre|desde|hasta)|(?:se|que) acept(?:aron|o|aste)|fecha de aceptacion)\b/.test(text)){
    return normalAnswer('Puedo comprobar el estado y la fecha del presupuesto. No tengo una fecha de aceptación que pueda usar para ese periodo.');
  }
  if(scope.mode==='sent-copy'&&!scope.reference)return normalAnswer('No puedo comprobar qué copia enviaste. Si me das la referencia, puedo localizar el documento actual.');
  if(scope.mode==='accepted-copy'&&!scope.reference)return normalAnswer('No tengo una versión vinculada a la aceptación. Si me das la referencia, puedo localizar el presupuesto actual.');
  const fingerprints=new Map();
  for(const row of data)fingerprints.set(row.key,(fingerprints.get(row.key)??0)+1);
  let review=0,missingLatest=false;
  let rows=data.filter(row=>{
    if(scope.projectId&&scope.projectId!==row.projectId||scope.reference&&norm(row.reference)!==scope.reference||scope.selection&&row.key!==scope.selection||
      scope.brand!=null&&scope.brand!==row.brand||scope.currency&&row.currency&&scope.currency!==row.currency)return false;
    if(scope.currency&&!row.currency){review++;return false;}
    const byClient=matchingClient(row,client,clients)&&matchingPaymentParty(row,scope.paymentParty);
    if(!byClient){if(byClient===null)review++;return false;}
    const date=scope.date?.field==='due'?row.due:row.date;
    if(scope.date&&(!date||date<scope.date.from||date>scope.date.to)){if(!date)review++;return false;}
    if(scope.state&&!(row.state===scope.state||scope.state==='partial'&&row.source.partial||scope.state==='sent'&&row.sent||
      scope.state==='open'&&row.due&&['pending','partial'].includes(row.state)||scope.state==='pending'&&['pending','partial','overdue'].includes(row.state))){
      if(!row.state||row.review||scope.state==='open'&&!row.due&&['pending','partial'].includes(row.state))review++;
      return false;
    }
    if(fingerprints.get(row.key)!==1){review++;return false;}
    if(scope.latest&&!row.date){review++;missingLatest=true;return false;}
    if(row.review)review++;
    return true;
  }).sort(byDate);
  if(scope.reference&&!scope.selection&&rows.length>1)return page?null:clarification(turn,'document_reference','Hay varios documentos con esa referencia. ¿Cuál quieres consultar?',rows);
  if(scope.mode==='linked'){
    if(rows.length!==1)return clarification(turn,'document_reference','¿Qué presupuesto quieres consultar?',rows);
    const original=rows[0];
    const invoice=typedRows(snapshot,today,'invoice').filter(row=>row.source.kind==='invoice'&&row.brand===original.brand&&
      row.record.sourceQuoteRef===original.reference&&(!row.projectId||!original.projectId||row.projectId===original.projectId));
    const names=[...new Set(invoice.map(row=>row.reference))];
    const message=names.length?'El presupuesto '+original.reference+' tiene '+(names.length===1?'vinculada la factura ':'vinculadas las facturas ')+names.join(', ')+'.':
      'No aparece una factura vinculada a '+original.reference+'.';
    return normalAnswer(message,{sources:[original,...invoice].slice(0,PAGE_SIZE).map(row=>row.source),documentContext:{scope}});
  }
  if(scope.latest&&rows.length){const date=rows[0].date;rows=rows.filter(row=>row.date===date);}
  const version=key('documentos',snapshot.studyId,Object.entries(snapshot.versions).sort(([a],[b])=>a.localeCompare(b)),scope,today);
  if(version.length>1800)return normalAnswer('La consulta necesita una referencia o un filtro más concreto.');
  const offset=page?.offset??0,count=rows.length;
  if(page&&(page.version!==version||offset>=count))return null;
  const sources=rows.slice(offset,offset+PAGE_SIZE).map(row=>row.source);
  const next=offset+sources.length<count?offset+sources.length:null;
  const projectLabel=scope.projectId?snapshot.projects.find(project=>id(project.id)===scope.projectId)?.name:null;
  const scopeLabel=[client?.label??scope.paymentParty?.label,projectLabel,periodLabel(scope),scope.currency].filter(Boolean).join(' · ');
  return normalAnswer(renderMessage({scope,rows,client,projectLabel,review,missingLatest}),{
    sources,sourceCount:count,documentContext:{scope},activeFilters:documentFilters(scope,{client,projectLabel}),
    documents:{kind:scope.kind,count,offset,next,version,scopeLabel,projectId:scope.projectId,sourceVersion:scope.kind==='quote'?snapshot.versions.presupuestos:snapshot.versions.facturas},
    trace:[{label:'Documentos autorizados comprobados',status:'done'}]
  });
}
