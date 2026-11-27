import {parsePeriod} from './receivable-scope.mjs';
import {isoDate,normalizeReceivableText} from './receivables.mjs';
import {payableScopePrompts} from './payment-direction.mjs';
import {buildEntityCatalog,normalizeEntityText,parseEntityIdentity,resolveEntity,serializeEntityIdentity} from './entities.mjs';

const PAGE_SIZE=12;
const label=(value,max=160)=>typeof value==='string'?value.trim().slice(0,max):'';
const normalize=value=>normalizeReceivableText(value).replace(/[^a-z0-9/-]+/g,' ').trim();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const rowId=value=>typeof value==='string'||Number.isSafeInteger(value)?String(value).trim():'';
const entryProjectId=entry=>rowId(entry.pid??entry.projectId);
const supplierName=entry=>label(entry.sup||entry.client);
const number=value=>(typeof value==='number'||typeof value==='string'&&value.trim())&&Number.isFinite(Number(value))?Number(value):null;
const cents=value=>Math.round(value*100);
const currency=value=>/^[A-Z]{3}$/.test(value||'')?value:null;
const paid=/^(?:cobr|pag|pagad[ao]s?|paid)$/;
const invalid=/^(?:anul|cancel|borrador|draft|void|rectificad)/;
const money=(amount,code)=>new Intl.NumberFormat('es-ES',{style:'currency',currency:code,useGrouping:'always',
  ...(Number.isInteger(amount)?{minimumFractionDigits:0}:{})}).format(amount);
const blankScope=()=>({projectId:null,supplier:null,date:null,overdue:null,currency:null,reference:null});
const partialEvidence=entry=>['cobros','pagos','payments'].some(key=>entry[key]!=null&&(!Array.isArray(entry[key])||entry[key].length>0));
const supportedCurrencies=new Set(Intl.supportedValuesOf('currency'));
const currencyNames=Object.freeze({euros:'EUR',euro:'EUR',dolares:'USD',dolar:'USD','dolares estadounidenses':'USD','dolar estadounidense':'USD',
 'dolares canadienses':'CAD','libras esterlinas':'GBP',libras:'GBP','francos suizos':'CHF','pesos mexicanos':'MXN','pesos colombianos':'COP',yenes:'JPY'});
