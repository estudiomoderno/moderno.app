"""Update button on the official isolated server; no real service calls or records."""
from pathlib import Path
import os,socket,subprocess,time,urllib.request,sys
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
html=(repo/'app/index.html').read_text();native=html[html.index('async function prepareAppReload('):html.index('async function applyAppUpdate(')]
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
 else:raise AssertionError('Official isolated server did not start')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width in [1440,390]:
   page=browser.new_page(viewport={'width':width,'height':900},locale='es-ES');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    if 'vchk' in parse_qs(urlsplit(r.request.url).query):r.fulfill(status=200,content_type='text/html',body='<script>const MODERNO_VER="v99.0.0";</script>');return
    r.continue_()
   page.route('**/*',route);page.goto(origin+'/?fixture=kept',wait_until='networkidle');page.evaluate(setup);page.evaluate('versionSentinel()')
   button=page.get_by_role('button',name='Actualizar ahora',exact=True);status=page.locator('#verBarStatus')
   expect(button).to_be_visible();assert page.locator('#verBar').count()==1
   # Native guard with only its cloud transport mocked; actual app SDK stays null.
   page.evaluate("source=>{prepareAppReload=new Function('sb',source+';return prepareAppReload;')({});cloudFlush=async()=>{for(const b of Object.keys(CLOUD_BLOCKS))_cloudHash[b]=canon(CLOUD_BLOCKS[b].get());};_cloudConflicts={proyectos:{fixture:true}};}",native)
   button.click();expect(status).to_contain_text('Hay cambios pendientes');expect(status).to_be_visible();expect(button).to_be_enabled();assert page.evaluate('records()===baseline')
   bounds=button.bounding_box();assert bounds['x']>=0 and bounds['x']+bounds['width']<=width,bounds
   assert page.locator('#verBarStatus').evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight')
   if output:page.screenshot(path=str(output/f'update-blocked-{width}.png'),full_page=True)
   # Actual click waits for the active save, then performs a real cache-busting navigation.
   page.evaluate('_cloudConflicts={};_cloudBusy=true;setTimeout(()=>_cloudBusy=false,700);window.beforeUpdateHash=location.hash;')
   before_hash=page.evaluate('beforeUpdateHash');button.click();expect(status).to_contain_text('Esperando');expect(page.locator('#verBarBtn')).to_be_disabled()
   page.wait_for_url(lambda url:'v=' in urlsplit(url).query,timeout=10000)
   assert parse_qs(urlsplit(page.url).query)['fixture']==['kept'];assert urlsplit(page.url).fragment==before_hash.removeprefix('#')
   page.wait_for_load_state('networkidle');page.evaluate(setup);page.evaluate('versionSentinel()')
   # The real settings wrapper must report the draft reason and preserve the entered value.
   page.evaluate("SettingsUI.open('estudio')")
   field=page.locator('[data-setting=type]');field.fill('Borrador ficticio conservado')
   page.get_by_role('button',name='Actualizar ahora',exact=True).click()
   expect(page.locator('#verBarStatus')).to_contain_text('cambios de Ajustes');expect(field).to_have_value('Borrador ficticio conservado');assert page.evaluate('SettingsUI.dirty()')
   if output:page.screenshot(path=str(output/f'update-settings-draft-{width}.png'),full_page=True)
   assert page.evaluate('sb===null');assert not writes,writes;assert not errors,errors
   print(width,'PASS: visible reason, retry enabled, waiting for save, real update navigation with query/hash retained, settings draft preserved; no remote writes',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
