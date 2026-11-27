import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../app/secretario-ui.js',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../app/secretary-feedback.js',import.meta.url),'utf8');

test('production pilot hides feedback controls while collection is disabled',()=>{
  assert.match(ui,/if\(config\.feedbackEnabled!==true\|\|!feedback\)\{feedbackHost\.hidden=true;return;\}/);
  assert.doesNotMatch(ui,/pendiente de activarse en pruebas/);
});
function section(start,end){
  const from=ui.indexOf(start),to=ui.indexOf(end,from);
  assert.ok(from>=0&&to>from,'Secretary feedback test boundaries must exist');
  return ui.slice(from,to);
}
const identityHelpers=section('  const owner=()=>','  let identity=owner()');
const declarations=section('  let identity=owner()','  const el=');
const resetCharacterCode=section('  function resetCharacter(){','  function messageAvatar(');
const resetCode=section('  function reset(){','  function checkIdentity(){');
const consentCode=section('  function feedbackScope(){','  function drawFeedbackSettings(){');
const storageRegistration=ui.match(/window\.addEventListener\(['"]storage['"],\s*handleFeedbackStorage\);/)?.[0];
assert.ok(storageRegistration,'Cross-tab consent invalidation must be registered');
const plain=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{
  let resolve;
  const promise=new Promise(yes=>{resolve=yes;});
  return {promise,resolve};
};

// Exercise the real consent functions and real feedback controller together.
// DOM rendering is irrelevant to consent races; RPC and storage are local doubles.
function fixture({storage=new Map(),storageBlocked=false,rpc,userId='fixture-user-a',studyId='fixture-study-a'}={}){
  const calls=[],listeners=new Map();
  const storageAccess=()=>{if(storageBlocked)throw new Error('Fictional storage access denied');};
  const sandbox=vm.createContext({
    AbortController,clearTimeout,
    addEventListener:(name,handler)=>listeners.set(name,handler),
    localStorage:{
      getItem:key=>{storageAccess();return storage.get(key)??null;},
      setItem:(key,value)=>{storageAccess();storage.set(key,String(value));},
      removeItem:key=>{storageAccess();storage.delete(key);}
    },
    sb:{rpc:(name,args)=>{calls.push({name,args:plain(args)});return rpc(name,args);}},
    document:{body:{classList:{remove(){}}},getElementById:()=>null,querySelector:()=>null}
  });
  vm.runInContext(core,sandbox);
  vm.runInContext(`
    const window=globalThis,config={enabled:true,feedbackEnabled:true};
    let ESTUDIO_ID=${JSON.stringify(studyId)},_accessRole='admin',_accessLoading=false;
    const state={sessionUser:{id:${JSON.stringify(userId)}},portalAnon:false};
    const drawFeedbackSettings=()=>{},drawThread=()=>{};
    ${identityHelpers}
    ${declarations}
    ${resetCharacterCode}
    ${resetCode}
    ${section('  function finishFinanceTransition()','  function positionFinanceTransition()')}
    ${section('  function showLauncher(','  function returnToConversation()')}
    ${consentCode}
    ${storageRegistration}
  `,sandbox);
  const run=code=>vm.runInContext(code,sandbox);
  const snapshot=()=>plain(run('({...feedback.getState(),loaded:feedbackLoaded,loading:feedbackLoading,revision:feedbackRevision,pendingWithdrawal:withdrawalPending(),message:feedbackError})'));
  function dispatchStorage({key,newValue}){
    if(key===null)storage.clear();
    else if(newValue===null)storage.delete(key);
    else storage.set(key,newValue);
    listeners.get('storage')({key,newValue});
  }
  return {run,snapshot,calls,storage,dispatchStorage};
}

test('a failed withdrawal stays disabled after checking preference and clearing conversation',async()=>{
  const f=fixture({rpc:async name=>name==='secretary_feedback_consent_get'
    ?{data:{version:1,enabled:true,revision:1}}
    :{error:new Error('Fictional offline withdrawal')}});
  await f.run('loadFeedback()');
  assert.equal(f.snapshot().consent,true);
  await f.run('setFeedbackConsent(false)');
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,true);
  assert.match(f.snapshot().message,/Falta confirmar/);
  const before=f.calls.length;
  await f.run("feedbackError='';loadFeedback()");
  await f.run('setFeedbackConsent(true)');
  assert.equal(f.calls.length,before,'pending withdrawal must neither restore nor re-enable participation');
  f.run('reset()');
  await f.run('loadFeedback()');
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,true);
  assert.equal(f.calls.length,before,'clearing conversation cannot reload a persisted grant');
  assert.deepEqual(plain(await f.run("feedback.submit({task:'invoice_from_quote',outcome:'helpful'})")),{status:'consent_required'});
  assert.deepEqual([...f.storage.values()],['pending'],'only an opt-out recovery marker is persisted');
});

test('a reload preserves pending withdrawal and a confirmed retry removes the marker',async()=>{
  const storage=new Map();
  const original=fixture({storage,rpc:async name=>name==='secretary_feedback_consent_get'
    ?{data:{version:1,enabled:true,revision:7}}
    :{error:new Error('Fictional network loss')}});
  await original.run('loadFeedback()');
  await original.run('setFeedbackConsent(false)');
  const reloaded=fixture({storage,rpc:async(name,args)=>{
    assert.equal(name,'secretary_feedback_consent_set');
    assert.equal(args.p_enabled,false);
    return {data:{version:1,enabled:false,revision:8}};
  }});
  await reloaded.run('loadFeedback()');
  assert.equal(reloaded.calls.length,0,'reload must not fetch and restore an old grant');
  assert.equal(reloaded.snapshot().pendingWithdrawal,true);
  await reloaded.run('setFeedbackConsent(false)');
  assert.equal(reloaded.calls.length,1);
  assert.equal(reloaded.snapshot().consent,false);
  assert.equal(reloaded.snapshot().pendingWithdrawal,false);
  assert.equal(reloaded.snapshot().loaded,true);
  assert.equal(storage.size,0);
});

test('pending withdrawal is isolated by user and study and does not change another saved preference',async()=>{
  const storage=new Map([['moderno_secretary_withdrawal:["fixture-study-a","fixture-user-a"]','pending']]);
  for(const scope of [{userId:'fixture-user-b',studyId:'fixture-study-a'},{userId:'fixture-user-a',studyId:'fixture-study-b'}]){
    const f=fixture({...scope,storage,rpc:async()=>({data:{version:1,enabled:true,revision:2}})});
    await f.run('loadFeedback()');
    assert.equal(f.snapshot().consent,true);
    assert.equal(f.snapshot().pendingWithdrawal,false);
  }
  assert.equal(storage.size,1);
  assert.equal(storage.values().next().value,'pending');
});

test('an earlier consent GET cannot restore participation after a local withdrawal',async()=>{
  const reading=deferred(),revoking=deferred();
  const f=fixture({rpc:name=>name==='secretary_feedback_consent_get'?reading.promise:revoking.promise});
  const load=f.run('loadFeedback()');
  const withdrawal=f.run('setFeedbackConsent(false)');
  reading.resolve({data:{version:1,enabled:true,revision:3}});
  await load;
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,true);
  revoking.resolve({data:{version:1,enabled:false,revision:4}});
  await withdrawal;
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,false);
});

