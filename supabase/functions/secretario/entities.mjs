/* Shared entity resolution for an already-authorized Secretary snapshot.
 *
 * `identity` is the only value that may cross turns as a selection. Array
 * positions are exposed only as same-snapshot links for existing document
 * contracts; they are never part of an identity or source pointer.
 */

export const ENTITY_KINDS=Object.freeze(['client','supplier','project','invoice','quote','project_file']);

const ENTITY_KIND_SET=new Set(ENTITY_KINDS);
const CONTACT_KINDS=new Set(['client','supplier']);
const TYPO_KINDS=new Set(['client','supplier','project']);
const SUPPLIER_TYPES=new Set(['proveedor','contratista','tecnico']);
const VERSION_BLOCKS=new Set(['contactos','facturas','presupuestos']);
const MAX_ID=160,MAX_ALIAS=240,MAX_BRAND=80,MAX_VERSION=240,MAX_IDENTITY=400;

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const bounded=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
const scalar=(value,max)=>{
  if(typeof value==='string')return value.trim().slice(0,max);
  if(Number.isSafeInteger(value))return String(value);
  return '';
};
const id=value=>scalar(value,MAX_ID);
const brand=value=>scalar(value,MAX_BRAND)||null;
const projectId=value=>id(value)||null;

export function normalizeEntityText(value){
  return scalar(value,1200).replace(/^\s*@+\s*/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

export function contactRole(contact){
  const type=normalizeEntityText(contact?.type);
  if(type==='cliente')return 'client';
  if(SUPPLIER_TYPES.has(type))return 'supplier';
  if(type==='team'||type==='equipo')return 'team';
  return null;
}

function exactKeys(value,allowed){
  return object(value)&&Object.keys(value).length===allowed.length&&Object.keys(value).every(key=>allowed.includes(key));
}

function versionBlocks(value){
  if(!bounded(value,MAX_VERSION))return null;
  const blocks=[],seen=new Set();
  for(const part of value.split('|')){
    const separator=part.indexOf('@'),block=part.slice(0,separator),revision=part.slice(separator+1);
    if(separator<1||!VERSION_BLOCKS.has(block)||!revision||seen.has(block))return null;
    seen.add(block);blocks.push(block);
  }
  return blocks;
}

function canonicalIdentity(value){
  if(!object(value)||!ENTITY_KIND_SET.has(value.kind)||!bounded(value.id,MAX_ID))return null;
  const kind=value.kind,stable={kind,id:value.id};
  if(CONTACT_KINDS.has(kind)){
    const legacy=/^(?:legacy|party):[0-9a-f]{16}$/.test(value.id);
    const allowed=legacy?['kind','id','brand','version']:['kind','id','brand'];
    if(!exactKeys(value,allowed)||value.brand!==null&&!bounded(value.brand,MAX_BRAND)||legacy&&!versionBlocks(value.version))return null;
    stable.brand=value.brand;
    if(legacy)stable.version=value.version;
  }else if(kind==='project'){
    if(!exactKeys(value,['kind','id']))return null;
  }else if(kind==='invoice'||kind==='quote'){
    if(!exactKeys(value,['kind','id','brand','projectId'])||value.brand!==null&&!bounded(value.brand,MAX_BRAND)||
      value.projectId!==null&&!bounded(value.projectId,MAX_ID))return null;
    stable.brand=value.brand;stable.projectId=value.projectId;
  }else{
    if(!exactKeys(value,['kind','id','projectId'])||!bounded(value.projectId,MAX_ID))return null;
    stable.projectId=value.projectId;
  }
  return stable;
}

export function serializeEntityIdentity(value){
  const canonical=canonicalIdentity(value);
  if(!canonical)return null;
  const serialized=JSON.stringify(canonical);
  return serialized.length<=MAX_IDENTITY?serialized:null;
}

export function parseEntityIdentity(value){
  if(typeof value!=='string'||!value.length||value.length>MAX_IDENTITY)return null;
  try{return canonicalIdentity(JSON.parse(value));}catch{return null;}
}

function hash64(value){
  let hash=0xcbf29ce484222325n;
  for(let index=0;index<value.length;index++){
    hash^=BigInt(value.charCodeAt(index));
    hash=BigInt.asUintN(64,hash*0x100000001b3n);
  }
  return hash.toString(16).padStart(16,'0');
}

function versionFor(snapshot,blocks){
  const values=[];
  for(const block of [...new Set(blocks)].sort()){
    const version=scalar(snapshot?.versions?.[block],MAX_VERSION);
    if(!version)return null;
    values.push(`${block}@${version}`);
  }
  const joined=values.join('|');
  return joined&&joined.length<=MAX_VERSION?joined:null;
}

function uniqueAliases(values){
  return Object.freeze([...new Set(values.map(normalizeEntityText).filter(alias=>alias&&alias.length<=MAX_ALIAS))]);
}

function identity(kind,identityId,{entityBrand=null,entityProjectId=null,version=null}={}){
  const value={kind,id:identityId};
  if(CONTACT_KINDS.has(kind)){
    value.brand=entityBrand;
    if(version)value.version=version;
  }else if(kind==='invoice'||kind==='quote'){
    value.brand=entityBrand;value.projectId=entityProjectId;
  }else if(kind==='project_file')value.projectId=entityProjectId;
  return serializeEntityIdentity(value)?Object.freeze(value):null;
}

function pointer(kind,pointerId,{entityBrand=null,entityProjectId=null}={}){
  if(kind==='invoice'||kind==='quote')return Object.freeze({kind,id:pointerId,brand:entityBrand,projectId:entityProjectId});
  if(kind==='project')return Object.freeze({kind:'project',id:pointerId,projectId:pointerId,...(entityBrand?{brand:entityBrand}:{})});
  if(kind==='project_file'){
    const composite=`${entityProjectId}:${pointerId}`;
    return composite.length<=MAX_ID*2?Object.freeze({kind:'document',id:composite,projectId:entityProjectId}):null;
  }
  return null;
}

function makeEntity({kind,entityId,ref=null,label,aliases,entityBrand=null,entityProjectId=null,contactIndex=null,
  entryIndexes=[],entryIds=[],legacy=false,version=null,origin,record=null,recordIndex=null,entityPointer=null,contactType=null}){
  const entityIdentity=identity(kind,entityId,{entityBrand,entityProjectId,version});
  const entity={
    kind,id:entityId,ref,label:scalar(label,240)||entityId,aliases:uniqueAliases(aliases),brand:entityBrand,projectId:entityProjectId,
    contactIndex:Number.isSafeInteger(contactIndex)&&contactIndex>=0?contactIndex:null,
    entryIndexes:Object.freeze([...new Set(entryIndexes.filter(index=>Number.isSafeInteger(index)&&index>=0))]),
    entryIds:Object.freeze([...new Set(entryIds.map(id).filter(Boolean))]),version:version||null,
    identity:entityIdentity,pointer:entityPointer,legacy:!!legacy,selectable:!!entityIdentity,origin,contactType:scalar(contactType,80)||null
  };
  Object.defineProperties(entity,{
    record:{value:record,enumerable:false},
    recordIndex:{value:Number.isSafeInteger(recordIndex)&&recordIndex>=0?recordIndex:null,enumerable:false}
  });
  return entity;
}

function contactFingerprint(kind,contact){
  return hash64(JSON.stringify([kind,brand(contact?.brand),...['id','num','name','fiscal','trade','commercialName','tradeName']
    .map(field=>normalizeEntityText(contact?.[field]))]));
}

function partyFingerprint(kind,name,entityBrand){
  return hash64(JSON.stringify([kind,normalizeEntityText(name),entityBrand]));
}

function compatibleBrand(entityBrand,wanted,contact=false){
  if(!wanted)return true;
  if(contact)return entityBrand===null||entityBrand==='both'||entityBrand===wanted;
  return entityBrand===wanted;
}

function authorizedContactMatch(entities,kind,name,entityBrand,contactIndex,contactId){
  const normalized=normalizeEntityText(name);
  if(contactId){
    const linked=entities.filter(entity=>entity.kind===kind&&entity.id===contactId&&compatibleBrand(entity.brand,entityBrand,true)&&
      normalized&&entity.aliases.includes(normalized));
    if(linked.length===1)return {entity:linked[0],known:true};
    if(linked.length>1)return {entity:null,known:true};
  }
  if(Number.isSafeInteger(contactIndex)&&contactIndex>=0){
    const linked=entities.filter(entity=>entity.kind===kind&&entity.contactIndex===contactIndex&&compatibleBrand(entity.brand,entityBrand,true)&&
      normalized&&entity.aliases.includes(normalized));
    if(linked.length===1)return {entity:linked[0],known:true};
    if(linked.length>1)return {entity:null,known:true};
  }
  if(!normalized)return {entity:null,known:false};
  const exact=entities.filter(entity=>entity.kind===kind&&compatibleBrand(entity.brand,entityBrand,true)&&entity.aliases.includes(normalized));
  return {entity:exact.length===1?exact[0]:null,known:exact.length>0};
}

function deletedInvoice(snapshot,record){
  return !!(record?.ref&&snapshot?.invoiceData?.ddel?.[record.ref]);
}

/** Build a complete catalog from one authorized, immutable snapshot. */
export function buildEntityCatalog(snapshot){
  const entities=[];
  const contactEntities=[];
  const contactsVersion=versionFor(snapshot,['contactos']);

  for(const [contactIndex,contact] of (Array.isArray(snapshot?.clients)?snapshot.clients:[]).entries()){
    if(!object(contact))continue;
    const kind=contactRole(contact);
    if(!CONTACT_KINDS.has(kind))continue;
    const stableId=id(contact.id),legacy=!stableId,entityBrand=brand(contact.brand);
    const entityId=stableId||`legacy:${contactFingerprint(kind,contact)}`;
    const version=legacy?contactsVersion:null;
    const label=scalar(contact.name||contact.fiscal||contact.num,240)||'Contacto';
    const entity=makeEntity({kind,entityId,label,entityBrand,contactIndex,legacy,version,origin:'contact',record:contact,
      recordIndex:contactIndex,contactType:contact.type,
      aliases:[contact.name,contact.fiscal,contact.num,contact.trade,contact.commercialName,contact.tradeName]});
    entities.push(entity);contactEntities.push(entity);
  }

  const projects=[];
  for(const [recordIndex,project] of (Array.isArray(snapshot?.projects)?snapshot.projects:[]).entries()){
    if(!object(project))continue;
    const entityId=id(project.id);if(!entityId)continue;
    const entityBrand=brand(project.brand),label=scalar(project.name||project.num,240)||entityId;
    const entity=makeEntity({kind:'project',entityId,label,aliases:[project.name,project.num],entityBrand,
      entityProjectId:entityId,origin:'project',record:project,recordIndex,
      entityPointer:pointer('project',entityId,{entityBrand})});
    entities.push(entity);projects.push(entity);
  }

  const partyGroups=new Map();
  const rememberParty=(kind,name,entityBrand,block,{entryIndex=null,entryId=null,record=null,recordIndex=null,contactIndex=null,contactId=null}={})=>{
    const normalized=normalizeEntityText(name);if(!normalized)return null;
    const match=authorizedContactMatch(contactEntities,kind,name,entityBrand,contactIndex,contactId);
    if(match.entity){
      if(Number.isSafeInteger(entryIndex)&&entryIndex>=0)match.entity._entryIndexes.add(entryIndex);
      if(entryId)match.entity._entryIds.add(entryId);
      return match.entity;
    }
    if(match.known)return null;
    const groupKey=JSON.stringify([kind,normalized,entityBrand]);
    if(!partyGroups.has(groupKey))partyGroups.set(groupKey,{kind,name:scalar(name,240),brand:entityBrand,blocks:new Set(),entryIndexes:new Set(),entryIds:new Set(),records:[]});
    const group=partyGroups.get(groupKey);group.blocks.add(block);
    if(Number.isSafeInteger(entryIndex)&&entryIndex>=0)group.entryIndexes.add(entryIndex);
    if(entryId)group.entryIds.add(entryId);
    if(record)group.records.push({record,recordIndex});
    return null;
  };

  // Mutable same-snapshot entry links are finalized before catalog publication.
  for(const contact of contactEntities){
    Object.defineProperty(contact,'_entryIndexes',{value:new Set(contact.entryIndexes),enumerable:false});
    Object.defineProperty(contact,'_entryIds',{value:new Set(contact.entryIds),enumerable:false});
  }

  const addDocument=(kind,record,recordIndex,block)=>{
    if(!object(record)||kind==='invoice'&&deletedInvoice(snapshot,record))return;
    const documentId=id(record.ref);if(!documentId)return;
    const entityBrand=brand(record.brand),entityProjectId=projectId(record.projectId??record.pid);
    const rawIndex=record.clientIdx;
    const contactIndex=rawIndex!==null&&rawIndex!==undefined&&rawIndex!==''&&Number.isSafeInteger(Number(rawIndex))&&Number(rawIndex)>=0?Number(rawIndex):null;
    const contactId=id(record.clientId);
    const partyName=scalar(record.client,240);
    const linked=partyName?rememberParty('client',partyName,entityBrand,block,{record,recordIndex,contactIndex,contactId}):null;
    entities.push(makeEntity({kind,entityId:documentId,ref:documentId,label:documentId,aliases:[documentId],entityBrand,
      entityProjectId,contactIndex:linked?.contactIndex??null,origin:block==='facturas'?'invoice':'quote',record,recordIndex,
      entityPointer:pointer(kind,documentId,{entityBrand,entityProjectId})}));
  };
  (Array.isArray(snapshot?.invoices)?snapshot.invoices:[]).forEach((record,index)=>addDocument('invoice',record,index,'facturas'));
  (Array.isArray(snapshot?.quotes)?snapshot.quotes:[]).forEach((record,index)=>addDocument('quote',record,index,'presupuestos'));

  for(const [entryIndex,entry] of (Array.isArray(snapshot?.entries)?snapshot.entries:[]).entries()){
    if(!object(entry)||entry.kind!=='out'||snapshot?.invoiceData?.del?.[entry.id])continue;
    const supplier=scalar(entry.sup||entry.client,240);if(!supplier)continue;
    const rawIndex=entry.supplierIdx??entry.supIdx??entry.clientIdx;
    const contactIndex=rawIndex!==null&&rawIndex!==undefined&&rawIndex!==''&&Number.isSafeInteger(Number(rawIndex))&&Number(rawIndex)>=0?Number(rawIndex):null;
    const contactId=id(entry.supplierId??entry.contactId??entry.clientId);
    const entryId=id(entry.id);
    const linked=rememberParty('supplier',supplier,brand(entry.brand),'facturas',{entryIndex,entryId,record:entry,recordIndex:entryIndex,contactIndex,contactId});
    if(linked){linked._entryIndexes.add(entryIndex);if(entryId)linked._entryIds.add(entryId);}
  }

  for(const group of partyGroups.values()){
    const version=versionFor(snapshot,[...group.blocks]),entityId=`party:${partyFingerprint(group.kind,group.name,group.brand)}`;
    const first=group.records[0]??{};
    entities.push(makeEntity({kind:group.kind,entityId,label:group.name,aliases:[group.name],entityBrand:group.brand,
      entryIndexes:[...group.entryIndexes],legacy:true,version,origin:'document_party',record:first.record??null,
      recordIndex:first.recordIndex??null,entryIds:[...group.entryIds]}));
  }

  for(const project of projects){
    const files=Array.isArray(project.record?.files)?project.record.files:[];
    for(const [recordIndex,file] of files.entries()){
      if(!object(file))continue;
      const fileId=id(file.id);if(!fileId)continue;
      entities.push(makeEntity({kind:'project_file',entityId:fileId,label:scalar(file.name||file.title,240)||fileId,
        aliases:[file.name,file.title,fileId],entityBrand:project.brand,entityProjectId:project.id,origin:'project_file',
        record:file,recordIndex,entityPointer:pointer('project_file',fileId,{entityProjectId:project.id})}));
    }
  }

  const finalized=entities.map(entity=>{
    if(entity._entryIndexes){
      const replacement=makeEntity({...entity,entityId:entity.id,entityBrand:entity.brand,entityProjectId:entity.projectId,
        aliases:entity.aliases,entryIndexes:[...entity._entryIndexes],entryIds:[...entity._entryIds],entityPointer:entity.pointer,version:entity.identity?.version,
        record:entity.record,recordIndex:entity.recordIndex});
      return Object.freeze(replacement);
    }
    return Object.freeze(entity);
  });
  const catalog={entities:Object.freeze(finalized),versions:Object.freeze({...snapshot?.versions})};
  return Object.freeze(catalog);
}

function queryDetails(value){
  const normalized=normalizeEntityText(value);
  const match=/^(?:(?:el|la) )?(cliente|proveedor|proyecto|factura|presupuesto|archivo)(?: de)? (.+)$/.exec(normalized);
  if(!match)return {full:normalized,query:normalized,hint:null};
  const hint={cliente:'client',proveedor:'supplier',proyecto:'project',factura:'invoice',presupuesto:'quote',archivo:'project_file'}[match[1]];
  return {full:normalized,query:match[2],hint};
}

function pointerKey(value){
  if(!object(value)||!bounded(value.kind,40)||!bounded(value.id,MAX_ID*2))return null;
  if(value.kind==='document'){
    if(!bounded(value.projectId,MAX_ID)||!exactKeys(value,['kind','id','projectId']))return null;
    return JSON.stringify({kind:'document',id:value.id,projectId:value.projectId});
  }
  if(value.kind==='project'){
    if(Object.keys(value).some(key=>!['kind','id','projectId','brand'].includes(key)))return null;
    return JSON.stringify({kind:'project',id:value.id,projectId:value.projectId??value.id,brand:value.brand??null});
  }
  return null;
}

function entityPointerKey(entity){
  if(!entity.pointer)return null;
  if(entity.pointer.kind==='document')return JSON.stringify(entity.pointer);
  if(entity.pointer.kind==='project')return JSON.stringify({kind:'project',id:entity.pointer.id,projectId:entity.pointer.projectId??entity.pointer.id,brand:entity.pointer.brand??null});
  return null;
}

function scopeKinds(types,hint){
  const values=types==null?ENTITY_KINDS:typeof types==='string'?[types]:types;
  if(!Array.isArray(values)||!values.length||values.some(kind=>!ENTITY_KIND_SET.has(kind)))return null;
  const kinds=new Set(values);
  if(hint&&!kinds.has(hint))return new Set();
  return hint?new Set([hint]):kinds;
}

function scopedEntities(catalog,{types,hint,brand:scopeBrand,projectId:scopeProjectId}){
  const kinds=scopeKinds(types,hint);if(!kinds)return null;
  const wantedBrand=brand(scopeBrand),wantedProject=projectId(scopeProjectId);
  return catalog.entities.filter(entity=>{
    if(!kinds.has(entity.kind)||!compatibleBrand(entity.brand,wantedBrand,CONTACT_KINDS.has(entity.kind)))return false;
    if(!wantedProject)return true;
    if(entity.kind==='project')return entity.id===wantedProject;
    if(['invoice','quote','project_file'].includes(entity.kind))return entity.projectId===wantedProject;
    return true;
  });
}

function tokenPartial(alias,query){
  if(query.length<3)return false;
  const haystack=alias.split(' '),needles=query.split(' ');
  if(needles.some(token=>token.length<2))return false;
  for(let start=0;start<=haystack.length-needles.length;start++){
    if(needles.every((token,index)=>haystack[start+index].startsWith(token)))return true;
  }
  return false;
}

function boundedDistance(left,right,limit){
  if(Math.abs(left.length-right.length)>limit)return limit+1;
  let previous=Array.from({length:right.length+1},(_,index)=>index);
  for(let i=1;i<=left.length;i++){
    const current=[i];let rowMin=i;
    for(let j=1;j<=right.length;j++){
      const value=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(left[i-1]===right[j-1]?0:1));
      current[j]=value;rowMin=Math.min(rowMin,value);
    }
    if(rowMin>limit)return limit+1;
    previous=current;
  }
  return previous[right.length];
}

function typoLimit(query){
  const compact=query.replaceAll(' ','');
  if(compact.length<5)return 0;
  return compact.length<8?1:2;
}

function typoDistance(entity,query,limit){
  if(!TYPO_KINDS.has(entity.kind)||!limit||/\d/.test(query))return limit+1;
  let best=limit+1;
  for(const alias of entity.aliases){
    if(/\d/.test(alias))continue;
    const values=query.includes(' ')?[alias]:[alias,...alias.split(' ').filter(token=>token.length>=4)];
    for(const value of values)best=Math.min(best,boundedDistance(query,value,limit));
  }
  return best;
}

function ordered(entities){
  const rank=new Map(ENTITY_KINDS.map((kind,index)=>[kind,index]));
  return [...entities].sort((left,right)=>rank.get(left.kind)-rank.get(right.kind)||
    left.label.localeCompare(right.label,'es',{sensitivity:'base'})||String(left.brand??'').localeCompare(String(right.brand??''))||
    left.id.localeCompare(right.id)||String(left.projectId??'').localeCompare(String(right.projectId??''))||
    (left.contactIndex??-1)-(right.contactIndex??-1));
}

function result(status,{method=null,query=null,entities=[],limit=8}={}){
  const all=ordered(entities),boundedLimit=Number.isSafeInteger(limit)?Math.min(20,Math.max(1,limit)):8;
  const base={status,method,query,total:all.length,candidates:all.slice(0,boundedLimit),truncated:all.length>boundedLimit};
  return status==='resolved'?{...base,entity:all[0]}:base;
}

/** Resolve either a structured selection or free text. A failed selection is
 * never reinterpreted as text, even when `query` is also present. */
export function resolveEntity(catalog,{selected=null,query=null,types=null,brand:scopeBrand=null,projectId:scopeProjectId=null,limit=8}={}){
  if(!object(catalog)||!Array.isArray(catalog.entities))return result('invalid',{limit});
  if(selected!==null){
    if(!object(selected))return result('invalid',{limit});
    const selectedIdentity=canonicalIdentity(selected);
    let pool=scopedEntities(catalog,{types,hint:selectedIdentity?.kind??null,brand:scopeBrand,projectId:scopeProjectId});
    if(!pool)return result('invalid',{limit});
    if(selectedIdentity){
      if(selectedIdentity.version){
        const blocks=versionBlocks(selectedIdentity.version);
        const current=blocks.length?versionFor({versions:catalog.versions},blocks):null;
        if(current&&current!==selectedIdentity.version)return result('stale',{method:'selected',limit});
      }
      const serialized=serializeEntityIdentity(selectedIdentity);
      const matches=pool.filter(entity=>entity.identity&&serializeEntityIdentity(entity.identity)===serialized);
      if(matches.length===1)return result('resolved',{method:'selected',entities:matches,limit});
      if(matches.length>1)return result('ambiguous',{method:'selected',entities:matches,limit});
      if(selectedIdentity.version){
        const stale=pool.filter(entity=>entity.identity&&entity.identity.kind===selectedIdentity.kind&&entity.identity.id===selectedIdentity.id&&
          entity.identity.brand===selectedIdentity.brand&&entity.identity.version!==selectedIdentity.version);
        if(stale.length)return result('stale',{method:'selected',entities:stale,limit});
      }
      return result('not_found',{method:'selected',limit});
    }
    const selectedPointer=pointerKey(selected);
    if(!selectedPointer)return result('invalid',{limit});
    const matches=pool.filter(entity=>entityPointerKey(entity)===selectedPointer);
    if(matches.length===1)return result('resolved',{method:'selected',entities:matches,limit});
    return result(matches.length?'ambiguous':'not_found',{method:'selected',entities:matches,limit});
  }

  if(typeof query!=='string')return result('invalid',{limit});
  const details=queryDetails(query);
  if(!details.query)return result('invalid',{query:details.query,limit});
  const pool=scopedEntities(catalog,{types,hint:details.hint,brand:scopeBrand,projectId:scopeProjectId});
  if(!pool)return result('invalid',{query:details.query,limit});
  const fullExact=details.full!==details.query?pool.filter(entity=>entity.aliases.includes(details.full)):[];
  if(fullExact.length)return result(fullExact.length===1?'resolved':'ambiguous',{method:'exact',query:details.full,entities:fullExact,limit});
  const exact=pool.filter(entity=>entity.aliases.includes(details.query));
  if(exact.length)return result(exact.length===1?'resolved':'ambiguous',{method:'exact',query:details.query,entities:exact,limit});
  const partial=pool.filter(entity=>entity.aliases.some(alias=>tokenPartial(alias,details.query)));
  if(partial.length)return result(partial.length===1?'resolved':'ambiguous',{method:'partial',query:details.query,entities:partial,limit});
  const distance=typoLimit(details.query);
  const typo=pool.filter(entity=>typoDistance(entity,details.query,distance)<=distance);
  if(typo.length)return result(typo.length===1?'resolved':'ambiguous',{method:'typo',query:details.query,entities:typo,limit});
  return result('not_found',{query:details.query,limit});
}
