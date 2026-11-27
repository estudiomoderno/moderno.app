import {isoDate, normalizeReceivableText as normalize} from './receivables.mjs';
import {paymentDirection} from './payment-direction.mjs';

const compact = value => normalize(value).replace(/[^a-z0-9/-]+/g,' ').trim().replace(/\s+/g,' ');
const customerDebt=/\b(?:me|nos) (?:deben?|adeudan?)\b/;
const futureDue='(?:sin vencer|no vencidas?|(?:que )?(?:aun |todavia )?no (?:han vencido|vencen))';
const includeFuture=new RegExp('\\b(?:tambien|incluye(?:me)?|anade) (?:las )?'+futureDue+'\\b','g');
const futureDuePhrase=new RegExp('\\b'+futureDue+'\\b','g');
const queryText=value=>compact(value)
  .replace(/\bno (?:me|nos) (?:ha|han|hayan|habian) pagado\b/g,'por cobrar')
  .replace(/\bno ((?:(?:me|nos) )?(?:hay|quedan?|faltan?))(?: nada)? (?=por cobrar\b)/g,'$1 ')
  .replace(/\b(?:por que |por |que )?(?:me|nos) (?:paguen|pagen|pagan|(?:tienen?|van) (?:que |a )?pagar)\b/g,'por cobrar')
  .replace(/\b(?:por recibir el pago|sin haber cobrado|por ser cobradas|por pagarme|por abonarme|pendientes de cobrrar)\b/g,'por cobrar')
  .replace(/\b(?:(?:faltan?|quedan?|tengo que|tenemos que|debo|debemos) cobrar|(?:clientes? (?:tienen?|deben?|van a)|les faltan?|les quedan?) (?:que |por )?pagar)\b/g,'por cobrar')
  .replace(includeFuture,'sin filtro de vencimiento')
  .replace(futureDuePhrase,'sin vencer')
  .replace(/\b(?:lo mismo|igual) (?:para|en|de) (?=(?:el |del )?proyecto\b)/g,'para ')
  .replace(/\bsolamente\b/g,'solo');
const allowedWords = new Set('a acerca actualmente ademas ahora al aun cobrar cobro cobros con cuales cuantos cuanto cuantas de del dime el en ensename entonces esas esos estas estos estan factura facturas falta faltan favor hay importe la las lista listar lo los me mejor mi mis mismas mismos mostrar muestra muestrame nos pendiente pendientes por para puedes podrias que quiero queda quedan saber saldo solo tambien tengo tiene total todo todas todos ver y impagada impagadas adeudan adeudadas estudio'.split(' '));
const openOrWrite = /^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:me)?|abrir|edit\w*|registra\w*|emite\w*|envia\w*|crea\w*|prepara\w*|cobra|cobrame|paga(?:me|r)?|abona(?:me|r)?|como (?:puedo|podemos|debo|se|hago|pagar|abonar|configurar))\b/;
const fields=['receivable_confirm','receivable_scope','receivable_client','receivable_project','receivable_period','receivable_entity'];
export const confirmReceivables='¿Te refieres a facturas pendientes de cobro?';
const referencePattern=/\b[a-z][a-z0-9/-]*[-/]\d[a-z0-9/-]*\b/g;
const dropAll=/\b(?:todo el estudio|sin filtros|de todos los anos|sin limite de fechas)\b/;
const months='enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
const monthName=months.join('|');
const periodStart=new RegExp('^(?:este (?:ano|mes)|(?:el )?(?:ano|mes) (?:pasado|anterior)|'+monthName+'|19\\d{2}|20\\d{2}|21\\d{2})\\b');
const otherSubject=/\b(?:presupuestos?|tareas?|gastos?|balance|resumen|facturacion|informe|pedidos?)\b/;
const rankingPhrase=/\b(?:(?:quien(?:es)?|(?:que|cual(?:es)?) (?:de (?:mis|nuestros|los) )?clientes?) (?:(?:me|nos) )?(?:deben?|adeudan?) mas(?: dinero)?|(?:que cliente|cual es el cliente)(?: tiene| con) (?:el )?(?:mayor|mas) (?:(?:saldo|importe) )?(?:pendiente(?: de cobro)?|por cobrar)|cual es el cliente que mas (?:me|nos) (?:debe|adeuda))\b/;
const recheckBalance=/^(?:(?:y|entonces) )?(?:no (?:hay|quedan?) (?:ningun[ao]s?|nada)|cuanto (?:es|suma|queda)(?: (?:el|en))? total)(?: no)?$/;
const currencies={euro:'EUR',euros:'EUR',dolar:'USD',dolares:'USD','dolar estadounidense':'USD','dolares estadounidenses':'USD',
  libra:'GBP',libras:'GBP','libra esterlina':'GBP','libras esterlinas':'GBP'};