test('a late successful grant response cannot undo a newer confirmed withdrawal',async()=>{
  const granting=deferred(),revoking=deferred();
  const f=fixture({rpc:(name,args)=>{
    if(name==='secretary_feedback_consent_get')return {data:{version:1,enabled:false,revision:0}};
    return args.p_enabled?granting.promise:revoking.promise;
  }});
  await f.run('loadFeedback()');
  const enable=f.run('setFeedbackConsent(true)');
  const disable=f.run('setFeedbackConsent(false)');
  revoking.resolve({data:{version:1,enabled:false,revision:2}});
  await disable;
  granting.resolve({data:{version:1,enabled:true,revision:1}});
  await enable;
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().revision,2);
  assert.equal(f.snapshot().pendingWithdrawal,false);
});

test('late withdrawal responses from a previous identity cannot change the new identity',async()=>{
  const pending=deferred();
  const f=fixture({rpc:(name)=>name==='secretary_feedback_consent_get'
    ?{data:{version:1,enabled:true,revision:1}}:pending.promise});
  await f.run('loadFeedback()');
  const withdrawal=f.run('setFeedbackConsent(false)');
  f.run("ESTUDIO_ID='fixture-study-b';state.sessionUser.id='fixture-user-b';reset()");
  await f.run('loadFeedback()');
  assert.equal(f.snapshot().consent,true);
  pending.resolve({data:{version:1,enabled:false,revision:2}});
  await withdrawal;
  assert.equal(f.snapshot().consent,true);
  assert.equal(f.snapshot().revision,1);
  assert.equal(f.snapshot().pendingWithdrawal,false);
  assert.equal(f.storage.get('moderno_secretary_withdrawal:["fixture-study-a","fixture-user-a"]'),'pending');
});

