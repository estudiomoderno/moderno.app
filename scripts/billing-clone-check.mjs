// Explicitly scoped synthetic identity. Never accepts a production URL or service key.
const base='https://szbswxpkhidywaosdfcg.supabase.co';
const key=process.env.CLONE_PUBLIC_ANON_KEY,password=process.env.BILLING_FIXTURE_PASSWORD;
if(!key||!password)throw Error('Missing local fixture inputs');
const auth=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:'clipper-ui-20260912@example.invalid',password})});
const session=await auth.json();
if(!auth.ok||session.user?.id!=='5fa5231a-216f-42b3-890f-cefe786907c7')throw Error('Fixture authentication failed');
const r=await fetch(base+'/functions/v1/billing',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'status',studyId:'b25c0772-3db1-46ad-a4ed-8f191d1e9781'})});
const v=await r.json();
console.log(JSON.stringify({auth:auth.status,status:r.status,available:v.available,mode:v.mode,error:v.error,stage:v.stage,subscriptionStatus:v.account?.status,eligible:v.account?.eligible,cancelAtPeriodEnd:v.account?.cancelAtPeriodEnd,plans:v.plans?.map(p=>({slug:p.slug,unitAmount:p.unitAmount,currency:p.currency,ready:p.ready}))}));
if(!r.ok)process.exitCode=1;
if(r.ok&&['history','portal'].includes(process.argv[2])){
 const action=process.argv[2];const extra=await fetch(base+'/functions/v1/billing',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action,studyId:'b25c0772-3db1-46ad-a4ed-8f191d1e9781'})});
 const result=await extra.json();console.log(JSON.stringify({action,status:extra.status,error:result.error,url:result.url,invoices:result.invoices?.map(i=>({status:i.status,total:i.total,currency:i.currency,pdfAvailable:!!i.pdf}))}));if(!extra.ok)process.exitCode=1;
}
if(r.ok&&['checkout','checkout-failure'].includes(process.argv[2])){
 const plan=v.plans.find(p=>p.slug==='team');if(!plan?.ready)throw Error('Fixture plan not ready');
 const requestId=process.argv[2]==='checkout'?'66532183-8f63-4f72-983e-3be226aa4301':'66532183-8f63-4f72-983e-3be226aa4302';
 const checkout=await fetch(base+'/functions/v1/billing',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'checkout',studyId:'b25c0772-3db1-46ad-a4ed-8f191d1e9781',plan:'team',requestId,seatRevision:plan.seatRevision})});
 const result=await checkout.json();console.log(JSON.stringify({checkout:checkout.status,error:result.error,url:result.url}));if(!checkout.ok)process.exitCode=1;
}
