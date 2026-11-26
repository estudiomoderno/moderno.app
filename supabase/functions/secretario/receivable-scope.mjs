import {isoDate, normalizeReceivableText as normalize} from './receivables.mjs';

const compact = value => normalize(value).replace(/[^a-z0-9/-]+/g,' ').trim().replace(/\s+/g,' ');
const allowedWords = new Set('a acerca actualmente ademas ahora al aun cobrar cobro cobros con cuales cuantos cuanto cuantas de del dime el en ensename estan factura facturas falta faltan favor hay importe la las lista listar los me mi mis mostrar muestra muestrame pendiente pendientes por para puedes podrias que quiero queda quedan saber saldo solo tengo total todo todas todos ver y impagada impagadas adeudan adeudadas estudio'.split(' '));
const openOrWrite = /^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:me)?|abrir|edit\w*|registra\w*|emite\w*|envia\w*|crea\w*|prepara\w*|cobra|cobrame)\b/;

export function receivableQuestion(request) {
  if(request.automatic!==true)return isReceivableIntent(request.message)?request.message:null;
  if(!Object.keys(request.answers??{}).some(name=>name.startsWith('receivable_')))return null;
  const previous=request.history.findLast(turn=>turn.role==='user'&&turn.automatic!==true);
  return previous&&isReceivableIntent(previous.content)?previous.content:null;
}

export function isReceivableIntent(value) {
  const text=compact(value);
  if(!text||openOrWrite.test(text)&&!/^abr(?:e|ir)(?:me)? (?:las )?facturas\b/.test(text))return false;
  const invoices=/\bfacturas?\b/.test(text);
  const collections=/\b(?:pendientes? (?:\w+ ){0,2}(?:cobro|cobrar)|por cobrar|sin cobrar|no cobradas?|impagad[ao]s?|saldo pendiente|cobros? pendientes?)\b/.test(text);
  return invoices&&(/\b(?:pendientes?|impagad[ao]s?|vencidas?|sin (?:pagar|cobrar)|por cobrar|no cobradas?)\b/.test(text))||collections;
}

const months='enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
const monthName=months.join('|');
const dateToken='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4})';
const monthDate=(y,m,d=1)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);

