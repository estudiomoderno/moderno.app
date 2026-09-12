import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createHandler,validateConfig,verifySignature,snapshot,subscriptionReference} from '../supabase/functions/billing/core.mjs';
const intent=createRequire(import.meta.url)('../app/billing-intent.js');
const study='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222';
const config={enabled:true,secret:'sk_test_fixture',webhookSecret:'whsec_fixture',projectRef:'isolated',origins:['http://127.0.0.1:3187'],returnOrigin:'http://127.0.0.1:3187',plans:{synthetic:{name:'Plan de ensayo local',priceId:'price_fixture',quantity:1}}};
const price={id:'price_fixture',livemode:false,active:true,type:'recurring',unit_amount:100,currency:'eur',recurring:{interval:'month',interval_count:1}};
const subscription={id:'sub_fixture',livemode:false,customer:'cus_fixture',status:'active',latest_invoice:{status:'paid'},metadata:{study_id:study,checkout_request_id:requestId},items:{data:[{price:'price_fixture',quantity:1,current_period_end:1999999999}]}};
async function signature(body,secret=config.webhookSecret,time=Math.floor(Date.now()/1000)){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const b=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(time+'.'+body));return `t=${time},v1=${Buffer.from(b).toString('hex')}`;
}
function fixture(overrides={}){
 const calls=[],writes=[];
 const store={authorize:async()=>({customerId:'cus_fixture',status:'not_started'}),beginCheckout:async()=>({requestId,createdAt:new Date().toISOString(),customerId:'cus_fixture'}),setCustomer:async(...a)=>writes.push(['customer',...a]),finishCheckout:async(...a)=>writes.push(['checkout',...a]),expireCheckout:async(...a)=>writes.push(['expire',...a]),claimEvent:async()=>({token:'lease',plan:'synthetic'}),finishEvent:async(...a)=>writes.push(['event',...a]),releaseEvent:async()=>{},...overrides.store};
 const stripe={get:async p=>{calls.push(['get',p]);if(p.startsWith('/prices/'))return price;if(p.startsWith('/subscriptions/'))return subscription;if(p.startsWith('/invoices?'))return {data:[],has_more:false};return {id:'cs_test_fixture',livemode:false,customer:'cus_fixture',client_reference_id:study,status:'open',url:'https://checkout.stripe.com/test'};},post:async(p,body,key)=>{calls.push(['post',p,body,key]);return {id:'cs_test_fixture',livemode:false,customer:'cus_fixture',url:'https://checkout.stripe.com/test'};},...overrides.stripe};
 const handler=createHandler({config:{...config,...overrides.config},authenticate:async()=>({id:'admin'}),store,stripe,...overrides.dependencies});
 return {calls,writes,handler,request:async(action,extra={})=>handler(new Request('https://example.invalid/billing',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({action,studyId:study,...extra})})),webhook:async(event)=>{const body=JSON.stringify(event);return handler(new Request('https://example.invalid/billing/webhook',{method:'POST',headers:{'stripe-signature':await signature(body)},body}));}};
}
test('billing intention survives redirect without price, arbitrary URL or paid state',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const value=intent.capture({search:'?section=facturacion&plan=basic&price=1&paid=true&return=https://evil.invalid'},storage,1000);
 assert.deepEqual(value,{plan:'basic',createdAt:1000});assert.equal(intent.destination(intent.read(storage,2000)),'/es/ajustes?section=facturacion&plan=basic');
 assert.equal(intent.read(storage,86402000),null);assert.equal(intent.destination({plan:'https://evil.invalid'}),null);intent.clear(storage);assert.equal(intent.read(storage),null);
});
test('test configuration rejects live keys and production project',()=>{
 assert.equal(validateConfig({enabled:false}),false);
 assert.throws(()=>validateConfig({...config,secret:'sk_live_fixture'}));assert.throws(()=>validateConfig({...config,projectRef:'cgqtylvaapwbuwqvpjtb'}));
 assert.throws(()=>validateConfig({...config,plans:{synthetic:{priceId:'price_fixture',quantity:0}}}));
});
test('signature validates exact body, rejects tampering, old timestamps and wrong secrets',async()=>{
 const raw='{"test":1}',sig=await signature(raw);assert.equal(await verifySignature(raw,sig,config.webhookSecret),true);
 assert.equal(await verifySignature(raw+' ',sig,config.webhookSecret),false);assert.equal(await verifySignature(raw,sig,'other'),false);
 assert.equal(await verifySignature(raw,await signature(raw,config.webhookSecret,1),config.webhookSecret),false);
});
test('disabled billing offers no plans and starts no payment',async()=>{
 const f=fixture({config:{enabled:false}});assert.deepEqual((await (await f.request('status')).json()).plans,[]);
 assert.equal((await f.request('checkout',{plan:'synthetic',requestId})).status,503);assert.equal(f.calls.length,0);
});
test('server catalog determines price and quantity, browser totals are ignored',async()=>{
 const f=fixture();const r=await f.request('checkout',{plan:'synthetic',requestId,price:'price_attacker',amount:0,quantity:999});assert.equal(r.status,200);
 const call=f.calls.find(c=>c[0]==='post');assert.equal(call[2]['line_items[0][price]'],'price_fixture');assert.equal(call[2]['line_items[0][quantity]'],'1');assert.equal(call[3],'checkout:'+requestId);
 assert.equal(call[2]['subscription_data[metadata][study_id]'],study);assert.equal(f.writes.some(w=>w[0]==='event'),false);
});
test('unknown plan cannot reach Stripe',async()=>{const f=fixture();assert.equal((await f.request('checkout',{plan:'unknown',requestId})).status,400);assert.equal(f.calls.length,0);});
test('admin authorization failure prevents checkout and portal',async()=>{
 const f=fixture({store:{authorize:async()=>{throw Error('denied');}}});for(const action of ['checkout','portal','history'])assert.equal((await f.request(action,{plan:'synthetic',requestId})).status,503);assert.equal(f.calls.length,0);
});
test('missing identity and foreign origins are rejected',async()=>{
 const f=fixture({dependencies:{authenticate:async()=>null}});assert.equal((await f.request('status')).status,401);
 assert.equal((await f.handler(new Request('https://example.invalid/billing',{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status,403);
});
test('an open Checkout retry reuses session instead of charging twice',async()=>{
 const f=fixture({store:{beginCheckout:async()=>({requestId,sessionId:'cs_test_fixture',customerId:'cus_fixture'})}});
 assert.equal((await f.request('checkout',{plan:'synthetic',requestId})).status,200);assert.equal(f.calls.some(c=>c[0]==='post'),false);
});
test('uncertain old attempt cannot create a second session after Stripe idempotency retention',async()=>{
 const f=fixture({store:{beginCheckout:async()=>({requestId,createdAt:'2020-01-01',customerId:'cus_fixture'})}});
 assert.equal((await f.request('checkout',{plan:'synthetic',requestId})).status,409);assert.equal(f.calls.some(c=>c[0]==='post'),false);
});
test('expired Checkout can be closed for a later explicit retry',async()=>{
 const f=fixture({store:{beginCheckout:async()=>({requestId,sessionId:'cs_test_fixture',customerId:'cus_fixture'})},stripe:{get:async p=>p.startsWith('/prices')?price:{id:'cs_test_fixture',status:'expired',livemode:false,customer:'cus_fixture',client_reference_id:study}}});
 assert.equal((await f.request('checkout',{plan:'synthetic',requestId})).status,409);assert.equal(f.writes[0][0],'expire');
});
test('portal uses owned customer and a fixed return URL',async()=>{const f=fixture();await f.request('portal',{customerId:'cus_attacker',return_url:'https://evil.invalid'});const c=f.calls[0];assert.equal(c[2].customer,'cus_fixture');assert.match(c[2].return_url,/127\.0\.0\.1/);});
test('empty history remains empty; mismatched invoice ownership fails',async()=>{
 const f=fixture();assert.deepEqual((await (await f.request('history')).json()).invoices,[]);
 const bad=fixture({stripe:{get:async()=>({data:[{livemode:false,customer:'cus_other'}]})}});assert.equal((await bad.request('history')).status,400);
});
test('active requires paid invoice, not success URL, trial or pending invoice',()=>{
 assert.equal(snapshot(subscription,config.plans.synthetic,price).eligible,true);
 for(const patch of [{status:'past_due'},{status:'trialing'},{latest_invoice:{status:'open'}},{trial_end:123}])assert.equal(snapshot({...subscription,...patch},config.plans.synthetic,price).eligible,false);
 assert.throws(()=>snapshot({...subscription,livemode:true},config.plans.synthetic,price));
});
const event={id:'evt_fixture',livemode:false,type:'customer.subscription.updated',data:{object:subscription}};
test('signed event refreshes Stripe AFTER lease and records server state',async()=>{
 const f=fixture();assert.equal((await f.webhook(event)).status,200);assert.equal(f.calls.filter(c=>c[1].startsWith('/subscriptions/')).length,2);assert.equal(f.writes[0][4].eligible,true);
});
test('duplicate and busy webhook leases never write a subscription',async()=>{
 for(const lease of [{duplicate:true},{}]){const f=fixture({store:{claimEvent:async()=>lease}});const r=await f.webhook(event);assert.equal(r.status,lease.duplicate?200:503);assert.equal(f.writes.length,0);}
});
test('old event payload cannot reactivate a canceled subscription',async()=>{
 const f=fixture({stripe:{get:async p=>p.startsWith('/prices/')?price:{...subscription,status:'canceled'}}});await f.webhook(event);assert.equal(f.writes[0][4].status,'canceled');assert.equal(f.writes[0][4].eligible,false);
});
test('withdrawn plan cannot prevent cancellation or grant new rights',async()=>{
 const f=fixture({config:{plans:{}},stripe:{get:async()=>({...subscription,status:'canceled'})}});assert.equal((await f.webhook(event)).status,200);assert.equal(f.writes[0][4].eligible,false);
 assert.equal(snapshot(subscription,null,null).eligible,false);
});
test('live signed event and forged signature are rejected',async()=>{
 const f=fixture();assert.equal((await f.webhook({...event,livemode:true})).status,400);
 assert.equal((await f.handler(new Request('https://example.invalid/billing/webhook',{method:'POST',headers:{'stripe-signature':'forged'},body:JSON.stringify(event)}))).status,400);assert.equal(f.calls.length,0);
});
test('invoice reference supports current and legacy Stripe event shapes',()=>{
 assert.equal(subscriptionReference({type:'invoice.paid',data:{object:{parent:{subscription_details:{subscription:'sub_a'}}}}}),'sub_a');
 assert.equal(subscriptionReference({type:'invoice.paid',data:{object:{subscription:'sub_b'}}}),'sub_b');
});
