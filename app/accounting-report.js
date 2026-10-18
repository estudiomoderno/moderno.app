/* Read-only accounting presentation. Never changes ledger entries or source documents. */
var ModernoAccountingReport=(()=>{
 'use strict';
 const text=value=>typeof value==='string'?value:typeof value==='number'&&Number.isFinite(value)?String(value):'';
 const escape=value=>text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>value!==null&&value!==undefined&&!(typeof value==='string'&&!value.trim())&&['number','string'].includes(typeof value)&&Number.isFinite(Number(value))?Number(value):null;
 const round=value=>Math.round((value+Number.EPSILON)*100)/100;
 const unique=items=>items.length===1?items[0]:null;
 function model(entries,{projects=[],invoices=[],brands={}}={}){
  const items=entries.map(entry=>{
   const invoice=entry.kind==='in'&&entry.link?unique(invoices.filter(f=>f.ref===entry.link&&f.brand===entry.brand)):null;
   const pid=entry.pid??invoice?.projectId;
   const project=pid==null?null:unique(projects.filter(p=>String(p.id)===String(pid)&&(!p.brand||!entry.brand||p.brand===entry.brand)));
   const base=number(entry.base),tax=number(entry.iva),amount=number(entry.amount);
   const retentionRate=number(entry.irpf)??(invoice?.irpf?.on===false?0:invoice?.irpf?.on===true?number(invoice.irpf.pct):null);
   const payments=(Array.isArray(entry.cobros)?entry.cobros:[]).filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).map(p=>({amount:number(p.amount),date:text(p.date),note:text(p.note)}));
   const files=[...(entry.file?[entry.file]:[]),...(Array.isArray(entry.files)?entry.files:[])].map(file=>{
    const raw=typeof file==='string'?file:text(file?.name),name=/^(?:https?:|data:|blob:)/i.test(raw)?'Adjunto registrado':raw.split(/[\\/]/).pop();
    return {name:name||'Adjunto sin nombre',state:typeof file==='object'&&file?(file.subiendo?'Pendiente de subida':file.url||file.data||file.body||file.docRef?'Adjunto registrado':'Solo nombre'):'Solo nombre'};
   });
   const kind=entry.kind==='out'?'out':'in';
   return {kind,concept:text(entry.concept),date:text(entry.date),due:text(entry.due)||text(invoice?.due),reference:text(entry.link)||text(entry.ref),party:text(kind==='out'?entry.sup||entry.client:entry.client||entry.sup)||text(invoice?.client),project:project?[text(project.num),text(project.name)].filter(Boolean).join(' · '):pid!=null?'Proyecto no disponible':'Sin proyecto vinculado',brand:text(brands[entry.brand]?.name)||'Sin espacio identificado',category:text(entry.cat),amount,base,tax,taxRate:number(entry.vat)??(invoice?.iva?.on===true?number(invoice.iva.pct):null),retentionRate,retention:retentionRate===0?0:retentionRate!==null&&base!==null?round(base*retentionRate/100):null,status:entry.status==='cobr'?(kind==='out'?'Pagado':'Cobrado'):entry.status==='env'?'Factura enviada':entry.status==='pend'?'Pendiente':text(entry.status)||'Sin estado',payments,files,invoice:invoice?text(invoice.ref):''};
  });
  const sum=kind=>round(items.filter(item=>item.kind===kind&&item.amount!==null).reduce((total,item)=>total+item.amount,0));
  const income=sum('in'),expense=sum('out');
  return {items,income,expense,balance:round(income-expense),missingAmounts:items.filter(item=>item.amount===null).length};
 }
 function render(data,{title='Informe de contabilidad',period='',scope='',issuedOn='',issuer={},logoHTML='',footerHTML='',formatMoney=String}={}){
  const E=escape,money=value=>value===null?'No consta':E(formatMoney(value)),signed=item=>item.amount===null?'No consta':(item.kind==='out'?-item.amount:item.amount)<0?'−'+money(Math.abs(item.amount)):'+'+money(Math.abs(item.amount));
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value;
  const field=(label,value)=>`<div><dt>${E(label)}</dt><dd>${E(value)||'No consta'}</dd></div>`;
  const metric=(label,value)=>`<div><span>${E(label)}</span><strong>${money(value)}</strong></div>`;
  return `<div class="accounting-report"><header class="ar-heading"><div>${logoHTML}<h1>${E(title)}</h1><p>${E(period)}</p><p>${E(scope)} · ${data.items.length} movimiento${data.items.length===1?'':'s'}</p></div><div class="ar-issuer"><strong>${E(issuer.name)}</strong>${issuer.nif?`<span>NIF ${E(issuer.nif)}</span>`:''}${issuer.addr?`<span>${E(issuer.addr)}</span>`:''}<span>Emitido el ${E(issuedOn)}</span></div></header>
   <div class="ar-summary">${metric('Total ingresos: ',data.income)}${metric('Total gastos: ',data.expense)}${metric('Balance: ',data.balance)}</div>
   <p class="ar-note">Totales de los importes registrados. «No consta» indica información sin desglose.${data.missingAmounts?` ${data.missingAmounts} movimiento${data.missingAmounts===1?' sin importe no incluido':'s sin importe no incluidos'} en los totales.`:''}</p>
   <table class="ar-ledger"><colgroup><col style="width:13%"><col style="width:15%"><col style="width:50%"><col style="width:22%"></colgroup><thead><tr><th>Fecha</th><th>Tipo</th><th>Movimiento</th><th class="ar-right">Importe registrado</th></tr></thead>
   ${data.items.map((item,index)=>`<tbody class="ar-movement"><tr class="ar-main"><td>${E(date(item.date))||'No consta'}</td><td>${item.kind==='out'?'Gasto':'Ingreso'}</td><td><strong>${E(item.concept)||'Sin concepto'}</strong><span>${E(item.party)||'Sin cliente / proveedor registrado'}</span></td><td class="ar-right"><strong>${signed(item)}</strong><span>${E(item.status)}</span></td></tr>
    <tr class="ar-detail"><td colspan="4"><dl class="ar-details">${field('Referencia / vínculo',item.reference)}${field(item.kind==='out'?'Proveedor':'Cliente / origen',item.party)}${field('Proyecto',item.project)}${field('Espacio',item.brand)}${item.category?field('Categoría',item.category):''}${item.due?field('Vencimiento',date(item.due)):''}</dl>
     <div class="ar-tax">${metric('Base imponible',item.base)}${metric('Impuesto'+(item.taxRate!==null?' · '+item.taxRate+'%':''),item.tax)}${metric('Retención'+(item.retentionRate!==null?' · '+item.retentionRate+'%':''),item.retention)}</div>
     ${item.payments.length?`<div class="ar-payments"><b>Cobros registrados</b><ul>${item.payments.map(payment=>`<li><span>${E(date(payment.date))||'Sin fecha'}</span><strong>${money(payment.amount)}</strong>${payment.note?`<span>${E(payment.note)}</span>`:''}</li>`).join('')}</ul></div>`:item.kind==='in'?`<p class="ar-note">${item.status==='Cobrado'?'Marcado como cobrado; sin desglose de cobros.':'Sin desglose de cobros registrado.'}</p>`:''}
     <div class="ar-documents"><b>Documentación</b><span>${item.invoice?'Factura '+E(item.invoice)+' guardada en la aplicación.'+(item.files.length?' · ':''):''}${item.files.map(file=>`${E(file.name)} · ${E(file.state)}`).join(' · ')}${!item.invoice&&!item.files.length?'Sin documento registrado.':''}</span></div>
     <div class="ar-item-end">Movimiento ${index+1} de ${data.items.length}</div>
    </td></tr></tbody>`).join('')}</table>
   <footer class="ar-footer"><p>Este informe resume los registros de Contabilidad; no sustituye a las facturas y justificantes originales.</p>${footerHTML}</footer></div>`;
 }
 return {model,render};
})();
if(typeof module!=='undefined')module.exports=ModernoAccountingReport;