function parsePeriod(text,today){
  const [year,month]=today.split('-').map(Number);
  const ranges=[
    [new RegExp('\\b(?:entre|del|de|desde) ('+dateToken+') (?:y|al|a|hasta) ('+dateToken+')\\b'),m=>[isoDate(m[1]),isoDate(m[2])]],
    [new RegExp('\\b(?:desde|hasta|el) ('+dateToken+')\\b'),m=>m[0].startsWith('desde')?[isoDate(m[1]),'9999-12-31']:m[0].startsWith('hasta')?['1900-01-01',isoDate(m[1])]:[isoDate(m[1]),isoDate(m[1])]],
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

export function resolveReceivableScope(snapshot,request,original,today){
  const projects=snapshot.projects.map(row=>({kind:'project',key:String(row.id),label:display(row.name)||display(row.num),detail:display(row.num),aliases:refAliases(row.name,row.num)}));
  const clients=clientCandidates(snapshot),answers={...request.answers};
  if(answers.receivable_scope){
    original='facturas pendientes '+answers.receivable_scope;
    delete answers.receivable_scope;
  }
  const input=compact(original);
  if(/\b(?:a fecha de|al cierre de)\b/.test(input))return queryError('receivable_scope','¿Quieres consultar los saldos actuales de facturas emitidas en un periodo? Indica el periodo de emisión.');
  let remainder=input;
  let chosenProject=null,chosenClient=null;
  const matches=entityMatches(input,[...clients,...projects]);
  const explicitProject=/\b(?:este|del|el) proyecto\b/.test(input);
  const currentProject=/\beste proyecto\b/.test(input)?projects.find(item=>item.key===request.context.projectId):null;
  const remove=(text)=>{remainder=remainder.replace(text,' ');};
  const ranges=new Map(matches.map(match=>[match.start+':'+match.end,match]));
  for(const match of [...ranges.values()].sort((a,b)=>b.start-a.start))remainder=remainder.slice(0,match.start)+' '.repeat(match.end-match.start)+remainder.slice(match.end);
  if(/\b(?:excepto|excluy\w*|salvo|no (?!cobradas?\b|vencidas?\b)|o)\b/.test(remainder))return queryError('receivable_scope',scopePrompt);
  if(currentProject)remove(/\beste proyecto\b/);
  for(const [kind,items,field,prompt] of [
    ['project',projects,'receivable_project','¿De qué proyecto quieres ver las facturas pendientes?'],
    ['client',clients,'receivable_client','¿De qué cliente quieres ver las facturas pendientes?']
  ]){
    const answer=answers[field],eligible=[...new Map(matches.filter(match=>match.candidate.kind===kind).map(match=>[match.candidate.key,match.candidate])).values()];
    const explicit=kind==='project'?explicitProject||/\bproyecto\b/.test(remainder):/\bcliente\b/.test(remainder);
    const fromAnswer=answer?findCandidates(answer,items):null;
    if(fromAnswer&&fromAnswer.length!==1)return queryError(field,prompt);
    const chosen=fromAnswer?.[0]??(eligible.length===1?eligible[0]:null)??(kind==='project'?currentProject:null);
    if(!answer&&(eligible.length>1||explicit&&!chosen)){
      const options=eligible.slice(0,8).map(item=>({value:item.key,label:item.detail?item.label+' · '+item.detail:item.label}));
      return queryError(field,prompt,options);
    }
    if(!answer&&kind==='project'&&currentProject&&chosen?.key!==currentProject.key)return queryError(field,prompt);
    if(answer&&explicit){
      const prefix=kind==='project'?'proyecto':'cliente';
      const corrected=new RegExp('\\b'+prefix+'(?: [a-z0-9/-]+)*?(?=\\s+(?:(?:del?|para) (?:proyecto|cliente)|en |entre |desde |hasta |este mes|este ano)|$)');
      remove(corrected);
    }else if(chosen)remove(kind==='project'?/\bproyecto\b/:/\bcliente\b/);
    if(kind==='project')chosenProject=chosen;else chosenClient=chosen;
  }
  const overlaps=matches.some(match=>matches.some(other=>other.start===match.start&&other.end===match.end&&other.candidate.kind!==match.candidate.kind));
  if(overlaps&&!answers.receivable_project&&!answers.receivable_client)return queryError('receivable_scope','¿Ese nombre corresponde a un cliente o a un proyecto? Indica «cliente» o «proyecto» y su nombre, junto con el periodo si lo necesitas.');
  if(overlaps&&answers.receivable_project&&!answers.receivable_client)chosenClient=null;
  if(overlaps&&answers.receivable_client&&!answers.receivable_project)chosenProject=null;

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
  const dueRange=/\b(?:vencimiento|vencen|venzan|vencian)\b/.test(remainder)||!!period&&/\bvencidas?\b/.test(remainder);
  const overdue=/\b(?:sin vencer|no vencidas?)\b/.test(remainder)?'open':/\bvencidas?\b/.test(remainder)?'overdue':null;
  remove(/\b(?:sin vencer|no vencidas?|vencidas?|vencimiento|vencen|venzan|vencian|emitidas?|emision)\b/g);
  remove(/\b(?:no cobradas?|sin cobrar|sin pagar)\b/g);
  const unknown=remainder.split(/\s+/).filter(word=>word&&!allowedWords.has(word));
  if(unknown.length){
    if(/\b(?:periodo|trimestre|meses|semanas?|fechas?|desde|hasta|entre)\b/.test(remainder)||/\d/.test(remainder))return queryError('receivable_period','¿Qué periodo quieres consultar? Indica el mes y el año, o dos fechas.');
    return queryError('receivable_scope',scopePrompt);
  }
  return {scope:{projectId:chosenProject?.key??null,projectLabel:chosenProject?.label??null,client:chosenClient?{name:chosenClient.name,label:chosenClient.label,brand:chosenClient.brand}:null,
    date:period?{from:period.from,to:period.to,field:dueRange?'due':'issued'}:null,overdue}};
}
