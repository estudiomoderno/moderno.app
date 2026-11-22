import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const F=require('../app/secretary-feedback.js');
const context={userId:'fictional-user-a',studyId:'fictional-study-a'};
const selection={task:'invoice_from_quote',outcome:'unhelpful',reason:'too_many_questions'};
const deferred=()=>{
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
};
function enabledClient(send){
  const client=F.createClient({send});
  const token=client.setContext(context);
  assert.equal(client.setConsent(true,token),true);
  return {client,token};
}

test('feedback identifies quote-to-invoice difficulty with a closed, immutable payload',()=>{
  const event=F.buildEvent(selection);
  assert.deepEqual(event,{version:1,event:'secretary_feedback',...selection});
  assert.deepEqual(F.validateEvent(event),event);
  assert.ok(Object.isFrozen(event));
  assert.throws(()=>{event.prompt='private';},TypeError);
  assert.deepEqual(F.buildEvent({task:'navigation',outcome:'helpful'}),{
    version:1,event:'secretary_feedback',task:'navigation',outcome:'helpful'
  });
});

test('validator rejects confidential extras instead of silently copying or stripping them',()=>{
  const event=F.buildEvent(selection);
  for(const key of ['prompt','response','text','name','email','amount','price','document','documentId','clientId','projectId','userId','studyId','tenantId','route','metadata','toJSON']){
    const value=key==='toJSON'?()=>'SECRET':{private:'SECRET'};
    assert.throws(()=>F.validateEvent({...event,[key]:value}),{code:'invalid_feedback'},key);
    assert.throws(()=>F.buildEvent({...selection,[key]:value}),{code:'invalid_feedback'},key);
  }
  assert.throws(()=>F.validateEvent({...event,event:'other'}),{code:'invalid_feedback'});
  assert.throws(()=>F.validateEvent({...event,version:'1'}),{code:'invalid_feedback'});
  assert.throws(()=>F.validateEvent({...event,version:2}),{code:'invalid_feedback'});
});

test('categorical fields reject free text, unknown values and incompatible reasons',()=>{
  for(const value of [null,[],{},'SECRET',
    {...selection,task:'invoice_for_SECRET'},
    {...selection,outcome:'completed'},
    {...selection,reason:'Mi cliente SECRET'},
    {...selection,reason:{text:'SECRET'}},
    {...selection,reason:undefined},
    {...selection,outcome:'helpful'},
    {...selection,reason:'clear_answer'}]){
    assert.throws(()=>F.buildEvent(value),{code:'invalid_feedback'});
  }
  for(const task of F.TASKS)for(const outcome of F.OUTCOMES)for(const reason of F.REASONS[outcome]){
    assert.equal(F.validateEvent(F.buildEvent({task,outcome,reason})).reason,reason);
  }
});

test('validator does not execute getters or accept hidden or inherited payload data',()=>{
  let reads=0;
  const getter={...selection};
  Object.defineProperty(getter,'reason',{get(){reads+=1;return 'SECRET';}});
  const hidden={...selection};
  Object.defineProperty(hidden,'prompt',{value:'SECRET'});
  const symbol={...selection,[Symbol('private')]:'SECRET'};
  const inherited=Object.assign(Object.create({prompt:'SECRET'}),selection);
  const poisoned=JSON.parse('{"task":"invoice_from_quote","outcome":"unhelpful","__proto__":{"prompt":"SECRET"}}');
  for(const value of [getter,hidden,symbol,inherited,poisoned])assert.throws(()=>F.buildEvent(value),{code:'invalid_feedback'});
  assert.equal(reads,0);
});

test('feedback is disabled by default and unavailable without a configured transport',async()=>{
  const offline=F.createClient();
  const token=offline.setContext(context);
  assert.equal(offline.setConsent(true,token),false);
  assert.deepEqual(await offline.submit(selection),{status:'unavailable'});
  assert.deepEqual(offline.getState(),{available:false,hasContext:true,consent:false,pending:0});
  let calls=0;
  const client=F.createClient({send:async()=>{calls+=1;return {accepted:true};}});
  client.setContext(context);
  assert.deepEqual(await client.submit(selection),{status:'consent_required'});
  assert.equal(calls,0);
});

