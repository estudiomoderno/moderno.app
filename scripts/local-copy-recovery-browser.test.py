"""Ordinary autosave under real localStorage quota, with fictional records only."""
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
    context=browser.new_context(viewport={'width':width,'height':900},locale='es-ES');page=context.new_page();errors=[];writes=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
     if not r.request.url.startswith(origin+'/'):r.abort();return
     if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
     r.continue_()
    page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
    page.evaluate("""failure=>{
      clearTimeout(_saveT);_localRepairAfter=0;
      ModernoPendingArchive.writeCurrent=async()=>{throw new DOMException('Fictional unavailable live storage','QuotaExceededError');};
      window.savedArchive=cloudArchivePendingCopies;window.archiveAttempts=0;
      cloudArchivePendingCopies=async()=>{archiveAttempts++;if(failure)throw Error('fictional archive failure');const promise=savedArchive();state.account.latestNote='Changed while archiving';await promise;};
      for(let i=0;i<53;i++)localStorage.setItem(LS_KEY+'_pendiente_'+(2100000000000+i),JSON.stringify({v:1,fictional:i,padding:'x'.repeat(98000)}));
      state.account.quotaFixture='current-'+ 'y'.repeat(800000);window.memoryBefore=records();
      persistNow();if(!_saveErr)throw Error('Quota was not reproduced');
    }""",failure)
    page.wait_for_function('_localWrite===null&&_localRepair===null',timeout=10000)
    if failure:
     assert page.evaluate('_saveErr&&syncCopyKeys().length===53&&records()===memoryBefore&&archiveAttempts===1')
     page.evaluate('syncDetails()');expect(page.locator('#modalBox')).to_contain_text('No hay espacio');expect(page.locator('#modalBox')).to_contain_text('MB')
     if output:page.screenshot(path=str(output/f'local-copy-failure-{width}.png'),full_page=True)
     # Current-memory download must succeed even though the regular local copy failed.
     with page.expect_download() as event:page.get_by_role('button',name='Descargar cambios actuales',exact=True).click()
     download=event.value
     import json
     data=json.loads(Path(download.path()).read_text());assert data['state']['account']['quotaFixture']=='current-'+ 'y'*800000
     # Restore the native archive; the actual Retry button must wait for it before cloudFlush.
     page.evaluate("cloudArchivePendingCopies=async()=>{archiveAttempts++;const task=savedArchive();state.account.latestNote='Changed while archiving';await task;}")
     page.get_by_role('button',name='Reintentar guardado',exact=True).click()
     page.wait_for_function('_localWrite===null&&_localRepair===null&&!_saveErr',timeout=10000)
    assert page.evaluate("!_saveErr&&JSON.parse(localStorage.getItem(LS_KEY)).state.account.latestNote==='Changed while archiving'")
    # Read every original copy back from the real IndexedDB archive; no discards or auto-imports.
    assert page.evaluate("""async()=>{
      for(let i=0;i<53;i++){
        const key=LS_KEY+'_pendiente_'+(2100000000000+i),raw=JSON.stringify({v:1,fictional:i,padding:'x'.repeat(98000)});
        if(await ModernoPendingArchive.resolve(localStorage,key,pendingArchiveStore())!==raw)throw Error('Old copy changed');
      }
      return syncCopyKeys().length===53&&sb===null;
    }""")
    assert page.evaluate("syncView().label!=='Guardado en nube'") # Local recovery alone must not acknowledge remote data.
    assert not errors,errors;assert not writes,writes
    print(width,'PASS','failure+download+native retry' if failure else 'ordinary automatic recovery','53 copies preserved, newest state verified, no false cloud acknowledgement or remote writes',flush=True)
    context.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
