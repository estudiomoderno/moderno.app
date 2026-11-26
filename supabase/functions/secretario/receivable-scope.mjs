import {isoDate, normalizeReceivableText as normalize} from './receivables.mjs';

const compact = value => normalize(value).replace(/[^a-z0-9/-]+/g,' ').trim().replace(/\s+/g,' ');
const queryText=value=>compact(value)
  .replace(/\b(?:por que |por |que )?me (?:paguen|pagen|pagan|deben)\b/g,'por cobrar')
  .replace(/\b(?:por recibir el pago|sin haber cobrado|por ser cobradas|por pagarme|por abonarme|pendientes de cobrrar)\b/g,'por cobrar')
  .replace(/\b(?:me tienen que pagar|faltan? cobrar|quedan? cobrar)\b/g,'por cobrar')
  .replace(/\bsolamente\b/g,'solo');
const allowedWords = new Set('a acerca actualmente ademas ahora al aun cobrar cobro cobros con cuales cuantos cuanto cuantas de del dime el en ensename esas esos estas estos estan factura facturas falta faltan favor hay importe la las lista listar los me mejor mi mis mismas mismos mostrar muestra muestrame pendiente pendientes por para puedes podrias que quiero queda quedan saber saldo solo tambien tengo total todo todas todos ver y impagada impagadas adeudan adeudadas estudio'.split(' '));
const openOrWrite = /^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:me)?|abrir|edit\w*|registra\w*|emite\w*|envia\w*|crea\w*|prepara\w*|cobra|cobrame)\b/;
const fields=['receivable_confirm','receivable_scope','receivable_client','receivable_project','receivable_period','receivable_entity'];
export const confirmReceivables='¿Te refieres a facturas pendientes de cobro?';
const referencePattern=/\b[a-z][a-z0-9/-]*[-/]\d[a-z0-9/-]*\b/g;
const dropAll=/\b(?:todo el estudio|sin filtros|de todos los anos|sin limite de fechas)\b/;
const months='enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
const monthName=months.join('|');
const periodStart=new RegExp('^(?:este (?:ano|mes)|(?:el )?(?:ano|mes) (?:pasado|anterior)|'+monthName+'|19\\d{2}|20\\d{2}|21\\d{2})\\b');
const otherSubject=/\b(?:presupuestos?|tareas?|gastos?|balance|resumen|facturacion|informe|pedidos?)\b/;
const fragment=value=>{
  const text=value.replace(/^(?:(?:y|ahora|mejor|dime|ensename|muestrame|muestra|solo) )+/,'');
  return !otherSubject.test(text)&&(/^(?:de |del |para |en |entre |desde |hasta |las |esas |el cliente |el proyecto |cliente |proyecto |sin |pendientes? de cobro\b|todas\b|todos\b)/.test(text)||
   /\b(?:vencidas?|sin vencer|sin filtro|todo el estudio)\b/.test(text)||periodStart.test(text));
};

export function receivableQuestion(request) {
  const {message,automatic,history,receivableContext:context}=request;
  const answers=request.answers??{},text=queryText(message),standalone=isReceivableIntent(message);
  if(!automatic&&!standalone&&(openOrWrite.test(text)||otherSubject.test(text)))return null;
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
  if(!text||openOrWrite.test(text)&&!/^abr(?:e|ir)(?:me)? (?:las )?facturas\b/.test(text))return false;
  const invoices=/\bfacturas?\b/.test(text);
  const collections=/\b(?:pendientes? (?:\w+ ){0,2}(?:cobro|cobrar)|por cobrar|sin cobrar|no cobradas?|impagad[ao]s?|saldo pendiente|cobros? pendientes?)\b/.test(text);
  return invoices&&(/\b(?:pendientes?|impagad[ao]s?|vencidas?|sin (?:pagar|cobrar)|por cobrar|no cobradas?)\b/.test(text))||collections||
    /\b(?:las|mis) pendientes(?: de| del|$)/.test(text);
}

const dateToken='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4})';
const monthDate=(y,m,d=1)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);