const currencyCodes=new Set(Intl.supportedValuesOf('currency').map(code=>code.toLowerCase()));
const currencyMention=/\b(?:en (?:moneda )?|moneda )([a-z]{3}\b|(?:euros?|dolares?(?: estadounidenses?)?|libras?(?: esterlinas?)?)\b)/g;
const clearCurrencyText=/\b(?:sin filtro de moneda|en cualquier moneda|(?:en )?todas las monedas)\b/g;
const debtRecipient=/\b(?:me|nos) (?:deben?|adeudan?) (?:el cliente )?(?!nada\b)([a-z0-9/-]+(?: [a-z0-9/-]+)*?)(?= (?:del? (?:el )?proyecto|en|desde|hasta|entre|este|emitidas?|vencidas?|sin)\b|$)/;
const fragment=value=>{
  const text=value.replace(/^(?:(?:y|ahora|mejor|dime|ensename|muestrame|muestra|solo|tambien|entonces|quiero) )+/,'');
  return !otherSubject.test(text)&&(/^(?:de |del |para |en |entre |desde |hasta |las |esas |el cliente |el proyecto |cliente |proyecto |sin |pendientes? de cobro\b|todas\b|todos\b)/.test(text)||
   /\b(?:vencidas?|vencen?|venceran?|sin vencer|sin filtro|todo el estudio)\b/.test(text)||periodStart.test(text));
};

export function receivableDetailQuestion(value){
  const text=compact(value);
  return /^(?:y )?(?:cuanto|que importe) (?:queda|falta)(?: por cobrar)? de (?:esta|esa)(?: factura)?$/.test(text)||
    /^por que (?:pone|figura|aparece|dice|son) (?:que |un importe de )?\d/.test(text);
}

export function receivableQuestion(request) {
  const {message,automatic,history,receivableContext:context}=request;
  const answers=request.answers??{},text=queryText(message),standalone=isReceivableIntent(message);
  const direction=paymentDirection(automatic?(answers.detail??answers.receivable_confirm??message):message);
  if(direction==='payable'||direction==='ambiguous')return null;
  if(!automatic&&!standalone&&(openOrWrite.test(text)||otherSubject.test(text)))return null;
  if(!automatic&&rankingPhrase.test(text)){
    const base=context?.scope?{...context.scope,reference:null,brand:null}:null;
    return {query:message,base,answers:{}};
  }
  const clarification=context?.clarification;
  const anaphora=/^y\b|\b(?:esas|estas|mismas)\b/.test(text);
  const newQuestion=standalone&&!anaphora&&(/\b(?:facturas?|(?:las|mis) pendientes)\b/.test(text)||[...text.matchAll(referencePattern)].length>0||!fragment(text)&&!dropAll.test(text));
  if(clarification&&(automatic?Object.hasOwn(answers,clarification.field):!newQuestion)){
    const answer=automatic?answers[clarification.field]:message;
    if(clarification.field==='receivable_confirm')return confirmedQuery(answer);
    return {query:clarification.query,base:context.scope,answers:{...clarification.answers,[clarification.field]:answer}};
  }
  if(!context&&history?.at(-1)?.role==='assistant'&&history.at(-1).content.startsWith(confirmReceivables)){
    return confirmedQuery(automatic?answers.detail??answers.receivable_confirm:message);
  }
  if(automatic){
    const previous=history?.findLast(turn=>turn.role==='user'&&turn.automatic!==true);
    const legacy=Object.fromEntries(Object.entries(answers).filter(([key])=>fields.includes(key)));
    return previous&&isReceivableIntent(previous.content)&&Object.keys(legacy).length?{query:previous.content,answers:legacy}:null;
  }
  if(context?.scope&&!clarification&&recheckBalance.test(text))return {query:'',base:context.scope,answers:{}};
  if(context?.scope&&!newQuestion&&(fragment(text)||anaphora&&standalone)){
    return {query:message,base:context.scope,answers:{}};
  }
  return standalone?{query:message,answers:{}}:null;
}

