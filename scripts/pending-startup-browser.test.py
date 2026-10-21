"""Startup with a large pending snapshot under real localStorage quota, with fictional records only."""
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
   for failure in [False,True]:
    page=browser.new_page(viewport={'width':width,'height':900},locale='es-ES');errors=[];writes=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
     if not r.request.url.startswith(origin+'/'):r.abort();return
     if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
     r.continue_()
    page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
    page.evaluate("""async failure=>{
      clearTimeout(_saveT);_localRepairAfter=Date.now()+60000;
      state.account.quotaFixture='pending-'+ 'z'.repeat(3100000);persistNow();clearTimeout(_saveT);
      if(_saveErr)throw Error('Current original must fit');
      _resumed=true;localStorage.setItem(LS_KEY+'_dirty','1');
      window.originalRaw=localStorage.getItem(LS_KEY);window.originalMemory=records();
      for(let i=0;i<53;i++){
        const key=LS_KEY+'_pendiente_'+(2100000000000+i),raw=JSON.stringify({v:1,fictional:i});
        await pendingArchiveStore().write(key,raw);localStorage.setItem(key,ModernoPendingArchive.marker(key));
      }
      let quota=false;try{cloudKeepPendingCopy();}catch(e){quota=e.name==='QuotaExceededError';}
      if(!quota)throw Error('Actual duplicate quota not reproduced');
      window.rowsBefore=Object.entries(CLOUD_BLOCKS).map(([bloque,io])=>({bloque,contenido:JSON.parse(canon(io.get())),updated_at:'fixture-v0'}));
      rowsBefore.find(x=>x.bloque==='config').contenido.account.quotaFixture='remote-data';
      window.fixtureClient={rpc:async(name)=>{
        if(name==='unirse_al_estudio')return {data:{estudio_id:'estudio-ficticio',rol:'admin'}};
        if(name==='app_rol')return {data:'admin'};throw Error('Unexpected RPC: '+name);
      }};
      window.fixtureRead=async()=>({data:structuredClone(rowsBefore)});
      window.nativeStore=pendingArchiveStore();
      if(failure)_pendingArchiveStore={read:async k=>nativeStore.read(k),write:async()=>{throw Error('Fictional unavailable archive');}};
    }""",failure)
    html=(repo/'app/index.html').read_text();load_source=html.split('async function cloudLoad(){',1)[1].split('function _dataUrlBlob(',1)[0]
    page.evaluate("async source=>{window.fixtureLoad=new Function('sb','cloudReadRows','return async function cloudLoad(){'+source)(fixtureClient,fixtureRead);await fixtureLoad();}",load_source)
    if failure:
     assert page.evaluate("_accessLoading&&_accessError.includes('No hay espacio')&&localStorage.getItem(LS_KEY)===originalRaw&&localStorage.getItem(LS_KEY+'_dirty')==='1'&&records()===originalMemory")
     page.evaluate('syncDetails()')
     with page.expect_download() as event:page.get_by_role('button',name='Descargar cambios actuales',exact=True).click()
     import json
     assert json.loads(Path(event.value.path()).read_text())['state']['account']['quotaFixture']=='pending-'+ 'z'*3100000
     page.get_by_role('button',name='Cerrar',exact=True).click()
     page.evaluate('_pendingArchiveStore=nativeStore')
     page.get_by_role('button',name='Reintentar conexión',exact=True).evaluate('(el)=>{el.onclick=()=>fixtureLoad();}')
     page.get_by_role('button',name='Reintentar conexión',exact=True).click()
     page.wait_for_function('!_accessLoading',timeout=10000)
    assert page.evaluate("!_accessLoading&&!_accessError&&state.account.quotaFixture==='remote-data'&&syncCopyKeys().length===54")
    assert page.evaluate("""async()=>{
      for(let i=0;i<53;i++){
        const key=LS_KEY+'_pendiente_'+(2100000000000+i);
        if(await ModernoPendingArchive.resolve(localStorage,key,pendingArchiveStore())!==JSON.stringify({v:1,fictional:i}))throw Error('Old copy changed');
      }
      const key=syncCopyKeys().find(k=>!k.startsWith(LS_KEY+'_pendiente_21000000000'));
      if(!key)return false;const archived=JSON.parse(await ModernoPendingArchive.resolve(localStorage,key,pendingArchiveStore())),original=JSON.parse(originalRaw);return archived.state.account.quotaFixture===original.state.account.quotaFixture&&canon(archived.state.projects)===canon(original.state.projects)&&canon(archived.state.library)===canon(original.state.library)&&sb===null;
    }""")
    assert not writes,writes;assert not errors,errors
    print(width,'PASS','archive failure/download/native retry' if failure else 'direct archive','actual large-copy quota, 53 earlier copies plus pending original retained, cloud loading resumes only after verification; no real writes',flush=True)
    page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