function parsePeriod(text,today){
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
  if(scope&&(!record(scope,['projectId','clientKey','date','overdue','reference'])||
    !['projectId','clientKey','reference'].every(k=>scope[k]==null||str(scope[k],400))||
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
  function add(name,brand,aliases=[]){
    if(!display(name))return;
    const normalized=compact(name),space=shared.has(normalized)?'':display(brand);
    const key=JSON.stringify([normalized,space]),previous=map.get(key);
    const detail=display(snapshot.config.BRAND?.[space]?.name)||space;
    map.set(key,{kind:'client',key,brand:space,label:display(name),detail,aliases:refAliases(name,...aliases,...(previous?.aliases??[])),name:normalized});
  }
  for(const row of contacts)if(row&&['Cliente','Proveedor'].includes(row.type))add(row.name,row.brand,[row.fiscal,row.num]);
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
        const explicit=/\b(cliente|proyecto)\s*(?:de|llamado)?$/.exec(before)?.[1];
        if(explicit&&explicit!==(candidate.kind==='client'?'cliente':'proyecto'))continue;
        if(!explicit&&!/\b(?:de|del|para|en|a)$/.test(before)&&!/[0-9]/.test(alias))continue;
        results.push({candidate,start,end});
      }
    }
  }
  return results.filter(match=>!results.some(other=>other.start<=match.start&&other.end>=match.end&&(other.start<match.start||other.end>match.end)));
}

function findCandidates(answer,items){
  const name=compact(answer);
  return items.filter(item=>item.key===answer||item.aliases.includes(name));
}

export function resolveReceivableScope(snapshot,request,turn,today){
  let {query:original,base,answers}=turn;
  const projects=snapshot.projects.map(row=>({kind:'project',key:String(row.id),label:display(row.name)||display(row.num),detail:display(row.num),aliases:refAliases(row.name,row.num)}));
  const clients=clientCandidates(snapshot);
  if(answers.receivable_scope){
    original='facturas pendientes '+answers.receivable_scope;
    delete answers.receivable_scope;
  }
  const input=queryText(original);
  if(/\b(?:a fecha de|al cierre de)\b/.test(input))return queryError('receivable_scope','¿Quieres consultar los saldos actuales de facturas emitidas en un periodo? Indica el periodo de emisión.');
  let remainder=input;
  let chosenProject=null,chosenClient=null;
  const allMatches=entityMatches(input,[...clients,...projects]);
  const explicitProject=/\b(?:este|del|el) proyecto\b/.test(input);
  const currentProject=/\beste proyecto\b/.test(input)?projects.find(item=>item.key===request.context.projectId):null;
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
  if(clearAll)base=null;
  remove(/\b(?:sin filtros|sin filtro de (?:proyecto|cliente|periodo|fecha|vencimiento)|todos los (?:clientes|proyectos|anos)|sin limite de fechas|vencidas y (?:sin vencer|no vencidas))\b/g);
  const references=[...remainder.matchAll(referencePattern)].map(match=>match[0]);
  if(references.length>1)return queryError('receivable_scope','¿Qué factura quieres consultar? Indica una referencia.');
  const reference=references[0]??(clearAll?null:base?.reference??null);
  if(references.length)remove(references[0]);
  if(/\b(?:excepto|excluy\w*|salvo|no (?!cobradas?\b|vencidas?\b)|o)\b/.test(remainder))return queryError('receivable_scope',scopePrompt);
  if(currentProject)remove(/\beste proyecto\b/);
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
  const dueRange=/\b(?:vencimiento|vencen|venzan|vencian)\b/.test(remainder)||
    !!period&&/\bvencidas? (?:en|entre|desde|hasta)\b/.test(input)&&!/\b(?:emitidas?|emision)\b/.test(remainder);
  const overdue=/\b(?:sin vencer|no vencidas?)\b/.test(remainder)?'open':/\bvencidas?\b/.test(remainder)?'overdue':null;
  remove(/\b(?:sin vencer|no vencidas?|vencidas?|vencimiento|vencen|venzan|vencian|emitidas?|emision)\b/g);
  remove(/\b(?:no cobradas?|sin cobrar|sin pagar)\b/g);
  const unknown=remainder.split(/\s+/).filter(word=>word&&!allowedWords.has(word));
  if(unknown.length){
    if(!periodAnswer&&(/\b(?:periodo|trimestre|meses|semanas?|fechas?|desde|hasta|entre)\b/.test(remainder)||/\d/.test(remainder)))return queryError('receivable_period','¿Qué periodo quieres consultar? Indica el mes y el año, o dos fechas.');
    return queryError('receivable_scope',scopePrompt);
  }
  return {scope:{projectId:chosenProject?.key??null,projectLabel:chosenProject?.label??null,client:chosenClient?{name:chosenClient.name,label:chosenClient.label,brand:chosenClient.brand}:null,
    date:period?{from:period.from,to:period.to,field:dueRange?'due':'issued'}:clearDate?null:base?.date??null,
    overdue:overdue??(clearOverdue?null:base?.overdue??null),reference},
    clientKey:chosenClient?.key??null};
}