function confirmedQuery(answer){
  if(!answer||/^(?:no|otra cosa)\b/.test(queryText(answer)))return null;
  return {query:answer.replace(/^\s*(?:s[ií]|correcto|exacto)\b[\s,.:]*/i,''),answers:{}};
}

export function isReceivableIntent(value) {
  const text=queryText(value);
  const direction=paymentDirection(value);
  if(direction==='payable'||direction==='ambiguous')return false;
  if(!text||openOrWrite.test(text)&&!/^abr(?:e|ir)(?:me)? (?:las )?facturas\b/.test(text))return false;
  const invoices=/\bfacturas?\b/.test(text);
  const collections=/\b(?:pendientes? (?:\w+ ){0,2}(?:cobro|cobrar)|por cobrar|sin cobrar|no cobradas?|impagad[ao]s?|saldo pendiente|cobros? pendientes?)\b/.test(text);
  return direction==='receivable'||rankingPhrase.test(text)||customerDebt.test(text)||invoices&&(/\b(?:pendientes?|impagad[ao]s?|vencidas?|sin cobrar|por cobrar|no cobradas?)\b/.test(text))||collections||
    /\b(?:las|mis) pendientes(?: de| del|$)/.test(text);
}

const dateToken='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4})';
const monthDate=(y,m,d=1)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);

export function parsePeriod(value,today){
  const text=compact(value);
  const [year,month]=today.split('-').map(Number);
  const ranges=[
    [new RegExp('\\b(?:entre|del|de|desde) ('+dateToken+') (?:y|al|a|hasta) ('+dateToken+')\\b'),m=>[isoDate(m[1]),isoDate(m[2])]],
    [new RegExp('\\b(?:desde|hasta|el|del|de) ('+dateToken+')\\b'),m=>m[0].startsWith('desde')?[isoDate(m[1]),'9999-12-31']:m[0].startsWith('hasta')?['1900-01-01',isoDate(m[1])]:[isoDate(m[1]),isoDate(m[1])]],
    [new RegExp('\\b(?:(?:en|de|del) )?('+monthName+')(?: (?:de |del )?(\\d{4}))?\\b'),m=>{const y=Number(m[2]||year),n=months.indexOf(m[1]);return [monthDate(y,n),monthDate(y,n+1,0)];}],
    [/\b(?:este mes|(?:el )?mes pasado|(?:el )?mes anterior)\b/,m=>{const n=month-(m[0]==='este mes'?1:2);return [monthDate(year,n),monthDate(year,n+1,0)];}],
    [/\b(?:este ano|(?:el )?ano pasado|(?:el )?ano anterior)\b/,m=>{const y=year-(m[0]==='este ano'?0:1);return [monthDate(y,0),monthDate(y,11,31)];}],
    [/\b(?:(?:en|de|del) )?(?:ano )?(19\d{2}|20\d{2}|21\d{2})\b(?![/-])/,m=>[m[1]+'-01-01',m[1]+'-12-31']]
  ];
  for(const [regex,dates] of ranges){
    const match=regex.exec(text);
    if(!match)continue;
    const [from,to]=dates(match);
    if(!from||!to||from>to)return {invalid:true,matched:match[0]};
    return {from,to,matched:match[0]};
  }
  return null;
}

