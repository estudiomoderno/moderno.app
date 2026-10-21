"""Initial loading screen under delayed styles and access, with fictional records only."""
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
   page=browser.new_page(viewport={'width':width,'height':900},locale='es-ES');errors=[];writes=[];held=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    if '/brand/neutral-theme.css' in r.request.url:held.append(r);return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='commit')
   page.wait_for_function("!!document.getElementById('appLoading')")
   expect(page.locator('#appLoading')).to_be_visible()
   assert page.locator('#appLoading .dot-spinner__dot').count()==8
   assert page.evaluate("document.documentElement.classList.contains('app-boot')&&getComputedStyle(document.querySelector('.app')).visibility==='hidden'&&getComputedStyle(document.getElementById('appLoading')).backgroundColor==='rgb(255, 255, 255)'")
   assert page.locator('.dot-spinner').evaluate("el=>getComputedStyle(el).getPropertyValue('--uib-speed').trim()")=='.9s'
   page.wait_for_function("typeof _accessLoading!=='undefined'&&!!window.ModernoDesktopShell")
   page.evaluate("_accessLoading=true;_accessError='';showLogin(false)")
   if output:page.screenshot(path=str(output/f'app-loading-{width}.png'))
   assert held,'Delayed late stylesheet was not requested'
   for r in held:r.continue_()
   page.wait_for_load_state('domcontentloaded')
   page.wait_for_function("!!document.getElementById('appLoadingState')")
   # Styles alone cannot uncover an app still checking access.
   page.wait_for_timeout(150);expect(page.locator('#appLoading')).to_be_visible()
   # Native page error must become visible rather than remain behind the spinner.
   page.evaluate("document.documentElement.classList.add('portalboot');_accessError='Error ficticio de acceso';render()")
   expect(page.locator('#appLoading')).to_be_visible()
   page.evaluate('portalBootDone()')
   expect(page.locator('#appLoading')).to_have_count(0)
   expect(page.locator('.main')).to_contain_text('Error ficticio de acceso')
   expect(page.get_by_role('button',name='Reintentar conexión',exact=True)).to_be_visible()
   # Later renders must never bring back the startup layer or change records.
   page.evaluate(setup);before=page.evaluate('records()');page.evaluate('render()');assert page.evaluate('records()')==before
   assert not page.evaluate("document.documentElement.classList.contains('app-boot')")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS eight supplied dots, white viewport, legacy UI hidden during delayed CSS/access, error and retry revealed, records intact and zero external writes',flush=True)
   page.close()
  # No session shows the ordinary login after styles, without a stuck spinner.
  page=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else r.abort())
  page.goto(origin,wait_until='networkidle');expect(page.locator('#appLoading')).to_have_count(0);expect(page.locator('#loginScreen')).to_be_visible()
  # Exercise the actual timeout path without waiting twenty seconds.
  page.add_init_script("""const nativeTimeout=window.setTimeout;window.setTimeout=function(fn,ms,...args){if(ms===20000&&String(fn).includes('appLoadingText'))window.fixtureBootTimeout=fn;return nativeTimeout(fn,ms,...args);};""")
  slow_held=[]
  page.route('**/brand/neutral-theme.css*',lambda r:slow_held.append(r))
  page.reload(wait_until='commit');page.wait_for_function('!!window.fixtureBootTimeout&&!!document.getElementById("appLoading")')
  assert page.locator('.dot-spinner__dot').first.evaluate("el=>getComputedStyle(el,'::before').animationName")=='none'
  page.evaluate('fixtureBootTimeout()');expect(page.get_by_role('button',name='Ver estado de la aplicación',exact=True)).to_be_visible()
  page.get_by_role('button',name='Ver estado de la aplicación',exact=True).click();expect(page.locator('#appLoading')).to_have_count(0)
  for r in slow_held:r.continue_()
  page.wait_for_load_state('networkidle')
  print('PASS ordinary login, reduced motion, stalled-bootstrap escape without reload or data writes',flush=True)
  browser.close()
finally:server.terminate();server.wait(timeout=5)
