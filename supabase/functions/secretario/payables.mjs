import {parsePeriod} from './receivable-scope.mjs';
import {isoDate,normalizeReceivableText} from './receivables.mjs';
import {payableScopePrompts} from './payment-direction.mjs';

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

function scopeMatches(text,entities){
 const matches=[];
 for(const entity of entities){
  const alias=normalize(entity.label);
  if(alias.length<2)continue;
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

function scopeFor(snapshot,request,turn,today){
 const suppliers=new Map();
 for(const entry of snapshot.entries){
  const name=entry?.kind==='out'&&!snapshot.invoiceData?.del?.[entry.id]&&supplierName(entry);
  if(name)suppliers.set(normalize(name),name);
 }
 for(const contact of snapshot.clients??[]){
  if(['Proveedor','Contratista','Técnico'].includes(contact?.type)&&label(contact.name))suppliers.set(normalize(contact.name),label(contact.name));
 }
 const entities=snapshot.projects.flatMap(project=>[project.name,project.num].filter(Boolean).map(name=>({type:'proyecto',key:rowId(project.id),label:name})));
 for(const [key,name] of suppliers)entities.push({type:'proveedor',key,label:name});
 const scope={projectId:null,supplier:null,date:null,overdue:null};
 const queries=[turn.priorQuery,...(turn.priorFilters??[]),turn.query].filter(Boolean);
 for(const [index,query] of queries.entries()){
  let problem=null,scopeRecognized=false;
  let input=normalize(query).replace(/\b(?:(?:de|a) (?:los )?proveedores|en total|de momento|por favor)\b/g,' ');
  if(/\b(?:todo el estudio|sin filtros)\b/.test(input)){Object.assign(scope,{projectId:null,supplier:null,date:null,overdue:null});scopeRecognized=true;}
  if(/\b(?:todos los anos|sin limite de fechas)\b/.test(input)){scope.date=null;scopeRecognized=true;}
  if(/\b(?:todos los proveedores|cualquier proveedor)\b/.test(input)){scope.supplier=null;scopeRecognized=true;input=input.replace(/\b(?:todos los proveedores|cualquier proveedor)\b/g,' ');}
  if(/\b(?:todos los proyectos|cualquier proyecto)\b/.test(input)){scope.projectId=null;scopeRecognized=true;input=input.replace(/\b(?:todos los proyectos|cualquier proyecto)\b/g,' ');}
  if(/\b(?:este|ese) proyecto\b/.test(input)){
   const id=request.context.projectId??scope.projectId;
   if(id){scope.projectId=id;scopeRecognized=true;}
   else problem=payableScopePrompts.project;
   input=input.replace(/\b(?:este|ese) proyecto\b/g,' ');
  }
  const matched=scopeMatches(input,entities);
  const candidates=[...new Map(matched.map(entity=>[JSON.stringify([entity.type,entity.key]),entity])).values()];
  if(candidates.some((entity,i)=>candidates.slice(i+1).some(other=>entity.type===other.type||entity.start===other.start&&entity.end===other.end)))problem=payableScopePrompts.ambiguous;
  else for(const entity of candidates){
   if(entity.type==='proyecto')scope.projectId=entity.key;
   else scope.supplier=entity.key;
   scopeRecognized=true;
  }
  for(const {matched:phrase} of matched)input=input.replace(phrase,' ');
  const period=parsePeriod(input,today);
  if(period?.invalid)problem=payableScopePrompts.period;
  else if(period){
   scope.date={from:period.from,to:period.to,field:/\bvenc(?:e|en|imiento)\b/.test(input)?'due':'issued'};
   input=input.replace(period.matched,' ');
   scopeRecognized=true;
  }
  if(/\b(?:sin vencer|no vencidas?)\b/.test(input))scope.overdue='open';
  else if(/\bvencidas?\b/.test(input))scope.overdue='overdue';
  else if(/\b(?:todos los vencimientos|con o sin vencer)\b/.test(input))scope.overdue=null;
  const unrecognized=input.replace(/\b(?:pendientes? de pago|a los proveedores|a plazos|sin vencer|todos los vencimientos|de pago|en euros)\b/g,' ').trim();
  if(/\b(?:proveedor|proyecto) +\S/.test(unrecognized)||/\b(?:de|del|a) +(?!pago\b|cobro\b|las?\b|el\b|los\b|todo\b|mis?\b|nuestros?\b)[a-z0-9][a-z0-9 /-]*$/.test(unrecognized))
   problem??=payableScopePrompts.unknown;
  const isLast=index===queries.length-1;
  if(problem&&(!(turn.replacingScope||turn.priorScopeReply)||isLast))return problem;
  if(turn.replacingScope&&isLast&&!scopeRecognized)return payableScopePrompts.unknown;
 }
 return {scope,supplierLabel:suppliers.get(scope.supplier)};
}

export function collectPayables(snapshot,today,scope={projectId:null,supplier:null,date:null,overdue:null}){
 const ids=new Map();
 for(const entry of snapshot.entries){
  if(!entry||snapshot.invoiceData?.del?.[entry.id])continue;
  const id=rowId(entry.id);
  ids.set(id,(ids.get(id)??0)+1);
 }
 const rows=[];
 let review=0;
 for(const entry of snapshot.entries){
  if(entry?.kind!=='out'||snapshot.invoiceData?.del?.[entry.id])continue;
  const status=normalize(entry.status),id=rowId(entry.id),supplier=supplierName(entry),pid=entryProjectId(entry);
  if(paid.test(status)||invalid.test(status)||entry.voided===true||entry.draft===true)continue;
  if(scope.projectId!==null&&scope.projectId!==pid||scope.supplier!==null&&scope.supplier!==normalize(supplier))continue;
  const due=isoDate(entry.due),issued=isoDate(entry.date),overdue=Boolean(due&&due<today),date=scope.date?.field==='due'?due:issued;
  if(scope.overdue&&due&&overdue!==(scope.overdue==='overdue')||scope.date&&date&&(date<scope.date.from||date>scope.date.to))continue;
  const total=number(entry.amount),retention=entry.irpf==null||entry.irpf===''?0:number(entry.irpf),base=number(entry.base);
  const code=currency((entry.currency||snapshot.config.account?.currency||'EUR').toString().trim().toUpperCase());
  const pending=cents(total)-Math.round(base*retention);
  if(status!=='pend'||!id||id.length>160||ids.get(id)!==1||total==null||total<0||retention==null||retention<0||retention>100||
   retention>0&&(base==null||base<0||base>total)||!Number.isSafeInteger(pending)||pending<0||!code||
   entry.cobros!=null&&(!Array.isArray(entry.cobros)||entry.cobros.length>0)||entry.due&&!due||scope.overdue&&!due||scope.date&&!date){review++;continue;}
  if(!pending)continue;
  rows.push({kind:'entry',id,label:label(entry.concept)||'Factura recibida',brand:label(entry.brand,80),projectId:pid||null,supplier,currency:code,due,overdue,pending});
 }
 rows.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.due??'9999').localeCompare(b.due??'9999')||a.label.localeCompare(b.label,'es')||a.id.localeCompare(b.id));
 return {rows,review};
}