const queryError=(field,prompt,options=[])=>({question:{field,prompt,options}});
const scopePrompt='¿Qué ámbito exacto quieres consultar? Indica el cliente, el proyecto y el periodo que quieras aplicar, o escribe «todo el estudio».';
const escape=value=>value.replace(/[.*+?^$${}()|[\]\\]/g,'\\$&');
const aliasPattern=value=>new RegExp('(?:^| )('+escape(value)+')(?= |$)','g');
const refAliases=(...values)=>[...new Set(values.map(compact).filter(value=>value.length>=2))];
const display=value=>typeof value==='string'?value.trim().slice(0,160):'';

export function validReceivableContext(value){
  const record=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
  const str=(v,max)=>typeof v==='string'&&v.length<=max;
  if(!record(value,['scope','clarification']))return false;
  const {scope,clarification}=value;
  if(scope&&(!record(scope,['projectId','clientKey','date','overdue','reference','brand','currency'])||
    !['projectId','clientKey','reference'].every(k=>scope[k]==null||str(scope[k],400))||
    scope.brand!=null&&(!scope.reference||!str(scope.brand,80))||
    scope.currency!=null&&(!str(scope.currency,3)||!/^[A-Z]{3}$/.test(scope.currency))||
    scope.overdue!=null&&!['overdue','open'].includes(scope.overdue)||
    scope.date&&(!record(scope.date,['from','to','field'])||scope.date.from!==isoDate(scope.date.from)||scope.date.to!==isoDate(scope.date.to)||
      !scope.date.from||!scope.date.to||scope.date.from>scope.date.to||!['issued','due'].includes(scope.date.field))))return false;
  return (!clarification||record(clarification,['field','query','answers'])&&fields.includes(clarification.field)&&str(clarification.query,6000)&&
    record(clarification.answers,fields)&&Object.values(clarification.answers).every(answer=>str(answer,1200)))&&Boolean(scope||clarification);
}

function clientCandidates(snapshot){
  const map=new Map();
  const contacts=snapshot.clients??[];
  const shared=new Set(contacts.filter(row=>row?.brand==='both').map(row=>compact(row.name)));
  const contactGroups=new Map();
  const describe=(name,brand)=>[compact(name),shared.has(compact(name))?'':display(brand)];
  contacts.forEach((row,index)=>{
    if(!row||!['Cliente','Proveedor'].includes(row.type)||!display(row.name))return;
    const key=JSON.stringify(describe(row.name,row.brand));
    if(!contactGroups.has(key))contactGroups.set(key,[]);
    contactGroups.get(key).push({row,index});
  });
  function add(name,brand,aliases=[],contact){
    if(!display(name))return;
    const [normalized,space]=describe(name,brand),group=JSON.stringify([normalized,space]);
    const groupContacts=contactGroups.get(group)||[],duplicates=groupContacts.length>1;
    if(duplicates&&!contact)return;
    const contactId=contact?String(contact.row.id??'contact:'+contact.index):null;
    const identityConflict=duplicates&&contact?.row.id!=null&&groupContacts.filter(item=>String(item.row.id)===contactId).length>1;
    const numberConflict=duplicates&&contact?.row.num&&groupContacts.filter(item=>compact(item.row.num)===compact(contact.row.num)).length>1;
    const key=duplicates?JSON.stringify([normalized,space,identityConflict?'contact:'+contact.index:contactId]):group,previous=map.get(key);
    const detail=[contact?.row.num,duplicates&&(!contact.row.num||numberConflict)?'Ficha '+(contact.index+1):'',
      display(snapshot.config.BRAND?.[space]?.name)||space].filter(Boolean).join(' · ');
    map.set(key,{kind:'client',key,brand:space,label:display(name),detail,
      ids:contactId?[contactId]:previous?.ids??[],clientIndex:duplicates?contact.index:null,
      aliases:refAliases(name,...aliases,...(previous?.aliases??[])),name:normalized});
  }
  for(const group of contactGroups.values())for(const contact of group){
    const {row}=contact;add(row.name,row.brand,[row.fiscal,row.num],contact);
  }
  for(const row of snapshot.invoices)if(row)add(row.client,row.brand);
  for(const row of snapshot.entries)if(row?.kind==='in'&&row.link)add(row.client||row.sup||display(row.concept).split(' · ').slice(1).join(' · '),row.brand);
  return [...map.values()];
}

