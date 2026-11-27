const PAGE_SIZE = 12;
const clean = (value, max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const normalizeReceivableText = value => clean(value, 6000).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const normalize = normalizeReceivableText;
const key = (brand, ref) => JSON.stringify([brand ?? '', ref ?? '']);
const number = value => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
const cents = value => Math.round(value * 100);
const voidStatus = /^(?:anul|cancel|void|draft|borrador|rectificad)/;
const paidStatus = /^(?:pag|pagada|paid|cobr|cobrada|cobrado)$/;
const status = row => normalize(row?.status);
const project = row => String(row?.projectId ?? row?.pid ?? '');
const currency = value => {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(code) ? code : '';
};
const reviewLabels={movement:'falta el ingreso vinculado',duplicate:'hay referencias o vínculos duplicados',
  amount:'los importes o las retenciones no cuadran',payment:'los cobros o estados no cuadran',
  scope:'el cliente o el proyecto necesita confirmación',date:'las fechas faltan o no coinciden',currency:'la moneda falta o no coincide',
  debtor:'la identidad del cliente no se puede confirmar'};

export function isoDate(value) {
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value ?? '');
  const date = dmy ? dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0') : value;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : null;
}

function dueDate(doc, entry) {
  const entryDue = isoDate(entry.due), docDue = isoDate(doc?.due);
  if (entry.due && !entryDue || doc?.due && !docDue || entryDue && docDue && entryDue !== docDue) return {conflict:true};
  if (entryDue || docDue) return {date:entryDue || docDue,calculated:false};
  const issued = isoDate(entry.date) || isoDate(doc?.date);
  return {date:issued ? new Date(Date.parse(issued) + 30 * 86400000).toISOString().slice(0, 10) : null,calculated:!!issued};
}

function register(map, id, row) {
  if (!map.has(id)) map.set(id, []);
  map.get(id).push(row);
}

function legacyReference(entry, series) {
  if (entry.link) return clean(entry.link);
  const match = /^\s*(?:factura\s+)?([a-z]{1,12})\s*-?\s*(\d{2,}[\w/-]*)/i.exec(entry.concept ?? '');
  return match && [series, 'F', 'FC', 'FAC', 'FRA', 'FV'].includes(match[1].toUpperCase()) ? match[1] + '-' + match[2] : '';
}

const normalizedName=value=>normalize(value).replace(/[^a-z0-9/-]+/g,' ').trim().replace(/\s+/g,' ');
const clientName=(doc,entry)=>clean(doc?.client || entry?.client || entry?.sup || clean(entry?.concept, 500).split(' · ').slice(1).join(' · '));

function debtorLookup(contacts){
  const directory=new Map();
  for(const [index,contact] of contacts.entries()){
    const label=clean(contact?.name),name=normalizedName(label);
    if(name)register(directory,name,{index,label,id:contact.id==null?null:String(contact.id),brand:clean(contact.brand,80)});
  }
  return (doc,entry,label,brand)=>{
    const matches=directory.get(normalizedName(label))??[];
    const index=doc?.clientIdx??entry.clientIdx,id=doc?.clientId??entry.clientId;
    const candidates=matches.filter(item=>(item.brand===brand||item.brand==='both')&&
      (index==null||index===''||String(item.index)===String(index))&&
      (id==null||id===''||item.id===String(id)||'contact:'+item.index===String(id)));
    if(candidates.length!==1)return null;
    const [contact]=candidates;
    return {index:contact.index,label:matches.length>1?`${contact.label} (ficha ${contact.index+1})`:contact.label};
  };
}