test('transport receives only the allowlisted event; identity stays in the separate auth context',async()=>{
  const sent=[];
  const {client}=enabledClient(async(event,options)=>{
    sent.push({event,options});
    return {accepted:true,unexpectedPrivateResponse:'SECRET'};
  });
  assert.deepEqual(await client.submit(selection),{status:'sent'});
  assert.equal(sent.length,1);
  assert.deepEqual(sent[0].event,F.buildEvent(selection));
  assert.deepEqual(sent[0].options.context,context);
  assert.ok(sent[0].options.signal instanceof AbortSignal);
  assert.ok(Object.isFrozen(sent[0].event));
  assert.ok(Object.isFrozen(sent[0].options.context));
  assert.equal(JSON.stringify(sent[0].event).includes(context.userId),false);
  assert.equal(JSON.stringify(sent[0].event).includes(context.studyId),false);
});

test('invalid input never reaches the transport even after opt-in',async()=>{
  let calls=0;
  const {client}=enabledClient(async()=>{calls+=1;return {accepted:true};});
  assert.deepEqual(await client.submit({...selection,prompt:'SECRET'}),{status:'invalid'});
  assert.deepEqual(await client.submit({...selection,reason:'SECRET'}),{status:'invalid'});
  assert.equal(calls,0);
});

test('changing user or study resets consent and rejects a stale consent response',async()=>{
  let calls=0;
  const {client,token}=enabledClient(async()=>{calls+=1;return {accepted:true};});
  assert.equal(client.setContext({...context}),token);
  assert.equal(client.getState().consent,true);
  const other=client.setContext({...context,studyId:'fictional-study-b'});
  assert.notEqual(other,token);
  assert.equal(client.setConsent(true,token),false);
  assert.deepEqual(await client.submit(selection),{status:'consent_required'});
  assert.equal(client.setConsent(true,other),true);
  client.setContext({...context,userId:'fictional-user-b'});
  assert.equal(client.getState().consent,false);
  client.setContext(context);
  assert.equal(client.getState().consent,false);
  assert.equal(calls,0);
});

test('consent is not inherited by a new client instance or by an invalid session',async()=>{
  const send=async()=>({accepted:true});
  const {client}=enabledClient(send);
  const fresh=F.createClient({send});
  fresh.setContext(context);
  assert.equal(fresh.getState().consent,false);
  for(const badContext of [null,{}, {...context,userId:''},{...context,studyId:'wrong study'}, {...context,projectId:'SECRET'}]){
    const token=client.setContext(context);
    client.setConsent(true,token);
    assert.equal(client.setContext(badContext),null);
    assert.equal(client.getState().consent,false);
    assert.deepEqual(await client.submit(selection),{status:'unavailable'});
  }
});

test('revoking before dispatch prevents any network call and stale re-enabling',async()=>{
  let calls=0;
  const {client,token}=enabledClient(async()=>{calls+=1;return {accepted:true};});
  const result=client.submit(selection);
  assert.equal(client.setConsent(false,token),true);
  assert.equal(client.setConsent(true,token),false);
  assert.deepEqual(await result,{status:'cancelled'});
  assert.deepEqual(await client.submit(selection),{status:'consent_required'});
  assert.equal(calls,0);
  const fresh=client.setContext(context);
  assert.notEqual(fresh,token);
  assert.equal(client.setConsent(true,fresh),true);
  assert.deepEqual(await client.submit(selection),{status:'sent'});
  assert.equal(calls,1);
});

test('revocation aborts an in-flight request and settles even if the adapter ignores abort',async()=>{
  const pending=deferred(),started=deferred();
  let signal;
  const {client,token}=enabledClient((event,options)=>{
    signal=options.signal;started.resolve();return pending.promise;
  });
  const result=client.submit(selection);
  await started.promise;
  assert.equal(client.getState().pending,1);
  client.setConsent(false,token);
  assert.equal(signal.aborted,true);
  assert.equal(client.getState().pending,0);
  assert.deepEqual(await result,{status:'cancelled'});
  // An eventual acceptance from a request sent before withdrawal is not a new grant.
  pending.resolve({accepted:true});
  assert.equal(client.getState().consent,false);
});