export function pendingPayables(snapshot,request,turn,now){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:request.context.timeZone||'Europe/Madrid'}).format(now);
 const scoped=scopeFor(snapshot,request,turn,today),page=request.invoicePage;
 if(typeof scoped==='string')return page?null:{status:'clarifying',message:scoped,sources:[],actions:[],trace:[],questions:[{id:'payable_scope',prompt:scoped,options:[]}]};
 const {scope,supplierLabel}=scoped;
 const {projectId,supplier,date,overdue:dueFilter}=scope;
 const sourceVersion=snapshot.versions.facturas;
 const version=JSON.stringify(['payables',snapshot.studyId,sourceVersion,snapshot.versions.config,snapshot.versions.contactos,snapshot.versions.proyectos,scope,today]);
 const offset=page?.offset??0;
 if(page&&(page.version!==version||page.projectId!==projectId))return null;
 const {rows,review}=collectPayables(snapshot,today,scope),count=rows.length;
 if(page&&offset>=count)return null;
 const totals=new Map();
 for(const row of rows)totals.set(row.currency,(totals.get(row.currency)??0)+row.pending);
 const amounts=[...totals].sort(([a],[b])=>a.localeCompare(b)).map(([code,total])=>({currency:code,amount:total/100}));
 const sum=amounts.map(({currency,amount})=>money(amount,currency)).join(' y ');
 const overdue=rows.filter(row=>row.overdue).length,filtered=Boolean(projectId||supplier||date||dueFilter);
 let message=count?`Tienes ${count} ${count===1?'factura pendiente':'facturas pendientes'} de pago por ${sum}.`:
  review?'No he podido confirmar facturas pendientes de pago.':`No tienes facturas pendientes de pago${filtered?' con esos filtros':''}.`;
 if(overdue)message+=overdue===1?' Una está vencida.':` De ellas, ${overdue} están vencidas.`;
 if(review)message+=` ${review===1?'Hay 1 factura que necesita':`Hay ${review} facturas que necesitan`} revisión por datos incompletos o contradictorios.`;
 const sources=rows.slice(offset,offset+PAGE_SIZE).map(row=>({...row,pending:row.pending/100}));
 const scopeLabel=[snapshot.projects.find(project=>rowId(project.id)===projectId)?.name,supplierLabel,
  date&&`${date.field==='due'?'Vencimiento':'Emisión'}: ${date.from} a ${date.to}`,dueFilter==='overdue'?'Solo vencidas':dueFilter==='open'?'Sin vencer':null].filter(Boolean).join(' · ');
 const next=offset+sources.length<count?offset+sources.length:null;
 return {status:'answer',message,sources,questions:[],actions:[],payables:{count,overdue,amounts,review,offset,next,version,sourceVersion,projectId,scopeLabel},
  trace:[{label:'Facturas recibidas pendientes de pago comprobadas',status:'done'}]};
}
