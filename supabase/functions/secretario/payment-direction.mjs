import {normalizeReceivableText} from './receivables.mjs';

const words=value=>normalizeReceivableText(value).replace(/[^a-z0-9/-]+/g,' ').trim().replace(/\s+/g,' ');
const invoice=/\bfacturas?\b/;
const otherSubject=/\b(?:presupuestos?|tareas?|pedidos?|borradores?|balance|resumen|facturacion)\b/;
const action=/^(?:(?:por favor|puedes|podrias|quiero) )*(?:prepara\w*|crea\w*|edita\w*|emite\w*|registra\w*|paga|pagar|abona|abonar|como (?:puedo|podemos|debo|se|hago|pagar|abonar|configurar))\b/;
const payer=/\b(?:(?:debo|debemos|tengo que|tenemos que|he de) (?:pagar|abonar)|(?:pagar|abonar) (?:yo|nosotros)|(?:me|nos) (?:quedan?|faltan?|toca) (?:por )?(?:pagar|abonar)|(?:las?|lo) que (?:debo|debemos) (?:yo|nosotros)|(?:que|cuanto) (?:(?:le|les) )?(?:debo|debemos) a|adeudo|adeudamos)\b/;
const incomingPayment=/\b(?:(?:me|nos) (?:pagan|paguen|pagen|deben|(?:tienen?|van) (?:que |a )?pagar)|no (?:me|nos) (?:ha|han|hayan|habian) pagado|(?:clientes? (?:tienen?|deben?|van a)|les faltan?|les quedan?) (?:que |por )?pagar)\b/g;
const incomingBalance=/\b(?:pendientes? (?:de |del )?cobro|por cobrar|sin cobrar|no cobradas?|cobros? pendientes?|por pagarme|por abonarme|por recibir el pago|(?:debo|debemos|tengo que|tenemos que) cobrar)\b/;
const outgoingBalance=/\b(?:por (?:pagar|abonar)|pendientes? (?:de |del )?(?:pago|abono|pagar|abonar)|(?:sin pagar|sin abonar) (?:a|al) (?:los )?proveedores?|impagadas? de (?:los )?proveedores?)\b/;
const unspecifiedPayer=/\b(?:sin pagar|sin abonar)\b/;
const supplierInvoice=/\bfacturas? recibidas?\b|\bfacturas?\b[^.!?]*\b(?:de|del|a|al) (?:los )?proveedores?\b/;
const supplierStatus=/\b(?:pendientes?|vencidas?|impagadas?|pagadas?|anuladas?|sin pagar|sin abonar|(?:no|aun no|todavia no) (?:he|hemos) (?:pagado|abonado))\b/;
const correction=/^\s*no\b[\s,]+(?:quiero )?(?:las?|lo) que[^,;]+?(?:[,;]\s*|\s+sino\s+)(?:quiero )?((?:las?|lo) que\b.+)$/;
const executePayment=/^(?:(?:por favor|puedes|podrias|quiero que) )*(?:(?:paga|abona)(?:las?|los?|me)?|pagar|abonar)(?:\b|$)/;
const partialPayment=/\b(?:(?:(?:ya )?(?:pague|pagamos|(?:he|hemos) pagado|abone|abonamos)) (?:una parte|parte|algo)|pagos? parciales?)\b/;
const dueQuestion=/\b(?:(?:esta|figura|aparece|consta) como pagada|(?:esta|figura|aparece|consta) pagada|(?:la|esta) (?:he|hemos) pagado)\b/;

export const directionQuestion='¿Quieres ver las facturas que tienes que pagar a proveedores o las que te deben tus clientes?';
export const directionField='invoice_direction';
export const payableScopePrompts=Object.freeze({
  project:'¿De qué proyecto quieres ver las facturas por pagar?',
  ambiguous:'¿Qué proveedor o proyecto quieres consultar? Indica el nombre y si es un proveedor o un proyecto.',
  period:'¿Entre qué fechas quieres consultar las facturas por pagar?',
  unknown:'No encuentro ese filtro. ¿De qué proveedor, proyecto o periodo quieres ver las facturas por pagar?',
  supplier:'Ese nombre corresponde a más de un proveedor. ¿De qué espacio o referencia es la factura?',
  currency:'¿En qué moneda quieres ver las facturas por pagar?',
  status:'¿Quieres ver todas las pendientes, solo las vencidas o las que aún no han vencido?',
  reference:'¿Qué referencia de factura de proveedor quieres consultar?',
  duplicateReference:'Hay más de una factura recibida con esa referencia. ¿De qué proveedor o proyecto es?',
  soon:'¿Miramos las facturas que vencen en los próximos 7 días?',
  amount:'No puedo aplicar ese filtro de importe a las facturas por pagar. ¿Quieres indicar un proveedor, proyecto o periodo?'
});

const correctedQuery=value=>correction.exec(normalizeReceivableText(value))?.[1];