test('switching identity cancels an in-flight request and cannot attribute it to the new study',async()=>{
  const pending=deferred(),started=deferred();
  let meta;
  const {client}=enabledClient((event,options)=>{meta=options;started.resolve();return pending.promise;});
  const result=client.submit(selection);
  await started.promise;
  client.setContext({...context,studyId:'fictional-study-b'});
  assert.equal(meta.signal.aborted,true);
  assert.deepEqual(meta.context,context);
  assert.deepEqual(await result,{status:'cancelled'});
  pending.reject(new Error('SECRET delayed transport error'));
});

test('transport failures are contained and do not expose arbitrary backend text',async()=>{
  for(const send of [()=>{throw new Error('SECRET private backend message');},async()=>({accepted:false,error:'SECRET'}),async()=>({})]){
    const {client}=enabledClient(send);
    assert.deepEqual(await client.submit(selection),{status:'failed'});
    assert.equal(client.getState().pending,0);
    assert.equal(client.getState().consent,true);
  }
});

test('unavailable cancellation support and a disposed client both fail closed',async()=>{
  let calls=0;
  const send=async()=>{calls+=1;return {accepted:true};};
  const unsupported=F.createClient({send,AbortController:null});
  assert.equal(unsupported.setConsent(true,unsupported.setContext(context)),false);
  assert.deepEqual(await unsupported.submit(selection),{status:'unavailable'});
  const {client,token}=enabledClient(send);
  client.dispose();
  assert.equal(client.setContext(context),null);
  assert.equal(client.setConsent(true,token),false);
  assert.deepEqual(await client.submit(selection),{status:'unavailable'});
  assert.equal(calls,0);
});

function records(count,studies=3,event=F.buildEvent(selection)){
  return Array.from({length:count},(_,i)=>({event,contributorKey:'internal-user-'+i,studyKey:'internal-study-'+i%studies}));
}

test('review aggregation suppresses every category below both distinct-contributor and study thresholds',()=>{
  for(const input of [records(4,3),records(8,2),Array(100).fill(records(1,1)[0])]){
    assert.deepEqual(F.aggregateForReview(input).groups,[]);
  }
  const split=[...records(4,3),...records(4,3,F.buildEvent({...selection,reason:'unclear_answer'}))];
  assert.deepEqual(F.aggregateForReview(split).groups,[]);
});

test('review aggregation emits only categories and distinct counts, never identities or suppressed totals',()=>{
  const input=records(5,3);
  const result=F.aggregateForReview([...input,...input,...records(1,1,F.buildEvent({task:'navigation',outcome:'helpful'}))]);
  assert.deepEqual(result,{
    version:1,purpose:'human_review',minimumContributors:5,minimumStudies:3,
    groups:[{...selection,contributors:5,studies:3}]
  });
  const serialized=JSON.stringify(result);
  assert.equal(serialized.includes('internal-user-'),false);
  assert.equal(serialized.includes('internal-study-'),false);
  assert.equal(serialized.includes('navigation'),false);
  assert.ok(Object.isFrozen(result.groups));
});

test('one contributor in multiple studies cannot satisfy the contributor threshold',()=>{
  const input=records(12,12).map(row=>({...row,contributorKey:'one-person'}));
  assert.deepEqual(F.aggregateForReview(input).groups,[]);
});

test('review thresholds can be increased but cannot be weakened',()=>{
  assert.deepEqual(F.aggregateForReview(records(5,3),{minimumContributors:6}).groups,[]);
  assert.deepEqual(F.aggregateForReview(records(6,3),{minimumStudies:4}).groups,[]);
  for(const config of [{minimumContributors:4},{minimumStudies:2},{minimumContributors:5.5},{minimumStudies:Infinity},{minimumStudies:null},{raw:true}]){
    assert.throws(()=>F.aggregateForReview(records(10),config),{code:'invalid_feedback'});
  }
});

test('review aggregation rejects unvalidated metadata and confidential event fields',()=>{
  const [row]=records(1);
  for(const invalidRow of [
    {...row,event:{...row.event,prompt:'SECRET'}},
    {...row,contributorKey:''},
    {...row,studyKey:'bad key'},
    {...row,rawMessage:'SECRET'},
    {event:row.event}
  ])assert.throws(()=>F.aggregateForReview([invalidRow]),{code:'invalid_feedback'});
});