const currencyLabels={EUR:'Euros',USD:'Dólares estadounidenses'};
const referencePattern=/\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*[-/]\d[a-z0-9/-]*\b/g;
const dateWords=/\b(?:este|esta|pasado|pasada|anterior|proxim[oa]s?|ultim[oa]s?) (?:anos?|mes(?:es)?|semanas?|trimestres?|semestres?|quincenas?)\b|\b(?:ayer|manana|trimestre|semestre|quincena|periodo fiscal|ejercicio fiscal|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b|\b(?:19|20|21)\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/;
const supplierTypes=new Set(['Proveedor','Contratista','Técnico']);
const clearSupplier=/\b(?:todos los proveedores|cualquier proveedor|sin filtro de proveedor)\b/;
const clearProject=/\b(?:todos los proyectos|cualquier proyecto|sin filtro de proyecto)\b/;
const clearCurrency=/\b(?:todas las monedas|cualquier moneda|sin filtro de moneda)\b/;
const clearDate=/\b(?:todos los anos|sin limite de fechas|sin filtro de (?:periodo|fecha))\b/;
const clearDueStatus=/\b(?:sin filtro de (?:vencimiento|estado))\b/;
const clearReference=/\b(?:sin referencia|todas las referencias|sin filtro de referencia)\b/;
const clearAny=/^(?:(?:y|ahora|mejor|por favor) )*(?:quita(?:me)?|quitar|elimina(?:me)?|eliminar) (?:ese|este|el) filtro$/;

function payableFilters(scope,{supplierLabel,projectLabel}={}){
 const {projectId,supplier,date,overdue,currency:code,reference}=scope;
 return [
  [supplier&&(supplierLabel||'Proveedor'),'sin filtro de proveedor'],[projectId&&(projectLabel||'Proyecto'),'sin filtro de proyecto'],
  [date&&`${date.field==='due'?'Vencimiento':'Emisión'} · ${date.from} a ${date.to}`,'sin filtro de periodo'],
  [overdue==='overdue'?'Solo vencidas':overdue==='open'?'Sin vencer':overdue==='unknown'?'Sin vencimiento registrado':null,'sin filtro de vencimiento'],
  [code&&(currencyLabels[code]||code),'sin filtro de moneda'],[reference&&reference.toUpperCase(),'sin filtro de referencia']
 ].filter(([label])=>label).map(([label,clear])=>({label,clear}));
}

function supplierFromEntity(entity){
 const identity=serializeEntityIdentity(entity.identity);
 return identity?{key:normalize(entity.label),brand:entity.brand==='both'?null:entity.brand??null,identity}:null;
}

function supplierIndex(snapshot){
 const suppliers=new Map();
 const add=(name,brand,contact)=>{
  const key=normalize(name);if(!key)return;
  if(!suppliers.has(key))suppliers.set(key,{key,name,brands:new Set(),contacts:[]});
  const supplier=suppliers.get(key);
  if(contact)supplier.contacts.push(brand);
  else supplier.brands.add(brand);
 };
 for(const entry of snapshot.entries){
  if(entry?.kind==='out'&&!snapshot.invoiceData?.del?.[entry.id])add(supplierName(entry),label(entry.brand,80),false);
 }
 for(const contact of snapshot.clients??[]){
  if(supplierTypes.has(contact?.type))add(label(contact.name),label(contact.brand,80),true);
 }
 return suppliers;
}

function supplierBrands(supplier){
 return [...new Set([...supplier.brands,...supplier.contacts.filter(brand=>brand&&brand!=='both')])];
}

function supplierConflict(supplier,brand){
 const candidates=supplier.contacts.filter(space=>space===brand||!space||space==='both');
 return supplier.contacts.length>1&&candidates.length!==1;
}

function supplierOption(supplier,brand,spaceName){
 const title=brand?supplier.name+' · Espacio '+spaceName:supplier.name+' · Sin espacio registrado';
 return {label:title,value:title};
}

function supplierAliases(suppliers,brandName){
 const entities=[];
 for(const supplier of suppliers.values()){
  const target={type:'proveedor',key:supplier.key,brand:null,label:supplier.name};
  entities.push(target);
  for(const brand of supplierBrands(supplier)){
   const title=supplierOption(supplier,brand,brandName(brand)).label;
   entities.push({...target,brand,label:title});
   if(brand&&normalize(brandName(brand))!==normalize(brand))entities.push({...target,brand,label:supplier.name+' · Espacio '+brand});
  }
 }
 return entities;
}

function suggestedSuppliers(input,suppliers){
 const term=/^(?:actualmente |ahora |quiero ver )?(?:solo )?(?:(?:las?|esas) )?(?:de |del |al? (?:proveedor )?|proveedor )?([a-z0-9][a-z0-9/-]*(?: [a-z0-9][a-z0-9/-]*){0,3})$/.exec(input)?.[1]??
  /\b(?:a|al|del?|para) (?:el )?(?:proveedor )?([a-z0-9][a-z0-9/-]*(?: [a-z0-9][a-z0-9/-]*){0,3})$/.exec(input)?.[1];
 if(!term||term.length<3)return [];
 const matches=[...suppliers.values()].filter(supplier=>supplier.key.startsWith(term+' '));
 return matches.map(supplier=>({type:'proveedor',key:supplier.key,brand:null,label:supplier.name,matched:term,start:input.lastIndexOf(term),end:input.length}));
}

function requestedCurrency(input){
 const names=Object.keys(currencyNames).sort((a,b)=>b.length-a.length).join('|');
 const found=[...input.matchAll(new RegExp(`\\b(?:en |(?:moneda|divisa) (?:en )?)([a-z]{3}\\b|${names})\\b`,'g'))];
 const standalone=new RegExp(`^(?:solo )?([a-z]{3}|${names})$`).exec(input);
 if(standalone&&!found.length)found.push(standalone);
 if(found.length){
  const remainder=input.slice((found[0].index??0)+found[0][0].length);
  found.push(...remainder.matchAll(new RegExp(`(?:\\s+(?:y|o) |/)([a-z]{3}\\b|${names})\\b`,'g')));
 }
 const aliases=found.filter(match=>currencyNames[match[1]]||supportedCurrencies.has(match[1].toUpperCase()));
 const codes=new Set(aliases.map(match=>currencyNames[match[1]]??match[1].toUpperCase()));
 return {aliases,codes};
}

const queryProblem=(kind,message,options=[])=>({kind,message,options});

function scopeMatches(text,entities){
 const matches=[];
 for(const entity of entities){
  const alias=normalize(entity.label);
  if(alias.length<2||!text.includes(alias))continue;
  const pattern=new RegExp(`(?:^| )((?:${entity.type} (?:de )?|(?:de|del|para|en|a) )?${escape(alias)})(?= |$)`,'g');
  for(const match of text.matchAll(pattern)){
   const prefix=text.slice(0,match.index+match[0].length-alias.length).trim();
   const type=/\b(proveedor|proyecto)(?: de)?$/.exec(prefix)?.[1];
   if(type&&type!==entity.type||!type&&text!==alias&&!/\b(?:de|del|para|en|a)$/.test(prefix)&&match[1]===alias)continue;
   const end=match.index+match[0].length;
   matches.push({...entity,start:end-alias.length,end,matched:match[1]});
  }
 }
 return matches.filter(match=>!matches.some(other=>other.start<=match.start&&other.end>=match.end&&(other.start<match.start||other.end>match.end)));
}

export function resolvePayableScope(snapshot,request,turn,today){
 const suppliers=supplierIndex(snapshot);
 const brands=Object.entries(snapshot.config.BRAND??{});
 const brandName=brand=>{
  const name=label(snapshot.config.BRAND?.[brand]?.name)||brand;
  return brands.some(([key,value])=>key!==brand&&normalize(value?.name)===normalize(name))?`${name} (${brand})`:name;
 };
 const entities=snapshot.projects.flatMap(project=>[project.name,project.num].filter(Boolean).map(name=>({type:'proyecto',key:rowId(project.id),label:name})));
 entities.push(...supplierAliases(suppliers,brandName));
 const scope=blankScope(),problems=new Map();
 const reject=(kind,message,options)=>problems.set(kind,queryProblem(kind,message,options));
 const base=turn.base,mentions=request.verifiedMentions??[];
 const catalog=request.entityCatalog??(base?.clientKey||mentions.some(item=>item.kind==='supplier')?buildEntityCatalog(snapshot):null);
 let selectedSupplier=null;
 if(base){
  Object.assign(scope,{projectId:base.projectId??null,date:base.date??null,reference:base.reference??null,currency:base.currency??null,
   overdue:base.state==='overdue'?'overdue':base.state==='open'?'open':base.state==='unknown_due'?'unknown':null});
  if(scope.projectId&&!snapshot.projects.some(project=>rowId(project.id)===scope.projectId))reject('project',payableScopePrompts.project);
  if(base.clientKey){
   const identity=parseEntityIdentity(base.clientKey),result=identity&&catalog&&resolveEntity(catalog,{selected:identity,types:['supplier']});
   if(result?.status!=='resolved')reject('supplier',payableScopePrompts.supplier);
   else{selectedSupplier=result.entity;scope.supplier=supplierFromEntity(selectedSupplier);}
  }else if(base.paymentParty){
   const supplier=suppliers.get(base.paymentParty.name),brand=base.paymentParty.brand;
   if(!supplier||brand===null&&(supplierBrands(supplier).length>1||supplier.contacts.length>1)||
    brand!==null&&(!supplierBrands(supplier).includes(brand)||supplierConflict(supplier,brand)))reject('supplier',payableScopePrompts.supplier);
   else scope.supplier={key:supplier.key,brand};
  }
 }
 const queries=(base?[turn.query]:[turn.priorQuery,...(turn.priorFilters??[]),turn.query]).filter(Boolean);
 for(const query of queries){
  let input=normalize(query).replace(/\b(?:(?:de|a) (?:mis |nuestros |los )?proveedores|en total|de momento|por favor)\b/g,' ').trim();
  const accept=kind=>{problems.delete(kind);problems.delete('unknown');};
  if(clearAny.test(input)){
   const filters=payableFilters(scope);
   if(filters.length!==1)return {filterChoice:filters};
   input=filters[0].clear;
  }
  if(/\b(?:todo el estudio|sin filtros)\b/.test(input)){Object.assign(scope,blankScope());problems.clear();}
  if(clearDate.test(input)){scope.date=null;accept('period');input=input.replace(clearDate,' ');}
  if(clearSupplier.test(input)){scope.supplier=null;accept('supplier');input=input.replace(clearSupplier,' ');}
  if(clearProject.test(input)){scope.projectId=null;accept('project');input=input.replace(clearProject,' ');}
  if(clearCurrency.test(input)){scope.currency=null;accept('currency');input=input.replace(clearCurrency,' ');}
  if(clearDueStatus.test(input)){scope.overdue=null;accept('status');input=input.replace(clearDueStatus,' ');}
  if(problems.get('period')?.message===payableScopePrompts.soon&&/^(?:si|vale|correcto|de acuerdo)$/.test(input))input='vencen los proximos 7 dias';
  if(/\b(?:este|ese) proyecto\b/.test(input)){
   if(request.context.projectId){scope.projectId=request.context.projectId;accept('project');}
   else reject('project',payableScopePrompts.project);
   input=input.replace(/\b(?:este|ese) proyecto\b/g,' ');
  }
  const matched=scopeMatches(input,entities);
  if(!matched.some(entity=>entity.type==='proveedor'))matched.push(...suggestedSuppliers(input,suppliers));
  const candidates=[...new Map(matched.map(entity=>[JSON.stringify([entity.type,entity.key,entity.brand]),entity])).values()];
  if(candidates.some((entity,i)=>candidates.slice(i+1).some(other=>entity.type===other.type||entity.start===other.start&&entity.end===other.end))){
   reject('entity',payableScopePrompts.ambiguous,candidates.map(entity=>{
    const title=(entity.type==='proveedor'?'Proveedor ':'Proyecto ')+entity.label;
    return {label:title,value:title};
   }));
  }else for(const entity of candidates){
   if(entity.type==='proyecto'){scope.projectId=entity.key;accept('entity');accept('project');continue;}
   const supplier=suppliers.get(entity.key),brands=supplierBrands(supplier);
   if(entity.brand===null&&(brands.length>1||supplier.contacts.length>1)||entity.brand!==null&&supplierConflict(supplier,entity.brand)){
    const choices=brands.filter(brand=>!supplierConflict(supplier,brand)).map(brand=>supplierOption(supplier,brand,brandName(brand)));
    reject('supplier',payableScopePrompts.supplier,choices);
    continue;
   }
   scope.supplier={key:entity.key,brand:entity.brand};accept('entity');accept('supplier');
  }
  for(const {matched:phrase} of matched)input=input.replace(phrase,' ');
  const explicitReference=[...input.matchAll(referencePattern)].map(match=>match[0]);
  const numericReference=/\b(?:ref(?:erencia)?|factura (?:numero|n)) (\d{1,12})\b/.exec(input);
  if(numericReference){explicitReference.push(numericReference[1]);input=input.replace(numericReference[0],' ');}
  const references=new Set(explicitReference);
  if(references.size>1)reject('reference',payableScopePrompts.reference);
  else if(references.size===1){
   const [reference]=references;scope.reference=reference;accept('reference');
   if(problems.get('supplier')?.message===payableScopePrompts.supplier){scope.supplier=null;accept('supplier');}
   input=input.replace(new RegExp(`\\b(?:(?:ref(?:erencia)? (?:de factura )?|(?:factura )?(?:numero|n) ))?${escape(reference)}\\b`,'g'),' ');
  }
  if(clearReference.test(input)){scope.reference=null;accept('reference');input=input.replace(clearReference,' ');}
  if(/\b(?:ref|referencia|numero de factura)\b/.test(input))reject('reference',payableScopePrompts.reference);
  const {aliases,codes}=requestedCurrency(input);
  if(codes.size>1)reject('currency',payableScopePrompts.currency);
  else if(codes.size===1){[scope.currency]=codes;accept('currency');}
  for(const alias of aliases)input=input.replace(alias[0],' ');
  const explicitCode=/\ben +([A-Z]{3})\b/.exec(query)?.[1];
  if(explicitCode&&!supportedCurrencies.has(explicitCode)||/\b(?:moneda|divisa) +(?!de pago\b)\S/.test(input)||/\ben (?:pesos|dinares?|rublos?|rupias?|coronas?|francos?|reales|liras?)\b/.test(input))
   reject('currency',payableScopePrompts.currency);
  const soon=/\b(?:pronto|en breve|en los proximos dias|proximos vencimientos)\b/.exec(input);
  const days=/\b(?:los )?proximos (\d{1,3}) dias\b/.exec(input);
  const unsupportedSubdivision=/\b(?:a )?(?:principios|mediados|finales|primera quincena|segunda quincena) (?:de|del)\b/.test(input);
  const normalizedPeriod=input.replace(/\b(?:en |del |de )?mes de /g,' ');
  const period=parsePeriod(normalizedPeriod,today);
  if(soon&&!days&&!period){reject('period',payableScopePrompts.soon);input=input.replace(soon[0],' ');}
  if(days){
   const until=new Date(today+'T00:00:00Z');until.setUTCDate(until.getUTCDate()+Number(days[1]));
   if(Number(days[1])>0){scope.date={from:today,to:until.toISOString().slice(0,10),field:'due'};accept('period');}
   else reject('period',payableScopePrompts.period);
   input=input.replace(days[0],' ');
  }
  if(period?.invalid||unsupportedSubdivision)reject('period',payableScopePrompts.period);
  else if(period){
   scope.date={from:period.from,to:period.to,field:/\b(?:venc(?:e|en|imiento)|se vencen)\b/.test(input)?'due':'issued'};
   input=input.replace(period.matched,' ');
   accept('period');
  }
  if(!period&&!days&&/\b(?:periodo de|entre|desde|hasta) (?:el )?(?:\d|hace\b|principios\b|mediados\b|finales\b)/.test(input))reject('period',payableScopePrompts.period);
  if(dateWords.test(input)&&!/\b(?:todos los anos|sin limite de fechas)\b/.test(input))reject('period',payableScopePrompts.period);
  const open=/\b(?:sin vencer|no vencidas?|no (?:han|hayan) vencido)\b/;
  const allDue=/\b(?:todos los vencimientos|con o sin vencer|todas las pendientes)\b/;
  const noDue=/\b(?:sin (?:fecha de )?vencimiento|sin fecha limite)\b/;
  if(allDue.test(input)||problems.has('status')&&/^(?:solo )?(?:las )?pendientes(?: de pago)?$/.test(input)||/\btambien\b/.test(input)&&open.test(input)&&scope.overdue==='overdue'){scope.overdue=null;accept('status');}
  else if(open.test(input)){scope.overdue='open';accept('status');}
  else if(/\bvencidas?\b/.test(input)){scope.overdue='overdue';accept('status');}
  else if(noDue.test(input)){scope.overdue='unknown';accept('status');input=input.replace(noDue,' ');}
  const statusFilter=input.replace(/\bno pagadas?\b/g,' ');
  if(/\b(?:(?:con )?estado (?!pendiente\b|vencida\b)\w+|pagadas?|cobradas?|anuladas?|disputadas?|(?:las?|solo|incluye|tambien) en revision|cualquier otro estado)\b/.test(statusFilter))reject('status',payableScopePrompts.status);
  if(/\b(?:mas|menos) de \d+ dias\b/.test(input))reject('period',payableScopePrompts.period);
  else if(/\b(?:mas de|menos de|mayor(?:es)? (?:de|que|a)|menor(?:es)? (?:de|que|a)|por encima de|por debajo de|supera(?:n)?|importe (?:entre|superior|inferior))\b/.test(input))reject('amount',payableScopePrompts.amount);
  const unrecognized=input.replace(/\b(?:pendientes? de pago|facturas? de proveedores|a (?:los )?plazos|sin vencer|todos los vencimientos|de pago|mes de|vencimiento en)\b/g,' ').trim();
  if(/\bproveedor +\S/.test(unrecognized)&&!problems.has('supplier')&&!problems.has('entity'))reject('supplier',payableScopePrompts.unknown);
  else if(/\bproyecto +\S/.test(unrecognized)&&!problems.has('project')&&!problems.has('entity'))reject('project',payableScopePrompts.unknown);
  else if(/\b(?:de|del|a|al) +(?!pago\b|cobro\b|las?\b|el\b|los\b|todo\b|mis?\b|nuestros?\b)[a-z0-9][a-z0-9 /-]*$/.test(unrecognized)&&!problems.size)reject('unknown',payableScopePrompts.unknown);
  if(query===turn.query){
   const spoken=normalize(query),verifiedSuppliers=mentions.filter(entity=>entity.kind==='supplier');
   const verifiedProjects=mentions.filter(entity=>entity.kind==='project');
   if(!clearSupplier.test(spoken)&&verifiedSuppliers.length===1){
    const [entity]=verifiedSuppliers,resolution=catalog&&resolveEntity(catalog,{selected:entity.identity,types:['supplier']});
    if(resolution?.status==='resolved'){
     selectedSupplier=resolution.entity;scope.supplier=supplierFromEntity(selectedSupplier);accept('supplier');accept('entity');
    }
   }else if(verifiedSuppliers.length>1&&!clearSupplier.test(spoken))reject('supplier',payableScopePrompts.supplier);
   if(!clearProject.test(spoken)&&verifiedProjects.length===1&&snapshot.projects.some(project=>rowId(project.id)===verifiedProjects[0].id)){
    scope.projectId=verifiedProjects[0].id;accept('project');accept('entity');
   }else if(verifiedProjects.length>1&&!clearProject.test(spoken))reject('project',payableScopePrompts.project);
  }
 }
 const supplier=scope.supplier&&suppliers.get(scope.supplier.key);
 const supplierLabel=scope.supplier?.identity===serializeEntityIdentity(selectedSupplier?.identity)?selectedSupplier?.label:
  supplier&&(scope.supplier.brand===null?supplier.name:supplierOption(supplier,scope.supplier.brand,brandName(scope.supplier.brand)).label);
 return {scope,supplierLabel,catalog,...(problems.size?{problem:[...problems.values()].at(-1)}:{})};
}

function entryReferences(entry){
 const stored=[entry.ref,entry.concept].map(normalize).filter(Boolean);
 if(entry.ref)stored.push(...normalize(entry.ref).match(referencePattern)??[]);
 if(entry.concept)stored.push(...normalize(entry.concept).match(referencePattern)??[]);
 return new Set(stored);
}

export function collectPayables(snapshot,today,scope=blankScope(),authorizedEntities=null){
 const ids=new Map();
 for(const entry of snapshot.entries){
  if(!entry||snapshot.invoiceData?.del?.[entry.id])continue;
  const id=rowId(entry.id);
  ids.set(id,(ids.get(id)??0)+1);
 }
 const rows=[];
 let review=0;
 const identity=scope.supplier?.identity&&parseEntityIdentity(scope.supplier.identity);
 const catalog=identity&&(authorizedEntities??buildEntityCatalog(snapshot));
 const chosen=catalog&&resolveEntity(catalog,{selected:identity,types:['supplier']});
 const selected=chosen?.status==='resolved'?new Set(chosen.entity.entryIndexes):null;
 const other=selected?new Set(catalog.entities.filter(entity=>entity.kind==='supplier'&&entity!==chosen.entity).flatMap(entity=>entity.entryIndexes)):null;
 for(const [entryIndex,entry] of snapshot.entries.entries()){
  if(entry?.kind!=='out'||snapshot.invoiceData?.del?.[entry.id])continue;
  const status=normalize(entry.status),id=rowId(entry.id),supplier=supplierName(entry),pid=entryProjectId(entry);
  if(paid.test(status)||invalid.test(status)||entry.voided===true||entry.draft===true)continue;
  if(scope.projectId&&scope.projectId!==pid||!identity&&scope.supplier&&(scope.supplier.key!==normalize(supplier)||scope.supplier.brand!==null&&scope.supplier.brand!==label(entry.brand,80))||
    scope.reference&&!entryReferences(entry).has(scope.reference))continue;
  const due=isoDate(entry.due),issued=isoDate(entry.date),overdue=Boolean(due&&due<today),date=scope.date?.field==='due'?due:issued;
  if(scope.overdue==='unknown'&&due||scope.overdue&&scope.overdue!=='unknown'&&due&&overdue!==(scope.overdue==='overdue')||
    scope.date&&date&&(date<scope.date.from||date>scope.date.to))continue;
  const total=number(entry.amount),retention=entry.irpf==null||entry.irpf===''?0:number(entry.irpf),base=number(entry.base);
  const code=currency((entry.currency||snapshot.config.account?.currency||'EUR').toString().trim().toUpperCase());
  if(scope.currency&&code&&scope.currency!==code)continue;
  if(identity&&!selected?.has(entryIndex)){
   if(!other?.has(entryIndex)&&(chosen?.entity?.aliases??[normalizeEntityText(scope.supplier.key)]).includes(normalizeEntityText(supplier))&&
     (scope.supplier.brand===null||scope.supplier.brand===label(entry.brand,80)))review++;
   continue;
  }
  const pending=cents(total)-Math.round(base*retention);
  if(status!=='pend'||!id||id.length>160||ids.get(id)!==1||total==null||total<0||retention==null||retention<0||retention>100||
   retention>0&&(base==null||base<0||base>total)||!Number.isSafeInteger(pending)||pending<0||!code||
   partialEvidence(entry)||entry.due&&!due||scope.overdue&&scope.overdue!=='unknown'&&!due||scope.date&&!date){review++;continue;}
  if(!pending)continue;
  rows.push({kind:'entry',id,label:label(entry.concept)||'Factura recibida',brand:label(entry.brand,80),projectId:pid||null,supplier,currency:code,due,overdue,pending});
 }
 rows.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.due??'9999').localeCompare(b.due??'9999')||a.label.localeCompare(b.label,'es')||a.id.localeCompare(b.id));
 return {rows,review};
}