test('confirmed withdrawal clears the old sent labels together with persisted feedback',async()=>{
  const f=fixture({rpc:(name)=>({data:{version:1,enabled:name==='secretary_feedback_consent_get',revision:name==='secretary_feedback_consent_get'?1:2}})});
  await f.run('loadFeedback()');
  f.run("messages=[{feedbackSent:true,content:'Fictional message',owner:identity}]");
  await f.run('setFeedbackConsent(false)');
  assert.equal(f.run("Object.hasOwn(messages[0],'feedbackSent')"),false);
  assert.equal(f.snapshot().consent,false);
  assert.match(f.snapshot().message,/retirado tus valoraciones/);
});

test('unreadable local storage blocks restoring consent after reset and reload',async()=>{
  const make=()=>fixture({storageBlocked:true,rpc:()=>({data:{version:1,enabled:true,revision:9}})});
  const f=make();
  await f.run('loadFeedback()');
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,true);
  assert.match(f.snapshot().message,/navegador no permite comprobar/);
  await f.run('setFeedbackConsent(true)');
  f.run('reset()');
  await f.run('loadFeedback()');
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.calls.length,0);
  const reloaded=make();
  await reloaded.run('loadFeedback()');
  assert.equal(reloaded.snapshot().consent,false);
  assert.equal(reloaded.calls.length,0);
  assert.deepEqual(plain(await reloaded.run("feedback.submit({task:'navigation',outcome:'helpful'})")),{status:'consent_required'});
});

test('withdrawal in another tab aborts pending feedback and confirmation keeps it disabled',async()=>{
  const pending=deferred(),started=deferred();
  const f=fixture({rpc:name=>{
    if(name==='secretary_feedback_consent_get')return {data:{version:1,enabled:true,revision:3}};
    assert.equal(name,'secretary_feedback_submit');started.resolve();return pending.promise;
  }});
  await f.run('loadFeedback()');
  f.run('messages=[{feedbackSent:true}]');
  const submission=f.run("feedback.submit({task:'invoice_from_quote',outcome:'helpful'})");
  await started.promise;
  const key='moderno_secretary_withdrawal:["fixture-study-a","fixture-user-a"]';
  f.dispatchStorage({key,newValue:'pending'});
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,true);
  assert.equal(f.snapshot().pending,0);
  assert.deepEqual(plain(await submission),{status:'cancelled'});
  f.dispatchStorage({key,newValue:null});
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().pendingWithdrawal,false);
  assert.equal(f.run("Object.hasOwn(messages[0],'feedbackSent')"),false);
  assert.deepEqual(plain(await f.run("feedback.submit({task:'navigation',outcome:'helpful'})")),{status:'consent_required'});
  assert.equal(f.calls.length,2,'cross-tab confirmation does not reload or restore an old grant');
  pending.resolve({data:{accepted:true}});
});

test('a consent read started before another tab withdraws cannot restore a late grant',async()=>{
  const reading=deferred();
  const f=fixture({rpc:()=>reading.promise});
  const loading=f.run('loadFeedback()');
  const key='moderno_secretary_withdrawal:["fixture-study-a","fixture-user-a"]';
  f.dispatchStorage({key,newValue:'pending'});
  f.dispatchStorage({key,newValue:null});
  reading.resolve({data:{version:1,enabled:true,revision:1}});
  await loading;
  assert.equal(f.snapshot().consent,false);
  assert.equal(f.snapshot().revision,null);
  assert.equal(f.snapshot().loading,false);
  assert.equal(f.calls.length,1);
});

test('storage events belonging to another user or study leave the current consent untouched',async()=>{
  const f=fixture({rpc:()=>({data:{version:1,enabled:true,revision:4}})});
  await f.run('loadFeedback()');
  for(const key of [
    'moderno_secretary_withdrawal:["fixture-study-b","fixture-user-a"]',
    'moderno_secretary_withdrawal:["fixture-study-a","fixture-user-b"]'
  ]){
    f.dispatchStorage({key,newValue:'pending'});
    assert.equal(f.snapshot().consent,true);
    assert.equal(f.snapshot().pendingWithdrawal,false);
    assert.equal(f.snapshot().revision,4);
    f.dispatchStorage({key,newValue:null});
    assert.equal(f.snapshot().consent,true);
  }
  assert.equal(f.calls.length,1);
});
