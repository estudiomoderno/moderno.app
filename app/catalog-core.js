/* Pure catalog operations. No network, implicit initialization or document mutation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModernoCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const price=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 const active=c=>c&&c.tipo!=='Producto'&&!c.archived;
 function search(items,{q='',family='',type='',view='all',brand}={}){
  if(!['Servicio','Partida'].includes(type))type='';
  const tokens=norm(q).split(' ').filter(Boolean);
  return (items||[]).filter(c=>active(c)&&(!family||c.cat===family)&&(!type||(c.tipo||'Servicio')===type)&&
   (view!=='usual'||!c.extra)&&(view!=='extras'||c.extra)&&(!brand||c.brand===brand||c.brand==='both')&&
   tokens.every(t=>norm([c.code,c.name,c.cat,c.subcat,...(c.synonyms||[]),...(c.sourceCodes||[])].join(' ')).includes(t)));
 }
 function line(c,{unitPrice,variantCode}={}){
  if(!active(c))throw Error('Elige un servicio o partida activo');
  const v=variantCode?(c.variants||[]).find(x=>x.code===variantCode):null;
  if(variantCode&&!v)throw Error('La variante ya no existe');
  const p=unitPrice??(v?v.price:c.price);
  if(!price(p))throw Error('Esta partida requiere medición y un precio antes de añadirla');
  // Explicit strings also prevent legacy fallback from changing this document later.
  return {name:v?.name||c.name,desc:v?.desc||c.desc||'',cap:c.cat||((c.tipo||'Servicio')==='Servicio'?'Servicios':'Partidas de obra'),catId:c.id,
   catalogSource:{id:c.id,code:c.code||'',variantCode:variantCode||null,price:c.price??null,unit:c.unit||'ud'},qty:1,unit:c.unit||'ud',price:p,cost:c.cost??null};
 }
 function legacyCatalog(config){
  // Frozen pre-replacement items preserve the old resolver's order and exact matches.
  return [...(config.catalogArchive||[]),...(config.catalog||[])];
 }
 function displaySource(l,config){
  const items=legacyCatalog(config),id=l?.catId;
  if(id!==null&&id!==undefined){const exact=items.find(x=>x.id===id);if(exact)return exact;}
  const name=norm(l?.name||l?.c||l?.concept);
  return name?items.find(x=>norm(x.name)===name)||items.find(x=>norm(x.name).length>=12&&name.startsWith(norm(x.name))):undefined;
 }
 function priceIntent(l,c,newPrice,newUnit,{role,studyId}={}){
  if(role!=='admin'||!studyId)throw Error('Solo un administrador del estudio puede cambiar su catálogo');
  if(!active(c)||l.catId!==c.id)throw Error('La línea no tiene un vínculo exacto con el catálogo');
  if(l.catalogSource?.variantCode)throw Error('Este precio corresponde a una variante: el cambio se guardará solo en este documento');
  if(!price(newPrice))throw Error('Introduce un precio unitario válido');
  if(newUnit!==(c.unit||'ud'))throw Error('La unidad cambió: revisa la partida en Catálogo');
  if(l.catalogSource&&(l.catalogSource.price!==c.price||l.catalogSource.unit!==(c.unit||'ud')))throw Error('El catálogo cambió desde que añadiste esta línea; vuelve a revisar su precio');
  return {studyId,id:c.id,beforePrice:c.price??null,unit:c.unit||'ud',afterPrice:newPrice};
 }
 function applyPriceIntents(config,lines,{role,studyId}={}){
  const intents=lines.filter(l=>l.catalogPriceIntent).map(l=>({line:l,intent:l.catalogPriceIntent}));
  if(!intents.length)return copy(config);
  if(role!=='admin'||!studyId)throw Error('No tienes permiso para actualizar el catálogo');
  const unique=new Map();
  for(const {line:l,intent:i} of intents){
   if(i.studyId!==studyId||l.catId!==i.id||l.unit!==i.unit||l.price!==i.afterPrice||!price(i.afterPrice))throw Error('Revisa la actualización del catálogo de esta línea');
   const previous=unique.get(i.id);
   if(previous&&(previous.afterPrice!==i.afterPrice||previous.beforePrice!==i.beforePrice||previous.unit!==i.unit))throw Error('Hay dos precios propuestos para la misma partida: elige uno');
   // A second line using the same ID and a different unit price must be resolved explicitly.
   if(lines.some(other=>other.catId===i.id&&(other.price!==i.afterPrice||other.unit!==i.unit)))throw Error('La misma partida tiene precios distintos en el documento: resuelve la diferencia antes de actualizar el catálogo');
   const c=(config.catalog||[]).find(x=>x.id===i.id);
   if(!active(c)||c.price!==i.beforePrice||(c.unit||'ud')!==i.unit)throw Error('El precio o unidad del catálogo ha cambiado; vuelve a revisar la propuesta');
   unique.set(i.id,i);
  }
  const result=copy(config);result.catalog=result.catalog.map(c=>unique.has(c.id)?{...c,price:unique.get(c.id).afterPrice,priceStatus:'personalizado',priceRange:null,priceBasis:'Precio personalizado por el estudio'}:c);return result;
 }
 function validatePriceMerge(base,local,remote){
  for(const item of local.catalog||[]){
   const before=(base.catalog||[]).find(c=>c.id===item.id);
   if(!before||item.price===before.price)continue;
   const current=(remote.catalog||[]).find(c=>c.id===item.id);
   if(!current||current.archived!==before.archived||(current.unit||'ud')!==(before.unit||'ud'))throw Error('Conflicto: la unidad o disponibilidad de la partida cambió mientras se guardaba el precio');
  }
 }
 function replacement(config,template,{studyId,verifiedStudyId,reservedIds=[],firstId=-1}={}){
  if(!studyId||studyId!==verifiedStudyId)throw Error('Falta verificar el estudio de destino');
  if(!template?.version||!template.locale||!Array.isArray(template.items)||!template.items.length)throw Error('Plantilla vacía o sin versión');
  const used=new Set([...reservedIds,...(config.catalog||[]).map(c=>c.id),...(config.catalogArchive||[]).map(c=>c.id)]);
  let id=firstId;const catalog=template.items.map(c=>{
   if(!active(c)||!['Partida','Servicio'].includes(c.tipo)||!c.name||!c.unit||!(c.price===null||price(c.price)))throw Error('Partida de plantilla inválida');
   while(used.has(id)){id--;if(!Number.isSafeInteger(id))throw Error('No se pueden asignar identificadores');}
   if(!Number.isSafeInteger(id)||id>=0)throw Error('Los identificadores nuevos deben ser enteros negativos');
   const next={...copy(c),id,brand:'both'};used.add(id--);return next;
  });
  // Keep legacy IDs in the old collection as archived records as well. An older open
  // client still resolves historical document lines there until it updates.
  return {...copy(config),catalog:[...copy(config.catalog||[]).map(c=>({...c,archived:true})),...catalog],catalogArchive:[...copy(config.catalogArchive||[]),...copy(config.catalog||[])],catalogSeed:{version:template.version,locale:template.locale,studyId}};
 }
 function restoreCatalog(current,snapshot,expectedSeed){
  // Caller must additionally enforce DB updated_at CAS; never restore an entire config.
  if(JSON.stringify(current.catalogSeed)!==JSON.stringify(expectedSeed))throw Error('El catálogo ya cambió: no se puede restaurar automáticamente');
  const next=copy(current);for(const key of ['catalog','catalogArchive','catalogSeed']){if(Object.hasOwn(snapshot,key))next[key]=copy(snapshot[key]);else delete next[key];}return next;
 }
 return {norm,search,line,legacyCatalog,displaySource,priceIntent,applyPriceIntents,validatePriceMerge,replacement,restoreCatalog};
});
