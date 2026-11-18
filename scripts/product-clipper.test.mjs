import test from 'node:test';import assert from 'node:assert/strict';
import {extractProduct,preciseJSON,multiplyDecimal} from '../supabase/functions/product-clipper/extract.mjs';
import {publicURL,publicAddress,safeFetch,verifyImage} from '../supabase/functions/product-clipper/network.mjs';
import {createHandler} from '../supabase/functions/product-clipper/core.mjs';
const page=p=>`<html><head><script type="application/ld+json">${JSON.stringify(p)}</script></head><body><main><h1>Producto</h1></main></body></html>`;
const product={ '@type':'Product',name:'Silla',url:'https://shop.example.com/p/1',sku:'one',image:'https://cdn.example.com/one.jpg',offers:{'@type':'Offer',price:'129.123456',priceCurrency:'EUR'}};
test('rejects private, mapped IPv4, reserved, loopback, numeric URL and non-http targets',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','::1','fc00::1','fe80::1','::ffff:127.0.0.1','198.18.0.1','192.0.2.1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);
 for(const url of ['http://2130706433','http://0x7f000001','http://localhost','http://[::1]','https://a:pass@example.com','file:///tmp/x','https://example.com:22'])assert.throws(()=>publicURL(url));
 assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('2606:4700:4700::1111'),true);
});
test('DNS private/mixed answers and redirects cannot reach the network',async()=>{
 let requests=0;const request=async()=>{requests++;return {status:302,headers:{location:'http://127.0.0.1/'}};};
 await assert.rejects(safeFetch('https://shop.example.com',{resolver:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}],request}));assert.equal(requests,0);
 await assert.rejects(safeFetch('https://shop.example.com',{resolver:async()=>[{address:'8.8.8.8',family:4}],request}));assert.equal(requests,1);
});
test('image referer is reduced to a safe public origin',async()=>{
 let options;const request=async(_url,_ip,value)=>{options=value;return {status:200,headers:{},bytes:Buffer.from('ok')};};
 await safeFetch('https://cdn.example.com/image.jpg',{referer:'https://shop.example.com/product/1?private=selection',resolver:async()=>[{address:'8.8.8.8',family:4}],request});
 assert.equal(options.referer,'https://shop.example.com/');
 await assert.rejects(safeFetch('https://cdn.example.com/image.jpg',{referer:'http://user:secret@shop.example.com/product',resolver:async()=>[{address:'8.8.8.8',family:4}],request}));
});
test('returns exact decimal source, unknown VAT and never recommendations',()=>{
 const r=extractProduct(page(product),'https://shop.example.com/p/1');assert.equal(r.fields.price.value,'129.123456');assert.equal(r.tax.status,'unknown');assert.equal(r.fields.currency.value,'EUR');assert.equal(r.images.length,1);assert.equal(r.gallery.complete,false);
 assert.equal(preciseJSON('{"price":123.1234567890123}').price,'123.1234567890123');assert.equal(multiplyDecimal('12.345','1.21'),'14.93745');
});
test('SKLUM accepts an explicit VAT label in the current main product area',()=>{
 const url='https://www.sklum.com/es/comprar-sillas/1-silla.html',sklum={...product,url,image:'https://cdn.sklum.com/es/1/silla.jpg'};
 const html=`<html><head><script type="application/ld+json">${JSON.stringify(sklum)}</script></head><body><main><div id="productcore"><h1>Silla</h1></div><p>Precio con IVA incluido</p></main></body></html>`;
 const r=extractProduct(html,url);assert.equal(r.tax.status,'included');assert.equal(r.tax.evidence,'IVA incluido');assert.equal(r.fields.price.value,'129.123456');
});
test('aggregate prices and unverified variants never become exact prices',()=>{
 assert.equal(extractProduct(page({...product,offers:{'@type':'AggregateOffer',lowPrice:'10',highPrice:'20',priceCurrency:'EUR'}}),product.url).fields.price.value,null);
 const r=extractProduct(page(product),product.url+'?variant=other');assert.equal(r.variant.verified,false);assert.equal(r.fields.price.value,null);
 assert.throws(()=>extractProduct(page([product,{...product,url:'https://shop.example.com/p/2'}]),'https://shop.example.com/collection'));
});
test('a price shared exactly by every published variant is safe without choosing one',()=>{
 const variants=[
  {'@type':'Offer',sku:'one-red',price:'89.95',priceCurrency:'EUR',url:product.url+'?id_c=red'},
  {'@type':'Offer',sku:'one-blue',price:'89.95',priceCurrency:'EUR',url:product.url+'?id_c=blue'}
 ];
 const r=extractProduct(page({...product,offers:variants}),product.url);
 assert.equal(r.fields.price.value,'89.95');assert.equal(r.fields.currency.value,'EUR');assert.equal(r.fields.sku.value,'one');assert.equal(r.variant.sku,'one');assert.ok(r.warnings.includes('price_shared_by_variants'));
 const different=extractProduct(page({...product,offers:[variants[0],{...variants[1],price:'99.95'}]}),product.url);assert.equal(different.fields.price.value,null);assert.ok(different.warnings.includes('price_not_unambiguous'));
 const requested=extractProduct(page({...product,offers:variants}),product.url+'?id_c=missing');assert.equal(requested.fields.price.value,null);assert.equal(requested.variant.verified,false);
});
test('only declared axes/units are converted and unknown fields remain empty',()=>{
 const r=extractProduct(page({...product,width:{value:'1.25',unitCode:'MTR'},height:{value:'110 - 123',unitCode:'cm'}}),product.url);
 assert.equal(r.dimensions[0].cm,'125.00');assert.equal(r.dimensions[1].cm,null);assert.equal(r.fields.finish.value,null);assert.equal(r.fields.brand.value,null);
});
test('SVG and arbitrary HTML are rejected as product images',()=>{
 assert.throws(()=>verifyImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),'image/svg+xml'));
 assert.throws(()=>verifyImage(Buffer.from('<html>captcha</html>'),'image/jpeg'));
});
const request=body=>new Request('https://api.example.com',{method:'POST',headers:{Authorization:'Bearer fixture-token-1234567890'},body:JSON.stringify(body)});
const privateHeaderRequest=body=>new Request('https://api.example.com',{method:'POST',headers:{'X-Moderno-Session':'private-fixture-token-1234567890'},body:JSON.stringify(body)});
const envelopeRequest=(body,token='x'.repeat(16000))=>new Request('https://api.example.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session64:btoa(token),payload:body})});
const captureBody={action:'capture',id:'11111111-1111-4111-8111-111111111111',studyId:'22222222-2222-4222-8222-222222222222',url:product.url,destination:{kind:'biblioteca',brand:'cm'}};
test('handler authenticates before any capture and idempotent retries never fetch again',async()=>{
 let started=0,fetched=0;const deps={authenticate:async()=>null,start:async()=>{started++;return {start:false,estado:'procesando'};},fetchPage:async()=>{fetched++;}};
 assert.equal((await createHandler(deps)(request(captureBody))).status,401);assert.equal(started,0);
 deps.authenticate=async()=>({id:'fixture'});assert.equal((await createHandler(deps)(request(captureBody))).status,200);assert.equal(started,1);assert.equal(fetched,0);
});
test('handler authenticates the first-party session header before any operation',async()=>{
 let received;const deps={authenticate:async value=>{received=value;return {id:'fixture'};},start:async()=>({start:false,estado:'procesando'})};
 const response=await createHandler(deps)(privateHeaderRequest(captureBody));
 assert.equal(response.status,200);assert.equal(received,'Bearer private-fixture-token-1234567890');
 const preflight=await createHandler(deps)(new Request('https://api.example.com',{method:'OPTIONS',headers:{Origin:'https://app.moderno.app'}}));
 assert.match(preflight.headers.get('access-control-allow-headers'),/x-moderno-session/);
});
test('handler authenticates a large session from the bounded proxy envelope',async()=>{
 let received;const token='x'.repeat(16000),deps={authenticate:async value=>{received=value;return {id:'fixture'};},start:async()=>({start:false,estado:'procesando'})};
 const response=await createHandler(deps)(envelopeRequest(captureBody,token));
 assert.equal(response.status,200);assert.equal(received,'Bearer '+token);
});
test('member file signing uses the bounded session and refuses invalid paths',async()=>{
 let signed=0,received;const token='x'.repeat(16000),path='22222222-2222-4222-8222-222222222222/clipper/11111111-1111-4111-8111-111111111111/image.jpg';
 const deps={authenticate:async value=>{received=value;return {id:'fixture'};},file:async(_actor,value)=>{assert.equal(value,path);signed++;return 'https://clone.example/storage/v1/object/sign/archivos/'+path+'?token=ficticio';}};
 const response=await createHandler(deps)(envelopeRequest({action:'file',path},token));assert.equal(response.status,200);assert.equal(received,'Bearer '+token);assert.equal(signed,1);
 for(const invalid of ['other/no.jpg','22222222-2222-4222-8222-222222222222/../secret.jpg','22222222-2222-4222-8222-222222222222//secret.jpg'])assert.ok((await createHandler(deps)(envelopeRequest({action:'file',path:invalid},token))).status>=400);
 assert.equal(signed,1);
});
test('failed image download stores no hotlink and leaves incomplete capture',async()=>{
 let saved,uploads=0,imageOptions;const deps={authenticate:async()=>({id:'fixture'}),start:async()=>({start:true}),finish:async(_actor,_id,c)=>{saved=c;},upload:async()=>{uploads++;},fetchPage:async (url,options)=>{
 if(url!==product.url){imageOptions=options;throw Object.assign(Error('blocked'),{code:'store_http_403'});}return {url,bytes:Buffer.from(page(product)),headers:{'content-type':'text/html'}};
 }};
 const r=await createHandler(deps)(request(captureBody));assert.equal(r.status,200);assert.equal(uploads,0);assert.deepEqual(saved.images,[]);assert.ok(saved.missing.includes('images'));assert.equal(saved.status,'incomplete');
 assert.equal(imageOptions.referer,product.url);assert.ok(saved.warnings.includes('image_resolution_store_http_403'));
});