export function collectReceivables(snapshot, {today, projectId = null, client = null, date = null, overdue = null, reference = null, brand:scopeBrand = null, currency:scopeCurrency = null, ranking = false} = {}) {
  const wantedReference=normalize(reference);
  const data = snapshot.invoiceData ?? {}, defaultCurrency = currency(snapshot.config.account?.currency);
  const series = clean(snapshot.config.series?.fc).toUpperCase();
  const documents = new Map(), entries = new Map(), used = new Set(), idCounts = new Map();
  const lookupDebtor=ranking?debtorLookup(snapshot.clients??[]):null;
  let review = 0;
  const reviewCounts=new Map();
  function flag(reason){
    review++;
    reviewCounts.set(reason,(reviewCounts.get(reason)??0)+1);
  }
  const rows = [];
  for (const invoice of snapshot.invoices) {
    if (invoice && !data.ddel?.[invoice.ref]) register(documents, key(invoice.brand, invoice.ref), invoice);
  }
  for (const entry of snapshot.entries) {
    if (entry?.kind !== 'in' || data.del?.[entry.id]) continue;
    const linkedRef = clean(entry.link) || /\(([^()]+)\)\s*$/.exec(entry.concept ?? '')?.[1] || legacyReference(entry, series);
    if (linkedRef) register(entries, key(entry.brand, linkedRef), entry);
    idCounts.set(String(entry.id), (idCounts.get(String(entry.id)) ?? 0) + 1);
  }

  function inScope(doc,entry){
    if(scopeBrand!==null&&clean(doc?.brand??entry?.brand,80)!==scopeBrand)return false;
    if(projectId!==null&&project(doc)!==projectId&&project(entry)!==projectId)return false;
    if(client&&(normalizedName(clientName(doc,entry))!==client.name||client.brand&&client.brand!==(doc?.brand??entry?.brand)))return false;
    if(client?.clientIndex!=null&&doc?.clientIdx!=null&&doc.clientIdx!==''&&String(doc.clientIdx)!==String(client.clientIndex))return false;
    if(scopeCurrency){
      const codes=[currency(doc?.currency),currency(entry?.currency)].filter(Boolean);
      if(!doc?.currency&&!entry?.currency&&defaultCurrency)codes.push(defaultCurrency);
      if(codes.length&&!codes.includes(scopeCurrency))return false;
    }
    const due=entry?dueDate(doc,entry):null;
    const dateValue=date?.field==='due'?due?.date:isoDate(doc?.date)||isoDate(entry?.date);
    if(date&&dateValue&&(dateValue<date.from||dateValue>date.to))return false;
    if(overdue&&due?.date&&((due.date<today)!==(overdue==='overdue')))return false;
    return true;
  }

  function include(ref, doc, entry) {
    if (!ref || !entry) { if (!paidStatus.test(status(doc))) flag('movement'); return; }
    if (voidStatus.test(status(entry)) || voidStatus.test(status(doc)) || entry.draft === true || entry.voided === true || doc?.voided === true) return;
    const gross = number(entry.amount), retention = entry.irpf == null || entry.irpf === '' ? 0 : number(entry.irpf);
    const base = number(entry.base), docTotal = doc?.total == null ? null : number(doc.total);
    const movements = entry.cobros ?? [];
    const docCurrency = currency(doc?.currency), entryCurrency = currency(entry.currency), code = docCurrency || entryCurrency || defaultCurrency;
    if (gross == null || retention == null || retention < 0 || retention > 100 || (retention > 0 && (base == null || base < 0))
        || doc?.total != null && docTotal == null || docTotal != null && cents(gross - docTotal) !== 0) { flag('amount'); return; }
    if (!Array.isArray(movements) || movements.some(movement => !(number(movement?.amount) > 0))) { flag('payment'); return; }
    if (doc?.currency && !docCurrency || entry.currency && !entryCurrency || docCurrency && entryCurrency && docCurrency !== entryCurrency) { flag('currency'); return; }
    if (project(doc) && project(entry) && project(doc) !== project(entry)) { flag('scope'); return; }
    // Same calculation as aCobrar, cobrado and pendienteCobro in Finanzas.
    const retained = retention > 0 ? base * retention / 100 : 0;
    const total = gross - retained;
    const paid = movements.reduce((sum, movement) => sum + Number(movement.amount), 0);
    const remaining = cents(total - paid), markedPaid = paidStatus.test(status(doc)) || paidStatus.test(status(entry));
    if (!Number.isSafeInteger(remaining) || movements.length && remaining < 0
        || markedPaid && movements.length && remaining > 0
        || paidStatus.test(status(doc)) && status(entry) && !paidStatus.test(status(entry)) && remaining > 0) { flag('payment'); return; }
    if (markedPaid || remaining <= 0) return;
    if(client?.clientIndex!=null&&(doc?.clientIdx==null||doc.clientIdx==='')){flag('scope');return;}
    const due = dueDate(doc, entry);
    const issuedDate=isoDate(doc?.date)||isoDate(entry.date);
    if (!code) { flag('currency'); return; }
    if (due.conflict || date&&(date.field==='due'?!due.date:!issuedDate) || overdue&&!due.date) { flag('date'); return; }
    if (!doc && (entry.id == null || idCounts.get(String(entry.id)) !== 1)) { flag('duplicate'); return; }
    const brand = clean(doc?.brand ?? entry.brand, 80), pid = project(doc) || project(entry);
    const counterparty=clientName(doc,entry),debtor=lookupDebtor?.(doc,entry,counterparty,brand);
    if (lookupDebtor && !debtor) { flag('debtor'); return; }
    rows.push({
      kind:doc ? 'invoice' : 'invoice_entry', id:doc ? ref : String(entry.id), label:ref, brand, projectId:pid || null,
      client:counterparty,date:issuedDate,...(debtor?{debtor}:{}),
      remaining, gross, retained, paid:cents(paid)/100, currency:code, due:due.date, dueCalculated:due.calculated,
      overdue:!!due.date && due.date < today, partial:paid > 0
    });
  }

  for (const [identity, docs] of documents) {
    if(wantedReference&&!docs.some(doc=>normalize(doc.ref)===wantedReference))continue;
    const linked = entries.get(identity) ?? [];
    linked.forEach(entry => used.add(entry));
    const issued = docs.filter(doc => !voidStatus.test(status(doc)) && doc.voided !== true && doc.draft !== true);
    if (!issued.some(doc=>linked.length?linked.some(entry=>inScope(doc,entry)):inScope(doc,null))) continue;
    if (docs.length !== 1 || linked.length > 1) { flag('duplicate'); continue; }
    include(clean(issued[0].ref), issued[0], linked[0]);
  }
  const legacy = new Map();
  for (const entry of snapshot.entries) {
    if (entry?.kind !== 'in' || used.has(entry) || data.del?.[entry.id] || !inScope(null,entry)) continue;
    const ref = legacyReference(entry, series);
    if (ref && (!wantedReference||normalize(ref)===wantedReference) && !data.ddel?.[ref]) register(legacy,key(entry.brand,ref),{ref,entry});
  }
  for (const candidates of legacy.values()) {
    if (candidates.length !== 1) { flag('duplicate'); continue; }
    const [{ref,entry}] = candidates;
    include(ref,null,entry);
  }
  rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.label.localeCompare(b.label) || a.brand.localeCompare(b.brand) || a.id.localeCompare(b.id));
  return {rows, review, reviewReasons:[...reviewCounts].map(([reason,count])=>({reason,count}))};
}

