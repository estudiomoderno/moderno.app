"""Discover/footer navigation in the full app, with fictitious records and no external writes."""
from pathlib import Path
import ast,os,socket,subprocess,time,urllib.request,sys
from playwright.sync_api import sync_playwright,expect
repo=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else None
if output:output.mkdir(parents=True,exist_ok=True)
parsed=ast.parse((repo/'scripts/shopping-loading-browser.test.py').read_text())
setup=next(ast.literal_eval(n.value) for n in parsed.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='fixture_setup' for t in n.targets))
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
origin=f'http://127.0.0.1:{port}'
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://discover-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_discover-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,900),(1280,600),(1100,650),(1024,768),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   desktop=width>=1100
   if not desktop:page.evaluate("document.body.classList.add('sbopen')")
   scope=page.locator('#desktop-header' if desktop else 'aside.sidebar')
   discover=scope.locator('.desktop-discover' if desktop else '#ngDiscover')
   expect(discover).to_be_visible();expect(discover).to_contain_text('Discover')
   expect(discover.get_by_role('button',name='Plantillas',exact=True)).to_be_visible()
   expect(discover.get_by_role('button',name='Tutoriales',exact=True)).to_be_visible()
   docs=discover.get_by_role('link',name='Documentación',exact=True)
   expect(docs).to_have_attribute('href','https://doc.moderno.app');expect(docs).to_have_attribute('target','_blank')
   assert set(docs.get_attribute('rel').split())=={'noopener','noreferrer'}
   assert docs.evaluate('e=>e.onclick===null')
   docs.focus();expect(docs).to_be_focused()
   assert 'Comunidad' not in discover.inner_text()
   support=scope.get_by_role('button',name='Soporte',exact=True)
   expect(support).to_be_visible();box=support.bounding_box();assert box['y']+box['height']<=height
   if desktop:
    page.locator('.desktop-nav-clip').evaluate('e=>e.scrollTop=e.scrollHeight')
    stable=support.bounding_box();assert abs(stable['y']-box['y'])<1
    if output:page.screenshot(path=str(output/f'discover-{width}.png'))
   baseline=page.evaluate('JSON.stringify({projects:state.projects,library:state.library,docs:state.docs,invoices:state.invoices,quotes:state.quotes,entries:state.entries})')
   support.click();page.wait_for_function("state.view==='soporte'")
   expect(page.locator('#view h1')).to_have_text('Soporte');assert page.evaluate('location.pathname')=='/es/soporte'
   if not desktop:page.evaluate("document.body.classList.add('sbopen')")
   discover.get_by_role('button',name='Tutoriales',exact=True).click();page.wait_for_function("state.view==='tutoriales'")
   expect(page.locator('#view h1')).to_have_text('Tutoriales');assert page.evaluate('location.pathname')=='/es/tutoriales'
   if not desktop:page.evaluate("document.body.classList.add('sbopen')")
   discover.get_by_role('button',name='Plantillas',exact=True).click();page.wait_for_function("state.view==='plantillas'")
   expect(page.get_by_role('navigation',name='Secciones de documentos')).to_be_visible()
   assert page.evaluate('JSON.stringify({projects:state.projects,library:state.library,docs:state.docs,invoices:state.invoices,quotes:state.quotes,entries:state.entries})')==baseline
   if desktop:
    page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
    page.wait_for_function("document.body.classList.contains('desktop-menu-collapsed')&&!document.querySelector('.desktop-row').classList.contains('is-toggling')")
    expect(support).to_be_visible();expect(docs).to_be_visible();docs.focus();expect(docs).to_be_focused()
    box=support.bounding_box();assert box['width']<=44 and box['y']+box['height']<=height
    if output:page.screenshot(path=str(output/f'discover-collapsed-{width}.png'))
    page.get_by_role('button',name='Desplegar menú lateral',exact=True).click()
    page.evaluate("_accessRole='colaborador';render()")
    expect(discover.get_by_role('button',name='Plantillas',exact=True)).to_be_hidden()
    expect(discover.get_by_role('button',name='Tutoriales',exact=True)).to_be_visible();expect(docs).to_be_visible();expect(support).to_be_visible()
    page.evaluate("_accessRole='admin';render();ModernoDesktopShell.setEnabled(false)")
    assert page.locator('#desktop-header').count()==0
    page.evaluate('ModernoDesktopShell.setEnabled(true)');expect(page.locator('#desktop-header .desktop-discover')).to_be_visible()
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: Discover order/links, bottom support, routes, keyboard, collapsed/roles/fallback, records unchanged',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