const answer=message=>({status:'answer',message,sources:[],questions:[],actions:[],trace:[]});
const clarification=(message,options=[])=>({status:'clarifying',message,sources:[],actions:[],trace:[],questions:[{id:'payable_scope',prompt:message,options:options.slice(0,8)}]});

function focusedPayable(snapshot,request){
 const {document,results}=request.context.focus??{};
 const pointer=document??(results?.length===1?results[0]:null);
 if(pointer?.kind!=='entry')return null;
 const entries=snapshot.entries.filter(entry=>rowId(entry?.id)===pointer.id);
 const [entry]=entries;
 return entries.length===1&&entry.kind==='out'&&!snapshot.invoiceData?.del?.[entry.id]&&
  label(entry.brand,80)===(pointer.brand??'')&&entryProjectId(entry)===(pointer.projectId??'')?entry:null;
}

function paymentOperation(snapshot,request,operation){
 if(operation==='execute')return answer('No puedo hacer pagos desde el chat. Puedes abrir la factura para revisar sus datos.');
 if(operation==='partial')return answer('No puedo calcular el saldo de un pago parcial a proveedores desde el chat. Puedes revisar el detalle en su registro.');
 const entry=focusedPayable(snapshot,request);
 if(!entry)return clarification('¿De qué factura recibida quieres comprobar el estado? Abre su tarjeta y vuelve a preguntarme.');
 const status=normalize(entry.status);
 if(partialEvidence(entry)||entry.voided===true||entry.draft===true||!['pend','cobr','pag','pagada','paid'].includes(status))
  return answer('Los datos de pago de esta factura necesitan revisión. Consulta su registro en Gastos.');
 return answer(status==='pend'?'Figura como pendiente de pago.':'Figura como pagada.');
}

