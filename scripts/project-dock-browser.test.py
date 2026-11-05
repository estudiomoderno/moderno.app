"""Project sections and diary in the full app, with fictitious records and no external writes."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://sections-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_sections-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
  for width,height in [(1366,900),(1440,900),(1920,1080),(834,900),(390,844),(320,740)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   keys=['tareas','listas','ai','conversaciones','planos','obra','diario','calobra','estudio','pres','mediciones','utilidades','fin','cliente','archivos','ajustes']
   assert page.locator('.project-dock button').evaluate_all('(bs)=>bs.map(b=>b.id.replace("project-tab-",""))')==keys
   assert page.locator('.project-dock [role=separator]').count()==3
   assert page.locator('.project-dock img').evaluate_all('(imgs)=>imgs.every(i=>i.complete&&i.naturalWidth>0)')
   boxes=page.locator('.project-dock button').evaluate_all('(bs)=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y}})')
   for start in [0,4,8,12]:
    a,b,c,d=boxes[start:start+4]
    assert a['y']==b['y'] and c['y']==d['y'] and a['y']<c['y']
    assert a['x']==c['x'] and b['x']==d['x'] and a['x']<b['x']
   assert len(set(page.locator('.project-dock img').evaluate_all('(imgs)=>imgs.map(i=>getComputedStyle(i).filter)')))==1
   if width>=1100:
    assert page.locator('.desktop-row').bounding_box()['width']==64
    page.get_by_role('button',name='Desplegar menú lateral',exact=True).click()
    page.wait_for_timeout(350)
    assert page.locator('.desktop-row').bounding_box()['width']==224
    page.get_by_role('button',name='Comprimir menú lateral',exact=True).click()
    page.wait_for_timeout(350)
   for key in keys:
    if key in ['estudio','mediciones']:
     assert page.locator('#project-tab-'+key).get_attribute('aria-disabled')=='true'
     continue
    if key=='ajustes':
     page.locator('#project-tab-ajustes').click()
     assert page.locator('.overlay.open').count()==1
     assert page.locator('.project-dock').is_hidden()
     page.evaluate('closeModal()')
     continue
    page.locator('#project-tab-'+key).click()
    assert page.evaluate('state.projTab')==key
    assert page.locator('#project-tab-'+key).get_attribute('aria-selected')=='true'
    dock=page.locator('.project-dock').bounding_box()
    assert dock['x']>=0 and dock['x']+dock['width']<=width,(width,dock)
    assert dock['y']>height-180 and dock['y']+dock['height']<=height
    assert page.locator('.project-dock').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
   page.locator('#project-tab-archivos').press('Home')
   assert page.evaluate('state.projTab')=='tareas'
   page.locator('#project-tab-tareas').press('ArrowRight')
   assert page.evaluate('state.projTab')=='listas'
   page.locator('#project-tab-listas').press('End')
   assert page.evaluate('state.projTab')=='archivos'
   page.evaluate("projTab('listas')")
   page.locator('#project-tab-listas').hover()
   label=page.locator('#project-tab-listas .project-tab-label').bounding_box()
   assert label['y']+label['height']<page.locator('.project-dock').bounding_box()['y']
   page.mouse.move(0,0);page.locator('#project-tab-listas').blur()
   page.wait_for_timeout(350)
   if output:page.screenshot(path=str(output/f'barra-proyecto-{width}.png'))
   page.evaluate("state.projects[0].files=[{id:'fixture-plan',name:'Plano.png',type:'image/png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzS0AAAAASUVORK5CYII='}];projectPlanOpen(9001,0)")
   expect(page.locator('.project-plan-dialog')).to_be_visible()
   assert page.locator('.project-dock').is_hidden()
   page.locator('.project-plan-dialog').get_by_role('button',name='Cerrar',exact=True).click()
   expect(page.locator('.project-dock')).to_be_visible()
   page.evaluate("_accessRole='colaborador';state.myRole='colaborador';render()")
   assert page.locator('#project-tab-fin').count()==0
   assert page.locator('#project-tab-utilidades').count()==0
   assert not errors,errors
   assert not writes,writes
   print(width,'PASS: original icons, order, routes, keyboard, responsive dock, modal isolation, permissions',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
