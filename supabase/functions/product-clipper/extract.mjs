import {parseHTML} from './vendor.mjs';
import {publicURL,CaptureError} from './network.mjs';
const arr=v=>v==null?[]:Array.isArray(v)?v:[v];
const types=o=>arr(o?.['@type']).map(String);
const text=v=>typeof v==='string'||typeof v==='number'?String(v).trim():v?.name?text(v.name):'';
const clean=v=>text(v).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,8000);
// Quote numeric JSON tokens before parsing: a source price never passes through binary floating point.
export function preciseJSON(raw){return JSON.parse(raw.replace(/"(?:[^"\\]|\\.)*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,(token,number)=>number?JSON.stringify(number):token));}
export function decimal(raw,{localized=false}={}){
 let s=text(raw).replace(/\s/g,'');if(localized){if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');}
 return /^(?:0|[1-9]\d{0,11})(?:\.\d{1,10})?$/.test(s)?s:null;
}
export function multiplyDecimal(a,b){
 const [ai,af='']=a.split('.'),[bi,bf='']=b.split('.');let result=(BigInt(ai+af)*BigInt(bi+bf)).toString(),places=af.length+bf.length;
 if(!places)return result;result=result.padStart(places+1,'0');return result.slice(0,-places)+'.'+result.slice(-places);
}
function cm(value,unit){const v=decimal(value,{localized:true}),factor={cm:'1',CMT:'1',mm:'0.1',MMT:'0.1',m:'100',MTR:'100',in:'2.54',INH:'2.54'}[unit];return v&&factor?multiplyDecimal(v,factor):null;}
function field(value,source,raw=value){const val=typeof value==='string'?clean(value):value;return {value:val===''?null:val??null,status:val==null||val===''?'not_found':'found',source:val==null||val===''?null:{layer:source,raw:typeof raw==='string'?raw.slice(0,8000):raw}};}
const relevantQuery=u=>[...u.searchParams].filter(([k])=>!/^utm_|^(gclid|fbclid|msockid|ref|ref_)$/i.test(k));
function sameURL(a,b){try{const x=new URL(a,b),y=new URL(b);x.hash='';y.hash='';return x.href===y.href;}catch{return false;}}
function safeImage(url,base){try{return publicURL(new URL(url,base).href).href;}catch{return null;}}
function srcset(raw){return String(raw||'').split(',').map(x=>{const [url,size]=x.trim().split(/\s+/);return {url,score:parseFloat(size)||1,kind:size?.endsWith('w')?'w':'x'};}).filter(x=>x.url);}

// Only observed product-gallery selectors; never select all page images/recommendations.
export const adapters={
 'sklum.com':{id:'sklum-1',gallery:'.c-product-gallery__list img.c-product-gallery__image',scope:'#productcore'},
 'ikea.com':{id:'ikea-1',gallery:'[class*="product-gallery"] img[src*="/images/products/"]',scope:'main'},
 'westwing.es':{id:'westwing-1',gallery:null,scope:'[data-testid="product-price-container"]'},
 'amazon.es':{id:'amazon-1',gallery:'#landingImage',title:'#productTitle',scope:'#corePriceDisplay_desktop_feature_div'},
};
function adapterFor(host){return Object.entries(adapters).find(([d])=>host===d||host.endsWith('.'+d))?.[1];}
export function extractProduct(html,url,now=new Date().toISOString()){
 if(html.length>3*1024*1024)throw new CaptureError('too_large','La ficha es demasiado grande.');
 const requested=publicURL(url),{document:d}=parseHTML(html);const warnings=[];const adapter=adapterFor(requested.hostname);
 const meta=k=>d.querySelector(`meta[property="${k}"],meta[name="${k}"]`)?.getAttribute('content')||'';
 const nodes=[];function visit(x,depth=0){if(depth>8||nodes.length>200)return;if(Array.isArray(x)){x.forEach(v=>visit(v,depth+1));return;}if(!x||typeof x!=='object')return;if(types(x).includes('Product'))nodes.push(x);for(const k of ['@graph','mainEntity','hasVariant'])if(x[k])visit(x[k],depth+1);}
 for(const script of [...d.querySelectorAll('script[type="application/ld+json"]')].slice(0,30)){try{visit(preciseJSON(script.textContent));}catch{warnings.push('invalid_json_ld');}}
 let candidates=nodes.filter(p=>sameURL(p.url||p['@id'],requested.href));if(!candidates.length&&nodes.length===1)candidates=nodes;
 if(candidates.length>1){const first=JSON.stringify(candidates[0]);if(candidates.every(p=>JSON.stringify(p)===first))candidates=[candidates[0]];}
 if(nodes.length&&candidates.length!==1)throw new CaptureError('ambiguous_product','La página contiene varios productos y no se puede identificar la variante. Abre una ficha concreta.');
 const product=candidates[0]||null;
 const micro=[...d.querySelectorAll('[itemscope][itemtype]')].find(e=>/\/Product$/.test(e.getAttribute('itemtype')));
 const microValue=k=>{const e=micro?.querySelector(`[itemprop="${k}"]`);return e?.getAttribute('content')||e?.getAttribute('href')||e?.textContent||'';};
 const main=d.querySelector('main')||d.body;
 const h1=adapter?.title?d.querySelector(adapter.title):main?.querySelector('h1');
 const adapterImage=adapter?.gallery&&d.querySelector(adapter.gallery);
 const ogProduct=/^product(?:[.:]|$)/i.test(meta('og:type'))||meta('product:price:amount')&&meta('product:price:currency');
 if(!product&&!micro&&(!h1||!(ogProduct&&meta('og:image')||adapter?.title&&adapterImage)))throw new CaptureError('no_product','La tienda no expone una ficha de producto accesible. Puedes añadirla manualmente.');
 const get=(k,og,dom)=>product?.[k]!=null?field(text(product[k]),'json_ld.Product.'+k):microValue(k)?field(microValue(k),'microdata.'+k):og&&meta(og)?field(meta(og),'open_graph.'+og):field(dom||null,'dom');
 const fields={name:get('name','og:title',h1?.textContent),brand:get('brand'),manufacturer:get('manufacturer'),sku:get('sku'),ean:get('gtin13'),description:get('description','og:description'),material:get('material'),color:get('color'),finish:field(null),unit:field(null),availability:field(null),leadTime:field(null),price:field(null),originalPrice:field(null),currency:field(null)};
 const properties=arr(product?.additionalProperty).filter(x=>x&&typeof x==='object').slice(0,60);
 for(const [key,label] of [['material','Material'],['finish','Acabado'],['color','Color']]){const p=properties.find(x=>clean(x.name).toLowerCase()===label.toLowerCase());if(fields[key].value==null&&p)fields[key]=field(text(p.value),'json_ld.additionalProperty.'+label);}
 if(!fields.ean.value)for(const k of ['gtin','gtin14','gtin12','gtin8'])if(product?.[k]){fields.ean=field(text(product[k]),'json_ld.Product.'+k);break;}
 const dimensions=[];const axisLabels={width:['Ancho'],height:['Alto','Altura'],depth:['Fondo','Profundo','Profundidad']};
 for(const [axis,labels] of Object.entries(axisLabels)){
  const raw=product?.[axis]??properties.find(x=>labels.includes(clean(x.name)));
  if(!raw)continue;const value=typeof raw==='object'?text(raw.value):text(raw),unit=typeof raw==='object'?text(raw.unitCode||raw.unitText):'';
  dimensions.push({axis,value,unit,cm:cm(value,unit),source:'json_ld',raw});
 }
 let offers=arr(product?.offers);let offer=offers.length===1?offers[0]:offers.find(o=>sameURL(o.url,requested.href));
 const variantQuery=relevantQuery(requested),queryMatched=offer?.url&&sameURL(offer.url,requested.href);
 // SKLUM exposes the selected combination in the offer SKU: productId-combinationId-locale.
 const sklumMatched=adapter?.id==='sklum-1'&&requested.searchParams.has('id_c')&&new RegExp('^[0-9]+-'+requested.searchParams.get('id_c')+'-[a-z]{2}$').test(String(offer?.sku||''));
 const variantVerified=!variantQuery.length||queryMatched||sklumMatched;
 if(!variantVerified)warnings.push('variant_not_verified');
 if(variantVerified&&offer?.sku)fields.sku=field(text(offer.sku),'json_ld.Offer.sku');
 let tax={status:'unknown',rate:null,evidence:null,conversion:null};
 if(offer&&typeof offer==='object'&&variantVerified&&!types(offer).includes('AggregateOffer')){
  const specs=arr(offer.priceSpecification),current=specs.find(x=>!x.priceType||/SalePrice$/.test(x.priceType));
  const price=decimal(offer.price??current?.price);fields.price=field(price,'json_ld.Offer.price',offer.price??current?.price);
  const currency=text(offer.priceCurrency||current?.priceCurrency);fields.currency=field(/^[A-Z]{3}$/.test(currency)?currency:null,'json_ld.Offer.priceCurrency');
  const list=specs.find(x=>/ListPrice|StrikethroughPrice$/.test(x.priceType));fields.originalPrice=field(decimal(list?.price),'json_ld.Offer.priceSpecification.ListPrice');
  fields.availability=field(text(offer.availability),'json_ld.Offer.availability');
  fields.unit=field(text(offer.eligibleQuantity?.unitText||offer.eligibleQuantity?.unitCode||current?.unitText||current?.unitCode),'json_ld.Offer.unit');
  if(current?.valueAddedTaxIncluded===true||offer.valueAddedTaxIncluded===true)tax={...tax,status:'included',evidence:'json_ld.valueAddedTaxIncluded=true'};
  if(current?.valueAddedTaxIncluded===false||offer.valueAddedTaxIncluded===false)tax={...tax,status:'excluded',evidence:'json_ld.valueAddedTaxIncluded=false'};
 }else if(offers.length)warnings.push(types(offer).includes('AggregateOffer')?'price_range_not_exact':'price_not_unambiguous');
 if(!offers.length&&variantVerified){
  const value=microValue('price')||meta('product:price:amount'),currency=microValue('priceCurrency')||meta('product:price:currency');
  if(decimal(value)&&/^[A-Z]{3}$/.test(currency)){fields.price=field(decimal(value),microValue('price')?'microdata.price':'open_graph.product:price:amount');fields.currency=field(currency,'microdata_or_open_graph.priceCurrency');}
 }
 if(adapter?.id==='amazon-1'&&variantVerified){
  const asin=requested.pathname.match(/\/dp\/([A-Z0-9]{10})(?:\/|$)/)?.[1],scope=d.querySelector(adapter.scope);
  if(asin&&scope?.getAttribute('data-csa-c-asin')===asin){
   const values=[...scope.querySelectorAll('.a-price .a-offscreen')].map(e=>clean(e.textContent)).filter(v=>/^\d[\d.,]*\s*€$/.test(v));
   if(values.length===1){fields.price=field(decimal(values[0].replace('€',''),{localized:true}),'adapter.amazon-1.currentPrice',values[0]);fields.currency=field('EUR','adapter.amazon-1.euroSymbol');}
  }
 }
 // Scoped explicit VAT labels only; no assumed rate from country or currency.
 const taxScope=adapter?.scope?d.querySelector(adapter.scope):micro;
 const taxText=taxScope?.textContent.replace(/\s+/g,' ')||'';
 const taxMatch=taxText.match(/IVA\s+(incluido|no incluido)|incluye\s+IVA|VAT\s+included/i);
 if(tax.status==='unknown'&&taxMatch)tax={...tax,status:/no incluido/i.test(taxMatch[0])?'excluded':'included',evidence:taxMatch[0]};
 const gallery=[];const seen=new Set();const groups=new Map();function add(raw,source){const candidate=safeImage(raw,requested);if(!candidate||seen.has(candidate)||/\.(svg|gif)(?:[?#]|$)/i.test(candidate))return;seen.add(candidate);
  const u=new URL(candidate);let key=candidate;
  if(adapter?.id==='sklum-1')key=u.origin+u.pathname.replace('/wk/','/');
  if(['ikea-1','westwing-1'].includes(adapter?.id))key=u.origin+u.pathname;
  const previous=groups.get(key);if(previous){if(previous.alternatives.length<3)previous.alternatives.push(candidate);return;}
  const image={url:candidate,source,alternatives:[]};groups.set(key,image);gallery.push(image);
 }
 arr(product?.image).forEach(i=>add(typeof i==='object'?i.contentUrl||i.url:i,'json_ld.Product.image'));
 const images=adapter?.gallery?[...d.querySelectorAll(adapter.gallery)]:micro?[...micro.querySelectorAll('[itemprop="image"]')]:[];
 for(const img of images.slice(0,40)){
  const zoom=img.getAttribute('data-zoom-image')||img.getAttribute('data-large-src')||img.getAttribute('data-old-hires');
  const displayWidth=Number(img.getAttribute('width'))||Math.max(0,...[...String(img.getAttribute('sizes')||'').matchAll(/(\d+)px/g)].map(m=>Number(m[1])))||160;
  const sets=srcset(img.getAttribute('srcset'));const sorted=sets.sort((a,b)=>(b.kind==='x'?b.score*displayWidth:b.score)-(a.kind==='x'?a.score*displayWidth:a.score));
  const best=zoom||sorted[0]?.url||img.getAttribute('src')||img.getAttribute('content');
  if(best)add(best,adapter?'adapter.'+adapter.id:'microdata.image');
 }
 if(!gallery.length&&meta('og:image')){add(meta('og:image'),'open_graph.image');warnings.push('gallery_only_open_graph');}
 if(!adapter)warnings.push('generic_extraction');
 if(gallery.length>12)warnings.push('gallery_limit');
 const canonicalRaw=d.querySelector('link[rel="canonical"]')?.getAttribute('href')||product?.url||requested.href;
 let canonical=requested.href;try{const c=publicURL(new URL(canonicalRaw,requested).href);if(c.hostname===requested.hostname)canonical=c.href;}catch{}
 const missing=Object.entries(fields).filter(([,f])=>f.value==null).map(([k])=>k);if(!dimensions.length)missing.push('dimensions');if(tax.status==='unknown')missing.push('tax');if(!gallery.length)missing.push('images');
 return {schemaVersion:'1.0',status:'incomplete',capturedAt:now,url:requested.href,canonicalUrl:canonical,domain:requested.hostname,adapter:adapter?.id||'generic-1',fields,dimensions,tax,
 variant:{query:variantQuery,sku:text(offer?.sku||product?.sku)||null,color:fields.color.value,verified:variantVerified},images:gallery.slice(0,12),gallery:{found:gallery.length,complete:false},missing,warnings:[...new Set(warnings)],suggestions:{category:null,room:null,status:'manual'}};
}
