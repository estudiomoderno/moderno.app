"""Large current snapshot under real localStorage quota, with fictional records only."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://ui-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
setup="""()=>{
 if(sb!==null)throw Error('Backend must be disabled');
 state.sessionUser={id:'fixture',mail:'fixture@example.invalid',name:'Persona ficticia'};state.onboarded=true;state.myRole='admin';_accessRole='admin';_accessLoading=false;
 state.account.name='Estudio ficticio';state.account.apiToken='';state.account.billContacts=[];state.projects=[];state.clients=[];state.library=[];state.catalog=[];state.entries=[];state.invoices=[];state.quotes=[];state.docs=[];state.notifs=[];
 BRAND.cm.name='Estudio ficticio';ESTUDIO_ID='estudio-ficticio';applySessionUI();drawBrandSwitch();showLogin(false);go('proyectos');
 for(const b of Object.keys(CLOUD_BLOCKS))_cloudHash[b]=canon(CLOUD_BLOCKS[b].get());
 window.records=()=>JSON.stringify({projects:state.projects,library:state.library,quotes:state.quotes,invoices:state.invoices,account:state.account});window.baseline=records();
}"""
try:
 for attempt in range(100):
  try:
   with opener.open(origin,timeout=1) as response:assert 'moderno_pruebas_ui-fixture' in response.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   context=browser.new_context(viewport={'width':width,'height':900},locale='es-ES');page=context.new_page();errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""async()=>{
     clearTimeout(_saveT);window.nativeStore=pendingArchiveStore();
     for(let i=0;i<55;i++){
       const key=LS_KEY+'_pendiente_'+(2100000000000+i),raw=JSON.stringify({v:1,fictional:i});
       await nativeStore.write(key,raw);localStorage.setItem(key,ModernoPendingArchive.marker(key));
     }
     state.account.quotaFixture='z'.repeat(6*1024*1024);state.account.latestNote='first';
     let quota=false;try{localStorage.setItem(LS_KEY,JSON.stringify({v:1,state,BRAND,wsOrder}));}catch(e){quota=e.name==='QuotaExceededError';}
     if(!quota)throw Error('Quota was not reproduced');
     window.releaseWrite=null;window.startedWrite=false;
     _pendingArchiveStore={read:k=>nativeStore.read(k),write:async(k,v)=>{startedWrite=true;await new Promise(resolve=>releaseWrite=resolve);return nativeStore.write(k,v);}};
     persistNow();
   }""")
   page.wait_for_function('startedWrite')
   assert page.evaluate("!_saveErr&&!!_localWrite&&syncView().mode==='saving'")
   assert page.evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()")
   page.evaluate("state.account.latestNote='newest during write';persistNow();_pendingArchiveStore=nativeStore;releaseWrite();")
   page.wait_for_function('!_localWrite&&!_saveErr',timeout=15000)
   assert page.evaluate("""async()=>{
     const d=JSON.parse(await ModernoPendingArchive.resolve(localStorage,LS_KEY,pendingArchiveStore()));
     return d.state.account.latestNote==='newest during write'&&d.state.account.quotaFixture.length===6*1024*1024&&syncCopyKeys().length===55&&!!ModernoPendingArchive.pointer(localStorage.getItem(LS_KEY));
   }""")
   assert page.evaluate("(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return !e.defaultPrevented&&!_localWrite;})()")
   assert page.evaluate('prepareAppReload()') # native reload guard reads back IndexedDB too
   # Real navigation must recover the large local snapshot before initialization runs.
   page.reload(wait_until='networkidle');page.wait_for_function('_resumed&&!_localResumePending')
   assert page.evaluate("state.account.latestNote==='newest during write'&&state.account.quotaFixture.length===6*1024*1024&&syncCopyKeys().length===55")
   page.evaluate("clearTimeout(_saveT);_accessRole='admin';_accessLoading=false;ESTUDIO_ID='estudio-ficticio';window.nativeStore=pendingArchiveStore();localStorage.setItem(LS_KEY+'_dirty','1');_resumed=true;")
   # Materialize a historical copy of the full data before any cloud cache replacement.
   assert page.evaluate("""async()=>{await cloudKeepPendingCopyArchived(_accessAttempt);const key=syncCopyKeys().find(k=>!k.endsWith('00000')&&k.includes('.'));window.liveHistoryKey=key;return JSON.parse(await ModernoPendingArchive.resolve(localStorage,key,pendingArchiveStore())).state.account.latestNote==='newest during write';}""")
   # A real IndexedDB failure leaves memory/download intact and native Retry repairs it.
   page.evaluate("_pendingArchiveStore={read:k=>nativeStore.read(k),write:async()=>{throw new DOMException('Fictional full disk','QuotaExceededError');}};_localRepairAfter=Date.now()+60000;state.account.latestNote='unsaved failure';persistNow();")
   page.wait_for_function('!_localWrite');assert page.evaluate('_saveErr')
   page.evaluate('syncDetails()');expect(page.locator('#modalBox')).to_contain_text('No hay espacio')
   with page.expect_download() as event:page.get_by_role('button',name='Descargar cambios actuales',exact=True).click()
   import json
   downloaded=json.loads(Path(event.value.path()).read_text());assert downloaded['state']['account']['latestNote']=='unsaved failure'
   page.evaluate('_pendingArchiveStore=nativeStore')
   page.get_by_role('button',name='Reintentar guardado',exact=True).click();page.wait_for_function('!_localWrite&&!_saveErr',timeout=15000)
   assert page.evaluate("""async()=>JSON.parse(await ModernoPendingArchive.resolve(localStorage,liveHistoryKey,pendingArchiveStore())).state.account.latestNote==='newest during write'""")
   assert page.evaluate("syncView().label!=='Guardado en nube'")
   # Test an interrupted startup read: show a retry screen, do not overwrite the pointer.
   context.add_init_script("""if(sessionStorage.getItem('fixtureFailRead')==='1'){
     sessionStorage.removeItem('fixtureFailRead');const native=indexedDB.open.bind(indexedDB);let first=true;
     indexedDB.open=function(...args){if(!first)return native(...args);first=false;const request={error:new DOMException('Fictional read failure','UnknownError')};setTimeout(()=>request.onerror?.(),0);return request;};
   }""")
   page.evaluate("sessionStorage.setItem('fixtureFailRead','1')")
   page.reload(wait_until='networkidle');expect(page.locator('#view')).to_contain_text('No se ha podido leer la copia local')
   page.wait_for_function("!document.documentElement.classList.contains('app-boot')")
   assert page.evaluate('_localResumePending&&!!ModernoPendingArchive.pointer(localStorage.getItem(LS_KEY))')
   if output:page.screenshot(path=str(output/f'large-copy-retry-{width}.png'),full_page=True)
   page.get_by_role('button',name='Reintentar',exact=True).click();page.wait_for_function('_resumed&&!_localResumePending')
   assert page.evaluate("state.account.latestNote==='unsaved failure'&&state.account.quotaFixture.length===6*1024*1024&&syncCopyKeys().length===56&&sb===null")
   # Full native startup pipeline: conserve the latest >6 MB pending snapshot before replacing the cache.
   page.evaluate("""async()=>{
     clearTimeout(_saveT);if(_localWrite)await _localWrite;
     localStorage.setItem(LS_KEY+'_dirty','1');_resumed=true;_accessRole='admin';_accessLoading=false;ESTUDIO_ID='estudio-ficticio';
     window.rowsBefore=Object.entries(CLOUD_BLOCKS).map(([bloque,io])=>({bloque,contenido:JSON.parse(canon(io.get())),updated_at:'fixture-v0'}));
     const account=rowsBefore.find(x=>x.bloque==='config').contenido.account;account.quotaFixture='remote data';account.latestNote='remote confirmed';
     window.fixtureClient={rpc:async name=>{if(name==='unirse_al_estudio')return {data:{estudio_id:'estudio-ficticio',rol:'admin'}};if(name==='app_rol')return {data:'admin'};throw Error('Unexpected RPC');}};
     window.fixtureRead=async()=>({data:structuredClone(rowsBefore)});
   }""")
   html=(repo/'app/index.html').read_text();load_source=html.split('async function cloudLoad(){',1)[1].split('function _dataUrlBlob(',1)[0]
   page.evaluate("async source=>{window.fixtureLoad=new Function('sb','cloudReadRows','return async function cloudLoad(){'+source)(fixtureClient,fixtureRead);await fixtureLoad();}",load_source)
   assert page.evaluate("""async()=>{
     if(_accessError||_accessLoading||state.account.latestNote!=='remote confirmed'||syncCopyKeys().length!==57)return false;
     for(const key of syncCopyKeys()){
       const d=JSON.parse(await ModernoPendingArchive.resolve(localStorage,key,pendingArchiveStore()));
       if(d.state?.account?.latestNote==='unsaved failure'&&d.state.account.quotaFixture.length===6*1024*1024)return true;
     }
     return false;
   }""")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS >6 MB actual quota; newest edit; 55 historical copies; reload; immutable pending copy; failed storage+download+retry; failed startup+retry; no remote writes',flush=True)
   context.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