function entityMatches(text,candidates){
  const results=[];
  for(const candidate of candidates){
    for(const alias of candidate.aliases){
      for(const match of text.matchAll(aliasPattern(alias))){
        const start=match.index+match[0].length-match[1].length,end=start+match[1].length;
        const before=text.slice(0,start).trimEnd();
        const after=text.slice(end).trimStart();
        const explicit=/\b(cliente|proyecto)\s*(?:de|llamado)?$/.exec(before)?.[1];
        if(explicit&&explicit!==(candidate.kind==='client'?'cliente':'proyecto'))continue;
        const debtor=candidate.kind==='client'&&(/\b(?:me|nos) (?:deben?|adeudan?)$/.test(before)||
          /^(?:ya )?(?:no )?(?:me|nos) (?:deben?|adeudan?)\b/.test(after));
        if(!explicit&&!debtor&&!/\b(?:de|del|para|en|a)$/.test(before)&&!/[0-9]/.test(alias))continue;
        results.push({candidate,start,end});
      }
    }
  }
  return results.filter(match=>!results.some(other=>other.start<=match.start&&other.end>=match.end&&(other.start<match.start||other.end>match.end)));
}

function findCandidates(answer,items){
  const name=compact(answer);
  return items.filter(item=>item.key===answer||item.ids?.includes(answer)||item.aliases.includes(name));
}