export function paymentDirection(value){
  const text=words(correctedQuery(value)??value);
  if(!text||action.test(text)||otherSubject.test(text)&&!invoice.test(text))return null;
  const withoutIncoming=text.replace(incomingPayment,' ');
  const incoming=withoutIncoming!==text||incomingBalance.test(text);
  const outgoing=payer.test(withoutIncoming)||outgoingBalance.test(withoutIncoming)||supplierInvoice.test(withoutIncoming)&&supplierStatus.test(withoutIncoming);
  if(incoming&&outgoing)return 'ambiguous';
  if(incoming)return 'receivable';
  if(outgoing)return 'payable';
  if(invoice.test(text)&&unspecifiedPayer.test(text))return 'ambiguous';
  return null;
}

function invoiceFollowup(text){
  const phrase=text.replace(/^(?:(?:y|ahora|mejor|entonces|dime|muestrame|ensename|solo|tambien|ahora quiero) )+/,'');
  return !otherSubject.test(phrase)&&(/^(?:las? |esas? |estas? )?(?:facturas?|pendientes)$/.test(phrase)||
    /^(?:(?:las?|esas?|estas?) )?(?:de |del |en |desde |hasta |entre |sin vencer\b|sin (?:fecha de )?vencimiento\b|vencidas?\b|que (?:vencen|no han vencido)\b)/.test(phrase)||
    /^(?:(?:lo mismo )?para |todo el estudio|sin filtros|de todos los anos|(?:este|el) (?:ano|mes)\b|(?:proveedor|proyecto) |cualquier (?:moneda|proveedor|proyecto)|todas las monedas|(?:los )?proximos? \d+ dias)/.test(phrase)||/^(?:19|20|21)\d{2}$/.test(phrase));
}

const scopeReplyRequested=turn=>turn?.role==='assistant'&&Object.values(payableScopePrompts).includes(turn.content);

function previousPayment(history){
  const fragments=[];
  let direction=null,fallback=null;
  for(let index=history.length-1;index>=0;index--){
    const turn=history[index];
    if(turn.role!=='user')continue;
    const phrase=words(turn.content),current=paymentDirection(turn.content);
    if(/^abr(?:e|ir)/.test(phrase)&&history[index+1]?.role==='assistant'&&history[index+1].content.startsWith('He localizado '))continue;
    if(current==='receivable')break;
    if(current){
      direction??=current;
      fallback={direction,priorQuery:correctedQuery(turn.content)??turn.content,priorFilters:fragments.slice().reverse()};
      if(invoice.test(phrase))return fallback;
    }else if(!scopeReplyRequested(history[index-1])&&!invoiceFollowup(phrase))break;
    fragments.push(turn.content);
  }
  return fallback;
}

function confirmedReceipt(query,priorQuery){
  const remainder=words(priorQuery).replace(/\b(?:(?:por|sin) (?:pagar|abonar)|pendientes? (?:de |del )?(?:pago|abono|pagar|abonar))\b/g,' ');
  const extra=words(query).replace(/^(?:receivable|(?:a )?cobrar|las que tengo que cobrar|las que debo cobrar|cobros? de clientes?)\b/,'');
  return ['Facturas pendientes de cobro',extra,remainder].filter(Boolean).join(' ');
}

export function invoicePaymentTurn({message,automatic,answers={},history=[],context}){
  const input=automatic?(answers[directionField]??answers.payable_scope??answers.detail??answers.receivable_confirm??message):message;
  const corrected=correctedQuery(input),query=corrected??input;
  const direction=paymentDirection(query);
  const last=history.at(-1);
  if(last?.role==='assistant'&&last.content===directionQuestion){
    const choice=words(query),prior=previousPayment(history);
    if(direction==='payable'||/^(?:payable|(?:a )?pagar|las que debo pagar|pagos? a proveedores?)$/.test(choice))
      return {...prior,direction:'payable',query:direction==='payable'?query:'Facturas pendientes de pago'};
    if(direction==='receivable'||/^(?:receivable|(?:a )?cobrar|cobros? de clientes?)$/.test(choice))
      return {direction:'receivable',query:confirmedReceipt(query,prior?.priorQuery)};
  }
  const phrase=words(query),prior=previousPayment(history);
  const scopeReply=scopeReplyRequested(last);
  const expenseFocused=context?.focus?.document?.kind==='entry'||context?.focus?.results?.some(item=>item.kind==='entry');
  if(executePayment.test(phrase))return {direction:'payable',operation:'execute',query};
  if(partialPayment.test(phrase)&&(expenseFocused||prior?.direction==='payable'||/\b(?:pague|pagamos|he pagado|hemos pagado|abone|abonamos)\b/.test(phrase)))return {direction:'payable',operation:'partial',query};
  if(dueQuestion.test(phrase)&&(expenseFocused||prior?.direction==='payable'||/\bproveedor\b/.test(phrase)))return {direction:'payable',operation:'status',query};
  if(direction==='ambiguous')return {direction,query};
  if(corrected&&direction==='receivable')return {direction,query:'Facturas pendientes de cobro '+query};
  if(scopeReply&&prior?.direction==='payable'&&!direction&&!action.test(phrase)&&!otherSubject.test(phrase))
    return {...prior,query};
  if(direction==='payable')return {...(invoice.test(phrase)?null:prior),direction,query};
  if(direction||!prior||!invoiceFollowup(phrase))return null;
  return {...prior,query};
}