function highestDebts(rows){
  const totals=new Map();
  for(const row of rows){
    if(!totals.has(row.currency))totals.set(row.currency,new Map());
    const byDebtor=totals.get(row.currency),previous=byDebtor.get(row.debtor.index)??0;
    byDebtor.set(row.debtor.index,previous+row.remaining);
  }
  const maxima=new Map([...totals].map(([code,byDebtor])=>[code,[...byDebtor.values()].reduce((max,value)=>Math.max(max,value),0)]));
  const leaders=new Map();
  const selected=rows.filter(row=>{
    const maximum=maxima.get(row.currency);
    if(totals.get(row.currency).get(row.debtor.index)!==maximum)return false;
    if(!leaders.has(row.currency))leaders.set(row.currency,new Map());
    leaders.get(row.currency).set(row.debtor.index,row.debtor.label);
    return true;
  });
  return {selected,leaders:[...leaders].sort(([a],[b])=>a.localeCompare(b)).map(([code,names])=>({code,amount:maxima.get(code)/100,
    names:[...names.values()].sort((a,b)=>a.localeCompare(b,'es'))}))};
}

export function receivablesPage(snapshot, {today, offset = 0, ...scope}) {
  const result=collectReceivables(snapshot,{today,...scope});
  const {review,reviewReasons}=result;
  const ranking=scope.ranking?highestDebts(result.rows):null;
  const rows=ranking?.selected??result.rows;
  const totals = new Map();
  let overdue = 0;
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.remaining);
    if (row.overdue) overdue++;
  }
  const amounts = [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([code, total]) => ({currency:code, amount:total / 100}));
  const money=(amount,currency)=>new Intl.NumberFormat('es-ES',{style:'currency',currency,useGrouping:'always',
    ...(Number.isInteger(amount)?{minimumFractionDigits:0}:{})}).format(amount);
  const text = amounts.map(({currency, amount}) => money(amount,currency)).join(' y ');
  const filtered=scope.projectId||scope.client||scope.date||scope.overdue||scope.reference||scope.currency;
  const year=scope.date?.field==='issued'&&scope.date.from.endsWith('-01-01')&&scope.date.to===scope.date.from.slice(0,4)+'-12-31'?scope.date.from.slice(0,4):null;
  let message;
  if(!rows.length){
    message=review?(ranking?'No puedo confirmar qué cliente tiene el mayor saldo pendiente.':'No puedo confirmar el saldo pendiente con los datos disponibles.'):`No tienes facturas pendientes de cobro${filtered?' con esos filtros':''}.`;
  }else if(ranking){
    const list=new Intl.ListFormat('es',{type:'conjunction'});
    message=ranking.leaders.map(({code,amount,names})=>{
      const confirmed=review?' confirmado':'',value=money(amount,code);
      if(names.length===1)return `El mayor pendiente${confirmed} es de ${names[0]} por ${value}.`;
      const tied=names.length>3?`${names.length} clientes`:list.format(names);
      return `El mayor pendiente${confirmed} está empatado entre ${tied}, con ${value} cada uno.`;
    }).join(' ');
  }else if(review){
    message=`Puedo confirmar ${text} pendientes de cobro en ${rows.length} ${rows.length===1?'factura':'facturas'}.`;
  }else if(scope.reference&&rows.length===1){
    const [row]=rows;
    const retention=row.retained>0?`, con ${money(row.retained,row.currency)} de retención`:'',rounded=retention&&cents(row.gross)-cents(row.retained)-cents(row.paid)!==row.remaining;
    message=`Quedan ${text} por cobrar. La factura es de ${money(row.gross,row.currency)}${retention} y tiene ${money(row.paid,row.currency)} de cobros registrados${rounded?' (saldo con el redondeo de la aplicación)':''}.`;
  }else if(scope.overdue==='overdue'){
    const prefix=year?`De esas facturas de ${year}, `:'';
    message=rows.length===1?`${prefix}${prefix?'queda':'Queda'} 1 vencida por ${text}.`:`${prefix}${prefix?'quedan':'Quedan'} ${rows.length} vencidas por ${text}.`;
  }else if(scope.client&&!year){
    message=`A ${scope.client.label} le quedan ${text} por pagar de ${rows.length} ${rows.length===1?'factura':'facturas'}.`;
    if(overdue)message+=overdue===1?' Una está vencida.':` De ellas, ${overdue} están vencidas.`;
  }else{
    const prefix=year?`De las emitidas en ${year}, tienes`:'Tienes';
    message=`${prefix} ${rows.length} ${rows.length===1?'factura pendiente':'facturas pendientes'}${year?'':' de cobro'} por ${text}.`;
    if(overdue)message+=overdue===1?' Una está vencida.':` De ellas, ${overdue} están vencidas.`;
  }
  if (review) {
    const reasons=new Intl.ListFormat('es',{type:'conjunction'}).format(reviewReasons.map(({reason})=>reviewLabels[reason]));
    message+=` ${review===1?'Hay 1 factura que necesita':`Hay ${review} facturas que necesitan`} revisión porque ${reasons}.`;
  }
  const page = rows.slice(offset, offset + PAGE_SIZE).map(({remaining,gross,retained,paid,debtor,...row}) => ({...row,total:gross,paid,retained,pending:remaining / 100}));
  return {message, page, count:rows.length, overdue, amounts, review, reviewReasons, offset, next:offset + page.length < rows.length ? offset + page.length : null};
}