export function resolveReceivableScope(snapshot,request,turn,today){
  let {query:original,base,answers}=turn;
  const projects=snapshot.projects.map(row=>({kind:'project',key:String(row.id),label:display(row.name)||display(row.num),detail:display(row.num),aliases:refAliases(row.name,row.num)}));
  const clients=clientCandidates(snapshot);
  if(answers.receivable_scope){
    original='facturas pendientes '+answers.receivable_scope;
    delete answers.receivable_scope;
  }
  const text=queryText(original);
  // The version includes the projection as its last element and is checked together with the verified scope.
  const ranking=rankingPhrase.test(text)||!!request.invoicePage&&
    (rankingPhrase.test(queryText(request.message))||request.invoicePage.version.endsWith(',true]'));
  const input=ranking?text.replace(rankingPhrase,'').trim():text;
  const debt=customerDebt.test(input);
  if(/\b(?:a fecha de|al cierre de)\b/.test(input))return queryError('receivable_scope','¿Quieres consultar los saldos actuales de facturas emitidas en un periodo? Indica el periodo de emisión.');
  let remainder=input;
  let chosenProject=null,chosenClient=null;
  const allMatches=entityMatches(input,[...clients,...projects]);
  const explicitProject=/\b(?:este|ese|del|el) proyecto\b/.test(input);
  const projectReference=/\b(?:de )?(este|ese) proyecto\b/.exec(input);
  const projectId=projectReference?.[1]==='ese'?base?.projectId??request.context.projectId:request.context.projectId;
  const currentProject=projectReference?projects.find(item=>item.key===projectId):null;
  const remove=(text)=>{remainder=remainder.replace(text,' ');};
  const ranges=new Map();
  for(const match of allMatches){
    const key=match.start+':'+match.end;
    if(!ranges.has(key))ranges.set(key,[]);
    ranges.get(key).push(match);
  }
  const matches=[];
  for(const group of [...ranges.values()].sort((a,b)=>b[0].start-a[0].start)){
    const [{start,end}]=group;
    remainder=remainder.slice(0,start)+' '.repeat(end-start)+remainder.slice(end);
    const types=new Set(group.map(match=>match.candidate.kind));
    if(types.size===1){matches.push(...group);continue;}
    const options=[...new Map(group.map(({candidate})=>{
      const label=(candidate.kind==='client'?'Cliente ':'Proyecto ')+candidate.label;
      const value=JSON.stringify([candidate.kind,candidate.key]);
      return [value,{label,value}];
    })).values()];
    const selection=options.filter(option=>option.value===answers.receivable_entity||compact(option.label)===compact(answers.receivable_entity));
    if(selection.length!==1){
      const name=group[0].candidate.label;
      return queryError('receivable_entity','¿Te refieres al cliente '+name+' o al proyecto '+name+'?',options);
    }
    matches.push(...group.filter(({candidate})=>JSON.stringify([candidate.kind,candidate.key])===selection[0].value));
  }
  const clearAll=/\b(?:todo el estudio|sin filtros)\b/.test(remainder);
  const clearProject=clearAll||/\b(?:sin filtro de proyecto|todos los proyectos)\b/.test(remainder);
  const clearClient=clearAll||/\b(?:sin filtro de cliente|todos los clientes)\b/.test(remainder);
  const clearDate=clearAll||/\b(?:sin filtro de (?:periodo|fecha)|(?:de )?todos los anos|sin limite de fechas)\b/.test(remainder);
  const clearOverdue=clearAll||/\b(?:sin filtro de vencimiento|vencidas y sin vencer|vencidas y no vencidas)\b/.test(remainder);
  const clearCurrency=clearAll||[...remainder.matchAll(clearCurrencyText)].length>0;
  if(clearAll)base=null;
  remove(/\b(?:sin filtros|sin filtro de (?:proyecto|cliente|periodo|fecha|vencimiento)|todos los (?:clientes|proyectos|anos)|sin limite de fechas|vencidas y (?:sin vencer|no vencidas))\b/g);
  remove(clearCurrencyText);
  const currencyMatches=[...remainder.matchAll(currencyMention)].filter(([,word])=>Object.hasOwn(currencies,word)||currencyCodes.has(word));
  const requestedCurrencies=new Set(currencyMatches.map(([,word])=>currencies[word]??word.toUpperCase()));
  if(requestedCurrencies.size>1)return queryError('receivable_scope','¿Qué moneda quieres consultar? Indica una moneda o escribe «en cualquier moneda».');
  for(const [match] of currencyMatches)remove(match);
  const references=[...remainder.matchAll(referencePattern)].map(match=>match[0]);
  if(references.length>1)return queryError('receivable_scope','¿Qué factura quieres consultar? Indica una referencia.');
  const reference=references[0]??(clearAll?null:base?.reference??null);
  if(references.length)remove(references[0]);
  if(debt){
    const requestedClient=debtRecipient.exec(input)?.[1];
    if(answers.receivable_client&&requestedClient&&!matches.some(({candidate})=>candidate.kind==='client'))remove(requestedClient);
    remove(/\b(?:(?:no )?(?:me|nos) (?:deben?|adeudan?)|ya|nada|no$)\b/g);
  }
  if(/\b(?:excepto|excluy\w*|salvo|no (?!cobradas?\b|vencidas?\b)|o)\b/.test(remainder))return queryError('receivable_scope',scopePrompt);
  if(currentProject)remove(projectReference[0]);
  for(const [kind,items,field,prompt] of [
    ['project',projects,'receivable_project','¿De qué proyecto quieres ver las facturas pendientes?'],
    ['client',clients,'receivable_client','¿De qué cliente quieres ver las facturas pendientes?']
  ]){
    const answer=answers[field],eligible=[...new Map(matches.filter(match=>match.candidate.kind===kind).map(match=>[match.candidate.key,match.candidate])).values()];
    const explicit=kind==='project'?explicitProject&&!clearProject||/\bproyecto\b/.test(remainder):/\bcliente\b/.test(remainder);
    const fromAnswer=answer?findCandidates(answer,items):null;
    if(fromAnswer&&fromAnswer.length!==1)return queryError(field,prompt);
    const inherited=kind==='project'?!clearProject&&base?.projectId:!clearClient&&base?.clientKey;
    const carried=inherited?items.find(item=>item.key===inherited):null;
    const chosen=fromAnswer?.[0]??(eligible.length===1?eligible[0]:null)??(kind==='project'?currentProject:null)??(!explicit?carried:null);
    if(inherited&&!carried&&!chosen)return queryError(field,prompt);
    if(!answer&&(eligible.length>1||explicit&&!chosen)){
      const options=eligible.slice(0,8).map(item=>({value:item.key,label:item.detail?item.label+' · '+item.detail:item.label}));
      return queryError(field,prompt,options);
    }
    if(!answer&&kind==='project'&&currentProject&&chosen?.key!==currentProject.key)return queryError(field,prompt);
    if(answer&&explicit){
      const prefix=kind==='project'?'proyecto':'cliente';
      const corrected=new RegExp('\\b'+prefix+'(?: [a-z0-9/-]+)*?(?=\\s+(?:(?:del?|para) (?:proyecto|cliente)|en |entre |desde |hasta |este mes|este ano|emitidas?\\b|vencidas?\\b|sin vencer\\b|'+monthName+'|(?:19|20|21)\\d{2}\\b)|$)');
      remove(corrected);
    }else if(chosen)remove(kind==='project'?/\bproyecto\b/:/\bcliente\b/);
    if(kind==='project')chosenProject=chosen;else chosenClient=chosen;
  }
  const periodAnswer=answers.receivable_period;
  const period=parsePeriod(periodAnswer?compact(periodAnswer):remainder,today);
  if(period?.invalid||periodAnswer&&!period)return queryError('receivable_period','¿Qué fechas quieres consultar? Indica el mes y el año, o dos fechas.');
  if(period&&!periodAnswer)remove(period.matched);
  if(periodAnswer){
    const originalPeriod=parsePeriod(remainder,today);
    if(originalPeriod?.matched)remove(originalPeriod.matched);
    remove(/\b(?:(?:primer|segundo|tercer|cuarto|ultimo) )?(?:trimestre|periodo|fechas?)\b/g);
    remove(/\b(?:de los |en los |los )?ultim[oa]s? (?:\w+ ){1,3}(?:meses|semanas|dias)\b/g);
  }
  const dueRange=/\b(?:vencimiento|vencen?|venceran?|venzan|vencian)\b/.test(remainder)||
    !!period&&/\bvencidas? (?:en|entre|desde|hasta)\b/.test(input)&&!/\b(?:emitidas?|emision)\b/.test(remainder);
  const overdue=/\b(?:sin vencer|no vencidas?)\b/.test(remainder)?'open':/\bvencidas?\b/.test(remainder)?'overdue':null;
  remove(/\b(?:sin vencer|no vencidas?|vencidas?|vencimiento|vencen?|venceran?|venzan|vencian|emitidas?|emision)\b/g);
  remove(/\b(?:no cobradas?|sin cobrar|sin pagar)\b/g);
  const unknown=remainder.split(/\s+/).filter(word=>word&&!allowedWords.has(word));
  if(unknown.length){
    if(!periodAnswer&&(/\b(?:periodo|trimestre|meses|semanas?|fechas?|desde|hasta|entre)\b/.test(remainder)||/\d/.test(remainder)))return queryError('receivable_period','¿Qué periodo quieres consultar? Indica el mes y el año, o dos fechas.');
    if(debt&&!chosenClient&&!answers.receivable_client)return queryError('receivable_client','¿De qué cliente quieres ver el pendiente de cobro?');
    return queryError('receivable_scope',scopePrompt);
  }
  return {scope:{projectId:chosenProject?.key??null,projectLabel:chosenProject?.label??null,client:chosenClient?{name:chosenClient.name,label:chosenClient.label,brand:chosenClient.brand,clientIndex:chosenClient.clientIndex}:null,
    date:period?{from:period.from,to:period.to,field:dueRange?'due':/\b(?:emitidas?|emision)\b/.test(input)?'issued':base?.date?.field??'issued'}:clearDate?null:base?.date??null,
    overdue:overdue??(clearOverdue?null:base?.overdue??null),reference,brand:references.length?null:base?.brand??null,
    currency:requestedCurrencies.values().next().value??(clearCurrency?null:base?.currency??null),ranking},
    clientKey:chosenClient?.key??null};
}
