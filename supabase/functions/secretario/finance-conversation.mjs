import {normalizeReceivableText} from './receivables.mjs';

export const financeWords=value=>normalizeReceivableText(value).replace(/[^a-z0-9%/.-]+/g,' ').replace(/\s+/g,' ').trim();
const plain=value=>financeWords(value).replace(/[.,!?]+$/,'');
const prefix=/^(?:(?:por favor|puedes|podrias|quiero que|quiero|necesito que|ahora|mejor) )+/;

function parseReceivableCompound(value){
 const words=plain(value),continuation=/^(?:y|ahora|mejor)\b/.test(words);
 const command=words.replace(prefix,'').replace(/^y /,'');
 const match=/^(?:dime|muestrame|ensename) (?:lo que (?:tengo|tenemos) |lo |las facturas )?pendientes?(?: de cobro| por cobrar)? y abre(?:me)? (?:la factura |la )de (?:el cliente )?(.+)$/.exec(command);
 if(!match)return null;
 const client=match[1].trim();
 // The second clause is deliberately a client label, never another command.
 if(client.length<2||client.length>160||!/[a-z0-9]/.test(client)||
  /\b(?:y|luego|despues) (?:abr\w*|edit\w*|modific\w*|borr\w*|elimin\w*|guard\w*|env\w*|cre\w*|prepar\w*|pag\w*|cobr\w*)\b/.test(client))return null;
 return {client,continuation,query:'facturas pendientes de cobro'};
}

// CON-10 is the only compound financial operation admitted here. Automatic
// replies may resume an open client/scope clarification from that same turn.
export function receivableCompoundOpen(request){
 if(!request?.automatic)return parseReceivableCompound(request?.message);
 if(!request.receivableContext?.clarification||!Object.keys(request.answers??{}).some(key=>key.startsWith('receivable_')))return null;
 const prior=[...(request.history??[])].reverse().find(turn=>turn?.role==='user'&&turn.automatic!==true);
 const parsed=prior&&parseReceivableCompound(prior.content);
 return parsed?{...parsed,clarification:true}:null;
}

