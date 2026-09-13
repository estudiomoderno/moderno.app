import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createHandler,BillingError} from './core.mjs';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const server=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
let plans={};try{plans=JSON.parse(Deno.env.get('BILLING_TEST_PLANS')||'{}');}catch{/* Invalid configuration stays disabled. */}
const secret=Deno.env.get('STRIPE_TEST_SECRET_KEY')||'';
const config={enabled:Deno.env.get('BILLING_TEST_ENABLED')==='true',taxReady:Deno.env.get('BILLING_TEST_TAX_REVIEWED')==='true',secret,webhookSecret:Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET')||'',projectRef:new URL(url).hostname.split('.')[0],plans,
 origins:(Deno.env.get('BILLING_TEST_ORIGINS')||'').split(',').filter(Boolean),returnOrigin:Deno.env.get('BILLING_TEST_RETURN_ORIGIN')||''};
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await server.rpc(name,args);if(error){if(name==='sales_test_submit'){const mapped=({PT429:['sales_rate_limited',429],PT409:['sales_request_conflict',409],'22023':['invalid_sales_request',400],'42501':['forbidden',403]} as Record<string,[string,number]>)[error.code];if(mapped)throw new BillingError(mapped[0],mapped[1]);}throw new BillingError('database_'+(/^[A-Z0-9]{5,12}$/.test(error.code||'')?error.code:'unavailable'),503);}return data;}
async function stripeRequest(path:string,body?:Record<string,string>,key?:string){
 const headers:Record<string,string>={Authorization:'Bearer '+secret};if(body)headers['Content-Type']='application/x-www-form-urlencoded';if(key)headers['Idempotency-Key']=key;
 const response=await fetch('https://api.stripe.com/v1'+path,{method:body?'POST':'GET',headers,body:body?new URLSearchParams(body):undefined,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new BillingError('stripe_http_'+response.status,503);return response.json();
}
Deno.serve(createHandler({config,
 authenticate:async(authorization:string)=>{const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.getUser(authorization.slice(7));return error?null:data.user;},
 stripe:{get:stripeRequest,post:stripeRequest},
 store:{
  isExempt:(study:string)=>rpc('billing_is_exempt',{p_estudio:study}),
  saveSeatPreview:(actor:string,study:string,request:string,value:unknown)=>rpc('billing_test_seat_preview_save',{p_actor:actor,p_estudio:study,p_id:request,p_value:value}),
  submitSales:(actor:string,study:string,request:string,value:{name:string;company:string;email:string;internalUsers:number;message:string})=>rpc('sales_test_submit',{p_actor:actor,p_estudio:study,p_id:request,p_name:value.name,p_company:value.company,p_email:value.email,p_users:value.internalUsers,p_message:value.message}),
  authorize:(actor:string,study:string)=>rpc('billing_test_authorize',{p_actor:actor,p_estudio:study}),
  selectFree:(actor:string,study:string)=>rpc('billing_test_select_free',{p_actor:actor,p_estudio:study}),
  seatQuote:(actor:string,study:string,plan:string)=>rpc('billing_test_seat_quote',{p_actor:actor,p_estudio:study,p_plan:plan}),
  beginCheckout:(actor:string,study:string,request:string,plan:string,revision:string)=>rpc('billing_test_begin_plan',{p_actor:actor,p_estudio:study,p_request:request,p_plan:plan,p_revision:revision}),
  expireCheckout:(actor:string,study:string,request:string,session:string)=>rpc('billing_test_expire',{p_actor:actor,p_estudio:study,p_request:request,p_session:session}),
  setCustomer:(actor:string,study:string,request:string,customer:string)=>rpc('billing_test_checkout_save',{p_actor:actor,p_estudio:study,p_request:request,p_customer:customer,p_session:null}),
  finishCheckout:async(actor:string,study:string,request:string,session:string)=>{const a=await rpc('billing_test_authorize',{p_actor:actor,p_estudio:study});return rpc('billing_test_checkout_save',{p_actor:actor,p_estudio:study,p_request:request,p_customer:a.customerId,p_session:session});},
  claimEvent:(event:string,study:string,request:string,customer:string,subscription:string)=>rpc('billing_test_claim',{p_event:event,p_estudio:study,p_request:request,p_customer:customer,p_subscription:subscription}),
  finishEvent:(event:string,study:string,token:string,value:unknown)=>rpc('billing_test_finish',{p_event:event,p_estudio:study,p_token:token,p_value:value}),
  releaseEvent:(study:string,token:string)=>rpc('billing_test_release',{p_estudio:study,p_token:token})
 }
}));
