const acceptedTypes=new Set(['application/pdf','image/png','image/jpeg','image/webp']);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const only=(value,fields)=>plain(value)&&Object.keys(value).every(key=>fields.includes(key));
const short=(value,limit)=>typeof value==='string'&&value.trim().length>0&&value.length<=limit;

export function normalizeAttachments(list){
  if(list===undefined)return [];
  if(!Array.isArray(list)||list.length>3||new TextEncoder().encode(JSON.stringify(list)).byteLength>24000)return null;
  const ids=new Set();
  for(const file of list){
    if(!only(file,['id','name','mime','totalPages','pages','status','source'])||!short(file.id,120)||ids.has(file.id)||
      !short(file.name,220)||!acceptedTypes.has(file.mime)||!Number.isSafeInteger(file.totalPages)||file.totalPages<1||file.totalPages>10000||
      !['complete','partial'].includes(file.status)||!Array.isArray(file.pages)||file.pages.length>12||
      file.status==='complete'&&file.pages.length!==file.totalPages)return null;
    ids.add(file.id);
    const pages=new Set();
    for(const page of file.pages){
      if(!only(page,['page','text'])||!Number.isSafeInteger(page.page)||page.page<1||page.page>file.totalPages||pages.has(page.page)||!short(page.text,6500))return null;
      pages.add(page.page);
    }
    const s=file.source;
    if(s!==undefined&&(!only(s,['kind','id','projectId','brand','version'])||!['document','invoice','invoice_entry','quote','entry'].includes(s.kind)||
      !short(s.id,320)||s.projectId!=null&&!short(s.projectId,160)||s.brand!=null&&typeof s.brand!=='string'||
      !short(s.version,100)))return null;
  }
  return list;
}

const normalized=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const common=new Set(['aqui','archivo','adjunto','adjunta','factura','busca','dime','documento','encuentra','esta','este','dice','pone','cual','cuanto','pagina','texto','tengo','tiene','puedes','pdf','imagen','que','lee','resume','resumen','muestra']);
const concepts=[[/\b(?:importe|cuanto|suma)\b/,'total'],[/\b(?:numero|referencia)\b/,'factura'],[/\b(?:proveedor|emisor)\b/,'emisor']];

export function requestedAttachmentReading(request){
  if(!request.attachments.length)return false;
  const words=normalized(request.message);
  if(/^\W*(?:abre|abrir|descarga|descargar|edita)\b/.test(words))return false;
  if(/\b(?:prepara|crea|haz|genera|edita)\w*\b.*\b(?:factura|presupuesto|borrador)\b/.test(words))return false;
  if(/\b(?:aqui|adjunt\w*|archivos?|pdf|imagen|paginas?|lee|extrae|resume|que pone|que dice|compar\w*)\b/.test(words))return true;
  return words.length<160&&/\b(?:importe total|fecha de emision|fecha de vencimiento|numero de factura|nif|referencia|emisor)\b/.test(words)&&
    !/\b(?:estudio|mis facturas|presupuestos|facturacion|facturado|por cobrar|por pagar)\b/.test(words);
}

export function attachmentExtract(request){
  const words=normalized(request.message);
  const requestedPage=Number(/\bpagina\s+(\d{1,4})\b/.exec(words)?.[1])||null;
  const terms=new Set(words.match(/[a-z0-9]{3,}/g)?.filter(word=>!common.has(word))||[]);
  for(const [pattern,term] of concepts)if(pattern.test(words))terms.add(term);
  const sources=[];
  for(const file of request.attachments){
    const rows=file.pages.filter(page=>requestedPage===null||page.page===requestedPage);
    const ranked=[];
    for(const page of rows){
      const lines=page.text.split(/[\r\n]+/).map(line=>line.trim()).filter(Boolean);
      for(const line of lines){
        const plainLine=normalized(line);
        const score=[...terms].reduce((n,word)=>n+(plainLine.includes(word)?1:0),0);
        ranked.push({file:file.name,page:page.page,excerpt:line.slice(0,420),score});
      }
    }
    ranked.sort((a,b)=>b.score-a.score);
    const chosen=ranked.filter(row=>!terms.size||row.score>0).slice(0,2);
    sources.push(...chosen.map(({score,...row})=>row));
  }
  const partial=request.attachments.some(file=>file.status==='partial');
  const limit=partial?' La lectura fue parcial. Puede faltar texto o alguna página.':'';
  const pageLabel=requestedPage===null?'':' en la página '+requestedPage;
  const message=sources.length?'Esto es lo que aparece'+pageLabel+' en el texto extraído.'+limit:
    'No he localizado ese dato'+pageLabel+' en el texto disponible.'+limit;
  return {message,attachmentSources:sources,attachmentCoverage:request.attachments.map(file=>({name:file.name,status:file.status,read:file.pages.length,total:file.totalPages}))};
}