export function conversationPolicy(request){
 const words=plain(request.message),command=words.replace(prefix,'');
 if(/^(?:hola|buenas|buenos dias|buenas (?:tardes|noches)|que tal)(?: secretario)?$/.test(words))
  return {message:'Hola, ¿qué hacemos hoy?'};
 if(/^(?:que puedes hacer(?: aqui)?|para que sirves|ayuda|como puedes ayudarme)$/.test(words))return {capabilities:true};
 if(/^(?:dejalo|deja eso|cancelalo|cancela(?: la consulta| el borrador| la preparacion)?|no sigas|olvidalo)$/.test(command))
  return {message:'Vale, dejo esta consulta.',cancelledOperation:true};
 if(/\b(?:otro estudio|otra empresa)\b/.test(words)&&/\b(?:facturas?|presupuestos?|cobros?|pagos?|gastos?|documentos?)\b/.test(words))return {forbidden:true};
 if(/\b(?:saldo (?:bancario|en (?:el|mi) banco)|cuanto (?:dinero )?(?:tengo|tendre|hay|habra) en (?:el|mi) banco|cuanto (?:dinero )?me queda en (?:el|mi) banco)\b/.test(words))
  return {message:'Desde aquí no puedo ver el saldo del banco. Puedo consultar los cobros y gastos registrados.'};
 if(/\b(?:beneficio (?:real|final)|(?:cuanto|cuanto dinero) (?:estoy ganando|gano|me queda limpio|deja esta reforma))\b/.test(words))
  return {message:'Puedo mostrarte lo facturado y los costes registrados. Para saber el beneficio final hacen falta todos los costes del proyecto.'};
 if(/\b(?:me debian|debiamos|saldo pendiente a fecha de|pendiente al cierre de|quedaba (?:por )?(?:pagar|cobrar))\b/.test(words))
  return {message:'Puedo consultar el saldo pendiente actual. No puedo reconstruir cuánto quedaba en aquella fecha.'};
 if(/^(?:pag(?:a|ala|alo|alas|alos|ad)|ab(?:ona|onala|onalo|onalas|onalos)|haz (?:el pago|la transferencia)|realiza (?:el pago|la transferencia))\b/.test(command))
  return {message:'No puedo pagar facturas desde el chat. Puedes abrir la factura para revisar sus datos.'};
 if(/^(?:guard(?:a|ala|alo|alas|alos|ar)|env(?:ia|iala|ialo|iasela|iaselo|ialas|ialos|iar)|emit(?:e|ela|elo|elas|elos|ir))\b/.test(command))
  return {message:'Desde el chat puedo preparar el borrador. Para guardarlo o emitirlo, revísalo en el editor. El envío se hace desde el recorrido disponible en la app.'};
 if(/^(?:borr(?:a|ala|alo|alas|alos|ar)|elimin(?:a|ala|alo|alas|alos|ar)|marc(?:a|ala|alo|alas|alos|ar)|registra (?:un|el) (?:cobro|pago)|cobra(?:la|lo|las|los))\b/.test(command))
  return {message:'Ese cambio se hace desde el registro. No lo he modificado.'};
 if(/\b(?:plano|planos)\b/.test(words)&&/\b(?:mide|medir|te subo|te adjunto|hazme|presupuest)\w*\b/.test(words))
  return {message:'Todavía no puedo medir planos desde el chat. Con las medidas y los trabajos puedo preparar el borrador.'};
 if(/\b(?:anticipo|facturacion parcial|\d+(?:[.,]\d+)?\s*% (?:de|del) (?:este |ese |el )?presupuesto)\b/.test(words)&&/\b(?:factur|anticip|convierte)\w*\b/.test(words))
  return {message:'Puedo preparar la factura completa. Para facturar solo una parte, ajusta el documento en el editor.'};
 if(/\b(?:borrador|partida|linea)\b/.test(words)&&/^(?:anade|agrega|quita|suprime)\b/.test(command))
  return {message:'Para añadir o quitar partidas, utiliza el editor del borrador.'};
 if(/\b(?:impuestos? incluidos?|iva incluido|precio final)\b/.test(words)&&/\b(?:cada|pon|precio|unidad|cuesta|eur)\b/.test(words))
  return {message:'Ese precio ya incluye impuestos. Ajusta el importe final en el editor para que cuadre por unidad.'};
 if(/\b(?:copia exacta que envie|version que (?:se envio|acepto el cliente)|es la misma que (?:le )?(?:mande|envie))\b/.test(words))
  return {message:'Puedo mostrarte la versión actual. No puedo confirmar que sea la copia que se envió o aceptó.',preserveQueryContext:true};
 if(/\b(?:ya (?:se la |se lo |le )?(?:mande|envie)|seguro que (?:se la |se lo |le )?(?:mande|envie)|se (?:mando|envio) realmente)\b/.test(words)&&!(/\b(?:que|cual) factura\b/.test(words)))
  return {sentStatus:true};
 if(/^(?:ya )?(?:esta|quedo|se ha) guardad[oa](?: el borrador| la factura| el presupuesto)?$/.test(words))return {saveStatus:true};
 if(/\b(?:cuanto (?:voy a|vamos a) cobrar|(?:calculame|calcula) lo que voy a ingresar|preve cuanto entra)\b/.test(words))
  return {message:'No puedo confirmar cuánto entrará. En Previsión puedes revisar los planes y vencimientos registrados.',screen:'prevision'};
 return null;
}