function payableContext(scope,supplierLabel){
 const {supplier,projectId,date,overdue,currency:code,reference}=scope;
 return {scope:{kind:'received',mode:'pending-payables',latest:false,projectId,date,reference,currency:code,
  clientKey:supplier?.identity??null,state:overdue==='overdue'?'overdue':overdue==='open'?'open':overdue==='unknown'?'unknown_due':null,
  ...(supplier&&!supplier.identity?{paymentParty:{name:supplier.key,label:label(supplierLabel||supplier.key),brand:supplier.brand}}:{})}};
}

export function pendingPayables(snapshot,request,turn,now){
 if(turn.operation)return request.invoicePage?null:paymentOperation(snapshot,request,turn.operation);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:request.context.timeZone||'Europe/Madrid'}).format(now);
 const scoped=resolvePayableScope(snapshot,request,turn,today),page=request.invoicePage;
 if(scoped.filterChoice)return page?null:{...answer(scoped.filterChoice.length?'¿Qué filtro quieres quitar?':'No hay filtros activos.'),
  activeFilters:scoped.filterChoice,preserveQueryContext:true};
 const {scope,supplierLabel,catalog}=scoped;
 const documentContext=payableContext(scope,supplierLabel);
 if(scoped.problem)return page?null:{...clarification(scoped.problem.message,scoped.problem.options),documentContext};
 const {projectId,supplier,date,overdue:dueFilter,currency:code,reference}=scope;
 const sourceVersion=snapshot.versions.facturas;
 const version=JSON.stringify(['payables',snapshot.studyId,sourceVersion,snapshot.versions.config,snapshot.versions.contactos,snapshot.versions.proyectos,scope,today]);
 const offset=page?.offset??0;
 if(page&&(page.version!==version||page.projectId!==projectId))return null;
 const {rows,review}=collectPayables(snapshot,today,scope,catalog),count=rows.length;
 if(reference&&count+review>1)return page?null:clarification(payableScopePrompts.duplicateReference);
 if(page&&offset>=count)return null;
 const totals=new Map();
 for(const row of rows)totals.set(row.currency,(totals.get(row.currency)??0)+row.pending);
 const amounts=[...totals].sort(([a],[b])=>a.localeCompare(b)).map(([code,total])=>({currency:code,amount:total/100}));
 const sum=amounts.map(({currency,amount})=>money(amount,currency)).join(' y ');
 const overdue=rows.filter(row=>row.overdue).length,filtered=Boolean(projectId||supplier||date||dueFilter||code||reference);
 let message=count?`Tienes ${count} ${count===1?'factura pendiente':'facturas pendientes'} de pago por ${sum}.`:
  review?'No he podido confirmar facturas pendientes de pago.':`No tienes facturas pendientes de pago${filtered?' con esos filtros':''}.`;
 if(overdue)message+=overdue===1?' Una está vencida.':` De ellas, ${overdue} están vencidas.`;
 if(review)message+=` ${review===1?'Hay 1 factura que necesita':`Hay ${review} facturas que necesitan`} revisión por datos incompletos, pagos parciales sin saldo verificable o importes contradictorios.`;
 const sources=rows.slice(offset,offset+PAGE_SIZE).map(row=>({...row,pending:row.pending/100}));
 const projectLabel=snapshot.projects.find(project=>rowId(project.id)===projectId)?.name;
 const scopeLabel=[projectLabel,supplierLabel,
  date&&`${date.field==='due'?'Vencimiento':'Emisión'}: ${date.from} a ${date.to}`,dueFilter==='overdue'?'Solo vencidas':dueFilter==='open'?'Sin vencer':dueFilter==='unknown'?'Sin vencimiento registrado':null,
  code&&(currencyLabels[code]||code),reference&&reference.toUpperCase()].filter(Boolean).join(' · ');
 const next=offset+sources.length<count?offset+sources.length:null;
 return {status:'answer',message,sources,questions:[],actions:[],documentContext,activeFilters:payableFilters(scope,{supplierLabel,projectLabel}),
  payables:{count,overdue,amounts,review,offset,next,version,sourceVersion,projectId,scopeLabel},
  trace:[{label:'Facturas recibidas pendientes de pago comprobadas',status:'done'}]};
}
