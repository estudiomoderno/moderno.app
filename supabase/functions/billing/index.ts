import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createHandler} from './core.mjs';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const server=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
let plans={};try{plans=JSON.parse(Deno.env.get('BILLING_TEST_PLANS')||'{}');}catch{/* Invalid configuration stays disabled. */}
const secret=Deno.env.get('STRIPE_TEST_SECRET_KEY')||'';
const config={enabled:Deno.env.get('BILLING_TEST_ENABLED')==='true',secret,webhookSecret:Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET')||'',projectRef:new URL(url).hostname.split('.')[0],plans,
 origins:(Deno.env.get('BILLING_TEST_ORIGINS')||'').split(',').filter(Boolean),returnOrigin:Deno.env.get('BILLING_TEST_RETURN_ORIGIN')||''};
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await server.rpc(name,args);if(error)throw error;return data;}
async function stripeRequest(path:string,body?:Record<string,string>,key?:string){
 const headers:Record<string,string>={Authorization:'Bearer '+secret};if(body)headers['Content-Type']='application/x-www-form-urlencoded';if(key)headers['Idempotency-Key']=key;
 const response=await fetch('https://api.stripe.com/v1'+path,{method:body?'POST':'GET',headers,body:body?new URLSearchParams(body):undefined,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Stripe no disponible');return response.json();
}
Deno.serve(createHandler({config,
 authenticate:async(authorization:string)=>{const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.getUser(authorization.slice(7));return error?null:data.user;},
 stripe:{get:stripeRequest,post:stripeRequest},
 store:{
  authorize:(actor:string,study:string)=>rpc('billing_test_authorize',{p_actor:actor,p_estudio:study}),
  beginCheckout:(actor:string,study:string,request:string,plan:string)=>rpc('billing_test_begin',{p_actor:actor,p_estudio:study,p_request:request,p_plan:plan}),
  expireCheckout:(actor:string,study:string,request:string,session:string)=>rpc('billing_test_expire',{p_actor:actor,p_estudio:study,p_request:request,p_session:session}),
  setCustomer:(actor:string,study:string,request:string,customer:string)=>rpc('billing_test_checkout_save',{p_actor:actor,p_estudio:study,p_request:request,p_customer:customer,p_session:null}),
  finishCheckout:async(actor:string,study:string,request:string,session:string)=>{const a=await rpc('billing_test_authorize',{p_actor:actor,p_estudio:study});return rpc('billing_test_checkout_save',{p_actor:actor,p_estudio:study,p_request:request,p_customer:a.customerId,p_session:session});},
  claimEvent:(event:string,study:string,request:string,customer:string,subscription:string)=>rpc('billing_test_claim',{p_event:event,p_estudio:study,p_request:request,p_customer:customer,p_subscription:subscription}),
  finishEvent:(event:string,study:string,token:string,value:unknown)=>rpc('billing_test_finish',{p_event:event,p_estudio:study,p_token:token,p_value:value}),
  releaseEvent:(study:string,token:string)=>rpc('billing_test_release',{p_estudio:study,p_token:token})
 }
}));
