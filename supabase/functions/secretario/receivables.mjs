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
  if (entryDue || docDue) return {date:entryDue || docDue};
  const issued = isoDate(entry.date) || isoDate(doc?.date);
  return {date:issued ? new Date(Date.parse(issued) + 30 * 86400000).toISOString().slice(0, 10) : null};
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

export function collectReceivables(snapshot, {today, projectId = null, client = null, date = null, overdue = null} = {}) {
  const data = snapshot.invoiceData ?? {}, defaultCurrency = currency(snapshot.config.account?.currency);
  const series = clean(snapshot.config.series?.fc).toUpperCase();
  const documents = new Map(), entries = new Map(), used = new Set(), idCounts = new Map();
  let review = 0;
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
    if(projectId!==null&&project(doc)!==projectId&&project(entry)!==projectId)return false;
    if(client&&(normalizedName(clientName(doc,entry))!==client.name||client.brand&&client.brand!==(doc?.brand??entry?.brand)))return false;
    const due=entry?dueDate(doc,entry):null;
    const dateValue=date?.field==='due'?due?.date:isoDate(doc?.date)||isoDate(entry?.date);
    if(date&&dateValue&&(dateValue<date.from||dateValue>date.to))return false;
    if(overdue&&due?.date&&((due.date<today)!==(overdue==='overdue')))return false;
    return true;
  }

  function include(ref, doc, entry) {
    if (!ref || !entry) { if (!paidStatus.test(status(doc))) review++; return; }
    if (voidStatus.test(status(entry)) || voidStatus.test(status(doc)) || entry.draft === true || entry.voided === true || doc?.voided === true) return;
    const gross = number(entry.amount), retention = entry.irpf == null || entry.irpf === '' ? 0 : number(entry.irpf);
    const base = number(entry.base), docTotal = doc?.total == null ? null : number(doc.total);
    const movements = entry.cobros ?? [];
    const docCurrency = currency(doc?.currency), entryCurrency = currency(entry.currency), code = docCurrency || entryCurrency || defaultCurrency;
    if (gross == null || retention == null || retention < 0 || retention > 100 || (retention > 0 && base == null)
        || doc?.total != null && docTotal == null || docTotal != null && cents(gross - docTotal) !== 0
        || !Array.isArray(movements) || movements.some(movement => !(number(movement?.amount) > 0))
        || doc?.currency && !docCurrency || entry.currency && !entryCurrency || docCurrency && entryCurrency && docCurrency !== entryCurrency
        || project(doc) && project(entry) && project(doc) !== project(entry)) { review++; return; }
    // Same calculation as aCobrar, cobrado and pendienteCobro in Finanzas.
    const total = gross - (retention > 0 ? base * retention / 100 : 0);
    const paid = movements.reduce((sum, movement) => sum + Number(movement.amount), 0);
    const remaining = cents(total - paid), markedPaid = paidStatus.test(status(doc)) || paidStatus.test(status(entry));
    if (!Number.isSafeInteger(remaining) || movements.length && remaining < 0
        || markedPaid && movements.length && remaining > 0
        || paidStatus.test(status(doc)) && status(entry) && !paidStatus.test(status(entry)) && remaining > 0) { review++; return; }
    if (markedPaid || remaining <= 0) return;
    const due = dueDate(doc, entry);
    const issuedDate=isoDate(doc?.date)||isoDate(entry.date);
    if (!code || due.conflict || date&&(date.field==='due'?!due.date:!issuedDate) || overdue&&!due.date) { review++; return; }
    if (!doc && (entry.id == null || idCounts.get(String(entry.id)) !== 1)) { review++; return; }
    const brand = clean(doc?.brand ?? entry.brand, 80), pid = project(doc) || project(entry);
    rows.push({
      kind:doc ? 'invoice' : 'invoice_entry', id:doc ? ref : String(entry.id), label:ref, brand, projectId:pid || null,
      client:clientName(doc,entry),
      remaining, currency:code, due:due.date, overdue:!!due.date && due.date < today, partial:paid > 0
    });
  }

  for (const [identity, docs] of documents) {
    const linked = entries.get(identity) ?? [];
    linked.forEach(entry => used.add(entry));
    const issued = docs.filter(doc => !voidStatus.test(status(doc)) && doc.voided !== true && doc.draft !== true);
    if (!issued.some(doc=>linked.length?linked.some(entry=>inScope(doc,entry)):inScope(doc,null))) continue;
    if (docs.length !== 1 || linked.length > 1) { review++; continue; }
    include(clean(issued[0].ref), issued[0], linked[0]);
  }
  const legacy = new Map();
  for (const entry of snapshot.entries) {
    if (entry?.kind !== 'in' || used.has(entry) || data.del?.[entry.id] || !inScope(null,entry)) continue;
    const ref = legacyReference(entry, series);
    if (ref && !data.ddel?.[ref]) register(legacy,key(entry.brand,ref),{ref,entry});
  }
  for (const candidates of legacy.values()) {
    if (candidates.length !== 1) { review++; continue; }
    const [{ref,entry}] = candidates;
    include(ref,null,entry);
  }
  rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.label.localeCompare(b.label) || a.brand.localeCompare(b.brand) || a.id.localeCompare(b.id));
  return {rows, review};
}

export function receivablesPage(snapshot, {today, offset = 0, ...scope}) {
  const {rows, review} = collectReceivables(snapshot, {today, ...scope});
  const totals = new Map();
  let overdue = 0;
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.remaining);
    if (row.overdue) overdue++;
  }
  const amounts = [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([code, total]) => ({currency:code, amount:total / 100}));
  const text = amounts.map(({currency, amount}) => new Intl.NumberFormat('es-ES',{style:'currency',currency}).format(amount)).join(' y ');
  let message = rows.length
    ? `Tienes ${rows.length} ${rows.length === 1 ? 'factura pendiente' : 'facturas pendientes'} de cobro por ${text}. ${overdue === 1 ? '1 está vencida.' : `${overdue} están vencidas.`}`
    : review ? 'No he podido confirmar facturas con saldo pendiente.' : 'No tienes facturas pendientes de cobro.';
  if (review) message += ` ${review === 1 ? 'Hay 1 factura que necesita' : `Hay ${review} facturas que necesitan`} revisión por datos incompletos o contradictorios.`;
  const page = rows.slice(offset, offset + PAGE_SIZE).map(({remaining, ...row}) => ({...row, pending:remaining / 100}));
  return {message, page, count:rows.length, overdue, amounts, review, offset, next:offset + page.length < rows.length ? offset + page.length : null};
}
