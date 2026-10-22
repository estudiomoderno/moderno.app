"""General Projects folders and navigation in the full app, with fictitious records and no external writes."""
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
server=subprocess.Popen(['node','scripts/dev-server.mjs'],cwd=repo,env=dict(os.environ,PORT=str(port),SUPABASE_URL='https://work-calendar-fixture.supabase.co',SUPABASE_ANON_KEY='sb_publishable_offline_fixture_only_no_credentials_49'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
 for _ in range(100):
  try:
   with opener.open(origin,timeout=1) as r:assert 'moderno_pruebas_work-calendar-fixture' in r.read().decode()
   break
  except OSError:time.sleep(.05)
 else:raise AssertionError('Official isolated server unavailable')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(1440,1000),(1100,850),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},locale='es-ES',timezone_id='Europe/Madrid');errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def route(r):
    if not r.request.url.startswith(origin+'/'):r.abort();return
    if r.request.method not in ['GET','HEAD']:writes.append(r.request.method);r.abort();return
    r.continue_()
   page.route('**/*',route);page.goto(origin,wait_until='networkidle');page.evaluate(setup)
   page.evaluate("""()=>{
    const base=state.projects[0];state.projects=Array.from({length:27},(_,i)=>({...structuredClone(base),id:9001+i,num:'PR-'+(9001+i),name:i===0?'Proyecto con nombre largo para comprobar el ajuste':'Proyecto ficticio '+(i+1),color:i%2?'#F6CBDD':'#123456',status:'En proceso'}));
    state.projView='grid';state.projQ='';state.showArchived=false;go('proyectos');window.before=JSON.stringify(state.projects);
   }""")
   cards=page.locator('.projects-identity .project-folio-neutral');expect(cards).to_have_count(27)
   title=page.locator('.projects-header h1');assert '27 proyectos' in title.inner_text()
   if width>=1100:assert 52<=title.bounding_box()['y']<=80,title.bounding_box()
   art=cards.first.locator('.neutral-folder-art');caption=cards.first.locator('.neutral-folder-caption')
   assert caption.bounding_box()['y']>=art.bounding_box()['y']+art.bounding_box()['height']
   shape=art.locator('svg');before=shape.bounding_box();shape.hover();page.wait_for_timeout(350)
   assert shape.bounding_box()==before
   assert shape.evaluate("e=>getComputedStyle(e).transform==='none'")
   assert cards.first.locator('.folio-flap').count()==0
   assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
   if output:page.screenshot(path=str(output/f'projects-{width}.png'))
   cards.first.locator('summary').first.focus();page.keyboard.press('Enter');expect(page.locator('.projects-identity')).to_have_count(0)
   page.evaluate("go('proyectos')")
   page.get_by_role('textbox',name='Buscar por proyecto o cliente').fill('PR-9002');expect(cards).to_have_count(1)
   page.get_by_role('textbox',name='Buscar por proyecto o cliente').fill('');expect(cards).to_have_count(27)
   page.get_by_role('button',name='Lista',exact=True).click();expect(page.locator('.projects-clean-list tbody tr')).to_have_count(27)
   page.get_by_role('button',name='Cuadrícula',exact=True).click();expect(cards).to_have_count(27)
   page.get_by_role('button',name='Proyectos archivados',exact=True).click();expect(cards).to_have_count(0)
   page.get_by_role('button',name='Volver a proyectos activos',exact=True).click();expect(cards).to_have_count(27)
   assert page.evaluate('JSON.stringify(state.projects)===before')
   assert page.evaluate("projectFolio(state.projects[0]).includes('folio-flap')&&!projectFolio(state.projects[0]).includes('project-folio-neutral')")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: neutral static folders, dynamic elevated title, keyboard navigation, search, list, archive, unchanged data and home presentation',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
