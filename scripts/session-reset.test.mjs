import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const archiveSource=fs.readFileSync(new URL('../app/pending-archive.js',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function pendingCopyIdentity('),html.indexOf('/* ============ PERSISTENCIA REAL'))+
  html.slice(html.indexOf('function syncCopyKeys(){'),html.indexOf('function syncView(){'));
const CANARY='CANARY_ACCOUNT_A_MUST_NEVER_REACH_B';
const STUDY_A='11111111-1111-4111-8111-111111111111',STUDY_B='22222222-2222-4222-8222-222222222222';

function fixture(){
  const removed=[],calls={load:0,persist:0,rendered:[],persisted:[]},storageMap=new Map(),archiveDisk=new Map();
  const localStorage={get length(){return storageMap.size},key:i=>[...storageMap.keys()][i]??null,getItem:key=>storageMap.get(key)??null,setItem:(key,value)=>storageMap.set(key,String(value)),removeItem:key=>storageMap.delete(key)};
  const c={
    state:{sessionUser:{id:'user-a',mail:'a@example.invalid',name:'A'},projects:[{id:CANARY}],library:[CANARY],clients:[{email:'a@secret.invalid'}],quotes:[CANARY],invoices:[CANARY],entries:[CANARY],borradores:[CANARY],docs:[CANARY],trash:[CANARY],catalog:[CANARY],catalogArchive:[CANARY],catalogSeed:CANARY,entriesDel:{a:CANARY},docsDel:{a:CANARY},obraTpl:[CANARY],account:{name:CANARY},emitter:{email:'a@secret.invalid'},users:[{email:'a@secret.invalid'}],logos:{cm:CANARY},counters:{cm:7},idPrefix:{cm:CANARY},series:{cm:CANARY},trades:[CANARY],notifs:[CANARY],cal:{events:[CANARY]},calToken:CANARY,catImgs:{a:CANARY},customCats:[CANARY],techs:[CANARY],typeColors:{a:CANARY},exOpts:{a:CANARY},portalAnon:CANARY,portalFacturas:[CANARY],portalResp:[CANARY],portalEmisor:{email:'a@secret.invalid'},portalEstudio:CANARY,portalTel:CANARY,portalBrandToken:CANARY,portalCapabilities:{secret:CANARY},portalCobrado:7,portalCalProject:CANARY,obraPortalPlanos:true,futureTenantKey:{secret:CANARY},view:'proyecto'},
    BRAND:{cm:{name:'Estudio A',front:'#abcdef',team:[{email:'a@secret.invalid'}]},em:{name:CANARY},dynamicA:{apiKey:CANARY}},wsOrder:['cm','em','dynamicA'],
    sb:{auth:{async signOut(){}},async removeChannel(channel){removed.push(channel);}},LS_KEY:'test',localStorage,
    ESTUDIO_ID:STUDY_A,_cloudLoadedStudy:STUDY_A,_cloudUserId:'user-a',
    _accessAttempt:4,_accessConnecting:true,_accessError:'old',_accessRole:'admin',_accessLoading:false,_gestoriaData:{},
    _cloudT:1,_cloudRetryT:2,_rtPoll:3,_rtChan:{id:'old-channel'},_rtRerender:true,_cloudHash:{proyectos:'old'},_cloudSeen:{proyectos:'old'},_cloudCount:{proyectos:7},_cloudForce:{proyectos:true},
    _cloudWriteRequest:{owner:'old'},_cloudFailures:3,_cloudRetryAfter:99,_syncReview:true,_syncConfirmed:true,_syncPhase:'idle',_syncDetail:'old',_localWrite:null,_fileAttachTask:null,_saveT:null,
    _sbEntered:true,_afterDone:true,_cloudConflicts:{proyectos:{}},teamPresence:{stop(){calls.stopped=true}},
    fileResetSession(){calls.files=true},clearTimeout(){},clearInterval(){},persistNow(){calls.persist++;calls.persisted.push(JSON.stringify({state:c.state,BRAND:c.BRAND,wsOrder:c.wsOrder}))},applySessionUI(){},showLogin(){},toast(){},syncRefresh(){},
    routeAuthReturn(){},sbUserToSession:user=>({id:user.id,mail:user.email||'',name:user.name||user.id}),ensureSelfInTeam(){},render(){calls.rendered.push(JSON.stringify({state:c.state,BRAND:c.BRAND,wsOrder:c.wsOrder}))},persistSoon(){c.persistNow()},afterLoginOnce(){},
    cloudLoad(){calls.load++;c._accessLoading=false;c.persistNow()},document:{getElementById(){return null}},
    pendingArchiveStore(){return {read:async key=>archiveDisk.get(key),write:async(key,value)=>archiveDisk.set(key,value),remove:async key=>archiveDisk.delete(key)}},
  };
  c.window=c;vm.createContext(c);vm.runInContext(archiveSource,c);
  const rawA=JSON.stringify({v:1,state:{sessionUser:{id:'user-a',mail:'a@example.invalid'},account:{secret:CANARY}},sync:{study:STUDY_A,user:'user-a'}});
  const rawB=JSON.stringify({v:1,state:{sessionUser:{id:'user-b',mail:'b@example.invalid'},account:{secret:'B'}},sync:{study:STUDY_A,user:'user-b'}});
  const rawAStudyB=JSON.stringify({v:1,state:{sessionUser:{id:'user-a',mail:'a@example.invalid'},account:{secret:'A-STUDY-B'}},sync:{study:STUDY_B,user:'user-a'}});
  storageMap.set('test_pendiente_1700000000000',rawA);
  storageMap.set('test_pendiente_1700000000001',rawB);
  storageMap.set('test_pendiente_1700000000002',JSON.stringify({v:1,state:{account:{secret:'OWNER_UNKNOWN'}}}));
  archiveDisk.set('legacy-a',rawA);storageMap.set('test_pendiente_1700000000003',c.ModernoPendingArchive.marker('legacy-a'));
  storageMap.set('test_pendiente_1700000000004',rawAStudyB);
  vm.runInContext(source,c);return {c,calls,removed,storageMap,archiveDisk};
}

test('a complete session reset prevents account B from inheriting account A study state',async()=>{
  const {c,calls,removed}=fixture();
  await c.sbResetSession();
  assert.equal(c.ESTUDIO_ID,null);assert.equal(c._cloudLoadedStudy,null);assert.equal(c._cloudUserId,null);assert.equal(c._accessRole,null);
  assert.equal(c.state.sessionUser,null);assert.equal(c.state.projects.length,0);assert.equal(Object.keys(c.state.account).length,0);assert.equal(c.BRAND.cm.name,'');assert.equal(c._accessAttempt,5);assert.equal(Object.keys(c._cloudHash).length,0);assert.equal(Object.keys(c._cloudSeen).length,0);assert.equal(Object.keys(c._cloudCount).length,0);assert.equal(Object.keys(c._cloudForce).length,0);
  assert.deepEqual(JSON.parse(JSON.stringify(c.BRAND)),{cm:{name:'',chip:'cm',front:'var(--cm-soft)',back:'var(--cm-back)'}});assert.deepEqual(Array.from(c.wsOrder),['cm']);
  assert.doesNotMatch(JSON.stringify([c.state,c.BRAND,c.wsOrder]),/CANARY_ACCOUNT_A|a@secret\.invalid|dynamicA|futureTenantKey/);
  assert.equal(c._rtChan,null);assert.equal(c._rtPoll,null);assert.equal(c._cloudWriteRequest,null);assert.equal(c._syncReview,false);assert.equal(calls.files,true);assert.deepEqual(removed,[{id:'old-channel'}]);
  c.sbEnter({id:'user-b',email:'b@example.invalid',name:'B'},false);
  assert.equal(c.state.sessionUser.id,'user-b');assert.equal(calls.load,1,'B must always reload its authorized study after A signs out');
  assert.doesNotMatch(calls.rendered.at(-1),/CANARY_ACCOUNT_A|a@secret\.invalid|dynamicA|futureTenantKey/,'B render must be clean');
  assert.doesNotMatch(calls.persisted.at(-1),/CANARY_ACCOUNT_A|a@secret\.invalid|dynamicA|futureTenantKey/,'B local snapshot must be clean');
});

test('the reset allow-list covers every state field referenced directly by the app',()=>{
  const {c}=fixture(),keys=new Set([...html.matchAll(/\bstate\.([A-Za-z_$][\w$]*)/g)].map(match=>match[1])),blank=c.sbEmptyStudyState();
  assert.deepEqual([...keys].filter(key=>!Object.hasOwn(blank,key)),[],'new state fields must receive an explicit clean-session default');
});

test('historical pending copies remain stored but are visible and downloadable only to their owner',async()=>{
  const {c,storageMap}=fixture(),allKeys=[...storageMap.keys()].filter(key=>key.startsWith('test_pendiente_'));
  assert.equal(c.syncCopyKeys().length,1,'an untagged pointer stays hidden until its snapshot is verified');
  await c.pendingCopyMigrateOwnership();assert.equal(c.syncCopyKeys().length,2,'A sees its raw and verified legacy-pointer copies');
  await c.sbResetSession();c.sbEnter({id:'user-b',email:'b@example.invalid',name:'B'},false);c.ESTUDIO_ID=STUDY_A;await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(Array.from(c.syncCopyKeys()),['test_pendiente_1700000000001']);
  await assert.rejects(c.pendingCopyResolveForCurrentUser('test_pendiente_1700000000000'),/no pertenece/);
  assert.ok(allKeys.every(key=>storageMap.has(key)),'account switch must not delete any historical copy');
  await c.sbResetSession();c.sbEnter({id:'user-a',email:'a@example.invalid',name:'A'},false);c.ESTUDIO_ID=STUDY_A;await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(Array.from(c.syncCopyKeys()).sort(),['test_pendiente_1700000000000','test_pendiente_1700000000003']);
  assert.match(await c.pendingCopyResolveForCurrentUser('test_pendiente_1700000000003'),new RegExp(CANARY));
  assert.ok(allKeys.every(key=>storageMap.has(key)),'A must recover its copies when it returns');
  assert.equal(c.pendingCopyStoredOwner(storageMap.get('test_pendiente_1700000000002')),'','unattributed legacy copy remains hidden');
});

test('concurrent startup ownership migrations share one sequential archive read',async()=>{
  const {c,archiveDisk}=fixture();let reads=0,release;
  const gate=new Promise(resolve=>{release=resolve;});
  c.pendingArchiveStore=()=>({read:async key=>{reads++;await gate;return archiveDisk.get(key)},write:async()=>{},remove:async()=>{}});
  const first=c.pendingCopyMigrateOwnership(),second=c.pendingCopyMigrateOwnership();
  assert.equal(first,second);await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,1);
  release();await Promise.all([first,second]);assert.equal(reads,1);
});

test('the same account cannot count, list or download copies from another study',async()=>{
  const {c,storageMap}=fixture();await c.pendingCopyMigrateOwnership();
  assert.deepEqual(Array.from(c.syncCopyKeys()).sort(),['test_pendiente_1700000000000','test_pendiente_1700000000003']);
  c.ESTUDIO_ID=STUDY_B;
  assert.deepEqual(Array.from(c.syncCopyKeys()),['test_pendiente_1700000000004']);
  await assert.rejects(c.pendingCopyResolveForCurrentUser('test_pendiente_1700000000000'),/no pertenece/);
  assert.match(await c.pendingCopyResolveForCurrentUser('test_pendiente_1700000000004'),/A-STUDY-B/);
  assert.ok(['test_pendiente_1700000000000','test_pendiente_1700000000003','test_pendiente_1700000000004'].every(key=>storageMap.has(key)),'study switching must not delete copies');
});

test('natural and cross-tab auth changes use the same complete reset path',()=>{
  const auth=html.slice(html.indexOf('sb.auth.onAuthStateChange('),html.indexOf('} else if(_resumed'));
  assert.match(auth,/SIGNED_OUT[\s\S]*?sbResetSession\(\)/);
  assert.match(auth,/SIGNED_IN[\s\S]*?await sbResetSession\(\)[\s\S]*?sbEnter\(user/);
});

test('account B waits for account A expanded local write before A data is cleared',async()=>{
  const {c,calls}=fixture();let release,savedOwner;
  c.persistNow=()=>{savedOwner=c.state.sessionUser?.id;c._localWrite=new Promise(resolve=>{release=resolve;});};
  const reset=c.sbResetSession(),enter=reset.then(()=>c.sbEnter({id:'user-b',email:'b@example.invalid',name:'B'},false));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(savedOwner,'user-a');assert.equal(c.state.sessionUser.id,'user-a');assert.equal(calls.load,0);
  release();await enter;
  assert.equal(c.state.sessionUser.id,'user-b');assert.equal(c.state.projects.length,0);assert.equal(calls.load,1);
});

test('logout waits for the file attachment barrier created by the final local write',async()=>{
  const {c,calls}=fixture();let releaseLocal,releaseAttachment;
  c.persistNow=()=>{c._localWrite=new Promise(resolve=>{releaseLocal=()=>{c._fileAttachTask=new Promise(done=>{releaseAttachment=done;});resolve();};});};
  const reset=c.sbResetSession();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.files,undefined);assert.equal(c.state.sessionUser.id,'user-a');
  releaseLocal();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.files,undefined);assert.equal(c.state.sessionUser.id,'user-a');
  releaseAttachment();await reset;
  assert.equal(calls.files,true);assert.equal(c.state.sessionUser,null);
});
