/* Library contract. Study products never become public by carrying origin metadata.
   Publication authorization belongs to the future server catalogue, not this module. */
(function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function metadata(product){
  const origin=product?.libraryOrigin;
  return {visibility:'study',rights:{publish:false},source:origin?.kind==='brand'?
   {kind:'brand',brandId:origin.brandId,productId:origin.productId,revision:origin.revision}:
   {kind:product?.captureId||product?.capture?'url':'study'}};
 }
 function published(record){
  return !!record&&record.status==='published'&&record.rights?.display===true&&
   typeof record.brandId==='string'&&!!record.brandId&&typeof record.id==='string'&&!!record.id&&
   Number.isInteger(record.revision)&&record.revision>0&&typeof record.product?.name==='string'&&!!record.product.name.trim();
 }
 function copyPublished(record,id,custom={}){
  if(!published(record)||record.rights?.saveToStudy!==true)throw Error('Producto no disponible para guardar');
  if(id==null)throw Error('Falta identificador de la copia');
  const source=record.product,copy={id};
  // Allowlist: a brand cannot supply study identifiers, internal files or financial links.
  for(const key of ['name','url','sku','unit','img','dims','material','color','cat'])
   if(typeof source[key]==='string')copy[key]=source[key];
  copy.price=null;copy.cost=null;copy.qty=1;
  for(const key of ['price','notes','supplier']){
   if(key==='price'&&Number.isFinite(custom[key])&&custom[key]>=0)copy[key]=custom[key];
   if(key!=='price'&&typeof custom[key]==='string')copy[key]=custom[key];
  }
  copy.libraryOrigin={kind:'brand',brandId:record.brandId,productId:record.id,revision:record.revision};
  return clone(copy);
 }
 const api={metadata,published,copyPublished};
 root.ModernoLibraryOrigin=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
