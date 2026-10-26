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
    const base=state.projects[0];state.projects=Array.from({length:27},(_,i)=>({...structuredClone(base),id:9001+i,num:'PR-'+(9001+i),name:i===0?'Proyecto con nombre largo para comprobar el ajuste':'Proyecto ficticio '+(i+1),color:i%2?'#F6CBDD':'#123456',status:'En proceso',client:i===1?'':base.client,tasks:i===0?[{id:'a',title:'Tarea completada',col:'listo'},{id:'b',title:'Otra completada',col:'listo'},{id:'c',title:'Tarea pendiente ficticia',col:'pend',due:'2000-01-01'}]:i===2?[{id:'d',title:'Terminada',col:'listo'}]:i===3?[{id:'e',title:'Por empezar',col:'pend'}]:[]}));
    state.projView='list';state.projQ='';state.showArchived=false;go('proyectos');window.before=JSON.stringify(state.projects);
   }""")
   cards=page.locator('.projects-identity .project-overview-card');expect(cards).to_have_count(27)
   title=page.locator('.projects-header h1');expect(title).to_have_text('Proyectos')
   assert 'Estos son tus' not in page.locator('.projects-header').inner_text()
   if width>=1100:
    group=page.locator('.ha-project-actions');expect(group).to_be_visible()
    trash=group.get_by_role('button',name='Proyectos archivados',exact=True).bounding_box()
    bell=page.locator('.ha-notification-host button').bounding_box()
    assert trash['width']==trash['height']==bell['width']==bell['height']==32,(trash,bell)
    assert abs(trash['y']+trash['height']/2-bell['y']-bell['height']/2)<1,(trash,bell)
    bar=page.locator('#project-window-bar').bounding_box();assert bar['x']+bar['width']<group.bounding_box()['x']
    expect(page.locator('.projects-primary-actions')).to_be_hidden()
   else:expect(page.locator('.projects-primary-actions')).to_be_visible()
   page.locator('.projects-new:visible').click()
   expect(page.locator('.overlay.open')).to_be_visible();page.evaluate('closeModal()')
   expect(cards.first.locator('.project-card-percent')).to_have_text('67 % completado')
   expect(cards.first.locator('progress')).to_have_attribute('value','67')
   expect(cards.first.locator('.project-card-task-count')).to_have_text('2 de 3 tareas completadas')
   expect(cards.nth(1).locator('.project-card-no-tasks')).to_have_text('Sin tareas')
   expect(cards.nth(1).locator('progress')).to_have_count(0)
   expect(cards.nth(1).locator('.project-card-client')).to_have_text('Sin cliente asignado')
   expect(cards.nth(2).locator('progress')).to_have_attribute('value','100')
   expect(cards.nth(3).locator('progress')).to_have_attribute('value','0')
   page.evaluate("state.projects[0].tasks[2].col='listo';render()")
   expect(cards.first.locator('progress')).to_have_attribute('value','100')
   page.evaluate("state.projects[0].tasks[2].col='pend';render()")
   expect(cards.first.locator('progress')).to_have_attribute('value','67')
   notice=cards.first.locator('.folio-notifications')
   notice.locator('summary').click();expect(notice.locator('.folio-notice-panel')).to_be_visible()
   assert page.evaluate("state.view==='proyectos'")
   notice.locator('summary').press('Escape');expect(notice).not_to_have_attribute('open','')
   before=cards.first.bounding_box();cards.first.hover();page.wait_for_timeout(250);assert cards.first.bounding_box()==before
   expect(page.locator('.projects-identity .neutral-folder-art')).to_have_count(0)
   assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
   expect(page.locator('.projects-divider')).to_be_visible()
   if width>=1100:
    divider=page.locator('.projects-divider').bounding_box()
    brand=page.locator('#desktop-header .desktop-brand')
    edge=brand.bounding_box()['y']+brand.bounding_box()['height']-brand.evaluate("e=>parseFloat(getComputedStyle(e).borderBottomWidth)")
    assert abs(divider['y']-edge)<1,(divider,edge)
   page.locator('.project-card-open').first.evaluate('e=>document.activeElement?.blur()')
   if output:page.screenshot(path=str(output/f'projects-{width}.png'))
   cards.first.locator('.project-card-open').focus();page.keyboard.press('Enter');expect(page.locator('.projects-identity')).to_have_count(0)
   expect(page.locator('.ha-project-actions')).to_have_count(0)
   page.evaluate("go('proyectos')")
   lower=page.get_by_role('textbox',name='Buscar por proyecto o cliente',include_hidden=True)
   if width>=1100:
    expect(lower).to_be_hidden()
    page.get_by_role('button',name='Abrir otro proyecto',exact=True).click()
    search=page.get_by_role('combobox',name='Buscar proyecto para abrir',exact=True)
    search.fill('PR-9002');expect(page.locator('.pw-project-choice')).to_have_count(1)
    page.locator('.pw-project-choice').click();page.wait_for_function('state.currentProject===9002')
    page.evaluate("go('proyectos')");expect(cards).to_have_count(27)
    page.evaluate('ModernoProjectWorkspace.setEnabled(false)');expect(lower).to_be_visible()
    lower.fill('PR-9002');expect(cards).to_have_count(1)
    lower.fill('');expect(cards).to_have_count(27)
    page.evaluate('ModernoProjectWorkspace.setEnabled(true)');expect(lower).to_be_hidden()
   else:
    expect(lower).to_be_visible()
    lower.fill('PR-9002');expect(cards).to_have_count(1)
    lower.fill('');expect(cards).to_have_count(27)
   expect(page.get_by_role('button',name='Lista',exact=True)).to_have_count(0)
   expect(page.get_by_role('button',name='Cuadrícula',exact=True)).to_have_count(0)
   expect(page.locator('.projects-clean-list')).to_have_count(0)
   page.evaluate("state.projView='timeline';render()");expect(cards).to_have_count(27)
   divider=page.locator('.projects-divider');expect(divider).to_be_visible()
   assert divider.evaluate("e=>getComputedStyle(e).borderTopWidth==='1px'")
   line=divider.bounding_box();first=cards.first.bounding_box()
   assert line['y']+line['height']<first['y']
   assert page.locator('.projects-view-content').bounding_box()['y']>=line['y']+line['height']
   if width>=1100:
    bar=page.locator('#project-window-bar').bounding_box();assert line['y']>bar['y']+bar['height']
   page.get_by_role('button',name='Proyectos archivados',exact=True).click();expect(cards).to_have_count(0)
   page.get_by_role('button',name='Volver a proyectos activos',exact=True).click();expect(cards).to_have_count(27)
   assert page.evaluate('JSON.stringify(state.projects)===before')
   assert page.evaluate("projectFolio(state.projects[0]).includes('folio-flap')&&!projectFolio(state.projects[0]).includes('project-folio-neutral')")
   assert not errors,errors;assert not writes,writes
   print(width,'PASS: project cards and real task progress, removed greeting, header actions, keyboard navigation, search, grid-only, separator, archive, unchanged data and home presentation',flush=True)
   page.close()
  browser.close()
finally:server.terminate();server.wait(timeout=5)
