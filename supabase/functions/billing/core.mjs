// Test-only billing. No access policy in the existing CRM is changed here.
import {PLANS,approvedPrice} from './plans.mjs';
export class BillingError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const fail=(code,status)=>{throw new BillingError(code,status);};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const slug=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(v);
const id=v=>typeof v==='string'?v:v?.id;
export function validateConfig(c){
 if(!c.enabled)return false;
 if(!/^sk_test_/.test(c.secret||'')||!/^whsec_/.test(c.webhookSecret||'')||!c.projectRef||c.projectRef==='cgqtylvaapwbuwqvpjtb')fail('test_configuration_required',503);
 for(const [name,p] of Object.entries(c.plans||{})){
  if(!['pro','team'].includes(name)||!/^price_\w+$/.test(p.priceId||'')||(p.quantity!==undefined&&p.quantity!==1))fail('invalid_catalog',503);
 }
 return true;
}
export async function rawBody(req,limit){
 const reader=req.body?.getReader();if(!reader)return '';const chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail('request_too_large',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return new TextDecoder('utf-8',{fatal:true}).decode(data);
}
export async function verifySignature(body,header,secret,now=Date.now()){
 const pieces=(header||'').split(',').map(x=>x.split('='));const stamps=pieces.filter(x=>x[0]==='t');
 if(stamps.length!==1||!/^\d+$/.test(stamps[0][1]))return false;
 const timestamp=Number(stamps[0][1]);if(Math.abs(now/1000-timestamp)>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+body)));
 const expected=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
 return pieces.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/.test(x[1]||'')).some(([,actual])=>{let diff=0;for(let n=0;n<64;n++)diff|=actual.charCodeAt(n)^expected.charCodeAt(n);return diff===0;});
}
export function subscriptionReference(event){
 const o=event.data?.object;if(!o)return null;
 if(event.type.startsWith('customer.subscription.'))return o.id;
 if(event.type.startsWith('checkout.session.'))return id(o.subscription);
 if(event.type.startsWith('invoice.'))return id(o.parent?.subscription_details?.subscription)||id(o.subscription);
 return null;
}
export function snapshot(subscription,plan,price){
 if(subscription.livemode!==false||(price&&price.livemode!==false))fail('test_object_required');
 const items=subscription.items?.data||[];
 const baseItem=plan?.basePriceId?items.find(i=>id(i.price)===plan.basePriceId):null;
 const extraItem=plan?.basePriceId?items.find(i=>id(i.price)===plan.priceId):null;
 const matches=plan?.basePriceId?!!price&&price.type==='recurring'&&baseItem?.quantity===1&&Number.isInteger(plan.quantity)&&plan.quantity>=1&&items.length===(plan.quantity>1?2:1)&&(plan.quantity===1||extraItem?.quantity===plan.quantity-1):!!plan&&!!price&&price.type==='recurring'&&items.length===1&&id(items[0].price)===plan.priceId&&items[0].quantity===plan.quantity;
 const statuses=['active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused'];
 if(!statuses.includes(subscription.status))fail('unknown_subscription_state');
 // Trial terms are not yet approved. Never grant a trial from a Stripe dashboard change.
 const eligible=matches&&subscription.status==='active'&&!subscription.trial_end&&subscription.latest_invoice?.status==='paid';
 const periodEnd=items[0]?.current_period_end||subscription.current_period_end||null;
 const cancelAt=Number.isSafeInteger(subscription.cancel_at)&&subscription.cancel_at>0?subscription.cancel_at:null;
 return {subscriptionId:subscription.id,customerId:id(subscription.customer),status:subscription.status,eligible,
  cancelAtPeriodEnd:!!subscription.cancel_at_period_end||(cancelAt!==null&&cancelAt===periodEnd),cancelAt,periodEnd};
}
export function createHandler({config,authenticate,store,stripe,now=()=>Date.now()}){
 return async req=>{
  const origin=req.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&(config.origins||[]).includes(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  let stage='request';
  try{
   if(origin&&!(config.origins||[]).includes(origin))fail('origin_denied',403);
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'}});
   if(req.method!=='POST')fail('method_not_allowed',405);
   const enabled=validateConfig(config);
   if(new URL(req.url).pathname.endsWith('/webhook')){
    if(!enabled)fail('not_configured',503);
    const raw=await rawBody(req,262144);
    if(!await verifySignature(raw,req.headers.get('stripe-signature'),config.webhookSecret,now()))fail('invalid_signature',400);
    const event=JSON.parse(raw);if(event.livemode!==false||!/^evt_\w+$/.test(event.id||'')||typeof event.type!=='string')fail('test_event_required');
    const subscriptionId=subscriptionReference(event);if(!subscriptionId)return reply({received:true,ignored:true});
    if(!/^sub_\w+$/.test(subscriptionId))fail('invalid_subscription');
    // Resolve ownership locally first; only a recorded Checkout attempt may introduce a subscription.
    const reference=await stripe.get('/subscriptions/'+subscriptionId+'?expand[]=latest_invoice');
    const study=reference.metadata?.study_id,requestId=reference.metadata?.checkout_request_id;
    if(!uuid(study)||!uuid(requestId))return reply({received:true,ignored:true});
    const lease=await store.claimEvent(event.id,study,requestId,id(reference.customer),subscriptionId);
    if(lease.duplicate||lease.ignored)return reply({received:true,...lease});
    if(!lease.token)fail('sync_busy',503);
    try{
     // Fetch again AFTER acquiring the lease. Payload timestamps are not an ordering guarantee.
     const current=await stripe.get('/subscriptions/'+subscriptionId+'?expand[]=latest_invoice');
     if(current.metadata?.study_id!==study||current.metadata?.checkout_request_id!==requestId||id(current.customer)!==id(reference.customer))fail('subscription_mismatch');
     const plan=config.plans?.[lease.plan];
     // Failed/canceled states must still propagate when an offer was withdrawn.
     const price=current.status==='active'&&plan?await stripe.get('/prices/'+plan.priceId):null;
     const dual=lease.plan==='team'&&current.metadata?.billing_model==='base_plus_extras';
     if(dual&&current.status==='active'){const basePrice=await stripe.get('/prices/'+config.plans.pro.priceId);if(!approvedPrice('pro',basePrice)||!approvedPrice('team',price))fail('price_unavailable');}
     const value=snapshot(current,plan?{...plan,quantity:lease.quantity,...(dual?{basePriceId:config.plans.pro.priceId}:{})}:null,price);
     value.plan=lease.plan;value.seats=lease.quantity;
     await store.finishEvent(event.id,study,lease.token,value);return reply({received:true});
    }catch(error){await store.releaseEvent(study,lease.token).catch(()=>{});throw error;}
   }
   const authorization=req.headers.get('authorization')||'';
   if(!authorization.startsWith('Bearer '))fail('unauthorized',401);
   stage='authentication';const actor=await authenticate(authorization);if(!actor)fail('unauthorized',401);
   const input=JSON.parse(await rawBody(req,8192));if(!uuid(input.studyId))fail('invalid_study');
   // Revalidated on each store mutation as well as this initial read.
   stage='authorization';const account=await store.authorize(actor.id,input.studyId);
   const exempt=await store.isExempt(input.studyId);
   if(exempt&&input.action==='status')return reply({available:true,mode:'test',exempt:true,account,plans:[],salesAvailable:false});
   if(exempt&&['checkout','portal','select-free'].includes(input.action))fail('billing_exempt',409);
   if(input.action==='sales-request'){
    if(config.projectRef!=='szbswxpkhidywaosdfcg')fail('test_configuration_required',503);
    if(!uuid(input.requestId)||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>120||typeof input.company!=='string'||!input.company.trim()||input.company.trim().length>160||typeof input.email!=='string'||input.email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())||!Number.isInteger(input.internalUsers)||input.internalUsers<5||input.internalUsers>10000||(input.message!==undefined&&(typeof input.message!=='string'||input.message.length>2000)))fail('invalid_sales_request',400);
    return reply(await store.submitSales(actor.id,input.studyId,input.requestId,{name:input.name.trim(),company:input.company.trim(),email:input.email.trim().toLowerCase(),internalUsers:input.internalUsers,message:(input.message||'').trim()}));
   }
   if(input.action==='status'){
    const plans=[];if(enabled)for(const [key,p] of Object.entries(config.plans||{})){
     stage='stripe_price';const price=await stripe.get('/prices/'+p.priceId);
     if(!approvedPrice(key,price))fail('price_unavailable',503);
     stage='seat_quote';const quote=await store.seatQuote(actor.id,input.studyId,key);
     plans.push({slug:key,name:PLANS[key].name,unitAmount:price.unit_amount,amount:key==='team'?2200+3800*Math.max(0,quote.quantity-1):price.unit_amount,quantity:quote.quantity,perInternalUser:key==='team',pricingPending:false,seatRevision:quote.revision,salesRequired:key==='team'&&quote.quantity>=5,ready:quote.ready&&config.taxReady===true&&(key!=='team'||quote.quantity<=4),currency:price.currency,interval:price.recurring.interval,intervalCount:price.recurring.interval_count});
    }
    return reply({available:enabled,salesAvailable:config.projectRef==='szbswxpkhidywaosdfcg',mode:'test',account:enabled?account:null,plans,terms:PLANS});
   }
   if(input.action==='select-free'){
    if(!config.projectRef||config.projectRef==='cgqtylvaapwbuwqvpjtb')fail('test_configuration_required',503);
    return reply({entitlements:await store.selectFree(actor.id,input.studyId)});
   }
   if(!enabled)fail('not_configured',503);
   const base=config.returnOrigin;if(!/^https:\/\//.test(base)&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))fail('invalid_return_origin',503);
   if(input.action==='checkout'){
    if(!slug(input.plan)||!config.plans?.[input.plan]||!uuid(input.requestId))fail('plan_unavailable');
    if(account.subscriptionId&&!['canceled','incomplete_expired'].includes(account.status))fail('subscription_exists',409);
    if(config.taxReady!==true)fail('tax_configuration_required',409);
    const plan=config.plans[input.plan],price=await stripe.get('/prices/'+plan.priceId);
    const basePriceId=input.plan==='team'?config.plans.pro?.priceId:plan.priceId;
    if(!basePriceId)fail('price_unavailable');
    if(input.plan==='team'&&!approvedPrice('pro',await stripe.get('/prices/'+basePriceId)))fail('price_unavailable');
    if(!approvedPrice(input.plan,price))fail('price_unavailable');
    const quote=await store.seatQuote(actor.id,input.studyId,input.plan);
    if(input.plan==='team'&&quote.quantity>=5)fail('sales_required',409);
    if(!quote.ready)fail('seat_rules_pending',409);if(input.seatRevision!==quote.revision)fail('team_changed',409);
    const attempt=await store.beginCheckout(actor.id,input.studyId,input.requestId,input.plan,input.seatRevision);
    if(!Number.isSafeInteger(attempt.quantity)||attempt.quantity<1||(input.plan==='pro'&&attempt.quantity!==1)||(input.plan==='team'&&attempt.quantity>4))fail('invalid_seat_quote',409);
    if(attempt.sessionId){const existing=await stripe.get('/checkout/sessions/'+attempt.sessionId);if(existing.livemode!==false||id(existing.customer)!==attempt.customerId||existing.client_reference_id!==input.studyId)fail('session_mismatch');
     if(input.plan==='team'&&existing.metadata?.billing_model!=='base_plus_extras')fail('checkout_requires_reconciliation',409);
     if(existing.status==='open'&&existing.url)return reply({url:existing.url});
     if(existing.status==='expired'){await store.expireCheckout(actor.id,input.studyId,attempt.requestId,existing.id);fail('checkout_expired',409);}
     fail('checkout_requires_reconciliation',409);}
    if(now()-Date.parse(attempt.createdAt)>23*3600000)fail('checkout_requires_reconciliation',409);
    let customerId=attempt.customerId;
    if(!customerId){const customer=await stripe.post('/customers',{'metadata[study_id]':input.studyId},'customer:'+attempt.requestId);if(customer.livemode!==false)fail('test_object_required');customerId=customer.id;await store.setCustomer(actor.id,input.studyId,attempt.requestId,customerId);}
    const session=await stripe.post('/checkout/sessions',{mode:'subscription',customer:customerId,'line_items[0][price]':basePriceId,'line_items[0][quantity]':'1',...(input.plan==='team'&&attempt.quantity>1?{'line_items[1][price]':plan.priceId,'line_items[1][quantity]':String(attempt.quantity-1)}:{}),'automatic_tax[enabled]':'true','tax_id_collection[enabled]':'true',billing_address_collection:'required','customer_update[address]':'auto','customer_update[name]':'auto',locale:'es',client_reference_id:input.studyId,
     'metadata[billing_model]':'base_plus_extras','metadata[study_id]':input.studyId,'metadata[checkout_request_id]':attempt.requestId,'subscription_data[metadata][billing_model]':'base_plus_extras','subscription_data[metadata][study_id]':input.studyId,'subscription_data[metadata][checkout_request_id]':attempt.requestId,
     success_url:base+'/es/ajustes?section=facturacion&billing_return=success&session_id={CHECKOUT_SESSION_ID}',cancel_url:base+'/es/ajustes?section=facturacion&billing_return=cancelled'},'checkout:'+attempt.requestId);
    if(session.livemode!==false||!session.url||id(session.customer)!==customerId)fail('session_mismatch');
    await store.finishCheckout(actor.id,input.studyId,attempt.requestId,session.id);
    return reply({url:session.url});
   }
   if(input.action==='portal'){
    if(!account.customerId)fail('no_subscription',409);
    // Recheck ownership before creating the short-lived portal session.
    await store.authorize(actor.id,input.studyId);
    const portal=await stripe.post('/billing_portal/sessions',{customer:account.customerId,return_url:base+'/es/ajustes?section=facturacion'});
    return reply({url:portal.url});
   }
   if(input.action==='history'){
    if(!account.customerId)return reply({invoices:[],hasMore:false});
    const result=await stripe.get('/invoices?customer='+encodeURIComponent(account.customerId)+'&limit=50');
    if(result.data?.some(x=>x.livemode!==false||id(x.customer)!==account.customerId))fail('invoice_mismatch');
    return reply({invoices:(result.data||[]).map(x=>({id:x.id,number:x.number,status:x.status,total:x.total,currency:x.currency,created:x.created,pdf:x.invoice_pdf,url:x.hosted_invoice_url})),hasMore:!!result.has_more});
   }
   return reply({error:'invalid_action'},400);
  }catch(e){return reply({error:e instanceof BillingError?e.code:'billing_unavailable',stage},e instanceof BillingError?e.status:503);}
 };
}
