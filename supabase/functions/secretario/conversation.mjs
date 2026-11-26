const sourceKinds=['invoice','invoice_entry','quote','document','project','task','entry','catalog','client'];
const fields=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
const bounded=value=>typeof value==='string'&&value.length>0&&value.length<=320;
export const sourcePointer=value=>fields(value,['kind','id','brand','projectId'])&&sourceKinds.includes(value.kind)&&
  bounded(value.id)&&(value.brand==null||bounded(value.brand))&&(value.projectId==null||bounded(value.projectId));
export function validFocus(value){
  return fields(value,['document','results'])&&
    (value.document==null||sourcePointer(value.document)||fields(value.document,['kind','id','projectId'])&&
      value.document.kind==='draft'&&(value.document.id==null||bounded(value.document.id))&&(value.document.projectId==null||bounded(value.document.projectId)))&&
    (value.results==null||Array.isArray(value.results)&&value.results.length<=80&&value.results.every(sourcePointer));
}
export const matchesSource=(source,pointer)=>source.kind===pointer.kind&&String(source.id)===pointer.id&&
  String(source.brand||'')===String(pointer.brand||'')&&String(source.projectId??'')===String(pointer.projectId??'');

const words=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[¿?¡!.,]+/g,' ').trim().replace(/\s+/g,' ');
const ordinals=['primer','segund','tercer','cuart','quint','sext','septim','octav','noven','decim'];
export function resultPosition(message){
  const match=/^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:me)?|abrir) (?:el |la )?(?:(?:resultado|factura|presupuesto|documento|archivo) )?([a-z]+|\d{1,2})(?: (?:factura|presupuesto|documento|archivo|resultado|de la lista|de los resultados))?$/.exec(words(message));
  if(!match)return null;
  if(/^\d+$/.test(match[1]))return Number(match[1])-1;
  const index=ordinals.findIndex(word=>[word,word+'a',word+'o',word+'er'].includes(match[1]));
  return index===-1?null:index;
}

export function explicitOpen(message){
  return /^(?:(?:por favor|puedes|podrias|quiero) )*(?:abre(?:me)?|abrir|ve a|ir a|llevame a)\b/.test(words(message));
}

export function draftRevision(message){
  return /^(?:(?:por favor|puedes|podrias|quiero|ahora|mejor) )*(?:cambia(?:me|r)?|ajusta(?:me|r)?|corrige|modifica|pon(?:me|er)?|sube|baja)\b/.test(words(message));
}