export function financialScreen(request){
 if(request.automatic)return null;
 const match=/^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:me)?|abrir|ve a|ir a|llevame a|vamos a) (?:la seccion de |el menu de |las? |los? )?(resumen|finanzas|ventas|facturas|gastos|contabilidad|presupuestos|prevision)$/.exec(plain(request.message));
 if(!match)return null;
 return {resumen:'finanzas',finanzas:'finanzas',ventas:'facturas',facturas:'facturas',gastos:'gastos',contabilidad:'gastos',presupuestos:'presupuestos',prevision:'prevision'}[match[1]];
}

export function requestedDocumentMode(request){
 if(request.automatic)return null;
 const words=plain(request.message).replace(prefix,'');
 if(/^(?:edita(?:me|la|lo)?|editar|modifica(?:me|la|lo)?|modificar)\b/.test(words))return 'edit';
 if(/^(?:abre(?:me)?|abrir|ensena(?:me)?|muestra(?:me)?|ver|dame|descarga(?:me)?|descargar|saca(?:me)?)\b.*\b(?:pdf|adjunto|archivo)\b/.test(words)||
  /^descarga(?:me|r)?\b.*\b(?:factura|presupuesto|esta|este)\b/.test(words))return 'pdf';
 if(/^(?:abre(?:me|la|lo)?|abrir)\b/.test(words))return 'read';
 return null;
}

export const relativeDocumentOpen=value=>/^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:la|lo)|abre(?:me)? (?:esa|ese|esta|este|la|el) (?:factura|presupuesto|documento)|edita(?:la|lo))$/.test(plain(value));

const metricWords={
 costs:/\b(?:gastos?|costes?|costos?|gastado|gastamos|gaste|nos ha costado)\b/,
 invoiced:/\b(?:facturacion|facturad[oa]|facture|facturamos|facturar en total)\b/,
 recordedCollections:/\b(?:he cobr[ae]do|hemos cobrado|llev(?:o|amos) cobrado|cobros? (?:registrados?|de este|del mes|de ayer)|cobrado|cobre)\b/,
 acceptedQuotes:/\b(?:presupuestos? aceptad[oa]s?|aceptad[oa]s? [a-z]+ presupuestos?)\b/,
 budgeted:/\b(?:presupuestad[oa]|presupuestacion|presupueste|presupuestamos)\b/
};
export const explicitMetric=value=>Object.entries(metricWords).filter(([,rx])=>rx.test(plain(value))).map(([metric])=>metric);
export const financeFollowup=value=>/^(?:y\b|ahora\b|mejor\b|solo\b|tambien\b|con\b|de\b|del\b|en\b|el total\b|cuanto (?:es|suma)\b|lo mismo\b|sin\b|todos?\b)/.test(plain(value));
export const financePeriodClear=value=>/\b(?:sin filtros|todos los anos|sin (?:filtro de )?(?:periodo|fecha)|sin limite de fechas)\b/.test(plain(value));

export function financeMetricTurn(request){
 const context=request.financeContext,words=plain(request.message),hits=explicitMetric(words);
 if(/^(?:abre|abrir|ensena(?:me)?|muestra(?:me)?|ver|edita|prepara|crea|busca)\b/.test(words)||
  /\b(?:proxim[oa]s?|estimad[oa]|previst[oa]|rentabilidad|beneficio|limpio|ganando)\b/.test(words))return null;
 if(/^(?:como vamos de dinero|como van las finanzas|dame (?:un |el )?resumen economico|que tal van las finanzas)$/.test(words))
  return {metric:null,continuation:false};
 const amount=/\b(?:cuanto|total|importe|suma(?:n)?|saldo|dime|que)\b/.test(words)||/^(?:gastos|costes|costos|facturacion|cobros)\b/.test(words);
 const follows=!!context&&financeFollowup(words);
 if(hits.length===1&&(amount||follows))return {metric:hits[0],continuation:follows};
 if(hits.length===0&&follows&&/\b(?:proyecto|cliente|lo mismo|ano|mes|fecha|de|del|sin filtros|total|importe)\b/.test(words))
  return {metric:context.metric,continuation:true};
 return null;
}
